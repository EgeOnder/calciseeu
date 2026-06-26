ALTER TABLE "document" ADD COLUMN "analysis_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "analysis" jsonb;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "analysis_error" text;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "analyzed_at" timestamp;