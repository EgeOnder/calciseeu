'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { authClient } from './auth-client';

export type AppSession = {
	user: {
		name: string;
		email: string;
		image?: string | null;
		isPro: boolean;
	};
} | null;

const InitialSessionContext = createContext<AppSession>(null);

/** Seeds the auth state resolved on the server so the first client paint
 * already knows whether the user is signed in (no loading flash / shift). */
export function SessionProvider({
	initialSession,
	children,
}: {
	initialSession: AppSession;
	children: ReactNode;
}) {
	return (
		<InitialSessionContext.Provider value={initialSession}>
			{children}
		</InitialSessionContext.Provider>
	);
}

/** Like `authClient.useSession`, but falls back to the server-resolved session
 * while the client request is still pending, so consumers never render a
 * transitional "logged out" state on reload. */
export function useAppSession(): { session: AppSession; isPending: boolean } {
	const initialSession = useContext(InitialSessionContext);
	const { data, isPending } = authClient.useSession();

	if (isPending) {
		return { session: initialSession, isPending: false };
	}

	const user = (data as { user?: NonNullable<AppSession>['user'] } | null)
		?.user;

	const session: AppSession = user
		? {
				user: {
					name: user.name,
					email: user.email,
					image: user.image,
					isPro: user.isPro ?? false,
				},
			}
		: null;

	return { session, isPending: false };
}
