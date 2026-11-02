import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLearningProgress } from "@/lib/learning-progress";

type LearningPath = {
  id: string;
  title: string;
  description: string;
  estimatedDuration: string;
  updatedAt: Date;
  milestones: { id: string; title: string; position: number; isCompleted: boolean }[];
};

export function LearningDashboard({ roadmaps, page, hasNextPage }: {
  roadmaps: LearningPath[]; page: number; hasNextPage: boolean;
}) {
  const resume = page === 1 ? roadmaps.find((item) => getLearningProgress(item.milestones).nextMilestone) : undefined;
  return <div className="mx-auto max-w-5xl space-y-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#3c7156] dark:text-[#a9e950]">Your learning space</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">My Learning</h1>
        <p className="mt-3 text-black/60 dark:text-white/60">Small steps, real progress. Pick up where you left off.</p>
      </div>
      <Button asChild className="bg-[#c8ff65] text-slate-950 hover:bg-[#b8ef55]"><Link href="/"><Plus size={16} />New roadmap</Link></Button>
    </header>
    {resume && <section aria-label="Continue learning" className="rounded-3xl border border-[#3c7156]/25 bg-[#3c7156]/5 p-6 dark:border-[#a9e950]/20 dark:bg-[#a9e950]/5 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-widest text-[#3c7156] dark:text-[#a9e950]">Continue learning</p>
      <h2 className="mt-3 break-words text-2xl font-bold">{resume.title}</h2>
      <p className="mt-2 text-sm text-black/60 dark:text-white/60">Up next: {getLearningProgress(resume.milestones).nextMilestone?.title}</p>
      <Button asChild className="mt-5"><Link href={`/roadmap/${resume.id}`}>Continue learning<ArrowRight size={16} /></Link></Button>
    </section>}
    {roadmaps.length === 0 ? <section className="rounded-3xl border border-dashed border-black/15 px-6 py-16 text-center dark:border-white/20">
      <BookOpen className="mx-auto size-10 text-[#3c7156] dark:text-[#a9e950]" />
      <h2 className="mt-5 text-2xl font-bold">{page === 1 ? "Your next chapter starts here" : "No more learning paths"}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-black/60 dark:text-white/60">New roadmaps you generate with your account will appear here, with progress saved across devices.</p>
      <Button asChild className="mt-6"><Link href={page === 1 ? "/" : "/student"}>{page === 1 ? "Create your first roadmap" : "Back to your paths"}</Link></Button>
    </section> : <section aria-label="Saved roadmaps">
      <h2 className="mb-4 text-lg font-bold">Your paths</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {roadmaps.map((roadmap) => {
          const progress = getLearningProgress(roadmap.milestones);
          return <article key={roadmap.id} className="flex flex-col rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/[.025]">
            <div className="flex items-center justify-between gap-2 text-xs text-black/55 dark:text-white/55">
              <span>{roadmap.estimatedDuration}</span>
              <span className="flex items-center gap-1">{progress.isComplete && <CheckCircle2 size={14} />}{progress.isComplete ? "Completed" : progress.completed ? "In progress" : "Ready to start"}</span>
            </div>
            <h3 className="mt-4 break-words text-xl font-bold">{roadmap.title}</h3>
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-black/60 dark:text-white/60">{roadmap.description}</p>
            <div className="mt-6 flex justify-between text-xs font-medium"><span>{progress.completed} of {progress.total} milestones</span><span>{progress.percent}%</span></div>
            <div role="progressbar" aria-label={`${roadmap.title} progress`} aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
              <div className="h-full rounded-full bg-[#3c7156] dark:bg-[#a9e950]" style={{ width: `${progress.percent}%` }} />
            </div>
            <p className="mt-3 text-xs text-black/55 dark:text-white/55">{progress.nextMilestone ? `Next: ${progress.nextMilestone.title}` : progress.isComplete ? "All milestones complete. Well done!" : "No milestones yet."}</p>
            <div className="mt-auto flex items-center justify-between gap-3 pt-6">
              <time className="text-xs text-black/45 dark:text-white/45" dateTime={roadmap.updatedAt.toISOString()}>Updated {roadmap.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</time>
              <Button asChild variant="outline" size="sm"><Link href={`/roadmap/${roadmap.id}`}>{progress.isComplete ? "Review" : "Continue"}<ArrowRight size={14} /></Link></Button>
            </div>
          </article>;
        })}
      </div>
    </section>}
    {(page > 1 || hasNextPage) && <nav aria-label="Learning paths pages" className="flex items-center justify-center gap-4">
      {page > 1 && <Button asChild variant="outline"><Link href={`/student?page=${page - 1}`}>Previous</Link></Button>}
      <span className="text-sm">Page {page}</span>
      {hasNextPage && <Button asChild variant="outline"><Link href={`/student?page=${page + 1}`}>Next</Link></Button>}
    </nav>}
    <p className="text-xs leading-relaxed text-black/45 dark:text-white/45">Only roadmaps created after account saving was enabled appear here. Older and shared roadmaps remain available through their original links.</p>
  </div>;
}
