import {
	Buildings,
	CaretRight,
	ChartLineUp,
	CurrencyEur,
	GearIcon,
	Info,
	UsersThree,
	Vault,
} from '@phosphor-icons/react';

import { useStore } from '@/src/lib/store';
import {
	DEFAULT_TRY_RATE,
	formatEur,
	formatNumber,
	memberIncome,
	propertyIspEur,
	type Member,
	type MemberRole,
	type Property,
} from '@/src/lib/iseeu';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from './ui/collapsible';
import { motion } from 'motion/react';
import { useState } from 'react';

const roleLabels: Record<MemberRole, string> = {
	student: 'Öğrenci',
	parent: 'Ebeveyn',
	sibling: 'Kardeş',
	other: 'Diğer',
};

const parentStatusLabels = {
	married: 'Evli / birlikte',
	divorced: 'Boşanmış / yasal ayrılık',
	unmarried: 'Evli değil / birlikte değil',
} as const;

const incomeFields: {
	key: keyof Pick<
		Member,
		'salary' | 'pension' | 'selfEmployment' | 'rentalIncome' | 'otherIncome'
	>;
	label: string;
}[] = [
	{ key: 'salary', label: 'Maaş' },
	{ key: 'pension', label: 'Emekli aylığı' },
	{ key: 'selfEmployment', label: 'Serbest meslek' },
	{ key: 'rentalIncome', label: 'Kira geliri' },
	{ key: 'otherIncome', label: 'Diğer gelir' },
];

function formatLocal(amount: number, currency: string) {
	if (!amount) return `0 ${currency}`;
	return `${new Intl.NumberFormat('tr-TR', {
		maximumFractionDigits: 2,
	}).format(amount)} ${currency}`;
}

function DecisionRow({
	label,
	value,
}: {
	label: string;
	value: React.ReactNode;
}) {
	return (
		<div className="flex items-start justify-between gap-3 py-1.5 text-sm">
			<span className="min-w-0 text-muted-foreground">{label}</span>
			<span className="max-w-[58%] text-right font-medium text-foreground">
				{value}
			</span>
		</div>
	);
}

function Section({
	icon,
	title,
	children,
}: {
	icon: React.ReactNode;
	title: string;
	children: React.ReactNode;
}) {
	const [open, setOpen] = useState(true);

	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			<section>
				<CollapsibleTrigger className="mb-2.5 flex w-full items-center gap-2 text-left text-sm font-semibold outline-none transition-transform duration-150 ease-out active:scale-[0.99]">
					{icon}
					<span>{title}</span>
					<motion.span
						aria-hidden
						className="ml-auto text-muted-foreground"
						initial={false}
						animate={{ rotate: open ? 90 : 0 }}
						transition={{
							duration: 0.16,
							ease: [0.23, 1, 0.32, 1],
						}}
					>
						<CaretRight className="size-3.5" />
					</motion.span>
				</CollapsibleTrigger>
				<CollapsibleContent
					keepMounted
					render={
						<motion.div
							className="overflow-hidden"
							initial={false}
							animate={{
								height: open ? 'auto' : 0,
								opacity: open ? 1 : 0,
							}}
							transition={{
								height: {
									duration: 0.2,
									ease: [0.23, 1, 0.32, 1],
								},
								opacity: {
									duration: open ? 0.16 : 0.12,
									ease: 'easeOut',
								},
							}}
						/>
					}
				>
					<div className="space-y-1 pb-1">{children}</div>
				</CollapsibleContent>
			</section>
		</Collapsible>
	);
}

function EmptyState() {
	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2 pb-1 text-sm font-medium">
				<Info className="size-4" />
				Henüz bilgi girilmedi
			</div>
			<p className="text-sm leading-relaxed text-muted-foreground">
				Seçim yaptıkça veya tutar girdikçe özet burada kısa başlıklar
				halinde oluşacak.
			</p>
		</div>
	);
}

function MemberIncomeSummary({ member }: { member: Member }) {
	const { state } = useStore();
	const income = memberIncome(member, state.exchangeRate);
	const filledFields = incomeFields.filter((field) => member[field.key] > 0);

	return (
		<div className="rounded-lg bg-muted/45 px-3 py-2.5">
			<div className="flex items-center justify-between gap-3">
				<div className="min-w-0">
					<div className="truncate text-sm font-medium">
						{member.name || 'İsimsiz üye'}
					</div>
					<div className="text-[11px] text-muted-foreground">
						{roleLabels[member.role]}
					</div>
				</div>
				<div className="shrink-0 text-right text-xs">
					<div className="font-medium tabular-nums">
						{formatEur(income.netEur)}
					</div>
					<div className="text-muted-foreground">net</div>
				</div>
			</div>
			<div className="mt-2 space-y-1">
				{filledFields.map((field) => (
					<div
						key={field.key}
						className="flex items-center justify-between gap-3 text-xs"
					>
						<span className="text-muted-foreground">
							{field.label}
						</span>
						<span className="tabular-nums">
							{formatLocal(member[field.key], state.currency)}
						</span>
					</div>
				))}
				{income.deductionEur > 0 && (
					<div className="flex items-center justify-between gap-3 text-xs">
						<span className="text-muted-foreground">
							Uygulanan kesinti
						</span>
						<span className="tabular-nums">
							{formatEur(income.deductionEur, true)}
						</span>
					</div>
				)}
			</div>
		</div>
	);
}

function PropertySummary({
	property,
	index,
}: {
	property: Property;
	index: number;
}) {
	const { state } = useStore();
	const valuation =
		property.kind === 'building' && !property.useManualValue
			? `${formatNumber(property.areaSqm)} m² × 500 €`
			: formatLocal(property.manualValue, state.currency);

	return (
		<div className="rounded-lg bg-muted/45 px-3 py-2.5">
			<div className="flex items-center justify-between gap-3">
				<div className="min-w-0">
					<div className="truncate text-sm font-medium">
						{property.label || `Taşınmaz ${index + 1}`}
					</div>
					<div className="text-[11px] text-muted-foreground">
						{property.kind === 'building'
							? 'Bina / konut'
							: 'Arsa / arazi'}
					</div>
				</div>
				<div className="shrink-0 text-right text-xs font-medium tabular-nums">
					{formatEur(propertyIspEur(property, state.exchangeRate))}
				</div>
			</div>
			<div className="mt-2 space-y-1 text-xs">
				{(property.areaSqm > 0 || property.manualValue > 0) && (
					<div className="flex items-center justify-between gap-3">
						<span className="text-muted-foreground">Değerleme</span>
						<span className="text-right tabular-nums">
							{valuation}
						</span>
					</div>
				)}
				{property.ownershipPct !== 100 && (
					<div className="flex items-center justify-between gap-3">
						<span className="text-muted-foreground">Sahiplik</span>
						<span className="tabular-nums">
							{formatNumber(property.ownershipPct)}%
						</span>
					</div>
				)}
				{property.isMainResidence && (
					<div className="flex items-center justify-between gap-3">
						<span className="text-muted-foreground">Ana konut</span>
						<span>Evet</span>
					</div>
				)}
			</div>
		</div>
	);
}

export function CalculationOverview({
	className = '',
}: {
	className?: string;
	step?: number;
}) {
	const { state, result } = useStore();
	const incomeMembers = state.members.filter((member) =>
		incomeFields.some((field) => member[field.key] > 0),
	);
	const totalMovable = state.movableBank + state.movableInvestments;
	const showSetup =
		state.currency !== 'TRY' || state.exchangeRate !== DEFAULT_TRY_RATE;
	const showHousehold =
		state.studentIndependent ||
		state.parentStatus !== 'married' ||
		state.members.length !== 3 ||
		state.members.some((member) => {
			if (member.role === 'student') return member.name !== 'Öğrenci';
			if (member.role !== 'parent') return true;
			return member.name !== 'Anne' && member.name !== 'Baba';
		});
	const showIncome = incomeMembers.length > 0;
	const showMovable = state.movableBank > 0 || state.movableInvestments > 0;
	const showImmovable = state.properties.length > 0;
	const showResult = result.iseeu > 0 || result.ispeu > 0;
	const hasContent =
		showSetup ||
		showHousehold ||
		showIncome ||
		showMovable ||
		showImmovable ||
		showResult;

	return (
		<aside
			className={`overflow-hidden overscroll-contain rounded-2xl border border-border bg-card text-card-foreground ${className}`}
			aria-label="Hesaplama genel bakış"
		>
			<div className="p-4 border-b border-border">
				<p className="text-xs font-medium text-muted-foreground">
					Hesaplama genel bakış
				</p>
			</div>
			<div className="space-y-4 p-4">
				{!hasContent && <EmptyState />}

				{showSetup && (
					<Section
						icon={<GearIcon className="size-4" />}
						title="Ayarlar"
					>
						{state.currency !== 'TRY' && (
							<DecisionRow
								label="Para birimi"
								value={state.currency}
							/>
						)}
						{state.exchangeRate !== DEFAULT_TRY_RATE && (
							<DecisionRow
								label="EUR kuru"
								value={state.exchangeRate}
							/>
						)}
					</Section>
				)}

				{showHousehold && (
					<Section
						icon={<UsersThree className="size-4" />}
						title="Hane"
					>
						<DecisionRow
							label="Öğrenci bağımsızlığı"
							value={
								state.studentIndependent
									? 'Bağımsız'
									: 'Bağımlı'
							}
						/>
						{!state.studentIndependent && (
							<DecisionRow
								label="Ebeveyn durumu"
								value={parentStatusLabels[state.parentStatus]}
							/>
						)}
						<DecisionRow
							label="Hane büyüklüğü"
							value={`${result.size} kişi`}
						/>
						<div className="mt-2 flex flex-wrap gap-1.5">
							{state.members.map((member) => (
								<span
									key={member.id}
									className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
								>
									{member.name || 'İsimsiz'} ·{' '}
									{roleLabels[member.role]}
								</span>
							))}
						</div>
					</Section>
				)}

				{showIncome && (
					<Section
						icon={<CurrencyEur className="size-4" />}
						title="Gelirler"
					>
						<div className="space-y-2">
							{incomeMembers.map((member) => (
								<MemberIncomeSummary
									key={member.id}
									member={member}
								/>
							))}
						</div>
						<DecisionRow
							label="Toplam ISR"
							value={formatEur(result.isr)}
						/>
					</Section>
				)}

				{showMovable && (
					<Section
						icon={<Vault className="size-4" />}
						title="Taşınır"
					>
						{state.movableBank > 0 && (
							<DecisionRow
								label="Banka & posta"
								value={formatLocal(
									state.movableBank,
									state.currency,
								)}
							/>
						)}
						{state.movableInvestments > 0 && (
							<DecisionRow
								label="Yatırımlar"
								value={formatLocal(
									state.movableInvestments,
									state.currency,
								)}
							/>
						)}
						{state.movableBank > 0 &&
							state.movableInvestments > 0 && (
								<DecisionRow
									label="Girilen toplam"
									value={formatLocal(
										totalMovable,
										state.currency,
									)}
								/>
							)}
						{result.movableIsp > 0 && (
							<DecisionRow
								label="Muafiyet sonrası ISP"
								value={formatEur(result.movableIsp)}
							/>
						)}
					</Section>
				)}

				{showImmovable && (
					<Section
						icon={<Buildings className="size-4" />}
						title="Taşınmaz"
					>
						<div className="space-y-2">
							{state.properties.map((property, index) => (
								<PropertySummary
									key={property.id}
									property={property}
									index={index}
								/>
							))}
						</div>
						{result.immovableIsp > 0 && (
							<DecisionRow
								label="Taşınmaz ISP"
								value={formatEur(result.immovableIsp)}
							/>
						)}
					</Section>
				)}

				{showResult && (
					<Section
						icon={<ChartLineUp className="size-4" />}
						title="Tahmini sonuç"
					>
						<div className="rounded-xl bg-primary p-3 text-primary-foreground">
							<div className="flex items-center justify-between gap-3">
								<span className="text-sm text-primary-foreground/70">
									ISEEU tahmini
								</span>
								<CaretRight className="size-4 shrink-0" />
							</div>
							<div className="mt-1 font-heading text-2xl font-semibold tabular-nums">
								{formatEur(result.iseeu, true)}
							</div>
						</div>
						<DecisionRow
							label="ISPEU tahmini"
							value={formatEur(result.ispeu)}
						/>
						<DecisionRow
							label="ISE"
							value={formatEur(result.ise)}
						/>
						<DecisionRow
							label="ISP"
							value={formatEur(result.isp)}
						/>
					</Section>
				)}
			</div>
		</aside>
	);
}
