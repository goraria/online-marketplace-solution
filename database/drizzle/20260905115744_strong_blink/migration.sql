ALTER TABLE "users" ADD COLUMN "banned_until" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "synced_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "users_external_user_id_idx" ON "users" USING btree ("external_user_id");