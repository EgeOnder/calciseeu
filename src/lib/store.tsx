'use client';

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useState,
	type ReactNode,
} from 'react';
import {
	DEFAULT_TRY_RATE,
	computeIseeu,
	type HouseholdState,
	type IseeuResult,
	type Member,
	type MemberRole,
	type Property,
} from '@/src/lib/iseeu';

const DATA_KEY = 'iseeu:data:v1';
const STEP_KEY = 'iseeu:step:v1';
const CONFIG_KEY = 'iseeu:config:v1';
const ONBOARDED_KEY = 'iseeu:onboarded:v1';

/** Meta selected on the onboarding screen before a calculation begins. */
export interface CalcConfig {
	/** Academic year, e.g. '2026/2027'. */
	year: string;
	/** Scholarship / application type, e.g. 'DSU'. */
	scholarship: string;
	/** Applicant nationality, e.g. 'TR'. */
	nationality: string;
}

export interface ConfigOption {
	value: string;
	label: string;
	desc?: string;
	meta?: string;
	disabled?: boolean;
	/** Defaults to available; set false to show a disabled "coming soon" row. */
	available?: boolean;
}

export const YEAR_OPTIONS: ConfigOption[] = [
	{
		value: '2026/2027',
		label: 'Akademik yıl 2026/2027',
		desc: 'PoliMi 2026/2027 başvuru dönemi için güncel kurallar.',
		meta: 'Son güncelleme: 25.06.2026',
	},
	{
		value: '2027/2028',
		label: 'Akademik yıl 2027/2028',
		desc: 'PoliMi 2027/2028 başvuru dönemi için güncel kurallar.',
		disabled: true,
	},
];

export const SCHOLARSHIP_OPTIONS: ConfigOption[] = [
	{
		value: 'DSU',
		label: 'DSU — Diritto allo Studio',
		desc: 'Lombardiya bölgesinde üniversite bursu ve yurt başvurusu için ISEEU Parificato.',
	},
	{
		value: 'EDISU',
		label: 'EDISU — Ente per il Diritto allo Studio',
		desc: 'Piyemonte bölgesinde üniversite bursu ve yurt başvurusu için ISEEU Parificato.',
		disabled: true,
	},
];

export const NATIONALITY_OPTIONS: ConfigOption[] = [
	{
		value: 'TR',
		label: '🇹🇷 Türkiye',
		desc: "Türkiye'den toplanan gelir ve varlık belgelerine göre hesaplama.",
	},
];

export const DEFAULT_CONFIG: CalcConfig = {
	year: '2026/2027',
	scholarship: 'DSU',
	nationality: 'TR',
};

let idCounter = 0;
const uid = () => `id-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

export function makeMember(role: MemberRole, name: string): Member {
	return {
		id: uid(),
		role,
		name,
		salary: 0,
		pension: 0,
		selfEmployment: 0,
		rentalIncome: 0,
		otherIncome: 0,
	};
}

export function makeProperty(): Property {
	return {
		id: uid(),
		label: '',
		kind: 'building',
		areaSqm: 0,
		useManualValue: false,
		manualValue: 0,
		ownershipPct: 100,
		isMainResidence: false,
	};
}

function freshState(): HouseholdState {
	return {
		currency: 'TRY',
		exchangeRate: DEFAULT_TRY_RATE,
		studentIndependent: false,
		parentStatus: 'married',
		members: [
			makeMember('student', 'Öğrenci'),
			makeMember('parent', 'Anne'),
			makeMember('parent', 'Baba'),
		],
		movableBank: 0,
		movableInvestments: 0,
		properties: [],
	};
}

/** Loads the saved state from localStorage; returns a fresh state if missing/corrupt. */
function loadState(): HouseholdState {
	if (typeof window === 'undefined') return freshState();
	try {
		const raw = window.localStorage.getItem(DATA_KEY);
		if (!raw) return freshState();
		const parsed = JSON.parse(raw) as Partial<HouseholdState>;
		if (
			!parsed ||
			!Array.isArray(parsed.members) ||
			!Array.isArray(parsed.properties)
		) {
			return freshState();
		}
		return { ...freshState(), ...parsed };
	} catch {
		return freshState();
	}
}

function loadStep(): number {
	if (typeof window === 'undefined') return 0;
	try {
		const n = Number(window.localStorage.getItem(STEP_KEY));
		return Number.isFinite(n) && n >= 0 ? n : 0;
	} catch {
		return 0;
	}
}

function loadConfig(): CalcConfig {
	if (typeof window === 'undefined') return DEFAULT_CONFIG;
	try {
		const raw = window.localStorage.getItem(CONFIG_KEY);
		if (!raw) return DEFAULT_CONFIG;
		return {
			...DEFAULT_CONFIG,
			...(JSON.parse(raw) as Partial<CalcConfig>),
		};
	} catch {
		return DEFAULT_CONFIG;
	}
}

function loadOnboarded(): boolean {
	if (typeof window === 'undefined') return false;
	try {
		return window.localStorage.getItem(ONBOARDED_KEY) === '1';
	} catch {
		return false;
	}
}

type Action =
	| { type: 'patch'; patch: Partial<HouseholdState> }
	| { type: 'replace'; state: HouseholdState }
	| { type: 'addMember'; member: Member }
	| { type: 'removeMember'; id: string }
	| { type: 'updateMember'; id: string; patch: Partial<Member> }
	| { type: 'addProperty'; property: Property }
	| { type: 'removeProperty'; id: string }
	| { type: 'updateProperty'; id: string; patch: Partial<Property> }
	| { type: 'reset' };

function reducer(state: HouseholdState, action: Action): HouseholdState {
	switch (action.type) {
		case 'patch':
			return { ...state, ...action.patch };
		case 'replace':
			return action.state;
		case 'addMember':
			return { ...state, members: [...state.members, action.member] };
		case 'removeMember':
			return {
				...state,
				members: state.members.filter((m) => m.id !== action.id),
			};
		case 'updateMember':
			return {
				...state,
				members: state.members.map((m) =>
					m.id === action.id ? { ...m, ...action.patch } : m,
				),
			};
		case 'addProperty':
			return {
				...state,
				properties: [...state.properties, action.property],
			};
		case 'removeProperty':
			return {
				...state,
				properties: state.properties.filter((p) => p.id !== action.id),
			};
		case 'updateProperty':
			return {
				...state,
				properties: state.properties.map((p) =>
					p.id === action.id ? { ...p, ...action.patch } : p,
				),
			};
		case 'reset':
			return freshState();
		default:
			return state;
	}
}

interface StoreValue {
	state: HouseholdState;
	dispatch: React.Dispatch<Action>;
	result: IseeuResult;
	step: number;
	dir: number;
	go: (next: number) => void;
	reset: () => void;
	/** Whether the user has finished onboarding and started a calculation. */
	onboarded: boolean;
	/** The year/scholarship/nationality chosen on the onboarding screen. */
	config: CalcConfig;
	/** Begins a fresh calculation with the given config (used by onboarding). */
	startCalculation: (config: CalcConfig) => void;
	/** Loads a previously saved calculation and jumps to the final step. */
	loadCalculation: (state: HouseholdState, config: CalcConfig) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
	const [state, dispatch] = useReducer(reducer, undefined, freshState);
	const [{ step, dir }, setStep] = useState(() => ({
		step: 0,
		dir: 1,
	}));
	const [config, setConfig] = useState<CalcConfig>(DEFAULT_CONFIG);
	const [onboarded, setOnboarded] = useState(false);
	const [hydrated, setHydrated] = useState(false);

	const result = useMemo(() => computeIseeu(state), [state]);

	useEffect(() => {
		dispatch({ type: 'replace', state: loadState() });
		setStep({ step: loadStep(), dir: 1 });
		setConfig(loadConfig());
		setOnboarded(loadOnboarded());
		setHydrated(true);
	}, []);

	useEffect(() => {
		if (!hydrated) return;
		try {
			window.localStorage.setItem(DATA_KEY, JSON.stringify(state));
		} catch {}
	}, [state, hydrated]);

	useEffect(() => {
		if (!hydrated) return;
		try {
			window.localStorage.setItem(STEP_KEY, String(step));
		} catch {}
	}, [step, hydrated]);

	useEffect(() => {
		if (!hydrated) return;
		try {
			window.localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
		} catch {}
	}, [config, hydrated]);

	useEffect(() => {
		if (!hydrated) return;
		try {
			window.localStorage.setItem(ONBOARDED_KEY, onboarded ? '1' : '0');
		} catch {}
	}, [onboarded, hydrated]);

	const go = useCallback((next: number) => {
		setStep((cur) => ({ step: next, dir: next >= cur.step ? 1 : -1 }));
	}, []);

	const reset = useCallback(() => {
		dispatch({ type: 'reset' });
		setOnboarded(false);
		setStep({ step: 0, dir: -1 });
	}, []);

	const startCalculation = useCallback((next: CalcConfig) => {
		dispatch({ type: 'reset' });
		setConfig(next);
		setOnboarded(true);
		setStep({ step: 0, dir: 1 });
	}, []);

	const loadCalculation = useCallback(
		(nextState: HouseholdState, nextConfig: CalcConfig) => {
			dispatch({ type: 'replace', state: nextState });
			setConfig(nextConfig);
			setOnboarded(true);
		},
		[],
	);

	const value = useMemo(
		() => ({
			state,
			dispatch,
			result,
			step,
			dir,
			go,
			reset,
			onboarded,
			config,
			startCalculation,
			loadCalculation,
		}),
		[
			state,
			result,
			step,
			dir,
			go,
			reset,
			onboarded,
			config,
			startCalculation,
			loadCalculation,
		],
	);
	return (
		<StoreContext.Provider value={value}>{children}</StoreContext.Provider>
	);
}

export function useStore(): StoreValue {
	const ctx = useContext(StoreContext);
	if (!ctx) throw new Error('useStore must be used within StoreProvider');
	return ctx;
}
