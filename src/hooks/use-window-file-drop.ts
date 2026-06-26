'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Detects files being dragged anywhere over the window and reports whether the
 * drop indication should show. Areas marked with `data-app-sidebar` (the app
 * sidebar) are excluded: dragging over them hides the indication and dropping
 * over them does nothing. Files dropped elsewhere are passed to `onDrop`.
 */
export function useWindowFileDrop(onDrop: (files: File[]) => void): boolean {
	const [active, setActive] = useState(false);

	// Keep the latest callback without re-binding the window listeners.
	const onDropRef = useRef(onDrop);
	onDropRef.current = onDrop;

	useEffect(() => {
		const hasFiles = (event: DragEvent) =>
			Array.from(event.dataTransfer?.types ?? []).includes('Files');

		const overSidebar = (event: DragEvent) => {
			const target = event.target as HTMLElement | null;
			return !!target?.closest?.('[data-app-sidebar]');
		};

		const handleDragOver = (event: DragEvent) => {
			if (!hasFiles(event)) return;
			// Prevent the browser from opening the file on drop.
			event.preventDefault();
			setActive(!overSidebar(event));
		};

		const handleDragLeave = (event: DragEvent) => {
			// `relatedTarget` is null when the cursor leaves the window.
			if (event.relatedTarget === null) setActive(false);
		};

		const handleDrop = (event: DragEvent) => {
			if (!hasFiles(event)) return;
			event.preventDefault();
			setActive(false);
			if (overSidebar(event)) return;
			const files = event.dataTransfer?.files;
			if (files && files.length > 0) {
				onDropRef.current(Array.from(files));
			}
		};

		const handleDragEnd = () => setActive(false);

		window.addEventListener('dragover', handleDragOver);
		window.addEventListener('dragleave', handleDragLeave);
		window.addEventListener('drop', handleDrop);
		window.addEventListener('dragend', handleDragEnd);

		return () => {
			window.removeEventListener('dragover', handleDragOver);
			window.removeEventListener('dragleave', handleDragLeave);
			window.removeEventListener('drop', handleDrop);
			window.removeEventListener('dragend', handleDragEnd);
		};
	}, []);

	return active;
}
