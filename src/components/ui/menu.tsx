import { Menu as MenuPrimitive } from '@base-ui/react/menu';

import { cn } from '@/lib/utils';

function Menu({ ...props }: MenuPrimitive.Root.Props) {
	return <MenuPrimitive.Root data-slot="menu" {...props} />;
}

function MenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
	return <MenuPrimitive.Trigger data-slot="menu-trigger" {...props} />;
}

function MenuContent({
	className,
	children,
	side = 'top',
	sideOffset = 6,
	align = 'start',
	alignOffset = 0,
	...props
}: MenuPrimitive.Popup.Props &
	Pick<
		MenuPrimitive.Positioner.Props,
		'align' | 'alignOffset' | 'side' | 'sideOffset'
	>) {
	return (
		<MenuPrimitive.Portal>
			<MenuPrimitive.Positioner
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
				className="isolate z-50"
			>
				<MenuPrimitive.Popup
					data-slot="menu-content"
					className={cn(
						'relative z-50 min-w-(--anchor-width) origin-(--transform-origin) overflow-hidden rounded-lg bg-popover/70 p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
						className,
					)}
					{...props}
				>
					{children}
				</MenuPrimitive.Popup>
			</MenuPrimitive.Positioner>
		</MenuPrimitive.Portal>
	);
}

function MenuItem({
	className,
	variant = 'default',
	...props
}: MenuPrimitive.Item.Props & { variant?: 'default' | 'destructive' }) {
	return (
		<MenuPrimitive.Item
			data-slot="menu-item"
			data-variant={variant}
			className={cn(
				"relative flex w-full cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-foreground/10 data-[variant=destructive]:text-destructive data-[variant=destructive]:data-highlighted:bg-destructive/10 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg]:text-muted-foreground data-[variant=destructive]:[&_svg]:text-destructive",
				className,
			)}
			{...props}
		/>
	);
}

function MenuSeparator({
	className,
	...props
}: MenuPrimitive.Separator.Props) {
	return (
		<MenuPrimitive.Separator
			data-slot="menu-separator"
			className={cn('-mx-1 my-1 h-px bg-foreground/5', className)}
			{...props}
		/>
	);
}

function MenuGroupLabel({
	className,
	...props
}: MenuPrimitive.GroupLabel.Props) {
	return (
		<MenuPrimitive.GroupLabel
			data-slot="menu-group-label"
			className={cn(
				'px-2 py-1.5 text-xs text-muted-foreground',
				className,
			)}
			{...props}
		/>
	);
}

export {
	Menu,
	MenuContent,
	MenuGroupLabel,
	MenuItem,
	MenuSeparator,
	MenuTrigger,
};
