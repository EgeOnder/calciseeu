import { and, eq, sql } from 'drizzle-orm';
import { headers } from 'next/headers';

import { db } from '@/src/db';
import { calculation } from '@/src/db/schema';
import { auth } from '@/src/lib/auth';

/**
 * Lists the signed-in user's saved calculations that reference a given
 * document, so the UI can warn before deleting that those calculations will be
 * affected. Matches on the document id inside the calculation's stored
 * `data.automatic.documents` array via a jsonb containment query.
 */
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
	const contains = JSON.stringify({
		automatic: { documents: [{ id }] },
	});

	const calculations = await db
		.select({ id: calculation.id, title: calculation.title })
		.from(calculation)
		.where(
			and(
				eq(calculation.userId, session.user.id),
				sql`${calculation.data} @> ${contains}::jsonb`,
			),
		)
		.orderBy(calculation.title);

	return Response.json({ calculations });
}
