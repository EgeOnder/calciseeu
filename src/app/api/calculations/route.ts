import { and, desc, eq, inArray } from 'drizzle-orm';
import { headers } from 'next/headers';
import { after } from 'next/server';

import { db } from '@/src/db';
import {
	calculation,
	document,
	type CalculationData,
	type CalculationType,
} from '@/src/db/schema';
import { auth } from '@/src/lib/auth';
import { runDocumentAnalysis } from '@/src/lib/document-analysis';
import { MAX_DOCUMENT_COUNT } from '@/src/lib/documents';

const CALCULATION_TYPES: CalculationType[] = ['manual', 'automatic'];

/** Lists the signed-in user's saved calculations, newest first. */
export async function GET() {
	const session = await auth.api
		.getSession({ headers: await headers() })
		.catch(() => null);

	if (!session) {
		return Response.json({ error: 'Unauthorized.' }, { status: 401 });
	}

	const calculations = await db
		.select({
			id: calculation.id,
			type: calculation.type,
			title: calculation.title,
			iseeu: calculation.iseeu,
			createdAt: calculation.createdAt,
		})
		.from(calculation)
		.where(eq(calculation.userId, session.user.id))
		.orderBy(desc(calculation.createdAt));

	return Response.json({ calculations });
}

/** Saves a calculation tied to the signed-in user. */
export async function POST(request: Request) {
	const session = await auth.api
		.getSession({ headers: await headers() })
		.catch(() => null);

	if (!session) {
		return Response.json({ error: 'Unauthorized.' }, { status: 401 });
	}

	const body = (await request.json().catch(() => null)) as {
		type?: unknown;
		title?: unknown;
		iseeu?: unknown;
		data?: unknown;
	} | null;

	const type = CALCULATION_TYPES.includes(body?.type as CalculationType)
		? (body?.type as CalculationType)
		: null;
	const title =
		typeof body?.title === 'string' ? body.title.trim().slice(0, 200) : '';
	const iseeu = typeof body?.iseeu === 'number' ? body.iseeu : 0;
	const submittedData = body?.data as CalculationData | undefined;

	if (
		!type ||
		!title ||
		!submittedData ||
		typeof submittedData !== 'object'
	) {
		return Response.json(
			{ error: 'Invalid calculation payload.' },
			{ status: 400 },
		);
	}

	let data = submittedData;
	let automaticDocumentIds: string[] = [];
	if (type === 'automatic') {
		const submittedDocuments = submittedData.automatic?.documents;
		if (!Array.isArray(submittedDocuments)) {
			return Response.json(
				{ error: 'Automatic calculations require documents.' },
				{ status: 400 },
			);
		}
		automaticDocumentIds = submittedDocuments
			.map((item) => item?.id)
			.filter((id): id is string => typeof id === 'string');
		if (
			automaticDocumentIds.length === 0 ||
			automaticDocumentIds.length !== submittedDocuments.length ||
			new Set(automaticDocumentIds).size !== automaticDocumentIds.length ||
			automaticDocumentIds.length > MAX_DOCUMENT_COUNT
		) {
			return Response.json(
				{ error: 'Invalid document list.' },
				{ status: 400 },
			);
		}

		const ownedDocuments = await db
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
					inArray(document.id, automaticDocumentIds),
				),
			);
		if (ownedDocuments.length !== automaticDocumentIds.length) {
			return Response.json(
				{ error: 'One or more documents were not found.' },
				{ status: 404 },
			);
		}

		const byId = new Map(
			ownedDocuments.map((ownedDocument) => [
				ownedDocument.id,
				ownedDocument,
			]),
		);
		data = {
			...submittedData,
			automatic: {
				documents: automaticDocumentIds.map((id) => byId.get(id)!),
				messages: [],
				parameters: [],
			},
		};
	}

	const id = crypto.randomUUID();
	await db.insert(calculation).values({
		id,
		userId: session.user.id,
		type,
		title,
		iseeu,
		data,
	});

	if (automaticDocumentIds.length > 0) {
		const userId = session.user.id;
		after(async () => {
			await Promise.all(
				automaticDocumentIds.map((documentId) =>
					runDocumentAnalysis(documentId, userId),
				),
			);
		});
	}

	return Response.json({ id }, { status: 201 });
}
