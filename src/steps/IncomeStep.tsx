import { motion } from 'motion/react';
import { Coins } from '@phosphor-icons/react';

import { useStore } from '@/src/lib/store';
import { formatEur, memberIncome, type Member } from '@/src/lib/iseeu';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { MoneyInput, InfoTip, AnimatedNumber } from '@/src/components/shared';

const fields: {
	key: keyof Pick<
		Member,
		'salary' | 'pension' | 'selfEmployment' | 'rentalIncome' | 'otherIncome'
	>;
	label: string;
	tip?: string;
}[] = [
	{
		key: 'salary',
		label: 'Maaş / ücretli çalışma',
		tip: 'İş gelirlerine %20 kesinti uygulanabilir (kişi başı üst sınır 3.000 €).',
	},
	{
		key: 'pension',
		label: 'Emekli aylığı',
		tip: 'Emeklilik gelirlerine %20 kesinti uygulanabilir (kişi başı üst sınır 1.000 €).',
	},
	{ key: 'selfEmployment', label: 'Serbest meslek / işletme' },
	{ key: 'rentalIncome', label: 'Kira geliri' },
	{ key: 'otherIncome', label: 'Burs / yardım / diğer' },
];

export function IncomeStep() {
	const { state, dispatch, result } = useStore();

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<h2 className="font-heading text-xl font-semibold tracking-tight">
					Gelir göstergesi · ISR
				</h2>
				<p className="text-sm text-muted-foreground">
					Her hane üyesinin{' '}
					<span className="font-medium text-foreground">yıllık</span>{' '}
					gelirlerini {state.currency} cinsinden girin. Euroya çevirme
					ve kesintiler otomatik uygulanır.
				</p>
			</div>

			<Alert className="border-sky-500/25 bg-sky-500/5">
				<AlertTitle className="text-sky-700 dark:text-sky-400">
					Aylık değil, yıllık tutar girin
				</AlertTitle>
				<AlertDescription className="text-sky-700/80 dark:text-sky-300/80">
					Tüm tutarlar bir yılın (12 ay) toplamı olmalıdır. Örneğin
					aylık maaşı{' '}
					<span className="font-medium">12 ile çarpıp</span> yıllık
					brüt tutarı yazın.
				</AlertDescription>
			</Alert>

			<div className="space-y-4">
				{state.members.map((m) => {
					const inc = memberIncome(m, state.exchangeRate);
					return (
						<motion.div
							key={m.id}
							layout
							className="space-y-3 rounded-xl border border-border bg-card p-4"
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2 text-sm font-medium">
									<Coins
										weight="duotone"
										className="size-4.5 text-foreground/70"
									/>
									{m.name || 'İsimsiz üye'}
								</div>
								<div className="text-right text-xs text-muted-foreground">
									net:{' '}
									<span className="font-medium text-foreground tabular-nums">
										{formatEur(inc.netEur)}
									</span>
								</div>
							</div>
							<div className="grid gap-3 sm:grid-cols-2">
								{fields.map((f) => (
									<div key={f.key} className="space-y-1.5">
										<Label
											htmlFor={`${m.id}-${f.key}`}
											className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
										>
											{f.label}
											<span className="font-normal text-muted-foreground/60">
												· yıllık
											</span>
											{f.tip && <InfoTip text={f.tip} />}
										</Label>
										<MoneyInput
											id={`${m.id}-${f.key}`}
											currency={state.currency}
											placeholder="0"
											value={m[f.key]}
											onChange={(n) =>
												dispatch({
													type: 'updateMember',
													id: m.id,
													patch: { [f.key]: n },
												})
											}
										/>
									</div>
								))}
							</div>
							{inc.deductionEur > 0 && (
								<p className="text-xs text-muted-foreground">
									Uygulanan gelir kesintisi:{' '}
									<span className="font-medium text-foreground">
										{formatEur(inc.deductionEur, true)}
									</span>
								</p>
							)}
						</motion.div>
					);
				})}
			</div>

			<div className="flex items-center justify-between rounded-xl bg-primary/5 p-4 ring-1 ring-primary/10">
				<span className="text-sm font-medium">
					Toplam ISR (gelir göstergesi)
				</span>
				<AnimatedNumber
					value={result.isr}
					format={(n) => formatEur(n)}
					className="font-heading text-lg font-semibold tabular-nums"
				/>
			</div>
		</div>
	);
}
