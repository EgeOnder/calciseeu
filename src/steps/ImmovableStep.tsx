import { AnimatePresence, motion } from 'motion/react';
import { House, Plus, Trash, MapTrifold } from '@phosphor-icons/react';

import { useStore, makeProperty } from '@/src/lib/store';
import { formatEur, propertyIspEur, type Property } from '@/src/lib/iseeu';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
	MoneyInput,
	PlainNumberInput,
	InfoTip,
	AnimatedNumber,
	LegalNotice,
} from '@/src/components/shared';

function PropertyCard({ p, index }: { p: Property; index: number }) {
	const { state, dispatch } = useStore();
	const update = (patch: Partial<Property>) =>
		dispatch({ type: 'updateProperty', id: p.id, patch });
	const isp = propertyIspEur(p, state.exchangeRate);

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: -8 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.97 }}
			transition={{ ease: [0.16, 1, 0.3, 1] }}
			className="space-y-4 rounded-xl border border-border bg-card p-4"
		>
			<div className="flex items-center gap-2">
				{p.kind === 'building' ? (
					<House
						weight="duotone"
						className="size-4.5 text-foreground/70"
					/>
				) : (
					<MapTrifold
						weight="duotone"
						className="size-4.5 text-foreground/70"
					/>
				)}
				<Input
					value={p.label}
					placeholder={`Taşınmaz ${index + 1}`}
					onChange={(e) => update({ label: e.target.value })}
					className="h-7 flex-1 border-0 bg-transparent px-1 focus-visible:ring-0"
				/>
				<Button
					size="icon-sm"
					variant="ghost"
					aria-label="Taşınmazı kaldır"
					onClick={() =>
						dispatch({ type: 'removeProperty', id: p.id })
					}
				>
					<Trash />
				</Button>
			</div>

			{/* Kind */}
			<RadioGroup
				value={p.kind}
				onValueChange={(v) => update({ kind: v as Property['kind'] })}
				className="grid grid-cols-2 gap-2"
			>
				{(['building', 'land'] as const).map((k) => (
					<label
						key={k}
						className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm transition-colors ${
							p.kind === k
								? 'border-primary/40 bg-primary/4'
								: 'border-border hover:bg-muted/40'
						}`}
						onClick={() => update({ kind: k })}
					>
						<RadioGroupItem value={k} />
						{k === 'building' ? 'Bina / konut' : 'Arsa / arazi'}
					</label>
				))}
			</RadioGroup>

			{/* Valuation */}
			{p.kind === 'building' && !p.useManualValue ? (
				<div className="space-y-1.5">
					<Label className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
						Bina yüzölçümü (m²)
						<InfoTip text="Yurt dışı binalar için CAF çoğunlukla 500 €/m² konvansiyonel değer kullanır. Arsa alanını değil, binanın/bağımsız bölümün m²'sini girin." />
					</Label>
					<PlainNumberInput
						suffix="m²"
						value={p.areaSqm}
						onChange={(n) => update({ areaSqm: n })}
					/>
					<p className="text-[11px] text-muted-foreground">
						≈ 500 €/m² ile değerlenir.
					</p>
				</div>
			) : (
				<div className="space-y-1.5">
					<Label className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
						Taşınmaz değeri ({state.currency})
						<InfoTip text="Arsa/arazi için m² konvansiyonu yoktur; tapu veya belediye belgesindeki değeri girin." />
					</Label>
					<MoneyInput
						currency={state.currency}
						value={p.manualValue}
						onChange={(n) => update({ manualValue: n })}
					/>
				</div>
			)}

			{p.kind === 'building' && (
				<label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
					<Switch
						checked={p.useManualValue}
						onCheckedChange={(c) => update({ useManualValue: c })}
						size="sm"
					/>
					m² yerine değeri elle gireceğim
				</label>
			)}

			<div className="space-y-1.5">
				<Label className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
					Sahiplik oranı
					<InfoTip text="Yalnızca hane üyesinin payı sayılır. Örn. 1/2 sahiplikte 50 girin." />
				</Label>
				<PlainNumberInput
					suffix="%"
					value={p.ownershipPct}
					onChange={(n) => update({ ownershipPct: Math.min(100, n) })}
				/>
			</div>

			<label className="flex cursor-pointer flex-wrap items-center gap-x-1.5 gap-y-1.5 rounded-lg bg-muted/50 px-3 py-2">
				<span className="text-sm">Ana konut mu?</span>
				<InfoTip text="Hane bu evde yaşıyorsa ana konuttur: değer ≤ 52.500 € ise ISP etkisi 0 olabilir; eşiği aşarsa aşan kısmın 2/3'ü sayılır." />
				<Switch
					className="ml-auto"
					checked={p.isMainResidence}
					onCheckedChange={(c) => update({ isMainResidence: c })}
				/>
			</label>

			<div className="flex items-center justify-between border-t border-border pt-3 text-sm">
				<span className="text-muted-foreground">
					Bu taşınmazın ISP katkısı
				</span>
				<span className="font-heading font-semibold tabular-nums">
					{formatEur(isp)}
				</span>
			</div>
		</motion.div>
	);
}

export function ImmovableStep() {
	const { state, dispatch, result } = useStore();

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<h2 className="font-heading text-xl font-semibold tracking-tight">
					Taşınmaz varlıklar · ISP (2/2)
				</h2>
				<p className="text-sm text-muted-foreground">
					Ev, arsa ve arazileri ekleyin. Taşınmaz yoksa bu adımı boş
					bırakabilirsiniz.
				</p>
			</div>

			<LegalNotice title="Dikkat">
				Arsa alanını binanın m²&apos;si sanmak veya yalnızca yerel vergi
				değerini kullanıp CAF&apos;ın 500 €/m² değerleme ihtimalini göz
				ardı etmek sık yapılan hatalardır. Nihai değerleme CAF&apos;a
				bağlıdır.
			</LegalNotice>

			<div className="space-y-3">
				<AnimatePresence initial={false}>
					{state.properties.map((p, i) => (
						<PropertyCard key={p.id} p={p} index={i} />
					))}
				</AnimatePresence>
			</div>

			<Button
				variant="outline"
				className="w-full"
				onClick={() =>
					dispatch({ type: 'addProperty', property: makeProperty() })
				}
			>
				<Plus /> Taşınmaz ekle
			</Button>

			<div className="flex items-center justify-between rounded-xl bg-primary/5 p-4 ring-1 ring-primary/10">
				<span className="text-sm font-medium">
					Taşınmaz ISP toplamı
				</span>
				<AnimatedNumber
					value={result.immovableIsp}
					format={(n) => formatEur(n)}
					className="font-heading text-lg font-semibold tabular-nums"
				/>
			</div>
		</div>
	);
}
