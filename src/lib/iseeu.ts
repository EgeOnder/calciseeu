// ISEEU Parificato — estimated calculation engine
// Based on: ISEEU Parificato general calculation guide (Polimi DSU 2026/2027).
// This engine only produces an ESTIMATE; the official result is computed by an approved CAF.

/** Banca d'Italia reference rate for 31.12.2024: 1 EUR = 36.7372 TRY */
export const DEFAULT_TRY_RATE = 36.7372;

/** Income deduction rules (general ISEE rule). */
export const INCOME_DEDUCTION = {
	/** Salary / employment income: 20% deduction, capped at 3,000 € */
	salaryRate: 0.2,
	salaryCap: 3000,
	/** Pension income: 20% deduction, capped at 1,000 € */
	pensionRate: 0.2,
	pensionCap: 1000,
} as const;

/** Conventional value for buildings located abroad: 500 €/m² */
export const BUILDING_EUR_PER_SQM = 500;

/** ISP exemption threshold for the main residence. */
export const MAIN_RESIDENCE_THRESHOLD = 52500;

/** Counted fraction (2/3) for main residence value above the threshold. */
export const MAIN_RESIDENCE_FACTOR = 2 / 3;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MemberRole = 'student' | 'parent' | 'sibling' | 'other';

export interface Member {
	id: string;
	role: MemberRole;
	name: string;
	/** All amounts are entered in the local currency (e.g. TRY) and converted to EUR in the calculation. */
	salary: number; // annual salary / employment income
	pension: number; // annual pension income
	selfEmployment: number; // self-employment / business income
	rentalIncome: number; // rental income
	otherIncome: number; // scholarship / aid / other
}

export type PropertyKind = 'building' | 'land';

export interface Property {
	id: string;
	label: string;
	kind: PropertyKind;
	/** m² for a building (valued at 500 €/m²). */
	areaSqm: number;
	/** Whether the user enters the value directly instead of m² (local currency). */
	useManualValue: boolean;
	manualValue: number; // total value in local currency
	/** Ownership share, percentage (0-100). */
	ownershipPct: number;
	/** Does the household live in this property (main residence)? */
	isMainResidence: boolean;
}

export interface HouseholdState {
	currency: string; // e.g. "TRY"
	exchangeRate: number; // 1 EUR = X local currency
	studentIndependent: boolean;
	parentStatus: 'married' | 'divorced' | 'unmarried';
	members: Member[];
	movableBank: number; // bank/post: higher of Dec 31 or average balance (local currency)
	movableInvestments: number; // funds/stocks/bonds/insurance/company shares (local currency)
	properties: Property[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function toEur(amountLocal: number, rate: number): number {
	if (!rate || rate <= 0) return 0;
	return (amountLocal || 0) / rate;
}

/** Household size = number of members. */
export function householdSize(s: HouseholdState): number {
	return Math.max(1, s.members.length);
}

/**
 * Equivalence coefficient (guide §7).
 * 1→1.00 · 2→1.57 · 3→2.04 · 4→2.46 · 5→2.85 · 5+ adds +0.35 per extra person
 */
export function equivalenceCoefficient(size: number): number {
	const base: Record<number, number> = {
		1: 1.0,
		2: 1.57,
		3: 2.04,
		4: 2.46,
		5: 2.85,
	};
	if (size <= 5) return base[size] ?? 1.0;
	return 2.85 + (size - 5) * 0.35;
}

/**
 * Movable-asset franchise / exemption (guide §6.1).
 * 1 person 6,000 · 2 people 8,000 · 3 people 10,000 · 4+ 10,000 (+1,000 for each
 * child after the second). Child count is roughly approximated as (members − parents).
 */
export function movableFranchise(size: number, childCount: number): number {
	let base: number;
	if (size <= 1) base = 6000;
	else if (size === 2) base = 8000;
	else base = 10000;
	// For 4+ people, add +1,000 for each child after the second
	if (size >= 4 && childCount > 2) {
		base += (childCount - 2) * 1000;
	}
	return base;
}

// ---------------------------------------------------------------------------
// Component calculations
// ---------------------------------------------------------------------------

export interface MemberIncome {
	member: Member;
	grossEur: number;
	deductionEur: number;
	netEur: number;
}

/** Income deductions for a single member (salary 20%≤3,000€, pension 20%≤1,000€). */
export function memberIncome(m: Member, rate: number): MemberIncome {
	const salary = toEur(m.salary, rate);
	const pension = toEur(m.pension, rate);
	const self = toEur(m.selfEmployment, rate);
	const rent = toEur(m.rentalIncome, rate);
	const other = toEur(m.otherIncome, rate);

	const gross = salary + pension + self + rent + other;

	const salaryDeduction = Math.min(
		salary * INCOME_DEDUCTION.salaryRate,
		INCOME_DEDUCTION.salaryCap,
	);
	const pensionDeduction = Math.min(
		pension * INCOME_DEDUCTION.pensionRate,
		INCOME_DEDUCTION.pensionCap,
	);
	const deduction = salaryDeduction + pensionDeduction;

	return {
		member: m,
		grossEur: gross,
		deductionEur: deduction,
		netEur: Math.max(0, gross - deduction),
	};
}

/** Value contributed to ISP by a single property (in EUR). */
export function propertyIspEur(p: Property, rate: number): number {
	// Raw value (local) → EUR
	const rawLocal = p.useManualValue
		? p.manualValue
		: p.kind === 'building'
			? p.areaSqm * BUILDING_EUR_PER_SQM * rate // m²×500€ value to local; converted back below
			: p.manualValue; // no m² convention for land → manual value expected

	// For the building + m² option the value is already EUR-based, so handle it specially:
	let valueEur: number;
	if (!p.useManualValue && p.kind === 'building') {
		valueEur = p.areaSqm * BUILDING_EUR_PER_SQM;
	} else {
		valueEur = toEur(rawLocal, rate);
	}

	// Ownership share
	const net = valueEur * (Math.min(100, Math.max(0, p.ownershipPct)) / 100);

	if (p.isMainResidence) {
		// Main residence: 0 if below threshold, otherwise (value − threshold) × 2/3
		if (net <= MAIN_RESIDENCE_THRESHOLD) return 0;
		return (net - MAIN_RESIDENCE_THRESHOLD) * MAIN_RESIDENCE_FACTOR;
	}
	// If not the main residence it enters directly
	return net;
}

// ---------------------------------------------------------------------------
// Aggregate result
// ---------------------------------------------------------------------------

export interface IseeuResult {
	size: number;
	coefficient: number;
	// ISR
	incomes: MemberIncome[];
	isr: number;
	// ISP
	movableTotalEur: number;
	movableFranchiseEur: number;
	movableIsp: number;
	immovableIsp: number;
	isp: number;
	// Combined
	ise: number;
	iseeu: number;
	ispeu: number;
}

export function computeIseeu(s: HouseholdState): IseeuResult {
	const rate = s.exchangeRate;
	const size = householdSize(s);
	const coefficient = equivalenceCoefficient(size);

	// ISR
	const incomes = s.members.map((m) => memberIncome(m, rate));
	const isr = incomes.reduce((acc, i) => acc + i.netEur, 0);

	// Movable ISP
	const childCount = s.members.filter(
		(m) => m.role === 'student' || m.role === 'sibling',
	).length;
	const movableTotalEur =
		toEur(s.movableBank, rate) + toEur(s.movableInvestments, rate);
	const movableFranchiseEur = movableFranchise(size, childCount);
	const movableIsp = Math.max(0, movableTotalEur - movableFranchiseEur);

	// Immovable ISP
	const immovableIsp = s.properties.reduce(
		(acc, p) => acc + propertyIspEur(p, rate),
		0,
	);

	const isp = movableIsp + immovableIsp;

	// Combined
	const ise = isr + 0.2 * isp;
	const iseeu = coefficient > 0 ? ise / coefficient : ise;
	const ispeu = coefficient > 0 ? isp / coefficient : isp;

	return {
		size,
		coefficient,
		incomes,
		isr,
		movableTotalEur,
		movableFranchiseEur,
		movableIsp,
		immovableIsp,
		isp,
		ise,
		iseeu,
		ispeu,
	};
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const eurFmt = new Intl.NumberFormat('tr-TR', {
	style: 'currency',
	currency: 'EUR',
	maximumFractionDigits: 0,
});

const eurFmt2 = new Intl.NumberFormat('tr-TR', {
	style: 'currency',
	currency: 'EUR',
	maximumFractionDigits: 2,
});

export function formatEur(n: number, decimals = false): string {
	if (!isFinite(n)) return '—';
	return (decimals ? eurFmt2 : eurFmt).format(n);
}

export function formatNumber(n: number): string {
	return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(
		n,
	);
}
