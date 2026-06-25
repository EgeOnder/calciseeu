import { useState } from 'react';
import { motion } from 'motion/react';
import {
	Sparkle,
	ArrowCounterClockwise,
	ShareNetwork,
	DownloadSimple,
	CircleNotch,
} from '@phosphor-icons/react';

import { useStore } from '@/src/lib/store';
import { formatEur, formatNumber, type IseeuResult } from '@/src/lib/iseeu';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { AnimatedNumber, LegalNotice } from '@/src/components/shared';
import {
	renderShareCard,
	canShareImageFiles,
	shareImageFile,
	downloadImage,
} from '@/src/lib/shareImage';

function HeroCard({
	label,
	value,
	hint,
	delay,
	accent,
}: {
	label: string;
	value: number;
	hint: string;
	delay: number;
	accent?: boolean;
}) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 16, scale: 0.97 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={{ delay, type: 'spring', stiffness: 260, damping: 24 }}
			className={`relative overflow-hidden rounded-2xl p-5 ${
				accent
					? 'bg-primary text-primary-foreground'
					: 'bg-card text-card-foreground ring-1 ring-foreground/10'
			}`}
		>
			<div
				className={`text-xs font-medium uppercase tracking-wide ${
					accent
						? 'text-primary-foreground/70'
						: 'text-muted-foreground'
				}`}
			>
				{label}
			</div>
			<AnimatedNumber
				value={value}
				format={(n) => formatEur(n, true)}
				className="mt-1 block font-heading text-3xl font-semibold tracking-tight tabular-nums"
			/>
			<div
				className={`mt-1 text-xs ${accent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}
			>
				{hint}
			</div>
		</motion.div>
	);
}

function BreakdownRow({
	label,
	value,
	strong,
	formula,
}: {
	label: string;
	value: string;
	strong?: boolean;
	formula?: string;
}) {
	return (
		<div className="flex items-baseline justify-between gap-4 py-2">
			<div className="min-w-0">
				<div className={strong ? 'text-sm font-medium' : 'text-sm'}>
					{label}
				</div>
				{formula && (
					<div className="text-[11px] text-muted-foreground">
						{formula}
					</div>
				)}
			</div>
			<span
				className={`shrink-0 tabular-nums ${strong ? 'font-heading text-base font-semibold' : 'text-sm text-muted-foreground'}`}
			>
				{value}
			</span>
		</div>
	);
}

function ShareResult({ result }: { result: IseeuResult }) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [blob, setBlob] = useState<Blob | null>(null);
	const shareSupported = canShareImageFiles();

	const cleanup = (url: string | null) => {
		if (url) URL.revokeObjectURL(url);
	};

	const handleOpen = async () => {
		setOpen(true);
		setLoading(true);
		try {
			const isDark = document.documentElement.classList.contains('dark');
			const generated = await renderShareCard(result, isDark);
			const url = URL.createObjectURL(generated);
			setBlob(generated);
			setImageUrl((prev) => {
				cleanup(prev);
				return url;
			});
		} finally {
			setLoading(false);
		}
	};

	const handleOpenChange = (next: boolean) => {
		setOpen(next);
		if (!next) {
			cleanup(imageUrl);
			setImageUrl(null);
			setBlob(null);
		}
	};

	const handleShare = async () => {
		if (!blob) return;
		const shared = await shareImageFile(blob);
		if (!shared) downloadImage(blob);
	};

	return (
		<>
			<Button variant="outline" className="w-full" onClick={handleOpen}>
				<ShareNetwork /> Sonucu paylaş
			</Button>

			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Sonucunu paylaş</DialogTitle>
						<DialogDescription>
							Aşağıdaki görseli kaydedip dilediğin kişiyle
							paylaşabilirsin. Görsel yalnızca tahmini sonucu
							içerir.
						</DialogDescription>
					</DialogHeader>

					<div className="flex min-h-48 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40">
						{loading || !imageUrl ? (
							<CircleNotch className="size-6 animate-spin text-muted-foreground" />
						) : (
							<img
								src={imageUrl}
								alt="Tahmini ISEEU sonucu"
								className="h-auto w-full"
							/>
						)}
					</div>

					<DialogFooter>
						{shareSupported && (
							<Button onClick={handleShare} disabled={!blob}>
								<ShareNetwork /> Paylaş
							</Button>
						)}
						<Button
							variant={shareSupported ? 'outline' : 'default'}
							onClick={() => blob && downloadImage(blob)}
							disabled={!blob}
						>
							<DownloadSimple /> Görseli indir
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

export function ResultStep() {
	const { result, reset } = useStore();

	return (
		<div className="space-y-6">
			<LegalNotice title="Önemli — bu yalnızca bir tahmindir">
				Bu sonuç resmî değildir ve CAF hesaplamasının yerine geçmez.
				ISEEU Parificato&apos;nun son ve geçerli değerini üniversitenin
				onaylı CAF merkezi hesaplar. DSU&apos;da yalnızca ISEEU değil,{' '}
				<span className="font-medium">ISPEU limiti</span> de önemlidir.
				Başvuru sırasında Polimi DSU çağrısı ve onaylı CAF talimatları
				esas alınmalıdır.
			</LegalNotice>
			<div className="flex items-center gap-2">
				<motion.span
					initial={{ rotate: -20, scale: 0 }}
					animate={{ rotate: 0, scale: 1 }}
					transition={{ type: 'spring', stiffness: 300, damping: 15 }}
				>
					<Sparkle weight="fill" className="size-5 text-amber-500" />
				</motion.span>
				<h2 className="font-heading text-xl font-semibold tracking-tight">
					Tahmini sonucunuz
				</h2>
			</div>

			<div className="grid gap-3 sm:grid-cols-2">
				<HeroCard
					label="ISEEU (tahmini)"
					value={result.iseeu}
					hint="ISE ÷ eşdeğerlik katsayısı"
					delay={0.05}
					accent
				/>
				<HeroCard
					label="ISPEU (tahmini)"
					value={result.ispeu}
					hint="ISP ÷ eşdeğerlik katsayısı"
					delay={0.12}
				/>
			</div>

			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.2 }}
				className="divide-y divide-border rounded-xl border border-border bg-card px-4 py-1"
			>
				<BreakdownRow
					label="ISR — gelir göstergesi"
					value={formatEur(result.isr, true)}
					strong
				/>
				<BreakdownRow
					label="Taşınır ISP"
					value={formatEur(result.movableIsp, true)}
				/>
				<BreakdownRow
					label="Taşınmaz ISP"
					value={formatEur(result.immovableIsp, true)}
				/>
				<BreakdownRow
					label="ISP — varlık göstergesi"
					value={formatEur(result.isp, true)}
					strong
					formula="taşınır + taşınmaz"
				/>
				<BreakdownRow
					label="ISE"
					value={formatEur(result.ise, true)}
					strong
					formula="ISR + 0,20 × ISP"
				/>
				<BreakdownRow
					label="Eşdeğerlik katsayısı"
					value={formatNumber(result.coefficient)}
					formula={`${result.size} kişilik hane`}
				/>
			</motion.div>

			<div className="grid gap-2 sm:grid-cols-2">
				<ShareResult result={result} />
				<Button variant="ghost" className="w-full" onClick={reset}>
					<ArrowCounterClockwise /> Baştan başla
				</Button>
			</div>
		</div>
	);
}
