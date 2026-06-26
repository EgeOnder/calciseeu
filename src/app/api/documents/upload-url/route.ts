import { and, eq } from 'drizzle-orm';
import { headers } from 'next/headers';

import { db } from '@/src/db';
import { document } from '@/src/db/schema';
import { auth } from '@/src/lib/auth';
import {
	buildDocumentKey,
	duplicateDocumentMessage,
	isValidDocumentHash,
	MAX_DOCUMENT_COUNT,
	validateDocumentInput,
} from '@/src/lib/documents';
import { requireProUser } from '@/src/lib/pro';
import { createUploadUrl } from '@/src/lib/r2';

/**
 * Hands the browser a short-lived presigned URL so it can upload a single
 * document straight to R2. We mint the document id and key here so the client
 * can only write to a path that belongs to the signed-in user.
 */
export async function POST(request: Request) {
	const session = await auth.api
		.getSession({ headers: await headers() })
		.catch(() => null);

	if (!session) {
		return Response.json({ error: 'Unauthorized.' }, { status: 401 });
	}

	const proRequired = await requireProUser(session.user.id);
	if (proRequired) return proRequired;

	const body = (await request.json().catch(() => null)) as {
		name?: unknown;
		size?: unknown;
		type?: unknown;
		hash?: unknown;
	} | null;

	const name = typeof body?.name === 'string' ? body.name.slice(0, 255) : '';
	const size = typeof body?.size === 'number' ? body.size : Number.NaN;
	const type = typeof body?.type === 'string' ? body.type : '';

	const error = validateDocumentInput({ name, size, type });
	if (error) {
		return Response.json({ error }, { status: 400 });
	}

	if (!isValidDocumentHash(body?.hash)) {
		return Response.json({ error: 'Geçersiz dosya.' }, { status: 400 });
	}
	const hash = body.hash;

	// Reject a file the user already uploaded before handing out a URL, so the
	// duplicate never reaches R2.
	const [duplicate] = await db
		.select({ name: document.name })
		.from(document)
		.where(
			and(eq(document.userId, session.user.id), eq(document.hash, hash)),
		)
		.limit(1);

	if (duplicate) {
		return Response.json(
			{ error: duplicateDocumentMessage(duplicate.name), code: 'duplicate' },
			{ status: 409 },
		);
	}

	const count = await db.$count(
		document,
		eq(document.userId, session.user.id),
	);

	if (count >= MAX_DOCUMENT_COUNT) {
		return Response.json(
			{ error: `En fazla ${MAX_DOCUMENT_COUNT} belge yükleyebilirsiniz.` },
			{ status: 409 },
		);
	}

	const id = crypto.randomUUID();
	const key = buildDocumentKey(session.user.id, id);
	const uploadUrl = await createUploadUrl(key, type);

	return Response.json({ id, key, uploadUrl });
}
