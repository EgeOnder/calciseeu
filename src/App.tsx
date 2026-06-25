import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
	ArrowLeft,
	ArrowRight,
	Check,
	ArrowCounterClockwise,
} from '@phosphor-icons/react';

import { StoreProvider, useStore } from '@/src/lib/store';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { WelcomeStep } from '@/src/steps/WelcomeStep';
import { HouseholdStep } from '@/src/steps/HouseholdStep';
import { IncomeStep } from '@/src/steps/IncomeStep';
import { MovableStep } from '@/src/steps/MovableStep';
import { ImmovableStep } from '@/src/steps/ImmovableStep';
import { ResultStep } from '@/src/steps/ResultStep';

const steps = [
	{ id: 'welcome', short: 'Başlangıç', Component: WelcomeStep },
	{ id: 'household', short: 'Hane', Component: HouseholdStep },
	{ id: 'income', short: 'Gelir', Component: IncomeStep },
	{ id: 'movable', short: 'Taşınır', Component: MovableStep },
	{ id: 'immovable', short: 'Taşınmaz', Component: ImmovableStep },
	{ id: 'result', short: 'Sonuç', Component: ResultStep },
];

function Stepper({
	index,
	onJump,
}: {
	index: number;
	onJump: (i: number) => void;
}) {
	return (
		<div className="flex items-center">
			{steps.map((s, i) => {
				const done = i < index;
				const active = i === index;
				return (
					<div
						key={s.id}
						className="flex flex-1 items-center last:flex-none"
					>
						<button
							type="button"
							onClick={() => i <= index && onJump(i)}
							disabled={i > index}
							className="group flex flex-col items-center gap-1.5"
							aria-current={active ? 'step' : undefined}
						>
							<motion.span
								initial={false}
								animate={{
									scale: active ? 1.1 : 1,
									backgroundColor:
										done || active
											? 'var(--primary)'
											: 'var(--muted)',
									color:
										done || active
											? 'var(--primary-foreground)'
											: 'var(--muted-foreground)',
								}}
								transition={{
									type: 'spring',
									stiffness: 400,
									damping: 25,
								}}
								className="grid size-7 place-items-center rounded-full text-xs font-semibold"
							>
								{done ? (
									<motion.span
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										transition={{
											type: 'spring',
											stiffness: 500,
											damping: 18,
										}}
									>
										<Check
											weight="bold"
											className="size-3.5"
										/>
									</motion.span>
								) : (
									i + 1
								)}
							</motion.span>
							<span
								className={`hidden text-[11px] sm:block ${
									active
										? 'font-medium text-foreground'
										: 'text-muted-foreground'
								}`}
							>
								{s.short}
							</span>
						</button>
						{i < steps.length - 1 && (
							<div className="relative mx-1 h-0.5 flex-1 overflow-hidden rounded-full bg-muted sm:mb-5">
								<motion.div
									initial={false}
									animate={{ scaleX: done ? 1 : 0 }}
									transition={{
										ease: [0.16, 1, 0.3, 1],
										duration: 0.4,
									}}
									style={{ originX: 0 }}
									className="absolute inset-0 bg-primary"
								/>
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

function ResetButton() {
	const { reset } = useStore();
	const [open, setOpen] = useState(false);
	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger
				render={
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Hesaplamayı sıfırla"
						className="shrink-0 text-muted-foreground"
					/>
				}
			>
				<ArrowCounterClockwise />
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Hesaplamayı sıfırla?</AlertDialogTitle>
					<AlertDialogDescription>
						Girdiğiniz tüm veriler silinecek ve hesaplama en baştan
						başlayacak. Bu işlem geri alınamaz.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Vazgeç</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						onClick={() => {
							reset();
							setOpen(false);
						}}
					>
						Evet, sıfırla
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

function Wizard() {
	const { step, dir, go } = useStore();
	const index = Math.min(Math.max(step, 0), steps.length - 1);

	useEffect(() => {
		window.scrollTo({ top: 0, behavior: 'auto' });
	}, [index]);

	const Step = steps[index].Component;
	const isFirst = index === 0;
	const isLast = index === steps.length - 1;

	return (
		<div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4">
			<div className="sticky top-0 z-40 -mx-4 bg-transparent px-4 py-3.5 backdrop-blur-xl sm:py-4 md:bg-background md:backdrop-blur-none">
				<Stepper index={index} onJump={go} />
			</div>

			<main className="relative mt-8 flex-1">
				<AnimatePresence mode="wait" custom={dir} initial={false}>
					<motion.div
						key={steps[index].id}
						custom={dir}
						initial={{ opacity: 0, x: dir * 24 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: dir * -24 }}
						transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
					>
						<Step />
					</motion.div>
				</AnimatePresence>
			</main>

			<p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
				Bu araç eğitim amaçlıdır ve resmî CAF hesaplamasının yerine
				geçmez. Kurallar yıl ve üniversiteye göre değişebilir; nihai
				sonuç onaylı CAF tarafından belirlenir.
			</p>

			{/* Sticky, blurred bottom navigation */}
			<footer className="sticky bottom-0 z-40 -mx-4 mt-8 flex items-center justify-between gap-3 bg-transparent px-4 py-3 backdrop-blur-xl sm:py-3.5 md:bg-background md:backdrop-blur-none">
				<div className="flex items-center gap-1">
					{!isFirst && (
						<Button variant="ghost" onClick={() => go(index - 1)}>
							<ArrowLeft /> Geri
						</Button>
					)}
					<ResetButton />
				</div>
				{!isLast ? (
					<Button onClick={() => go(index + 1)} className="min-w-32">
						{isFirst ? 'Başla' : 'İleri'} <ArrowRight />
					</Button>
				) : (
					<span className="max-w-[55%] text-right text-xs text-muted-foreground">
						Sonuç yukarıda · istediğiniz adıma dönebilirsiniz
					</span>
				)}
			</footer>
		</div>
	);
}

// function useSystemTheme() {
// 	useEffect(() => {
// 		const mq = window.matchMedia('(prefers-color-scheme: dark)');
// 		const apply = () =>
// 			document.documentElement.classList.toggle('dark', mq.matches);
// 		apply();
// 		mq.addEventListener('change', apply);
// 		return () => mq.removeEventListener('change', apply);
// 	}, []);
// }

export default function App() {
	// useSystemTheme();
	return (
		<TooltipProvider delay={200}>
			<StoreProvider>
				<Wizard />
			</StoreProvider>
		</TooltipProvider>
	);
}
