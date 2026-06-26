import { eq } from 'drizzle-orm';

import { db } from '@/src/db';
import { user } from '@/src/db/schema';

const PRO_REQUIRED_MESSAGE = 'Bu işlem için Pro üyelik gerekir.';

export async function isProUser(userId: string): Promise<boolean> {
	const [row] = await db
		.select({ isPro: user.isPro })
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);

	return row?.isPro === true;
}

export async function requireProUser(
	userId: string,
): Promise<Response | null> {
	if (await isProUser(userId)) return null;

	return Response.json(
		{ error: PRO_REQUIRED_MESSAGE, code: 'pro_required' },
		{ status: 403 },
	);
}
