import { ChartLineUp, Vault } from '@phosphor-icons/react';

import { useStore } from '@/src/lib/store';
import { formatEur } from '@/src/lib/iseeu';
import { Label } from '../components/ui/label';
import { MoneyInput, InfoTip, AnimatedNumber } from '@/src/components/shared';

export function MovableStep() {
	const { state, dispatch, result } = useStore();

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<h2 className="font-heading text-xl font-semibold tracking-tight">
					Taşınır varlıklar · ISP (1/2)
				</h2>
				<p className="text-sm text-muted-foreground">
					Tüm hane üyelerinin banka ve yatırım varlıklarının{' '}
					<span className="font-medium text-foreground">
						31 Aralık
					</span>{' '}
					tarihli toplamını girin.
				</p>
			</div>

			<div className="space-y-4 rounded-xl border border-border bg-card p-4">
				<div className="space-y-1.5">
					<Label
						htmlFor="bank"
						className="flex flex-wrap items-center gap-1.5 text-sm"
					>
						<Vault
							weight="duotone"
							className="size-4.5 text-foreground/70"
						/>
						Banka & posta hesapları
						<InfoTip text="Yalnızca 31.12.2024 tarihindeki bakiyeyi girin. Ortak hesaplarda yalnızca kişinin payını ekleyin." />
					</Label>
					<MoneyInput
						id="bank"
						currency={state.currency}
						value={state.movableBank}
						onChange={(n) =>
							dispatch({
								type: 'patch',
								patch: { movableBank: n },
							})
						}
					/>
				</div>

				<div className="space-y-1.5">
					<Label
						htmlFor="inv"
						className="flex flex-wrap items-center gap-1.5 text-sm"
					>
						<ChartLineUp
							weight="duotone"
							className="size-4.5 text-foreground/70"
						/>
						Yatırım & menkul kıymet
						<InfoTip text="Fon, hisse, tahvil, finansal portföy, sigorta birikimleri ve şirket payları — 31 Aralık değeriyle." />
					</Label>
					<MoneyInput
						id="inv"
						currency={state.currency}
						value={state.movableInvestments}
						onChange={(n) =>
							dispatch({
								type: 'patch',
								patch: { movableInvestments: n },
							})
						}
					/>
				</div>
			</div>

			{/* Franchise breakdown */}
			<div className="space-y-2 rounded-xl bg-muted/50 p-4 text-sm">
				<Row
					label="Toplam taşınır varlık (€)"
					value={formatEur(result.movableTotalEur)}
				/>
				<Row
					label={`Muafiyet / franchise (${result.size} kişi)`}
					value={`− ${formatEur(result.movableFranchiseEur)}`}
				/>
				<div className="my-1 h-px bg-border" />
				<div className="flex items-center justify-between font-medium">
					<span>Taşınır ISP</span>
					<AnimatedNumber
						value={result.movableIsp}
						format={(n) => formatEur(n)}
						className="font-heading text-base tabular-nums"
					/>
				</div>
			</div>
		</div>
	);
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between text-muted-foreground">
			<span>{label}</span>
			<span className="tabular-nums text-foreground">{value}</span>
		</div>
	);
}
