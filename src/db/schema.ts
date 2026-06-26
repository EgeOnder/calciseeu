import { relations } from 'drizzle-orm';
import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	real,
	text,
	timestamp,
	uniqueIndex,
} from 'drizzle-orm/pg-core';

import type { CalcConfig } from '@/src/lib/store';
import type { HouseholdState } from '@/src/lib/iseeu';
import type { AutomaticCalculationData } from '@/src/lib/automatic';
import type { DocumentAnalysis } from '@/src/lib/document-analysis';

/** Calculation kind shown with its own icon in the sidebar. */
export type CalculationType = 'manual' | 'automatic';

/** Lifecycle of a document's LLM analysis (the cached ISEEU findings). */
export type DocumentAnalysisStatus =
	| 'pending'
	| 'processing'
	| 'completed'
	| 'failed';

/** Everything needed to re-open a saved calculation in the wizard. */
export interface CalculationData {
	state: HouseholdState;
	config: CalcConfig;
	/** Present only for automatic calculations: the chat + its documents. */
	automatic?: AutomaticCalculationData;
}

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	image: text('image'),
	isPro: boolean('is_pro').default(false).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export const session = pgTable(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: timestamp('expires_at').notNull(),
		token: text('token').notNull().unique(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
	},
	(table) => [index('session_user_id_idx').on(table.userId)],
);

export const account = pgTable(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at'),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
		scope: text('scope'),
		password: text('password'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index('account_user_id_idx').on(table.userId)],
);

export const verification = pgTable(
	'verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: timestamp('expires_at').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index('verification_identifier_idx').on(table.identifier)],
);

export const feedback = pgTable(
	'feedback',
	{
		id: text('id').primaryKey(),
		message: text('message').notNull(),
		path: text('path'),
		userAgent: text('user_agent'),
		userId: text('user_id').references(() => user.id, {
			onDelete: 'set null',
		}),
		createdAt: timestamp('created_at').defaultNow().notNull(),
	},
	(table) => [
		index('feedback_user_id_idx').on(table.userId),
		index('feedback_created_at_idx').on(table.createdAt),
	],
);

export const calculation = pgTable(
	'calculation',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		type: text('type').$type<CalculationType>().notNull(),
		title: text('title').notNull(),
		/** Estimated ISEEU at save time, for display in the sidebar. */
		iseeu: real('iseeu').default(0).notNull(),
		/** Full wizard snapshot so the calculation can be re-opened. */
		data: jsonb('data').$type<CalculationData>().notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index('calculation_user_id_idx').on(table.userId),
		index('calculation_created_at_idx').on(table.createdAt),
	],
);

export const document = pgTable(
	'document',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		/** Object key within the R2 bucket. */
		key: text('key').notNull(),
		/** Original file name as uploaded by the user. */
		name: text('name').notNull(),
		/** File size in bytes. */
		size: integer('size').notNull(),
		/** MIME type (application/pdf, image/jpeg, image/png). */
		type: text('type').notNull(),
		/**
		 * SHA-256 hex digest of the file contents, used to reject re-uploading
		 * the same file. Nullable so documents stored before hashing existed
		 * stay valid; the unique index treats those NULLs as distinct.
		 */
		hash: text('hash'),
		/** Lifecycle of the cached LLM analysis for this document. */
		analysisStatus: text('analysis_status')
			.$type<DocumentAnalysisStatus>()
			.default('pending')
			.notNull(),
		/**
		 * Cached ISEEU findings extracted from the document by the LLM. Acts as
		 * a cache: calculations read these conclusions instead of re-reading the
		 * file. Null until the analysis completes.
		 */
		analysis: jsonb('analysis').$type<DocumentAnalysis>(),
		/** Last analysis error, kept for debugging / retrying failed runs. */
		analysisError: text('analysis_error'),
		/** When the cached analysis was last produced. */
		analyzedAt: timestamp('analyzed_at'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
	},
	(table) => [
		index('document_user_id_idx').on(table.userId),
		index('document_created_at_idx').on(table.createdAt),
		// One copy of a given file per user: dedupe on (user, content hash).
		uniqueIndex('document_user_id_hash_idx').on(table.userId, table.hash),
	],
);

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	feedback: many(feedback),
	calculations: many(calculation),
	documents: many(document),
}));

export const documentRelations = relations(document, ({ one }) => ({
	user: one(user, {
		fields: [document.userId],
		references: [user.id],
	}),
}));

export const calculationRelations = relations(calculation, ({ one }) => ({
	user: one(user, {
		fields: [calculation.userId],
		references: [user.id],
	}),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
	user: one(user, {
		fields: [feedback.userId],
		references: [user.id],
	}),
}));
