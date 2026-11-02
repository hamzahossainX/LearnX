"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Layers,
  Pause,
  Play,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Volume2,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { DEMO_ROADMAP } from "@/lib/demo-roadmap";
import { encodeRoadmapForUrl } from "@/lib/roadmap-sharing";
import { cn } from "@/lib/utils";

export const START_TOUR_EVENT = "learnx:start-tour";
const AUTO_CONTINUE_SESSION_KEY = "learnx:tour-auto-continue";
const TOUR_SEEN_STORAGE_KEY = "learnx:judge-tour-seen:v1";
const STEP_AUTO_ADVANCE_MS = 4200;

export type TourStep = {
  selector: string;
  title: string;
  description: string;
  badge?: string;
  techHighlight?: string;
  isDemoTrigger?: boolean;
};

const TOUR_STEPS: TourStep[] = [
  {
    selector: "[data-tour='hero']",
    title: "One goal, one clear path",
    description: "Start with any natural-language learning goal, choose experience level, and generate a structured, week-by-week curriculum.",
    badge: "AI Path Builder",
    techHighlight: "Zod-validated prompts · Multi-provider failover · Atomic transactions",
  },
  {
    selector: "[data-tour='demo']",
    title: "Demo-safe by design",
    description: "Judges can explore a complete, production-grade roadmap without authentication, AI keys, or a live database connection.",
    badge: "Offline Reliability",
    techHighlight: "Zero-dependency sandbox · URL-encoded recovery state · Zero rate limits",
    isDemoTrigger: true,
  },
  {
    selector: "[data-tour='career-insights']",
    title: "Market value & career snapshot",
    description: "Evaluates real-world labor demand, salary ranges, and target job titles for the requested skillset.",
    badge: "Labor Insights",
    techHighlight: "Estimated salary brackets · Active job market telemetry · Top career titles",
  },
  {
    selector: "[data-tour='roadmap-header']",
    title: "Your command center",
    description: "Track completion, listen to full summaries with Web Speech synthesis, and monitor completion progress at a glance.",
    badge: "Progress & Audio",
    techHighlight: "Web Speech API narration · Animated progress telemetry · Accessible announcements",
  },
  {
    selector: "[data-tour='roadmap-actions']",
    title: "Built for action",
    description: "Open study streaks, workload planning heatmaps, achievement badges, adaptations, AI critique, and exports.",
    badge: "Productivity Suite",
    techHighlight: "Notion markdown export · Client-side PDF certificates · Study activity streaks",
  },
  {
    selector: "[data-tour='view-switcher']",
    title: "Two ways to understand",
    description: "Toggle seamlessly between a tactical milestone timeline and an interactive, AI-generated Mermaid mind map.",
    badge: "Dual Mental Models",
    techHighlight: "Mermaid.js SVG diagram engine · Zero layout shift · Responsive pan/zoom",
  },
  {
    selector: "[data-tour='milestone-list']",
    title: "Learn, focus, prove",
    description: "Each milestone combines curated documentation, Zen Pomodoro focus mode, progress tracking, and interactive quizzes.",
    badge: "Deep Pedagogy",
    techHighlight: "Curated documentation · ELI5 simplifier · Pomodoro timer · Quiz-gated milestones",
  },
  {
    selector: "[data-tour='feedback']",
    title: "Close the feedback loop",
    description: "Learners can rate the roadmap locally and provide improvement notes without sending private feedback to a server.",
    badge: "Privacy First",
    techHighlight: "100% localStorage sandbox · Zero third-party telemetry · Instant satisfaction rating",
  },
];

/**
 * Enhanced Header Launcher Button
 * High visual appeal with micro-pill badge, pinging indicator, and shortcut hints.
 */
export function GuidedTourLauncher() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(START_TOUR_EVENT))}
      aria-label="Start judge tour"
      title="Start judge tour (Press Shift+T)"
      className="group relative inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-[#3c7156]/25 bg-gradient-to-r from-[#f0f7e7] to-[#e8f4dc] px-3.5 text-xs font-black text-[#17211b] shadow-[0_2px_8px_rgba(60,113,86,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#3c7156]/50 hover:bg-[#e4f1d4] hover:shadow-[0_4px_16px_rgba(60,113,86,0.18)] dark:border-[#c8ff65]/25 dark:bg-gradient-to-r dark:from-[#c8ff65]/10 dark:to-[#c8ff65]/5 dark:text-[#c8ff65] dark:hover:border-[#c8ff65]/50 dark:hover:bg-[#c8ff65]/15"
    >
      <span className="relative flex size-2 items-center justify-center">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#3c7156] opacity-75 dark:bg-[#c8ff65]" />
        <span className="relative inline-flex size-1.5 rounded-full bg-[#3c7156] dark:bg-[#c8ff65]" />
      </span>
      <Sparkles className="size-3.5 text-[#3c7156] transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 dark:text-[#c8ff65]" />
      <span className="tracking-tight">Judge Tour</span>
    </button>
  );
}

/**
 * Main Guided Tour Overlay Component
 */
export function GuidedTour() {
  const router = useRouter();
  const pathname = usePathname();
  const maskId = useId();

  const [steps, setSteps] = useState<TourStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const [isNavigatingDemo, setIsNavigatingDemo] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const activeStep = steps[stepIndex];
  const open = Boolean(activeStep);
  const isLast = stepIndex === steps.length - 1;

  const close = useCallback(() => {
    setSteps([]);
    setStepIndex(0);
    setTargetRect(null);
    setAutoPlay(false);
    try {
      window.localStorage.setItem(TOUR_SEEN_STORAGE_KEY, new Date().toISOString());
      window.sessionStorage.removeItem(AUTO_CONTINUE_SESSION_KEY);
    } catch {
      // Optional storage only
    }
  }, []);

  const refreshSteps = useCallback(() => {
    const availableSteps = TOUR_STEPS.filter((step) => Boolean(document.querySelector(step.selector)));
    setSteps(availableSteps);
    setStepIndex(0);
    setProgressKey((prev) => prev + 1);
  }, []);

  // Listen for manual trigger event
  useEffect(() => {
    function startTour() {
      refreshSteps();
    }
    window.addEventListener(START_TOUR_EVENT, startTour);
    return () => window.removeEventListener(START_TOUR_EVENT, startTour);
  }, [refreshSteps]);

  // Global keyboard shortcut: Shift + T launches tour
  useEffect(() => {
    function handleGlobalShortcut(event: KeyboardEvent) {
      if (event.shiftKey && (event.key === "T" || event.key === "t")) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
          return;
        }
        event.preventDefault();
        refreshSteps();
      }
    }
    window.addEventListener("keydown", handleGlobalShortcut);
    return () => window.removeEventListener("keydown", handleGlobalShortcut);
  }, [refreshSteps]);

  // Cross-route auto-resume on load (e.g. continuing from landing page to demo roadmap)
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(AUTO_CONTINUE_SESSION_KEY) === "true") {
        window.sessionStorage.removeItem(AUTO_CONTINUE_SESSION_KEY);
        const shouldResumeAutoPlay = window.sessionStorage.getItem("learnx:tour-auto-play") === "true";
        window.sessionStorage.removeItem("learnx:tour-auto-play");
        const timer = window.setTimeout(() => {
          refreshSteps();
          if (shouldResumeAutoPlay) {
            setAutoPlay(true);
          }
        }, 500);
        return () => window.clearTimeout(timer);
      }
    } catch {
      // Ignore sessionStorage errors
    }
  }, [pathname, refreshSteps]);

  // Smooth target tracking & geometry updates
  useEffect(() => {
    if (!activeStep) return;

    const matchedTarget = document.querySelector<HTMLElement>(activeStep.selector);
    if (!matchedTarget) {
      // Try next step if available, else close
      if (stepIndex < steps.length - 1) {
        setStepIndex((idx) => idx + 1);
      } else {
        close();
      }
      return;
    }

    const target = matchedTarget;
    target.scrollIntoView({ behavior: "smooth", block: "center" });

    function updateRect() {
      setTargetRect(target.getBoundingClientRect());
    }

    updateRect();
    const frameId = window.requestAnimationFrame(updateRect);
    const scrollTimer = window.setTimeout(updateRect, 380);

    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(scrollTimer);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [activeStep, close, stepIndex, steps.length]);

  // Keyboard navigation inside tour
  useEffect(() => {
    if (!open) return;

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "ArrowRight" || event.key === "n" || event.key === "N") {
        event.preventDefault();
        setAutoPlay(false);
        setStepIndex((index) => Math.min(index + 1, steps.length - 1));
        setProgressKey((k) => k + 1);
      } else if (event.key === "ArrowLeft" || event.key === "p" || event.key === "P") {
        event.preventDefault();
        setAutoPlay(false);
        setStepIndex((index) => Math.max(index - 1, 0));
        setProgressKey((k) => k + 1);
      } else if (event.key === " " && event.target === document.body) {
        event.preventDefault();
        if (isLast) {
          close();
        } else {
          setStepIndex((index) => index + 1);
          setProgressKey((k) => k + 1);
        }
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [close, isLast, open, steps.length]);

  // Action: Launch Demo Roadmap directly from tour
  const handleLaunchDemo = useCallback(async () => {
    if (isNavigatingDemo) return;
    setIsNavigatingDemo(true);
    try {
      window.sessionStorage.setItem(AUTO_CONTINUE_SESSION_KEY, "true");
      if (autoPlay) {
        window.sessionStorage.setItem("learnx:tour-auto-play", "true");
      }
      const encodedRoadmap = await encodeRoadmapForUrl(DEMO_ROADMAP, { compress: false });
      router.push(`/roadmap/demo?roadmap=${encodeURIComponent(encodedRoadmap)}`);
      close();
    } catch {
      setIsNavigatingDemo(false);
    }
  }, [autoPlay, close, isNavigatingDemo, router]);

  // Auto-play timer implementation (advances smoothly every 4.2 seconds)
  useEffect(() => {
    if (!open || !autoPlay) return;

    const timer = window.setTimeout(() => {
      if (isLast) {
        if (activeStep?.isDemoTrigger) {
          void handleLaunchDemo();
        } else {
          close();
        }
      } else {
        setStepIndex((index) => index + 1);
        setProgressKey((k) => k + 1);
      }
    }, STEP_AUTO_ADVANCE_MS);

    return () => window.clearTimeout(timer);
  }, [activeStep?.isDemoTrigger, autoPlay, close, handleLaunchDemo, isLast, open, progressKey, stepIndex]);

  if (!activeStep) return null;

  // Determine smart position (top or bottom) so card does not cover target
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 900;
  const isTargetInBottomHalf = targetRect ? targetRect.top + targetRect.height / 2 > viewportHeight * 0.46 : false;

  const cutoutPadding = 10;
  const cutoutX = targetRect ? Math.max(6, targetRect.left - cutoutPadding) : 0;
  const cutoutY = targetRect ? Math.max(6, targetRect.top - cutoutPadding) : 0;
  const cutoutWidth = targetRect ? Math.min((typeof window !== "undefined" ? window.innerWidth : 1200) - 12, targetRect.width + cutoutPadding * 2) : 0;
  const cutoutHeight = targetRect ? targetRect.height + cutoutPadding * 2 : 0;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="LearnX guided tour"
    >
      {/* Dynamic SVG Spotlight Cutout */}
      <svg
        className="pointer-events-none fixed inset-0 z-[90] size-full transition-opacity duration-300"
        aria-hidden="true"
      >
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={cutoutX}
                y={cutoutY}
                width={cutoutWidth}
                height={cutoutHeight}
                rx={18}
                ry={18}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(5, 12, 8, 0.78)"
          mask={`url(#${maskId})`}
          className="backdrop-blur-[2px]"
        />
      </svg>

      {/* Backdrop click handler */}
      <div
        className="fixed inset-0 z-[89] cursor-pointer"
        onClick={close}
        aria-hidden="true"
      />

      {/* Animated Target Spotlight Frame */}
      {targetRect && (
        <motion.div
          key={`spotlight-${stepIndex}`}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          aria-hidden="true"
          className="pointer-events-none fixed z-[95] rounded-2xl border-2 border-[#c8ff65] shadow-[0_0_0_1px_rgba(200,255,101,0.5),0_0_40px_rgba(200,255,101,0.3)] transition-all duration-300 sm:rounded-3xl"
          style={{
            left: cutoutX,
            top: cutoutY,
            width: cutoutWidth,
            height: cutoutHeight,
          }}
        >
          {/* High-tech Corner Brackets */}
          <span className="absolute -left-1 -top-1 size-3 rounded-tl-sm border-l-2 border-t-2 border-[#c8ff65]" />
          <span className="absolute -right-1 -top-1 size-3 rounded-tr-sm border-r-2 border-t-2 border-[#c8ff65]" />
          <span className="absolute -bottom-1 -left-1 size-3 rounded-bl-sm border-b-2 border-l-2 border-[#c8ff65]" />
          <span className="absolute -bottom-1 -right-1 size-3 rounded-br-sm border-b-2 border-r-2 border-[#c8ff65]" />

          {/* Micro Target Indicator Tag */}
          <div className="absolute -top-3.5 left-4 flex items-center gap-1.5 rounded-full bg-[#c8ff65] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#17211b] shadow-md">
            <span className="size-1.5 animate-pulse rounded-full bg-[#17211b]" />
            Inspecting
          </div>
        </motion.div>
      )}

      {/* Floating Tour Card (Smartly positioned to avoid covering target) */}
      <AnimatePresence initial={false}>
        <motion.section
          key={`tour-card-${stepIndex}`}
          initial={{ opacity: 0, y: isTargetInBottomHalf ? -16 : 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className={cn(
            "fixed left-1/2 z-[100] w-[calc(100%-1.75rem)] max-w-lg -translate-x-1/2 rounded-[2rem] border border-white/12 bg-[#0d1510]/95 p-5 text-white shadow-[0_24px_90px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl sm:p-6",
            isTargetInBottomHalf ? "top-4 sm:top-8" : "bottom-4 sm:bottom-8",
          )}
        >
          {/* Subtle ambient gradient aura inside card */}
          <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-[#c8ff65]/10 blur-3xl" />

          {/* Header Row: Category Badge + Progress Dots + Controls */}
          <div className="relative mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c8ff65]/30 bg-[#c8ff65]/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#c8ff65]">
                <Sparkles className="size-3" />
                {activeStep.badge ?? "Judge Tour"}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/45">
                {stepIndex + 1} of {steps.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Auto-Play Toggle */}
              <button
                type="button"
                onClick={() => {
                  setAutoPlay((prev) => !prev);
                  setProgressKey((k) => k + 1);
                }}
                aria-label={autoPlay ? "Pause auto-tour" : "Play auto-tour"}
                title={autoPlay ? "Pause auto-tour" : "Play auto-tour"}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-bold uppercase tracking-wider transition-all",
                  autoPlay
                    ? "border-[#c8ff65] bg-[#c8ff65]/20 text-[#c8ff65] shadow-[0_0_12px_rgba(200,255,101,0.25)]"
                    : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10 hover:text-white",
                )}
              >
                {autoPlay ? <Pause className="size-3 text-[#c8ff65]" /> : <Play className="size-3" />}
                <span>{autoPlay ? "Auto: On" : "Auto"}</span>
              </button>

              {/* Close Button */}
              <button
                ref={closeButtonRef}
                type="button"
                onClick={close}
                aria-label="Close guided tour"
                title="Close tour (Esc)"
                className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/5 text-white/55 transition hover:bg-white/12 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8ff65]"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Interactive Step Progress Segments */}
          <div className="relative mb-4 flex gap-1.5" role="tablist" aria-label="Tour steps">
            {steps.map((step, idx) => {
              const isCurrent = idx === stepIndex;
              const isPassed = idx < stepIndex;

              return (
                <button
                  key={step.selector}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  aria-label={`Jump to step ${idx + 1}: ${step.title}`}
                  title={`Step ${idx + 1}: ${step.title}`}
                  onClick={() => {
                    setStepIndex(idx);
                    setProgressKey((k) => k + 1);
                  }}
                  className={cn(
                    "relative h-2 flex-1 overflow-hidden rounded-full transition-all duration-200",
                    isPassed
                      ? "bg-[#c8ff65]"
                      : isCurrent
                        ? autoPlay
                          ? "bg-white/20 ring-1 ring-[#c8ff65]/50"
                          : "bg-[#c8ff65]"
                        : "bg-white/15 hover:bg-white/30",
                  )}
                >
                  {isCurrent && autoPlay && (
                    <motion.div
                      key={`bar-${stepIndex}-${progressKey}`}
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: STEP_AUTO_ADVANCE_MS / 1000, ease: "linear" }}
                      className="h-full bg-[#c8ff65]"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Title & Description */}
          <div className="relative">
            <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
              {activeStep.title}
            </h2>
            <p className="mt-2 text-xs leading-5 text-white/70 sm:text-sm sm:leading-6">
              {activeStep.description}
            </p>

            {/* Technical Architecture / Judge Takeaway Box */}
            {activeStep.techHighlight && (
              <div className="mt-3.5 flex items-start gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-[11px] text-white/80">
                <Zap className="mt-0.5 size-3.5 shrink-0 text-[#c8ff65]" aria-hidden="true" />
                <div className="min-w-0 flex-1 leading-relaxed">
                  <span className="mr-1.5 font-bold uppercase tracking-wider text-[#c8ff65]">
                    Tech Highlight:
                  </span>
                  {activeStep.techHighlight}
                </div>
              </div>
            )}

            {/* Direct Contextual Action (e.g. for Offline Demo trigger) */}
            {activeStep.isDemoTrigger && (
              <button
                type="button"
                onClick={handleLaunchDemo}
                disabled={isNavigatingDemo}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#c8ff65] to-[#a3e635] px-4 py-2.5 text-xs font-black text-[#17211b] shadow-[0_4px_20px_rgba(200,255,101,0.22)] transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
              >
                <PlayCircle className="size-4" />
                <span>
                  {isNavigatingDemo ? "Loading Demo..." : "Launch Demo & Continue Tour on Roadmap →"}
                </span>
              </button>
            )}
          </div>

          {/* Bottom Bar: Keyboard Cheatsheet + Back/Next Actions */}
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/8 pt-4">
            <div className="hidden items-center gap-1.5 text-[10px] text-white/40 sm:flex">
              <span>Keys:</span>
              <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono text-[9px] text-white/60">←</kbd>
              <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono text-[9px] text-white/60">→</kbd>
              <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono text-[9px] text-white/60">Esc</kbd>
            </div>

            <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
              <button
                type="button"
                disabled={stepIndex === 0}
                onClick={() => {
                  setAutoPlay(false);
                  setStepIndex((idx) => Math.max(idx - 1, 0));
                  setProgressKey((k) => k + 1);
                }}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/15 px-3.5 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30"
              >
                <ArrowLeft className="size-3.5" /> Back
              </button>

              <button
                type="button"
                onClick={() => {
                  setAutoPlay(false);
                  if (isLast) {
                    close();
                  } else {
                    setStepIndex((idx) => idx + 1);
                    setProgressKey((k) => k + 1);
                  }
                }}
                className="inline-flex min-h-9 items-center gap-2 rounded-full bg-[#c8ff65] px-4 text-xs font-black text-[#17211b] shadow-sm transition hover:bg-[#b8ef55] hover:shadow-md active:scale-95"
              >
                {isLast ? (
                  <>
                    <Check className="size-4 stroke-[3]" /> Finish Tour
                  </>
                ) : (
                  <>
                    Next <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.section>
      </AnimatePresence>
    </div>
  );
}
