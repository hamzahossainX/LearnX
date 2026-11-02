ALTER TABLE "ai_roadmaps" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "ai_roadmaps" ADD CONSTRAINT "ai_roadmaps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_roadmaps_user_updated_idx" ON "ai_roadmaps" USING btree ("user_id","updated_at");