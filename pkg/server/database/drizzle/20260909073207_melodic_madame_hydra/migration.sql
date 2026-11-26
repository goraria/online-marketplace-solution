CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'suspended', 'deleted');--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "banned_until" TO "ban_expires";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_username_unique";--> statement-breakpoint
DROP INDEX "users_last_seen_at_idx";--> statement-breakpoint
DROP INDEX "users_external_user_id_idx";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "username" SET DATA TYPE varchar(64);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "last_seen_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "synced_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "synced_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" "user_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "user_last_seen_at_idx" ON "users" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "user_external_user_id_idx" ON "users" USING btree ("external_user_id");--> statement-breakpoint
CREATE INDEX "user_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "user_username_lower_key" ON "users" USING btree (lower("username"));