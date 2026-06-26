import { AnimatePresence, motion } from 'motion/react';
import { Plus, Trash, UsersThree, X } from '@phosphor-icons/react';

import { useStore, makeMember } from '@/src/lib/store';
import {
	equivalenceCoefficient,
	formatNumber,
	type MemberRole,
} from '@/src/lib/iseeu';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { InfoTip } from '@/src/components/shared';

const roleLabels: Record<MemberRole, string> = {
	student: 'Öğrenci',
	parent: 'Ebeveyn',
	sibling: 'Kardeş',
	other: 'Diğer',
};

function RadioRow({
	value,
	current,
	onSelect,
	title,
	desc,
}: {
	value: string;
	current: string;
	onSelect: (v: string) => void;
	title: string;
	desc: string;
}) {
	const active = value === current;
	return (
		<label
			className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
				active
					? 'border-primary/40 bg-primary/4'
					: 'border-border hover:bg-muted/40'
			}`}
		>
			<RadioGroupItem value={value} className="mt-0.5" />
			<div className="space-y-0.5" onClick={() => onSelect(value)}>
				<div className="text-sm font-medium">{title}</div>
				<div className="text-xs text-muted-foreground">{desc}</div>
			</div>
		</label>
	);
}

const parentGuidance: Record<string, { title: string; body: string }> = {
	married: {
		title: 'Evli ve birlikte yaşıyorlar',
		body: 'Genellikle anne, baba, öğrenci ve hanedeki çocuklar birlikte değerlendirilir. Geçici olarak ayrı şehirde yaşamak, resmî ayrılık yoksa tek başına dışlama anlamına gelmez.',
	},
	divorced: {
		title: 'Boşanmış / yasal olarak ayrılmış',
		body: 'Çoğu durumda öğrencinin birlikte yaşadığı ebeveynin hanesi esas alınır. Yalnızca fiilî ayrılık varsa (resmî karar yoksa) diğer ebeveyn tamamen dışarıda kalmayabilir.',
	},
	unmarried: {
		title: 'Evli değil ve birlikte yaşamıyorlar',
		body: 'Tanıyan ve birlikte yaşamayan ebeveyn bazı koşullarda haneye çekilebilir veya ek bileşen olarak hesaba katılabilir. Nafaka, velayet ve resmî kayıtlar sonucu değiştirir.',
	},
};

export function HouseholdStep() {
	const { state, dispatch, result } = useStore();

	const setIndependent = (v: boolean) => {
		dispatch({ type: 'patch', patch: { studentIndependent: v } });
		if (v) {
			const student = state.members.find((m) => m.role === 'student');
			dispatch({
				type: 'patch',
				patch: {
					members: student
						? [student]
						: [makeMember('student', 'Öğrenci')],
				},
			});
		} else if (state.members.length <= 1) {
			const student =
				state.members.find((m) => m.role === 'student') ??
				makeMember('student', 'Öğrenci');
			dispatch({
				type: 'patch',
				patch: {
					members: [
						student,
						makeMember('parent', 'Anne'),
						makeMember('parent', 'Baba'),
					],
				},
			});
		}
	};

	const guidance = parentGuidance[state.parentStatus];

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<h2 className="font-heading text-xl font-semibold tracking-tight">
					Hane (nucleo familiare)
				</h2>
				<p className="text-sm text-muted-foreground">
					Hesabın en kritik kısmı: kimin geliri ve varlığı hesaba
					girecek?
				</p>
			</div>

			{/* Independence */}
			<div className="space-y-3">
				<div className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
					Öğrenci ailesinden bağımsız mı?
					<InfoTip text="Bağımsızlık için genellikle iki şart birlikte aranır: en az 2 yıldır aileye ait olmayan ücretli bir konutta ikamet ve en az 2 yıldır yeterli, beyan edilmiş iş geliri. İkisi birden yoksa öğrenci 'bağımlı' kabul edilir." />
				</div>
				<RadioGroup
					value={state.studentIndependent ? 'yes' : 'no'}
					onValueChange={(v) => setIndependent(v === 'yes')}
				>
					<RadioRow
						value="no"
						current={state.studentIndependent ? 'yes' : 'no'}
						onSelect={() => setIndependent(false)}
						title="Hayır, bağımlı"
						desc="Aile kökeni (anne/baba/kardeş) haneye dahil edilir."
					/>
					<RadioRow
						value="yes"
						current={state.studentIndependent ? 'yes' : 'no'}
						onSelect={() => setIndependent(true)}
						title="Evet, bağımsız"
						desc="Her iki şart da sağlanıyor; yalnızca öğrencinin kendi gelir/varlığı sayılır."
					/>
				</RadioGroup>
			</div>

			{/* Parent status */}
			<AnimatePresence initial={false}>
				{!state.studentIndependent && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: 'auto' }}
						exit={{ opacity: 0, height: 0 }}
						transition={{ ease: [0.16, 1, 0.3, 1] }}
						className="space-y-3 overflow-hidden"
					>
						<div className="text-sm font-medium">
							Ebeveynlerin durumu
						</div>
						<RadioGroup
							value={state.parentStatus}
							onValueChange={(v) =>
								dispatch({
									type: 'patch',
									patch: {
										parentStatus:
											v as typeof state.parentStatus,
									},
								})
							}
							className="grid gap-2 sm:grid-cols-3"
						>
							{(
								['married', 'divorced', 'unmarried'] as const
							).map((k) => (
								<RadioRow
									key={k}
									value={k}
									current={state.parentStatus}
									onSelect={(val) =>
										dispatch({
											type: 'patch',
											patch: {
												parentStatus:
													val as typeof state.parentStatus,
											},
										})
									}
									title={
										k === 'married'
											? 'Evli'
											: k === 'divorced'
												? 'Boşanmış'
												: 'Birlikte değil'
									}
									desc={
										k === 'married'
											? 'Birlikte yaşıyorlar'
											: k === 'divorced'
												? 'Yasal ayrılık var'
												: 'Hiç evlenmemiş'
									}
								/>
							))}
						</RadioGroup>
						{guidance && (
							<Alert className="border-sky-500/25 bg-sky-500/5">
								<AlertTitle className="text-sky-700 dark:text-sky-400">
									{guidance.title}
								</AlertTitle>
								<AlertDescription className="text-sky-700/80 dark:text-sky-300/80">
									{guidance.body}
								</AlertDescription>
							</Alert>
						)}
					</motion.div>
				)}
			</AnimatePresence>

			{/* Household members */}
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1.5 text-sm font-medium">
						<UsersThree weight="duotone" className="size-4.5" />{' '}
						Hane üyeleri
					</div>
					<span className="text-xs text-muted-foreground">
						{state.members.length} kişi
					</span>
				</div>

				<div className="space-y-2">
					<AnimatePresence initial={false}>
						{state.members.map((m) => (
							<motion.div
								key={m.id}
								layout
								initial={{ opacity: 0, y: -6 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, x: -12 }}
								transition={{ ease: [0.16, 1, 0.3, 1] }}
								className="flex items-center gap-2 rounded-xl border border-border bg-card p-2"
							>
								<span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-xs font-medium text-muted-foreground">
									{roleLabels[m.role].slice(0, 1)}
								</span>
								<Input
									value={m.name}
									placeholder="İsim / etiket"
									onChange={(e) =>
										dispatch({
											type: 'updateMember',
											id: m.id,
											patch: { name: e.target.value },
										})
									}
									className="h-7 border-0 bg-transparent px-1 focus-visible:ring-0"
								/>
								<span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
									{roleLabels[m.role]}
								</span>
								<Button
									size="icon-sm"
									variant="ghost"
									disabled={m.role === 'student'}
									onClick={() =>
										dispatch({
											type: 'removeMember',
											id: m.id,
										})
									}
									aria-label="Üyeyi kaldır"
								>
									{m.role === 'student' ? (
										<X className="opacity-30" />
									) : (
										<Trash />
									)}
								</Button>
							</motion.div>
						))}
					</AnimatePresence>
				</div>

				{!state.studentIndependent && (
					<div className="flex flex-wrap gap-2">
						<Button
							size="sm"
							variant="outline"
							onClick={() =>
								dispatch({
									type: 'addMember',
									member: makeMember('parent', 'Ebeveyn'),
								})
							}
						>
							<Plus /> Ebeveyn
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={() =>
								dispatch({
									type: 'addMember',
									member: makeMember('sibling', 'Kardeş'),
								})
							}
						>
							<Plus /> Kardeş
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={() =>
								dispatch({
									type: 'addMember',
									member: makeMember('other', 'Kişi'),
								})
							}
						>
							<Plus /> Diğer kişi
						</Button>
					</div>
				)}
				<p className="text-xs text-muted-foreground">
					Kardeş başka şehirde yaşıyor diye otomatik olarak haneden
					çıkmaz; reşit, evli, çocuk sahibi veya mali olarak bağımsız
					olup olmadığına CAF karar verir.
				</p>
			</div>

			{/* Coefficient preview */}
			<div className="flex items-center justify-between rounded-xl bg-muted/50 p-3 text-sm">
				<span className="text-muted-foreground">
					Eşdeğerlik katsayısı (şu anki hane)
				</span>
				<motion.span
					key={result.size}
					initial={{ scale: 0.85, opacity: 0.5 }}
					animate={{ scale: 1, opacity: 1 }}
					transition={{ type: 'spring', stiffness: 400, damping: 22 }}
					className="font-heading text-base font-semibold tabular-nums"
				>
					{formatNumber(equivalenceCoefficient(result.size))}
				</motion.span>
			</div>
		</div>
	);
}
