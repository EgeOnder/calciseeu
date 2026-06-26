import { and, eq, inArray } from 'drizzle-orm';
import { headers } from 'next/headers';
import { after } from 'next/server';

import { db } from '@/src/db';
import { calculation, document } from '@/src/db/schema';
import { auth } from '@/src/lib/auth';
import { runDocumentAnalysis } from '@/src/lib/document-analysis';
import { MAX_DOCUMENT_COUNT } from '@/src/lib/documents';

/** Returns a single saved calculation (with its full snapshot) for re-opening. */
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

	const { id } = await params;
	const [row] = await db
		.select()
		.from(calculation)
		.where(
			and(
				eq(calculation.id, id),
				eq(calculation.userId, session.user.id),
			),
		)
		.limit(1);

	if (!row) {
		return Response.json({ error: 'Not found.' }, { status: 404 });
	}

	return Response.json({ calculation: row });
}

/** Updates a saved calculation owned by the signed-in user. */
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
		title?: unknown;
		documents?: unknown;
	} | null;
	const title =
		typeof body?.title === 'string' ? body.title.trim().slice(0, 200) : '';
	const submittedDocuments = Array.isArray(body?.documents)
		? body.documents
		: null;
	const hasDocuments = submittedDocuments !== null;
	if (!title && !hasDocuments) {
		return Response.json(
			{ error: 'Title or documents are required.' },
			{ status: 400 },
		);
	}

	const { id } = await params;
	const [current] = await db
		.select()
		.from(calculation)
		.where(
			and(
				eq(calculation.id, id),
				eq(calculation.userId, session.user.id),
			),
		)
		.limit(1);

	if (!current) {
		return Response.json({ error: 'Not found.' }, { status: 404 });
	}

	let data = current.data;
	let documentSetChanged = false;
	if (hasDocuments) {
		if (current.type !== 'automatic') {
			return Response.json(
				{ error: 'Documents are only supported for automatic calculations.' },
				{ status: 400 },
			);
		}

		const ids = submittedDocuments
			.filter(
				(item): item is { id: string } =>
					typeof item === 'object' &&
					item !== null &&
					typeof (item as { id?: unknown }).id === 'string',
			)
			.map((item) => item.id);
		if (
			ids.length !== submittedDocuments.length ||
			new Set(ids).size !== ids.length ||
			ids.length > MAX_DOCUMENT_COUNT
		) {
			return Response.json(
				{ error: 'Invalid document list.' },
				{ status: 400 },
			);
		}
		const currentIds = new Set(
			current.data.automatic?.documents.map((item) => item.id) ?? [],
		);
		documentSetChanged =
			currentIds.size !== ids.length ||
			ids.some((documentId) => !currentIds.has(documentId));

		const ownedDocuments =
			ids.length === 0
				? []
				: await db
						.select({
							id: document.id,
							name: document.name,
							size: document.size,
							type: document.type,
						})
						.from(document)
						.where(
							and(
								eq(document.userId, session.user.id),
								inArray(document.id, ids),
							),
						);
		if (ownedDocuments.length !== ids.length) {
			return Response.json(
				{ error: 'One or more documents were not found.' },
				{ status: 404 },
			);
		}

		const byId = new Map(ownedDocuments.map((document) => [document.id, document]));
		data = {
			...data,
				automatic: {
					...data.automatic,
					documents: ids.map((documentId) => byId.get(documentId)!),
					parameters: documentSetChanged
						? []
						: data.automatic?.parameters,
					// Adding/removing documents invalidates the previous result; a
				// rename or reorder does not.
				result: documentSetChanged
					? undefined
					: data.automatic?.result,
			},
		};
	}

	await db
		.update(calculation)
		.set({
			...(title ? { title } : {}),
			...(hasDocuments
				? { data, ...(documentSetChanged ? { iseeu: 0 } : {}) }
				: {}),
		})
		.where(eq(calculation.id, id));

	if (hasDocuments) {
		const userId = session.user.id;
		const documentIds = data.automatic?.documents.map((item) => item.id) ?? [];
		after(async () => {
			await Promise.all(
				documentIds.map((documentId) =>
					runDocumentAnalysis(documentId, userId),
				),
			);
		});
	}

	return Response.json({ ok: true });
}

/** Deletes a saved calculation owned by the signed-in user. */
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
	await db
		.delete(calculation)
		.where(
			and(
				eq(calculation.id, id),
				eq(calculation.userId, session.user.id),
			),
		);

	return Response.json({ ok: true });
}
