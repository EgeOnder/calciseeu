'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import {
	ArrowLeftIcon,
	ArrowRightIcon,
	CheckIcon,
	ArrowCounterClockwiseIcon,
	TrashIcon,
} from '@phosphor-icons/react';

import { StoreProvider, useStore } from '@/src/lib/store';
import {
	deleteCalculation,
	setActiveCalculation,
	useActiveCalculationId,
	useCalculations,
} from '@/src/lib/calculations';
import { TooltipProvider } from '../components/ui/tooltip';
import { Button } from '../components/ui/button';
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
} from '../components/ui/alert-dialog';
import { Sidebar } from '../components/sidebar';
import { CalculationOverview } from '../components/calculation-overview';
import { AutomaticFlow } from '../components/automatic-flow';
import { OnboardingStep } from '@/src/steps/OnboardingStep';
import { WelcomeStep } from '@/src/steps/WelcomeStep';
import { HouseholdStep } from '@/src/steps/HouseholdStep';
import { IncomeStep } from '@/src/steps/IncomeStep';
import { MovableStep } from '@/src/steps/MovableStep';
import { ImmovableStep } from '@/src/steps/ImmovableStep';
import { ResultStep } from '@/src/steps/ResultStep';

type CalculatorMode = 'setup' | 'manual' | 'automatic';

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
		<div className="flex items-center ml-6 md:ml-0">
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
										<CheckIcon
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
				<ArrowCounterClockwiseIcon />
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
					<AlertDialogCancel size="default" variant="outline">
						Vazgeç
					</AlertDialogCancel>
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

function DeleteCalculationButton({ id }: { id: string }) {
	const { reset } = useStore();
	const router = useRouter();
	const [open, setOpen] = useState(false);

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger
				render={
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Kayıtlı hesaplamayı kaldır"
						className="shrink-0"
					/>
				}
			>
				<TrashIcon className="text-destructive" />
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						Kayıtlı hesaplamayı kaldır?
					</AlertDialogTitle>
					<AlertDialogDescription>
						Bu hesaplama kayıtlarınızdan kalıcı olarak silinecek. Bu
						işlem geri alınamaz.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel size="default" variant="outline">
						Vazgeç
					</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						onClick={async () => {
							const deleted = await deleteCalculation(id);
							if (!deleted) {
								toast.error('Hesaplama kaldırılamadı', {
									description: 'Lütfen tekrar deneyin.',
								});
								return;
							}
							setActiveCalculation(null);
							reset();
							setOpen(false);
							router.push('/');
							toast.success('Kayıtlı hesaplama kaldırıldı');
						}}
					>
						Evet, kaldır
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

// Mirrors the `?id=` query param into the shared calculations store so the
// sidebar can highlight the active item and the footer can offer delete.
function ActiveCalculationSync() {
	const id = useSearchParams().get('id');
	useEffect(() => {
		setActiveCalculation(id);
	}, [id]);
	return null;
}

// When opened with `?id=`, load that saved calculation and jump to the final
// step so the result and its overview are shown immediately. Lives in its own
// component so the `useSearchParams` Suspense requirement stays scoped.
function SavedCalculationLoader() {
	const { go, loadCalculation } = useStore();
	const id = useSearchParams().get('id');

	useEffect(() => {
		if (!id) return;

		let active = true;
		void (async () => {
			const response = await fetch(
				`/api/calculations/${encodeURIComponent(id)}`,
			).catch(() => null);
			if (!active || !response || !response.ok) return;
			const { calculation } = (await response.json()) as {
				calculation?: { data?: { state?: unknown; config?: unknown } };
			};
			const data = calculation?.data;
			if (!data?.state || !data?.config) return;
			loadCalculation(
				data.state as Parameters<typeof loadCalculation>[0],
				data.config as Parameters<typeof loadCalculation>[1],
			);
			go(steps.length - 1);
		})();

		return () => {
			active = false;
		};
	}, [id, loadCalculation, go]);

	return null;
}

function Wizard() {
	const { step, dir, go } = useStore();
	const activeId = useActiveCalculationId();
	const calculations = useCalculations();
	const savedActive =
		activeId != null && calculations.some((calc) => calc.id === activeId);
	const index = Math.min(Math.max(step, 0), steps.length - 1);

	useEffect(() => {
		window.scrollTo({ top: 0, behavior: 'auto' });
	}, [index]);

	const Step = steps[index].Component;
	const isFirst = index === 0;
	const isLast = index === steps.length - 1;

	return (
		<div className="mx-auto flex min-h-dvh flex-col">
			<div className="fixed top-0 right-0 left-0 z-40 border-b bg-background px-8 pt-[calc(0.875rem+env(safe-area-inset-top))] pb-3.5 backdrop-blur-xl sm:pt-[calc(1rem+env(safe-area-inset-top))] sm:pb-4 md:left-64 md:bg-background md:backdrop-blur-none lg:left-84">
				<Stepper index={index} onJump={go} />
			</div>

			<div className="flex flex-1 gap-6 px-4 pt-24 pb-28 sm:px-8 xl:items-start">
				<main className="relative min-w-0 flex-1 xl:mx-auto xl:max-w-3xl">
					<AnimatePresence mode="wait" custom={dir} initial={false}>
						<motion.div
							key={steps[index].id}
							custom={dir}
							initial={{ opacity: 0, x: dir * 24 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: dir * -24 }}
							transition={{
								duration: 0.28,
								ease: [0.16, 1, 0.3, 1],
							}}
						>
							<Step />
						</motion.div>
					</AnimatePresence>

					<p className="mt-8 text-[11px] leading-relaxed text-muted-foreground">
						Bu araç eğitim amaçlıdır ve resmî CAF hesaplamasının
						yerine geçmez. Kurallar yıl ve üniversiteye göre
						değişebilir; nihai sonuç onaylı CAF tarafından
						belirlenir.
					</p>
				</main>

				<div className="mt-8 hidden w-84 shrink-0 xl:block">
					<CalculationOverview
						step={index}
						className="fixed top-24 right-8 bottom-24 z-30 w-84 overflow-y-auto"
					/>
				</div>
			</div>

			<footer className="fixed right-0 bottom-0 left-0 z-40 flex items-center justify-between gap-3 border-t bg-transparent px-8 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl sm:pt-3.5 sm:pb-[calc(0.875rem+env(safe-area-inset-bottom))] md:left-64 md:bg-background md:backdrop-blur-none lg:left-84">
				<div className="flex items-center gap-1">
					{!isFirst && (
						<Button variant="ghost" onClick={() => go(index - 1)}>
							<ArrowLeftIcon /> Geri
						</Button>
					)}
					{savedActive && activeId ? (
						<DeleteCalculationButton id={activeId} />
					) : (
						<ResetButton />
					)}
				</div>
				{!isLast ? (
					<Button onClick={() => go(index + 1)} className="min-w-32">
						{isFirst ? 'Başla' : 'İleri'} <ArrowRightIcon />
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

function AutomaticCalculation() {
	return (
		<div className="mx-auto flex min-h-dvh flex-col">
			<div className="fixed top-0 right-0 left-0 z-40 border-b bg-background px-8 py-4 md:left-64 lg:left-84">
				<span className="ml-6 md:ml-0 text-sm font-medium">
					Yeni otomatik hesaplama
				</span>
			</div>

			<Suspense fallback={null}>
				<AutomaticFlow />
			</Suspense>
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

function AppBody({ mode }: { mode: CalculatorMode }) {
	return (
		<AnimatePresence mode="wait" initial={false}>
			{mode === 'manual' ? (
				<motion.div
					key="wizard"
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -8 }}
					transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
				>
					<Suspense fallback={null}>
						<SavedCalculationLoader />
					</Suspense>
					<Wizard />
				</motion.div>
			) : mode === 'automatic' ? (
				<motion.div
					key="automatic"
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -8 }}
					transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
				>
					<AutomaticCalculation />
				</motion.div>
			) : (
				<motion.div
					key="onboarding"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0, y: -8 }}
					transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
				>
					<OnboardingStep />
				</motion.div>
			)}
		</AnimatePresence>
	);
}

export default function Calculator({
	mode = 'setup',
}: {
	mode?: CalculatorMode;
}) {
	// useSystemTheme();
	return (
		<TooltipProvider delay={200}>
			<StoreProvider>
				<Suspense fallback={null}>
					<ActiveCalculationSync />
				</Suspense>
				<div className="min-h-dvh">
					<Sidebar />
					<div className="min-w-0 md:pl-64 lg:pl-84">
						<AppBody mode={mode} />
					</div>
				</div>
			</StoreProvider>
		</TooltipProvider>
	);
}
