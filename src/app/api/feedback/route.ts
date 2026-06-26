import { headers } from 'next/headers';

import { db } from '@/src/db';
import { feedback } from '@/src/db/schema';
import { auth } from '@/src/lib/auth';

export async function POST(request: Request) {
	const body = (await request.json().catch(() => null)) as {
		message?: unknown;
		path?: unknown;
	} | null;
	const message = typeof body?.message === 'string' ? body.message.trim() : '';

	if (!message) {
		return Response.json(
			{ error: 'Feedback message is required.' },
			{ status: 400 },
		);
	}

	if (message.length > 4000) {
		return Response.json(
			{ error: 'Feedback message is too long.' },
			{ status: 400 },
		);
	}

	const requestHeaders = await headers();
	const session = await auth.api
		.getSession({
			headers: requestHeaders,
		})
		.catch(() => null);

	await db.insert(feedback).values({
		id: crypto.randomUUID(),
		message,
		path: typeof body?.path === 'string' ? body.path.slice(0, 500) : null,
		userAgent: request.headers.get('user-agent'),
		userId: session?.user.id ?? null,
	});

	return Response.json({ ok: true });
}
