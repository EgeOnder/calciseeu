CREATE TABLE "calculation" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"iseeu" real DEFAULT 0 NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calculation" ADD CONSTRAINT "calculation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calculation_user_id_idx" ON "calculation" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "calculation_created_at_idx" ON "calculation" USING btree ("created_at");