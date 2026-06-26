'use client';

import { AnimatePresence, motion } from 'motion/react';
import { UploadSimpleIcon } from '@phosphor-icons/react';

import {
	DOCUMENT_ACCEPT_LABEL,
	MAX_DOCUMENT_COUNT,
	MAX_DOCUMENT_SIZE,
} from '@/src/lib/documents';
import { formatBytes } from '@/src/hooks/use-file-upload';

/**
 * Full-content drop indication shown while files are dragged over the page.
 * Positioned to hug the content viewport, clearing the fixed sidebar on the
 * left so it matches the "everything except the sidebar" drop area.
 */
export function PageUploadOverlay({ active }: { active: boolean }) {
	return (
		<AnimatePresence>
			{active && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.15 }}
					className="pointer-events-none fixed inset-y-0 right-0 left-0 z-50 p-3 sm:p-4 md:left-64 lg:left-84"
				>
					<div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary bg-primary/5 text-center backdrop-blur-sm">
						<motion.span
							initial={{ scale: 0.9 }}
							animate={{ scale: 1 }}
							transition={{
								type: 'spring',
								stiffness: 380,
								damping: 18,
							}}
							className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary"
						>
							<UploadSimpleIcon className="size-8" />
						</motion.span>
						<div className="space-y-1 px-4">
							<p className="text-base font-medium">
								Yüklemek için bırakın
							</p>
							<p className="text-sm text-muted-foreground">
								{DOCUMENT_ACCEPT_LABEL} · dosya başına{' '}
								{formatBytes(MAX_DOCUMENT_SIZE)} · en fazla{' '}
								{MAX_DOCUMENT_COUNT} belge
							</p>
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
