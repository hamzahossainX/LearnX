export default function Loading() {
  return <div role="status" className="mx-auto max-w-5xl animate-pulse space-y-6 motion-reduce:animate-none">
    <p className="text-sm text-black/60 dark:text-white/60">Loading your learning paths…</p>
    <div className="h-40 rounded-3xl bg-black/5 dark:bg-white/5" />
    <div className="grid gap-4 sm:grid-cols-2">{[0, 1].map((id) => <div key={id} className="h-64 rounded-2xl bg-black/5 dark:bg-white/5" />)}</div>
  </div>;
}
