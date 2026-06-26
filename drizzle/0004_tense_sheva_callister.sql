ALTER TABLE "document" ADD COLUMN "hash" text;--> statement-breakpoint
CREATE UNIQUE INDEX "document_user_id_hash_idx" ON "document" USING btree ("user_id","hash");