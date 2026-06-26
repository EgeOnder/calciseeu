'use client';

import { useState } from 'react';
import { GoogleLogoIcon } from '@phosphor-icons/react';

import { authClient } from '@/src/lib/auth-client';
import { Button } from '@/src/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/src/components/ui/dialog';

type LoginPromptDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title?: string;
	description?: string;
};

export function LoginPromptDialog({
	open,
	onOpenChange,
	title = 'Devam etmek için giriş yapın',
	description = 'Bu işlemi hesabınızla ilişkilendirebilmek için önce giriş yapmanız gerekir.',
}: LoginPromptDialogProps) {
	const [signingIn, setSigningIn] = useState(false);

	const signIn = async () => {
		if (signingIn) return;
		setSigningIn(true);
		try {
			const response = await authClient.signIn.social({
				provider: 'google',
			});
			if (response?.error) setSigningIn(false);
		} catch {
			setSigningIn(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						className="w-full"
						disabled={signingIn}
						loading={signingIn}
						onClick={signIn}
					>
						{!signingIn && <GoogleLogoIcon weight="bold" />}
						Google ile giriş yap
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
