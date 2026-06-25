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

type Action =
	| { type: 'patch'; patch: Partial<HouseholdState> }
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
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
	const [state, dispatch] = useReducer(reducer, undefined, loadState);
	const [{ step, dir }, setStep] = useState(() => ({
		step: loadStep(),
		dir: 1,
	}));

	const result = useMemo(() => computeIseeu(state), [state]);

	useEffect(() => {
		try {
			window.localStorage.setItem(DATA_KEY, JSON.stringify(state));
		} catch {}
	}, [state]);

	useEffect(() => {
		try {
			window.localStorage.setItem(STEP_KEY, String(step));
		} catch {}
	}, [step]);

	const go = useCallback((next: number) => {
		setStep((cur) => ({ step: next, dir: next >= cur.step ? 1 : -1 }));
	}, []);

	const reset = useCallback(() => {
		dispatch({ type: 'reset' });
		setStep({ step: 0, dir: -1 });
	}, []);

	const value = useMemo(
		() => ({ state, dispatch, result, step, dir, go, reset }),
		[state, result, step, dir, go, reset],
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
