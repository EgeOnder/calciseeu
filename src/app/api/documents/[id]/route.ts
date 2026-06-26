import { and, eq, sql } from 'drizzle-orm';
import { headers } from 'next/headers';

import { db } from '@/src/db';
import { calculation, document } from '@/src/db/schema';
import { auth } from '@/src/lib/auth';
import { requireProUser } from '@/src/lib/pro';
import { createDownloadUrl, deleteObject } from '@/src/lib/r2';

/** Returns a fresh presigned preview URL for a single owned document. */
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await auth.api
		.getSession({ headers: await headers() })
		.catch(() => null);

	if (!session) {
		return Response.json({ error: 'Unauthorized.' }, { status: 401 });
	}

	const proRequired = await requireProUser(session.user.id);
	if (proRequired) return proRequired;

	const { id } = await params;
	const [row] = await db
		.select()
		.from(document)
		.where(and(eq(document.id, id), eq(document.userId, session.user.id)))
		.limit(1);

	if (!row) {
		return Response.json({ error: 'Not found.' }, { status: 404 });
	}

	return Response.json({
		url: await createDownloadUrl(row.key),
		analysisStatus: row.analysisStatus,
		analysis: row.analysis,
		analyzedAt: row.analyzedAt,
	});
}

/** Renames a document owned by the signed-in user. */
export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await auth.api
		.getSession({ headers: await headers() })
		.catch(() => null);

	if (!session) {
		return Response.json({ error: 'Unauthorized.' }, { status: 401 });
	}

	const body = (await request.json().catch(() => null)) as {
		name?: unknown;
	} | null;
	const name =
		typeof body?.name === 'string' ? body.name.trim().slice(0, 255) : '';

	if (!name) {
		return Response.json({ error: 'Dosya adı gerekli.' }, { status: 400 });
	}

	const { id } = await params;
	const updated = await db
		.update(document)
		.set({ name })
		.where(and(eq(document.id, id), eq(document.userId, session.user.id)))
		.returning({ id: document.id });

	if (updated.length === 0) {
		return Response.json({ error: 'Not found.' }, { status: 404 });
	}

	return Response.json({ ok: true });
}

/** Removes a document from both R2 and the database. */
export async function DELETE(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await auth.api
		.getSession({ headers: await headers() })
		.catch(() => null);

	if (!session) {
		return Response.json({ error: 'Unauthorized.' }, { status: 401 });
	}

	const { id } = await params;
	const [deleted] = await db
		.delete(document)
		.where(and(eq(document.id, id), eq(document.userId, session.user.id)))
		.returning({ key: document.key });

	if (!deleted) {
		return Response.json({ error: 'Not found.' }, { status: 404 });
	}

	// Strip the now-deleted document from any saved calculation that attached
	// it, so re-opening those calculations no longer references a missing file.
	const contains = JSON.stringify({ automatic: { documents: [{ id }] } });
	const affected = await db
		.select({ id: calculation.id, data: calculation.data })
		.from(calculation)
		.where(
			and(
				eq(calculation.userId, session.user.id),
				sql`${calculation.data} @> ${contains}::jsonb`,
			),
		);

	for (const row of affected) {
		const automatic = row.data.automatic;
		if (!automatic) continue;
		await db
			.update(calculation)
			.set({
				data: {
					...row.data,
					automatic: {
						...automatic,
						documents: automatic.documents.filter(
							(doc) => doc.id !== id,
						),
					},
				},
			})
			.where(eq(calculation.id, row.id));
	}

	// The row is gone either way; a failed object delete just leaves an orphan.
	await deleteObject(deleted.key).catch(() => null);

	return Response.json({ ok: true });
}
