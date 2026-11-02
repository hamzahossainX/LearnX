import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { aiRoadmaps, users } from "@/db/schema";
import { LearningDashboard } from "@/components/learning/learning-dashboard";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 12;

async function loadRoadmaps(email: string, page: number) {
  // Ownership comes only from the verified session, never a client user ID.
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true },
  });
  if (!user) return [];
  return db.query.aiRoadmaps.findMany({
    where: eq(aiRoadmaps.userId, user.id),
    columns: { id: true, title: true, description: true, estimatedDuration: true, updatedAt: true },
    with: { milestones: {
      columns: { id: true, title: true, position: true, isCompleted: true },
      orderBy: (milestones, { asc }) => [asc(milestones.position)],
    } },
    orderBy: [desc(aiRoadmaps.updatedAt), desc(aiRoadmaps.id)],
    limit: PAGE_SIZE + 1,
    offset: (page - 1) * PAGE_SIZE,
  });
}

export default async function StudentPage({ searchParams }: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  const params = await searchParams;
  const parsedPage = Number(params.page ?? 1);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 && parsedPage <= 10000 ? parsedPage : 1;
  let roadmaps: Awaited<ReturnType<typeof loadRoadmaps>>;
  try {
    roadmaps = await loadRoadmaps(session.user.email, page);
  } catch {
    console.error("My Learning: could not load saved roadmaps.");
    return <section className="mx-auto max-w-3xl rounded-3xl border border-black/10 p-8 dark:border-white/10">
      <h1 className="text-2xl font-bold">Your learning paths are temporarily unavailable</h1>
      <p className="mt-3 text-black/60 dark:text-white/60">We couldn’t load your saved progress. Please try again in a moment.</p>
      <Button asChild className="mt-6"><Link href="/student">Try again</Link></Button>
    </section>;
  }
  return <LearningDashboard roadmaps={roadmaps.slice(0, PAGE_SIZE)} page={page} hasNextPage={roadmaps.length > PAGE_SIZE} />;
}
