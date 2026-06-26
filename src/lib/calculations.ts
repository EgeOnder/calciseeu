'use client';

import { useSyncExternalStore } from 'react';

export type CalculationType = 'manual' | 'automatic';

export type SavedCalculation = {
	id: string;
	type: CalculationType;
	title: string;
	iseeu: number;
	createdAt: string;
};

const STORAGE_KEY = 'iseeu:calculations:v1';

// Module-level singleton cache so the list survives client-side navigation
// (the sidebar remounts per route) and is restored instantly on reload.
let cache: SavedCalculation[] = readStorage();
let activeId: string | null = null;
const listeners = new Set<() => void>();

function readStorage(): SavedCalculation[] {
	if (typeof window === 'undefined') return [];
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		const parsed = raw ? (JSON.parse(raw) as SavedCalculation[]) : [];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function writeStorage() {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
	} catch {}
}

function emit() {
	for (const listener of listeners) listener();
}

function setCache(next: SavedCalculation[]) {
	cache = next;
	writeStorage();
	emit();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

const EMPTY: SavedCalculation[] = [];

/** Reactive access to the cached list of saved calculations. */
export function useCalculations(): SavedCalculation[] {
	return useSyncExternalStore(
		subscribe,
		() => cache,
		() => EMPTY,
	);
}

/** Id of the saved calculation currently being viewed, or null. */
export function useActiveCalculationId(): string | null {
	return useSyncExternalStore(
		subscribe,
		() => activeId,
		() => null,
	);
}

export function setActiveCalculation(id: string | null) {
	if (activeId === id) return;
	activeId = id;
	emit();
}

// --- Optimistic local mutations -------------------------------------------

export function upsertCalculationLocal(calc: SavedCalculation) {
	setCache([calc, ...cache.filter((item) => item.id !== calc.id)]);
}

export function renameCalculationLocal(id: string, title: string) {
	setCache(cache.map((item) => (item.id === id ? { ...item, title } : item)));
}

export function removeCalculationLocal(id: string) {
	setCache(cache.filter((item) => item.id !== id));
}

export function clearCalculations() {
	setCache([]);
}

// --- Server sync ----------------------------------------------------------

/** Refetches the authoritative list for the signed-in user. */
export async function refreshCalculations(): Promise<void> {
	const response = await fetch('/api/calculations').catch(() => null);
	if (!response) return;
	if (response.status === 401) {
		setCache([]);
		return;
	}
	if (!response.ok) return;
	const { calculations } = (await response.json()) as {
		calculations?: SavedCalculation[];
	};
	setCache(calculations ?? []);
}

export async function deleteCalculation(id: string): Promise<boolean> {
	const response = await fetch(
		`/api/calculations/${encodeURIComponent(id)}`,
		{ method: 'DELETE' },
	).catch(() => null);
	if (!response || !response.ok) return false;
	removeCalculationLocal(id);
	return true;
}

export async function renameCalculation(
	id: string,
	title: string,
): Promise<boolean> {
	const trimmed = title.trim();
	if (!trimmed) return false;
	renameCalculationLocal(id, trimmed);
	const response = await fetch(
		`/api/calculations/${encodeURIComponent(id)}`,
		{
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title: trimmed }),
		},
	).catch(() => null);
	return !!response && response.ok;
}
