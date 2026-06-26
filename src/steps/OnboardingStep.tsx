'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
	ArrowRightIcon,
	CalendarBlankIcon,
	CheckIcon,
	GraduationCapIcon,
	IdentificationCardIcon,
	SparkleIcon,
} from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import {
	useStore,
	DEFAULT_CONFIG,
	YEAR_OPTIONS,
	SCHOLARSHIP_OPTIONS,
	NATIONALITY_OPTIONS,
	type CalcConfig,
	type ConfigOption,
} from '@/src/lib/store';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { LegalNotice } from '../components/shared';

function OptionRow({
	option,
	selected,
	onSelect,
}: {
	option: ConfigOption;
	selected: boolean;
	onSelect: (value: string) => void;
}) {
	const disabled = option.disabled || option.available === false;
	return (
		<button
			type="button"
			disabled={disabled}
			aria-pressed={selected}
			onClick={() => onSelect(option.value)}
			className={cn(
				'flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors',
				selected
					? 'border-primary/40 bg-primary/5'
					: 'border-border hover:bg-muted/40',
				disabled &&
					'cursor-not-allowed opacity-50 hover:bg-transparent',
			)}
		>
			<span
				className={cn(
					'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors',
					selected
						? 'border-primary bg-primary text-primary-foreground'
						: 'border-input',
				)}
			>
				{selected && <CheckIcon weight="bold" className="size-3" />}
			</span>
			<div className="min-w-0 flex-1 space-y-0.5">
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-sm font-medium">{option.label}</span>
					{disabled && <Badge variant="secondary">Yakında</Badge>}
				</div>
				{option.desc && (
					<p className="text-xs text-muted-foreground">
						{option.desc}
					</p>
				)}
				{option.meta && (
					<p className="text-xs font-medium text-muted-foreground/80">
						{option.meta}
					</p>
				)}
			</div>
		</button>
	);
}

function Section({
	icon: Icon,
	title,
	options,
	value,
	onSelect,
	delay,
}: {
	icon: React.ElementType;
	title: string;
	options: ConfigOption[];
	value: string;
	onSelect: (value: string) => void;
	delay: number;
}) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay, ease: [0.16, 1, 0.3, 1] }}
			className="space-y-2.5"
		>
			<div className="flex items-center gap-2">
				<Icon weight="duotone" className="size-4 text-foreground/70" />
				<h2 className="text-sm font-medium">{title}</h2>
			</div>
			<div className="space-y-2">
				{options.map((option) => (
					<OptionRow
						key={option.value}
						option={option}
						selected={value === option.value}
						onSelect={onSelect}
					/>
				))}
			</div>
		</motion.div>
	);
}

export function OnboardingStep() {
	const { startCalculation } = useStore();
	const router = useRouter();
	const [config, setConfig] = useState<CalcConfig>(DEFAULT_CONFIG);

	const patch = (p: Partial<CalcConfig>) =>
		setConfig((cur) => ({ ...cur, ...p }));
	const start = (path: '/manual' | '/automatic') => {
		startCalculation(config);
		router.push(path);
	};

	return (
		<div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12 sm:px-8">
			<div className="fixed top-0 right-0 left-0 z-40 border-b bg-background px-8 py-4 md:left-64 lg:left-84">
				<span className="ml-6 md:ml-0 text-sm font-medium">
					ISEEU Hesaplama
				</span>
			</div>
			<div className="w-full space-y-8 mt-8">
				<LegalNotice title="Bu bir resmî hesaplama değildir">
					Bu araç yalnızca{' '}
					<span className="font-medium">tahmini</span> bir sonuç
					üretir ve resmî CAF hesaplamasının yerine geçmez. ISEEU
					Parificato için son ve geçerli sonucu üniversitenin onaylı
					CAF merkezi hesaplar; Polimi bu verileri yalnızca onaylı
					CAF&apos;tan elektronik olarak alır.
				</LegalNotice>
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ ease: [0.16, 1, 0.3, 1] }}
					className="space-y-2"
				>
					<h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
						Yeni hesaplama oluştur
					</h1>
					<p className="text-muted-foreground">
						Hangi yıl, burs ve vatandaşlık için ISEEU Parificato
						tahmini yapmak istediğinizi seçin. Hesaplama bu
						seçimlere göre uyarlanır.
					</p>
				</motion.div>

				<div className="space-y-6">
					<Section
						icon={CalendarBlankIcon}
						title="Akademik yıl"
						options={YEAR_OPTIONS}
						value={config.year}
						onSelect={(year) => patch({ year })}
						delay={0.08}
					/>
					<Section
						icon={GraduationCapIcon}
						title="Burs / başvuru türü"
						options={SCHOLARSHIP_OPTIONS}
						value={config.scholarship}
						onSelect={(scholarship) => patch({ scholarship })}
						delay={0.16}
					/>
					<Section
						icon={IdentificationCardIcon}
						title="Vatandaşlık"
						options={NATIONALITY_OPTIONS}
						value={config.nationality}
						onSelect={(nationality) => patch({ nationality })}
						delay={0.24}
					/>
				</div>

				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
					className="flex flex-col md:flex-row items-center gap-2"
				>
					<Button
						className="md:flex-1 w-full md:w-auto"
						variant="outline"
						onClick={() => start('/manual')}
					>
						Manuel hesapla <ArrowRightIcon />
					</Button>
					<Button
						className="md:flex-1 w-full md:w-auto"
						onClick={() => start('/automatic')}
					>
						Otomatik hesapla{' '}
						<SparkleIcon weight="fill" className="text-amber-500" />
					</Button>
				</motion.div>
			</div>
		</div>
	);
}
