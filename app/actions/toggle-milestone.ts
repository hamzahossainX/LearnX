"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { aiRoadmaps, roadmapMilestones } from "@/db/schema";
import { db } from "@/db";
import { requireSignedInEmail } from "@/lib/require-session";

export async function toggleMilestone(milestoneId: string, completed: boolean) {
  const email = await requireSignedInEmail();
  const id = z.string().uuid().parse(milestoneId);
  z.boolean().parse(completed);

  const [updated] = await db.update(roadmapMilestones)
    .set({ isCompleted: completed, completedAt: completed ? new Date() : null })
    .where(and(eq(roadmapMilestones.id, id), sql`exists (
      select 1 from ai_roadmaps r
      where r.id = ${roadmapMilestones.roadmapId}
        and (r.user_id is null or r.user_id = (select id from users where email = ${email}))
    )`))
    .returning({ id: roadmapMilestones.id, roadmapId: roadmapMilestones.roadmapId });

  if (!updated) throw new Error("Milestone not found");
  await db.update(aiRoadmaps).set({ updatedAt: sql`now()` }).where(eq(aiRoadmaps.id, sql`(select roadmap_id from roadmap_milestones where id = ${id}::uuid)`));
  revalidatePath(`/roadmap/${updated.roadmapId}`);
  revalidatePath("/student");
  return { success: true };
}
