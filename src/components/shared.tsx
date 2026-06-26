import { useEffect } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { Info } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { InputGroup, InputGroupAddon, InputGroupInput } from './ui/input-group';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

export function AnimatedNumber({
	value,
	format,
	className,
}: {
	value: number;
	format: (n: number) => string;
	className?: string;
}) {
	const mv = useMotionValue(value);
	const text = useTransform(mv, (v) => format(v));
	useEffect(() => {
		const controls = animate(mv, value, {
			duration: 0.5,
			ease: [0.16, 1, 0.3, 1],
		});
		return () => controls.stop();
	}, [value, mv]);
	return <motion.span className={className}>{text}</motion.span>;
}

export function MoneyInput({
	value,
	onChange,
	currency,
	placeholder = '0',
	id,
}: {
	value: number;
	onChange: (n: number) => void;
	currency: string;
	placeholder?: string;
	id?: string;
}) {
	return (
		<InputGroup>
			<InputGroupAddon className="font-medium text-foreground/60">
				{currency}
			</InputGroupAddon>
			<InputGroupInput
				id={id}
				inputMode="decimal"
				placeholder={placeholder}
				value={value === 0 ? '' : value}
				onChange={(e) => {
					const raw = e.target.value
						.replace(/[^\d.,]/g, '')
						.replace(',', '.');
					const n = parseFloat(raw);
					onChange(isNaN(n) ? 0 : n);
				}}
			/>
		</InputGroup>
	);
}

export function PlainNumberInput({
	value,
	onChange,
	suffix,
	placeholder = '0',
	id,
}: {
	value: number;
	onChange: (n: number) => void;
	suffix?: string;
	placeholder?: string;
	id?: string;
}) {
	return (
		<InputGroup>
			<InputGroupInput
				id={id}
				inputMode="decimal"
				placeholder={placeholder}
				value={value === 0 ? '' : value}
				onChange={(e) => {
					const raw = e.target.value
						.replace(/[^\d.,]/g, '')
						.replace(',', '.');
					const n = parseFloat(raw);
					onChange(isNaN(n) ? 0 : n);
				}}
			/>
			{suffix && (
				<InputGroupAddon
					align="inline-end"
					className="font-medium text-foreground/60"
				>
					{suffix}
				</InputGroupAddon>
			)}
		</InputGroup>
	);
}

export function InfoTip({
	text,
	className,
}: {
	text: string;
	className?: string;
}) {
	return (
		<>
			{/* Desktop: tooltip bubble on non-touch devices */}
			<Tooltip>
				<TooltipTrigger
					render={
						<button
							type="button"
							aria-label="Bilgi"
							className={cn(
								'hidden size-4 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground sm:inline-flex',
								className,
							)}
						/>
					}
				>
					<Info weight="fill" className="size-4" />
				</TooltipTrigger>
				<TooltipContent className="max-w-xs text-pretty">
					{text}
				</TooltipContent>
			</Tooltip>
			{/* Mobile: inline description instead of a bubble */}
			<span className="order-last w-full basis-full text-xs leading-snug font-normal text-pretty text-muted-foreground sm:hidden">
				{text}
			</span>
		</>
	);
}

export function LegalNotice({
	title = 'Yasal uyarı',
	children,
	className,
}: {
	title?: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<Alert className={cn('border-amber-500/30 bg-amber-500/5', className)}>
			<AlertTitle className="text-amber-700 dark:text-amber-400">
				{title}
			</AlertTitle>
			<AlertDescription className="text-amber-700/80 dark:text-amber-300/80">
				{children}
			</AlertDescription>
		</Alert>
	);
}
