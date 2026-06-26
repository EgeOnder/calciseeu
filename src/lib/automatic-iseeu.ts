import {
	BUILDING_EUR_PER_SQM,
	INCOME_DEDUCTION,
	MAIN_RESIDENCE_FACTOR,
	MAIN_RESIDENCE_THRESHOLD,
	equivalenceCoefficient,
	movableFranchise,
} from '@/src/lib/iseeu';
import type {
	AutomaticCalculationParameter,
	AutomaticIseeuResult,
} from '@/src/lib/automatic';

export type AutomaticCurrency = 'EUR' | 'TRY';
export type AutomaticIncomeKind =
	| 'salary'
	| 'pension'
	| 'self_employment'
	| 'rental'
	| 'benefit'
	| 'other';

export interface AutomaticIncomeInput {
	personLabel: string;
	kind: AutomaticIncomeKind;
	annualAmount: number;
	currency: AutomaticCurrency;
	source: string;
}

export interface AutomaticMovableAssetInput {
	kind: 'bank' | 'investment' | 'insurance' | 'company_share' | 'other';
	balanceDec31: number | null;
	valueDec31: number | null;
	ownershipShare: number;
	currency: AutomaticCurrency;
	source: string;
}

export interface AutomaticImmovableAssetInput {
	kind: 'building' | 'land' | 'other';
	buildingSqm: number | null;
	declaredValue: number | null;
	currency: AutomaticCurrency;
	ownershipShare: number;
	isPrimaryResidence: boolean;
	mortgageRemaining: number;
	source: string;
}

export interface AutomaticIseeuInput {
	referenceYear: number;
	householdSize: number;
	childCount: number;
	incomes: AutomaticIncomeInput[];
	movableAssets: AutomaticMovableAssetInput[];
	immovableAssets: AutomaticImmovableAssetInput[];
}

export type AutomaticIseeuComputation =
	| { ok: true; result: AutomaticIseeuResult }
	| { ok: false; errors: string[] };

export type AutomaticIseeuInputBuild =
	| { ok: true; input: AutomaticIseeuInput }
	| { ok: false; errors: string[] };

/** Builds formula input exclusively from persisted, confirmed parameters. */
export function buildAutomaticIseeuInput(
	parameters: AutomaticCalculationParameter[],
): AutomaticIseeuInputBuild {
	const referenceYear = parameters.find(
		(parameter) => parameter.kind === 'reference_year',
	);
	const householdSize = parameters.find(
		(parameter) => parameter.kind === 'household_size',
	);
	const childCount = parameters.find(
		(parameter) => parameter.kind === 'child_count',
	);
	const confirmations = new Set(
		parameters
			.filter((parameter) => parameter.kind === 'category_confirmation')
			.map((parameter) => parameter.value.category),
	);
	const errors: string[] = [];

	if (!referenceYear) errors.push('Referans yılı kaydedilmemiş.');
	if (!householdSize) errors.push('Hane büyüklüğü kaydedilmemiş.');
	if (!childCount) errors.push('Çocuk sayısı kaydedilmemiş.');
	for (const category of [
		'household',
		'income',
		'movable_assets',
		'immovable_assets',
	] as const) {
		if (!confirmations.has(category)) {
			errors.push(`${category} kategorisi henüz doğrulanmamış.`);
		}
	}
	if (!referenceYear || !householdSize || !childCount || errors.length > 0) {
		return { ok: false, errors };
	}

	return {
		ok: true,
		input: {
			referenceYear: referenceYear.value,
			householdSize: householdSize.value,
			childCount: childCount.value,
			incomes: parameters
				.filter((parameter) => parameter.kind === 'income')
				.map((parameter) => ({
					...parameter.value,
					source: parameter.source,
				})),
			movableAssets: parameters
				.filter((parameter) => parameter.kind === 'movable_asset')
				.map((parameter) => ({
					...parameter.value,
					source: parameter.source,
				})),
			immovableAssets: parameters
				.filter((parameter) => parameter.kind === 'immovable_asset')
				.map((parameter) => ({
					...parameter.value,
					source: parameter.source,
				})),
		},
	};
}

/** 31.12.2024 Banca d'Italia rate from the supplied guide. */
const TRY_PER_EUR_2024 = 36.7372;

function toEur(amount: number, currency: AutomaticCurrency): number {
	return currency === 'EUR' ? amount : amount / TRY_PER_EUR_2024;
}

/**
 * Deterministic implementation of the supplied ISEEU guide. The model chooses
 * only which documented/user-confirmed facts to pass in; all currency
 * conversion, deductions, franchises, property valuation and final arithmetic
 * happen here.
 */
export function computeAutomaticIseeu(
	input: AutomaticIseeuInput,
): AutomaticIseeuComputation {
	const errors: string[] = [];
	if (input.referenceYear !== 2024) {
		errors.push(
			'Bu hesaplayıcı yalnızca 2026/2027 başvurusu için 2024 referans verilerini destekliyor.',
		);
	}
	if (input.householdSize < 1) {
		errors.push('Hane en az bir kişiden oluşmalıdır.');
	}
	if (input.childCount < 0 || input.childCount > input.householdSize) {
		errors.push('Çocuk sayısı hane büyüklüğüyle uyumlu değil.');
	}

	for (const asset of input.movableAssets) {
		if (asset.kind === 'bank') {
			if (asset.balanceDec31 === null) {
				errors.push(
					`${asset.source}: banka hesabı için 31.12.2024 bakiyesi gerekli.`,
				);
			}
		} else if (asset.valueDec31 === null) {
			errors.push(`${asset.source}: 31 Aralık varlık değeri gerekli.`);
		}
	}

	for (const property of input.immovableAssets) {
		if (property.kind === 'building' && property.buildingSqm === null) {
			errors.push(`${property.source}: bina yüzölçümü (m²) gerekli.`);
		}
		if (property.kind !== 'building' && property.declaredValue === null) {
			errors.push(`${property.source}: taşınmazın belgelenmiş değeri gerekli.`);
		}
	}

	if (errors.length > 0) return { ok: false, errors };

	const byPerson = new Map<
		string,
		{ salary: number; pension: number; other: number }
	>();
	for (const income of input.incomes) {
		const current = byPerson.get(income.personLabel) ?? {
			salary: 0,
			pension: 0,
			other: 0,
		};
		const eur = toEur(income.annualAmount, income.currency);
		if (income.kind === 'salary') current.salary += eur;
		else if (income.kind === 'pension') current.pension += eur;
		else current.other += eur;
		byPerson.set(income.personLabel, current);
	}

	let isr = 0;
	for (const income of byPerson.values()) {
		const salaryDeduction = Math.min(
			income.salary * INCOME_DEDUCTION.salaryRate,
			INCOME_DEDUCTION.salaryCap,
		);
		const pensionDeduction = Math.min(
			income.pension * INCOME_DEDUCTION.pensionRate,
			INCOME_DEDUCTION.pensionCap,
		);
		isr += Math.max(
			0,
			income.salary +
				income.pension +
				income.other -
				salaryDeduction -
				pensionDeduction,
		);
	}

	const movableTotalEur = input.movableAssets.reduce((total, asset) => {
		const value =
			asset.kind === 'bank'
				? (asset.balanceDec31 ?? 0)
				: (asset.valueDec31 ?? 0);
		return total + toEur(value, asset.currency) * asset.ownershipShare;
	}, 0);
	const movableFranchiseEur = movableFranchise(
		input.householdSize,
		input.childCount,
	);
	const movableIsp = Math.max(0, movableTotalEur - movableFranchiseEur);

	const immovableIsp = input.immovableAssets.reduce((total, property) => {
		const grossValueEur =
			property.kind === 'building'
				? (property.buildingSqm ?? 0) * BUILDING_EUR_PER_SQM
				: toEur(property.declaredValue ?? 0, property.currency);
		const mortgageEur = toEur(
			property.mortgageRemaining,
			property.currency,
		);
		const ownedNetValue = Math.max(
			0,
			grossValueEur * property.ownershipShare - mortgageEur,
		);
		if (!property.isPrimaryResidence) return total + ownedNetValue;
		return (
			total +
			Math.max(0, ownedNetValue - MAIN_RESIDENCE_THRESHOLD) *
				MAIN_RESIDENCE_FACTOR
		);
	}, 0);

	const coefficient = equivalenceCoefficient(input.householdSize);
	const isp = movableIsp + immovableIsp;
	const ise = isr + 0.2 * isp;

	return {
		ok: true,
		result: {
			referenceYear: input.referenceYear,
			householdSize: input.householdSize,
			coefficient,
			isr,
			movableTotalEur,
			movableFranchiseEur,
			movableIsp,
			immovableIsp,
			isp,
			ise,
			iseeu: ise / coefficient,
			ispeu: isp / coefficient,
			calculatedAt: new Date().toISOString(),
		},
	};
}
