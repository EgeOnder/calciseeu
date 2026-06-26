import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

import { db } from '@/src/db';
import { document } from '@/src/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { isProUser } from '@/src/lib/pro';
import { getObjectBytes } from '@/src/lib/r2';

/**
 * Zod schema for a document's cached ISEEU findings. This is the single source
 * of truth; {@link DocumentAnalysis} and the finding types are derived from it.
 *
 * The result is deliberately a mix of a free-form `summary` (the model's
 * conclusions) and structured numbers, so that computing ISR / ISP / the
 * equivalence coefficient later (see the ISEEU Parificato guide) is a matter of
 * summing already-extracted figures rather than re-reading the file. All amounts
 * stay in the document's own currency (see `currency`) plus `referenceYear`, so
 * conversion to EUR using the year's Dec 31 rate happens once, at calculation
 * time. OpenAI structured outputs reject `.optional()` / `.nullish()`, so every
 * absent-able field is `.nullable()`.
 */
const analysisSchema = z.object({
	documentType: z.enum([
		'income',
		'bank_statement',
		'investment',
		'real_estate',
		'rental',
		'family_status',
		'identity',
		'other',
		'unknown',
	]),
	summary: z
		.string()
		.describe(
			'Belgenin ne olduğu ve neyi gösterdiğine dair kısa, Türkçe sonuç.',
		),
	suggestedName: z
		.string()
		.nullable()
		.describe(
			'Yalnızca gerekliyse, daha açıklayıcı bir dosya adı önerisi (UZANTISIZ). Mevcut ad zaten anlaşılırsa null döndür.',
		),
	referenceYear: z.number().int().nullable(),
	currency: z.string().nullable().describe('ISO 4217, örn. TRY, EUR.'),
	personLabel: z.string().nullable(),
	income: z
		.object({
			kind: z.enum([
				'salary',
				'pension',
				'self_employment',
				'rental',
				'benefit',
				'other',
			]),
			annualAmount: z.number().nullable(),
			label: z.string().nullable(),
		})
		.array(),
	movableAssets: z
		.object({
			kind: z.enum([
				'bank',
				'investment',
				'insurance',
				'company_share',
				'other',
			]),
			balanceDec31: z
				.number()
				.nullable()
				.describe(
					'31.12.2024 tarihindeki hesap/varlık bakiyesi. Banka hesabı için çıkarılması gereken esas değer.',
				),
			ownershipShare: z.number().nullable(),
			label: z.string().nullable(),
		})
		.array(),
	immovableAssets: z
		.object({
			kind: z.enum(['building', 'land', 'other']),
			buildingSqm: z.number().nullable(),
			landSqm: z.number().nullable(),
			declaredValue: z
				.number()
				.nullable()
				.describe(
					'Yalnızca arsa/diğer taşınmaz için belgelenmiş değer. Bina/konut için rayiç bedel kullanılmaz; null döndür.',
				),
			ownershipShare: z.number().nullable(),
			isPrimaryResidence: z.boolean().nullable(),
			mortgageRemaining: z.number().nullable(),
			label: z.string().nullable(),
		})
		.array(),
	householdMembers: z
		.object({
			relation: z.string().nullable(),
			name: z.string().nullable(),
		})
		.array(),
	missingInfo: z.string().array(),
	confidence: z.enum(['high', 'medium', 'low']),
});

/** A document's cached ISEEU findings (see {@link analysisSchema}). */
export type DocumentAnalysis = z.infer<typeof analysisSchema>;
/** An income item feeding ISR. */
export type IncomeFinding = DocumentAnalysis['income'][number];
/** A movable asset (bank balance, investment, share) feeding ISP. */
export type MovableAssetFinding = DocumentAnalysis['movableAssets'][number];
/** An immovable asset (building, land) feeding ISP. */
export type ImmovableAssetFinding = DocumentAnalysis['immovableAssets'][number];
/** A household member named by a family-status document. */
export type HouseholdMemberFinding =
	DocumentAnalysis['householdMembers'][number];

/** The ISEEU rules the model needs to extract the right figures. */
const SYSTEM_PROMPT = `You extract data from a single document for an estimated ISEEU Parificato calculation (Politecnico di Milano DSU, students with income/assets abroad).

ISEEU is built from:
- ISR (income indicator): sum of household members' annual incomes for the reference year, after deductions.
- ISP (asset indicator): movable assets (bank/postal balances, investments, insurance savings, company shares) plus immovable assets (buildings, land).
- ISE = ISR + 0.20 × ISP; ISEEU = ISE ÷ equivalence coefficient; ISPEU = ISP ÷ equivalence coefficient.

What matters per document type:
- Income: salary, pension, self-employment, rental, benefits. Capture the GROSS ANNUAL amount for the reference year. (Deductions and caps are applied later, not by you.)
- Bank/postal accounts: capture the balance specifically at 31.12.2024. This is the only bank balance used by the formula. Do not request or extract the yearly average balance. For joint accounts capture the owner's share (0..1).
- Investments / funds / stocks / bonds / insurance / company shares: capture the Dec 31 value.
- Real estate: capture BUILDING floor area (m²) and LAND/parcel area (m²) SEPARATELY (do not confuse parcel area with the building), ownership share (0..1), whether it is the primary residence, and any remaining mortgage principal.
- For every BUILDING/HOME, including the primary residence, rayiç bedel / assessed value / market value is IRRELEVANT. Do not extract it into declaredValue; set declaredValue to null. Only buildingSqm enters the formula. Capture declaredValue only for land/other non-building property.
- Family-status documents (family registry, residence, marital status, divorce/separation): list the household members and their relation to the student.

Rules:
- Report every amount in the document's ORIGINAL currency and set "currency" (ISO 4217). Do NOT convert to EUR.
- Set "referenceYear" to the calendar year the figures belong to when stated.
- Only report figures that actually appear in THIS document. Never invent or estimate numbers; use null when a value is not present.
- Put genuinely useful but missing/ambiguous facts into "missingInfo".
- Write "summary", "label" and "personLabel" in Turkish.
- If the document is irrelevant to ISEEU (e.g. an ID), set documentType accordingly and leave the figure arrays empty.

File renaming ("suggestedName"):
- The current file name is given in the user message.
- Default to null. Only suggest a new name when renaming would MEANINGFULLY improve clarity — e.g. the current name is generic or uninformative like "IMG_1234", "scan", "document", "belge", "Adsız", "WhatsApp Image 2024-...".
- If the current name already clearly describes the document, return null.
- A suggestion must be a concise, human-readable Turkish title describing the document (e.g. type + person + year, like "Baba 2024 Maaş Belgesi"). NEVER include a file extension (no ".pdf"/".jpg") and no folder path. Keep it under ~60 characters.`;

/** Model used for analysis; overridable for cost/quality tuning. */
const ANALYSIS_MODEL = process.env.OPENAI_ANALYSIS_MODEL ?? 'gpt-4o';

/**
 * Runs the LLM over a document's bytes and returns the structured ISEEU
 * findings. `mediaType` must be the file's MIME type (application/pdf,
 * image/jpeg, image/png).
 */
export async function analyzeDocument(params: {
	bytes: Uint8Array;
	mediaType: string;
	fileName: string;
}): Promise<DocumentAnalysis> {
	const { output } = await generateText({
		model: openai(ANALYSIS_MODEL),
		system: SYSTEM_PROMPT,
		messages: [
			{
				role: 'user',
				content: [
					{
						type: 'text',
						text: `Aşağıdaki belgeyi ("${params.fileName}") ISEEU kurallarına göre analiz et ve bulguları çıkar.`,
					},
					{
						type: 'file',
						data: params.bytes,
						mediaType: params.mediaType,
					},
				],
			},
		],
		output: Output.object({ schema: analysisSchema }),
	});

	return output;
}

/**
 * Fetches a stored document, analyzes it, and caches the result on the row.
 * Owner-scoped and self-contained so it can run from `after()` once the upload
 * is confirmed, or from a retry endpoint. Never throws: failures are recorded
 * as `analysis_status = 'failed'` so they can be retried later.
 */
export async function runDocumentAnalysis(
	documentId: string,
	userId: string,
): Promise<void> {
	if (!(await isProUser(userId))) return;

	// Claim the row before downloading or calling the model. Upload confirmation
	// and automatic-calculation creation can both enqueue the same document;
	// this conditional update ensures only one worker performs the analysis.
	const [row] = await db
		.update(document)
		.set({ analysisStatus: 'processing', analysisError: null })
		.where(
			and(
				eq(document.id, documentId),
				eq(document.userId, userId),
				inArray(document.analysisStatus, ['pending', 'failed']),
			),
		)
		.returning({
			key: document.key,
			type: document.type,
			name: document.name,
		});

	if (!row) return;

	try {
		const bytes = await getObjectBytes(row.key);
		const analysis = await analyzeDocument({
			bytes,
			mediaType: row.type,
			fileName: row.name,
		});

		await db
			.update(document)
			.set({
				analysis,
				analysisStatus: 'completed',
				analysisError: null,
				analyzedAt: new Date(),
			})
			.where(
				and(eq(document.id, documentId), eq(document.userId, userId)),
			);
	} catch (error) {
		await db
			.update(document)
			.set({
				analysisStatus: 'failed',
				analysisError:
					error instanceof Error
						? error.message
						: 'Analiz başarısız oldu.',
			})
			.where(
				and(eq(document.id, documentId), eq(document.userId, userId)),
			);
	}
}
