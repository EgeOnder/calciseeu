import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';

import { db } from '@/src/db';
import * as schema from '@/src/db/schema';

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL,
	secret: process.env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema,
	}),
	user: {
		additionalFields: {
			isPro: {
				type: 'boolean',
				required: true,
				defaultValue: false,
				input: false,
			},
		},
	},
	session: {
		cookieCache: {
			// Serve the session from a short-lived signed cookie so server-side
			// `getSession` (used to prefetch for SSR) avoids a DB round-trip.
			enabled: true,
			maxAge: 5 * 60,
		},
	},
	emailAndPassword: {
		enabled: true,
	},
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID as string,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
		},
	},
});
