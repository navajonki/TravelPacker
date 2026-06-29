-- Add packing_list_id to items (previously applied only via an un-journaled
-- standalone script, so it was missing on fresh databases). On a fresh DB the
-- table is empty, so the backfill/DELETE statements are no-ops; on an existing
-- DB they backfill from the related category/bag/traveler before enforcing NOT
-- NULL. Also relaxes category_id to nullable to support "no category" items.
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "packing_list_id" integer;--> statement-breakpoint
UPDATE "items" SET "packing_list_id" = c.packing_list_id FROM categories c WHERE items.category_id = c.id AND items.packing_list_id IS NULL;--> statement-breakpoint
UPDATE "items" SET "packing_list_id" = b.packing_list_id FROM bags b WHERE items.bag_id = b.id AND items.packing_list_id IS NULL;--> statement-breakpoint
UPDATE "items" SET "packing_list_id" = t.packing_list_id FROM travelers t WHERE items.traveler_id = t.id AND items.packing_list_id IS NULL;--> statement-breakpoint
DELETE FROM "items" WHERE "packing_list_id" IS NULL;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "packing_list_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_packing_list_id_packing_lists_id_fk" FOREIGN KEY ("packing_list_id") REFERENCES "public"."packing_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "category_id" DROP NOT NULL;
