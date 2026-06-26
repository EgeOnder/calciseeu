import { motion } from 'motion/react';
import { Calculator, Bank, Scales } from '@phosphor-icons/react';

import { useStore } from '@/src/lib/store';
import { DEFAULT_TRY_RATE } from '@/src/lib/iseeu';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { MoneyInput, InfoTip } from '@/src/components/shared';

const features = [
	{
		icon: Bank,
		title: 'Gelir & varlık',
		desc: 'Maaş, emeklilik, banka ve gayrimenkulü tek tek girersiniz.',
	},
	{
		icon: Calculator,
		title: 'Otomatik formül',
		desc: 'ISR, ISP, ISE ve eşdeğerlik katsayısı sizin için hesaplanır.',
	},
	{
		icon: Scales,
		title: 'Tahmini sonuç',
		desc: 'ISEEU ve ISPEU değerlerini anında tahmin olarak görürsünüz.',
	},
];

export function WelcomeStep() {
	const { state, dispatch } = useStore();
	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
					Manuel hesaplama
				</h1>
				<p className="text-muted-foreground">
					Manuel olarak ISEEU Parificato tahmini yapmak için önce para
					birimi ve döviz kurunu ayarlayın. Ardından gelir ve varlık
					bilgilerini girerek tahmini sonucu anında görün.
				</p>
			</div>

			<div className="grid gap-3 sm:grid-cols-3">
				{features.map((f, i) => (
					<motion.div
						key={f.title}
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							delay: 0.1 + i * 0.08,
							ease: [0.16, 1, 0.3, 1],
						}}
						className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/5"
					>
						<f.icon
							weight="duotone"
							className="mb-2 size-6 text-foreground/80"
						/>
						<div className="text-sm font-medium">{f.title}</div>
						<div className="mt-0.5 text-xs text-muted-foreground">
							{f.desc}
						</div>
					</motion.div>
				))}
			</div>

			<div className="space-y-4 rounded-xl border border-border bg-card p-4">
				<div className="text-sm font-medium">
					Para birimi ve döviz kuru
				</div>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label
							htmlFor="currency"
							className="flex flex-wrap items-center gap-1.5"
						>
							Para birimi
							<InfoTip text="Belgelerinizdeki yerel para birimi. Tüm tutarları bu birimde gireceksiniz." />
						</Label>
						<Input
							id="currency"
							value={state.currency}
							maxLength={4}
							onChange={(e) =>
								dispatch({
									type: 'patch',
									patch: {
										currency: e.target.value.toUpperCase(),
									},
								})
							}
							disabled
						/>
					</div>
					<div className="space-y-1.5">
						<Label
							htmlFor="rate"
							className="flex flex-wrap items-center gap-1.5"
						>
							1 EUR = ? {state.currency || '...'}
							<InfoTip text="İlgili yılın 31 Aralık resmi kuru kullanılır. 31.12.2024 için Banca d'Italia TRY referans kuru 1 EUR = 36,7372 TRY'dir." />
						</Label>
						<MoneyInput
							id="rate"
							currency={state.currency || '—'}
							value={state.exchangeRate}
							onChange={(n) =>
								dispatch({
									type: 'patch',
									patch: { exchangeRate: n },
								})
							}
						/>
						<button
							type="button"
							onClick={() =>
								dispatch({
									type: 'patch',
									patch: {
										currency: 'TRY',
										exchangeRate: DEFAULT_TRY_RATE,
									},
								})
							}
							className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
						>
							31.12.2024 TRY kurunu kullan (36,7372)
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
