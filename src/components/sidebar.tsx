'use client';

import { useEffect, useRef, useState } from 'react';
import {
	CaretUpDownIcon,
	ChatCircleIcon,
	CheckIcon,
	CopyIcon,
	FilesIcon,
	GoogleLogoIcon,
	ListIcon,
	MonitorIcon,
	MoonIcon,
	PencilSimpleIcon,
	PlusIcon,
	SignOutIcon,
	SlidersHorizontalIcon,
	SparkleIcon,
	SunIcon,
	TrashIcon,
	UserIcon,
	XIcon,
} from '@phosphor-icons/react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useTheme } from 'next-themes';

import { cn } from '@/lib/utils';
import { authClient } from '@/src/lib/auth-client';
import { useAppSession } from '@/src/lib/session';
import { useStore } from '@/src/lib/store';
import { formatEur } from '@/src/lib/iseeu';
import {
	clearCalculations,
	deleteCalculation,
	refreshCalculations,
	renameCalculation,
	setActiveCalculation,
	useActiveCalculationId,
	useCalculations,
	type CalculationType,
	type SavedCalculation,
} from '@/src/lib/calculations';
import { Button } from './ui/button';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from './ui/alert-dialog';
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from './ui/context-menu';
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuSeparator,
	MenuTrigger,
} from './ui/menu';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';

type User = {
	name: string;
	email: string;
};

const calculationIcons: Record<CalculationType, React.ReactNode> = {
	manual: <SlidersHorizontalIcon className="size-4 shrink-0" />,
	automatic: <SparkleIcon className="size-4 shrink-0" />,
};

/** A single saved calculation: navigate (click), rename (double-click /
 * context menu), copy ISEEU, or remove (context menu, with confirmation). */
function CalculationItem({
	calc,
	active,
	onOpen,
	onRemoved,
}: {
	calc: SavedCalculation;
	active: boolean;
	onOpen: (calc: SavedCalculation) => void;
	onRemoved: (calc: SavedCalculation, wasActive: boolean) => void;
}) {
	const [editing, setEditing] = useState(false);
	const [removeOpen, setRemoveOpen] = useState(false);
	const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearClickTimer = () => {
		if (clickTimer.current) {
			clearTimeout(clickTimer.current);
			clickTimer.current = null;
		}
	};

	// Delay single-click navigation so a double-click can cancel it (rename).
	const handleClick = () => {
		if (clickTimer.current) return;
		clickTimer.current = setTimeout(() => {
			clickTimer.current = null;
			onOpen(calc);
		}, 200);
	};

	const handleDoubleClick = () => {
		clearClickTimer();
		setEditing(true);
	};

	const commitRename = async (value: string) => {
		setEditing(false);
		const next = value.trim();
		if (!next || next === calc.title) return;

		const renamed = await renameCalculation(calc.id, next);
		if (!renamed) {
			toast.error('Ad değiştirilemedi', {
				description: 'Lütfen tekrar deneyin.',
			});
		}
	};

	const copyIseeu = async () => {
		const value = formatEur(calc.iseeu, true);
		if (!navigator.clipboard) {
			toast.error('Kopyalama desteklenmiyor');
			return;
		}

		try {
			await navigator.clipboard.writeText(value);
			toast.success('ISEEU değeri kopyalandı', {
				description: `${value} panoya kopyalandı.`,
			});
		} catch {
			toast.error('ISEEU değeri kopyalanamadı');
		}
	};

	if (editing) {
		return (
			<input
				autoFocus
				defaultValue={calc.title}
				onFocus={(event) => event.currentTarget.select()}
				onBlur={(event) => commitRename(event.currentTarget.value)}
				onKeyDown={(event) => {
					if (event.key === 'Enter') {
						event.preventDefault();
						void commitRename(event.currentTarget.value);
					} else if (event.key === 'Escape') {
						event.preventDefault();
						setEditing(false);
					}
				}}
				className="w-full rounded-lg bg-sidebar-accent px-2 py-1.5 text-sm text-foreground outline-none ring-2 ring-ring/50"
			/>
		);
	}

	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger
					render={
						<button
							type="button"
							onClick={handleClick}
							onDoubleClick={handleDoubleClick}
							className={cn(
								'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm outline-none transition-colors select-none hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
								active
									? 'bg-sidebar-accent text-foreground'
									: 'text-muted-foreground',
							)}
						/>
					}
				>
					{calculationIcons[calc.type]}
					<span className="truncate">{calc.title}</span>
				</ContextMenuTrigger>
				<ContextMenuContent className="min-w-48">
					<ContextMenuItem onClick={copyIseeu}>
						<CopyIcon />
						ISEEU değerini kopyala
					</ContextMenuItem>
					<ContextMenuItem onClick={() => setEditing(true)}>
						<PencilSimpleIcon />
						Yeniden adlandır
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem
						variant="destructive"
						onClick={() => setRemoveOpen(true)}
					>
						<TrashIcon />
						Kayıtlardan kaldır
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>

			<AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Kayıtlı hesaplamayı kaldır?
						</AlertDialogTitle>
						<AlertDialogDescription>
							“{calc.title}” kayıtlarınızdan kalıcı olarak
							silinecek. Bu işlem geri alınamaz.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel size="default" variant="outline">
							Vazgeç
						</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={async () => {
								const deleted = await deleteCalculation(
									calc.id,
								);
								if (!deleted) {
									toast.error('Hesaplama kaldırılamadı', {
										description: 'Lütfen tekrar deneyin.',
									});
									return;
								}
								setRemoveOpen(false);
								onRemoved(calc, active);
								toast.success('Kayıtlı hesaplama kaldırıldı');
							}}
						>
							Evet, kaldır
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

function NavButton({
	icon,
	children,
	className,
	...props
}: React.ComponentProps<typeof Button> & { icon: React.ReactNode }) {
	return (
		<Button
			variant="ghost"
			className={cn(
				'h-9 w-full justify-start gap-2.5 px-2 font-normal text-muted-foreground hover:bg-sidebar-accent',
				className,
			)}
			{...props}
		>
			{icon}
			<span className="truncate">{children}</span>
		</Button>
	);
}

function ProfileMenu({ user }: { user: User }) {
	const router = useRouter();
	const [signingOut, setSigningOut] = useState(false);
	const initials = user.name
		.split(' ')
		.map((part) => part[0])
		.slice(0, 2)
		.join('')
		.toUpperCase();

	return (
		<Menu>
			<MenuTrigger
				render={
					<button
						type="button"
						className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left outline-none transition-colors select-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:bg-sidebar-accent"
					/>
				}
			>
				<span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium text-foreground">
					{initials}
				</span>
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="truncate text-sm font-medium">
						{user.name}
					</span>
					<span className="truncate text-xs text-muted-foreground">
						{user.email}
					</span>
				</span>
				<CaretUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
			</MenuTrigger>
			<MenuContent className="w-(--anchor-width)">
				<MenuItem>
					<UserIcon />
					Profil
				</MenuItem>
				<MenuSeparator />
				<MenuItem
					variant="destructive"
					closeOnClick={false}
					disabled={signingOut}
					onClick={async () => {
						if (signingOut) return;

						setSigningOut(true);
						try {
							await authClient.signOut({
								fetchOptions: {
									onSuccess: () => {
										router.refresh();
									},
								},
							});
						} catch {
							setSigningOut(false);
						}
					}}
				>
					{signingOut ? (
						<span
							aria-hidden="true"
							className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
						/>
					) : (
						<SignOutIcon />
					)}
					Çıkış yap
				</MenuItem>
			</MenuContent>
		</Menu>
	);
}

function LoginButton({ disabled }: { disabled?: boolean }) {
	const [signingIn, setSigningIn] = useState(false);

	return (
		<Button
			variant="outline"
			className="h-9 w-full gap-2.5"
			disabled={disabled}
			loading={signingIn}
			onClick={async () => {
				setSigningIn(true);
				try {
					const response = await authClient.signIn.social({
						provider: 'google',
					});

					if (response?.error) {
						setSigningIn(false);
					}
				} catch {
					setSigningIn(false);
				}
			}}
		>
			{signingIn ? null : <GoogleLogoIcon weight="bold" />}
			Google ile giriş yap
		</Button>
	);
}

function FeedbackButton() {
	const pathname = usePathname();
	const [open, setOpen] = useState(false);
	const [message, setMessage] = useState('');
	const [status, setStatus] = useState<'idle' | 'submitting' | 'sent'>(
		'idle',
	);
	const [error, setError] = useState<string | null>(null);

	const submitFeedback = async () => {
		const trimmedMessage = message.trim();

		if (!trimmedMessage || status === 'submitting') {
			return;
		}

		setStatus('submitting');
		setError(null);

		const response = await fetch('/api/feedback', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				message: trimmedMessage,
				path: pathname,
			}),
		});

		if (!response.ok) {
			setStatus('idle');
			setError('Geri bildirim gönderilemedi. Lütfen tekrar deneyin.');
			toast.error('Geri bildirim gönderilemedi', {
				description: 'Lütfen tekrar deneyin.',
			});
			return;
		}

		setMessage('');
		setStatus('sent');
	};

	return (
		<Popover
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);

				if (!nextOpen) {
					setStatus('idle');
					setError(null);
					setMessage('');
				}
			}}
		>
			<PopoverTrigger
				render={
					<Button
						variant="ghost"
						className="h-9 w-full justify-start gap-2.5 px-2 font-normal text-muted-foreground hover:text-foreground"
					/>
				}
			>
				<ChatCircleIcon />
				<span className="truncate">Geri bildirim</span>
			</PopoverTrigger>
			<PopoverContent className="w-80" align="start" side="top">
				<AnimatePresence mode="wait" initial={false}>
					{status === 'sent' ? (
						<motion.div
							key="sent"
							initial={{ opacity: 0, scale: 0.96, y: 4 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.96, y: -4 }}
							transition={{ duration: 0.16 }}
							className="flex min-h-36 flex-col items-center justify-center gap-3 text-center"
						>
							<motion.span
								initial={{ scale: 0.6, rotate: -12 }}
								animate={{ scale: 1, rotate: 0 }}
								transition={{
									type: 'spring',
									stiffness: 420,
									damping: 18,
								}}
								className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground"
							>
								<CheckIcon weight="bold" className="size-5" />
							</motion.span>
							<div className="space-y-1">
								<p className="text-sm font-medium">
									Geri bildiriminiz için teşekkürler.
								</p>
								<p className="text-xs text-muted-foreground">
									Uygulamayı geliştirmek için bunu
									kullanacağız.
								</p>
							</div>
						</motion.div>
					) : (
						<motion.form
							key="form"
							initial={{ opacity: 0, y: -4 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 4 }}
							transition={{ duration: 0.14 }}
							className="space-y-3"
							onSubmit={(event) => {
								event.preventDefault();
								void submitFeedback();
							}}
						>
							<div className="space-y-1.5">
								<p className="text-sm font-medium">
									Uygulama hakkında düşünceleriniz
								</p>
								<p className="text-xs text-muted-foreground">
									Kısa bir not bırakın. Uygulamayı
									iyileştirmek için bunu kullanacağız.
								</p>
							</div>
							<Textarea
								value={message}
								onChange={(event) =>
									setMessage(event.currentTarget.value)
								}
								onKeyDown={(event) => {
									if (
										event.key === 'Enter' &&
										!event.shiftKey
									) {
										event.preventDefault();
										void submitFeedback();
									}
								}}
								placeholder="Ne iyi çalıştı, ne eksik kaldı?"
								className="min-h-28 resize-none"
								disabled={status === 'submitting'}
								autoFocus
							/>
							{error ? (
								<p className="text-xs text-destructive">
									{error}
								</p>
							) : null}
							<Button
								type="submit"
								className="w-full"
								loading={status === 'submitting'}
								disabled={
									!message.trim() || status === 'submitting'
								}
							>
								Gönder
							</Button>
						</motion.form>
					)}
				</AnimatePresence>
			</PopoverContent>
		</Popover>
	);
}

const themeOptions = [
	{ value: 'light', label: 'Açık tema', icon: SunIcon },
	{ value: 'dark', label: 'Koyu tema', icon: MoonIcon },
	{ value: 'system', label: 'Sistem teması', icon: MonitorIcon },
] as const;

/** Segmented light / dark / system theme switcher. */
function ThemeToggle() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	// next-themes resolves the active theme only on the client; render a
	// neutral state until mounted to avoid a hydration mismatch.
	useEffect(() => setMounted(true), []);
	const active = mounted ? theme : undefined;

	return (
		<div
			role="radiogroup"
			aria-label="Tema"
			className="flex items-center gap-1 rounded-lg bg-sidebar-accent/60 p-1"
		>
			{themeOptions.map(({ value, label, icon: Icon }) => {
				const selected = active === value;
				return (
					<button
						key={value}
						type="button"
						role="radio"
						aria-checked={selected}
						aria-label={label}
						title={label}
						onClick={() => setTheme(value)}
						className={cn(
							'flex h-7 flex-1 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50',
							selected
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground',
						)}
					>
						<Icon className="size-4" />
					</button>
				);
			})}
		</div>
	);
}

function SidebarContent({
	pathname,
	onNewCalculation,
	onNavigate,
}: {
	pathname: string | null;
	onNewCalculation: () => void;
	onNavigate: (path: string) => void;
}) {
	const { session, isPending } = useAppSession();
	const user = session?.user
		? {
				name: session.user.name || session.user.email,
				email: session.user.email,
			}
		: null;

	const { reset } = useStore();
	const userEmail = session?.user.email ?? null;
	const calculations = useCalculations();
	const activeId = useActiveCalculationId();

	// Sync the authoritative list once auth state is known. Until then the
	// cached list (from localStorage) is shown so it never flashes empty.
	useEffect(() => {
		if (isPending) return;
		if (!userEmail) {
			clearCalculations();
			return;
		}
		void refreshCalculations();
	}, [userEmail, isPending]);

	const removeCalculation = (_calc: SavedCalculation, wasActive: boolean) => {
		if (wasActive) {
			setActiveCalculation(null);
			reset();
			onNavigate('/');
		}
	};

	return (
		<>
			<div className="flex flex-col gap-1 px-3 pt-4">
				<Button
					className="h-9 w-full justify-start gap-2.5 px-2.5"
					onClick={onNewCalculation}
				>
					<PlusIcon weight="bold" />
					Yeni hesaplama
				</Button>
				<NavButton
					icon={<FilesIcon />}
					onClick={() => onNavigate('/documents')}
					className={cn(
						pathname === '/documents' &&
							'bg-sidebar-accent text-foreground',
					)}
				>
					Yüklenen belgeler
				</NavButton>
			</div>

			{/* Saved calculations */}
			<div className="mt-4 flex min-h-0 flex-1 flex-col px-3">
				<p className="px-2 pb-1.5 text-xs font-medium text-muted-foreground">
					Geçmiş hesaplamalar
				</p>
				<nav className="-mr-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-1">
					{!user ? (
						<p className="px-2 py-1.5 text-sm text-muted-foreground">
							Hesaplamalarınızı kaydetmek için giriş yapın.
						</p>
					) : calculations.length === 0 ? (
						<p className="px-2 py-1.5 text-sm text-muted-foreground">
							Henüz kayıtlı hesaplama yok.
						</p>
					) : (
						calculations.map((calc) => (
							<CalculationItem
								key={calc.id}
								calc={calc}
								active={
									pathname === `/${calc.type}` &&
									calc.id === activeId
								}
								onOpen={(item) =>
									onNavigate(
										`/${item.type}?id=${encodeURIComponent(item.id)}`,
									)
								}
								onRemoved={removeCalculation}
							/>
						))
					)}
				</nav>
			</div>

			{/* Bottom: support + profile */}
			<div className="flex flex-col gap-2 border-t border-sidebar-border p-3">
				<FeedbackButton />
				<ThemeToggle />
				{user ? (
					<ProfileMenu user={user} />
				) : (
					<LoginButton disabled={isPending} />
				)}
			</div>
		</>
	);
}

// --- Sidebar --------------------------------------------------------------

export function Sidebar() {
	const { reset } = useStore();
	const pathname = usePathname();
	const router = useRouter();
	const [mobileOpen, setMobileOpen] = useState(false);

	const navigate = (path: string) => {
		router.push(path);
		setMobileOpen(false);
	};

	const startNewCalculation = () => {
		reset();
		navigate('/');
	};

	return (
		<>
			<Button
				size="icon"
				variant="ghost"
				aria-label={mobileOpen ? 'Menüyü kapat' : 'Menüyü aç'}
				aria-expanded={mobileOpen}
				onClick={() => setMobileOpen((open) => !open)}
				className="fixed top-3 left-3 z-50 shadow-sm md:hidden"
			>
				{mobileOpen ? <XIcon /> : <ListIcon />}
			</Button>

			{mobileOpen && (
				<div className="fixed inset-0 z-40 md:hidden">
					<button
						type="button"
						aria-label="Menüyü kapat"
						className="absolute inset-0 bg-background/70 backdrop-blur-sm"
						onClick={() => setMobileOpen(false)}
					/>
					<aside
						data-app-sidebar
						className="absolute top-0 bottom-0 left-0 flex w-72 max-w-[calc(100vw-3rem)] flex-col border-r border-sidebar-border bg-sidebar pt-12 text-sidebar-foreground shadow-xl"
					>
						<SidebarContent
							pathname={pathname}
							onNewCalculation={startNewCalculation}
							onNavigate={navigate}
						/>
					</aside>
				</div>
			)}

			<aside
				data-app-sidebar
				className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex lg:w-84"
			>
				<SidebarContent
					pathname={pathname}
					onNewCalculation={startNewCalculation}
					onNavigate={navigate}
				/>
			</aside>
		</>
	);
}
