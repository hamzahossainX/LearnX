"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Brain,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Mic,
  MicOff,
  Sparkles,
  LoaderCircle,
  RotateCcw,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  evaluateFeynman,
  type FeynmanEvaluationResult,
} from "@/app/actions/evaluate-feynman";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { countWords, truncateToMaxWords } from "@/lib/roadmap-validation";
import { cn } from "@/lib/utils";

type FeynmanMilestone = {
  id: string;
  title: string;
  description: string;
  position?: number;
};

type FeynmanEvaluatorModalProps = {
  milestone: FeynmanMilestone | null;
  onOpenChange: (open: boolean) => void;
  onVerified?: (milestoneId: string, score: number) => void;
  existingScore?: number;
};

export function FeynmanEvaluatorModal({
  milestone,
  onOpenChange,
  onVerified,
  existingScore,
}: FeynmanEvaluatorModalProps) {
  const [userExplanation, setUserExplanation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<FeynmanEvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVoiceTranscript = useCallback((transcript: string) => {
    setUserExplanation((prev) => {
      const trimmed = prev.trim();
      const combined = trimmed ? `${trimmed} ${transcript}` : transcript;
      return countWords(combined) > 100 ? truncateToMaxWords(combined, 100) : combined;
    });
  }, []);

  const handleVoiceError = useCallback((message: string) => {
    toast.warning(message, { duration: 6_000 });
  }, []);

  const { isListening, isSupported, toggleListening } = useSpeechRecognition({
    maxLength: 1200,
    onTranscript: handleVoiceTranscript,
    onError: handleVoiceError,
  });

  const wordCount = countWords(userExplanation);
  const isAtLimit = wordCount >= 100;

  function handleExplanationChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const rawVal = e.target.value;
    const words = countWords(rawVal);
    if (words > 100) {
      const truncated = truncateToMaxWords(rawVal, 100);
      setUserExplanation(truncated);
      toast.warning("Maximum limit reached: explanation capped at 100 words.", {
        id: "feynman-word-limit",
      });
    } else {
      setUserExplanation(rawVal);
    }
    if (error) setError(null);
  }

  function handleExplanationPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const pastedText = e.clipboardData.getData("text");
    if (!pastedText) return;

    const textarea = e.currentTarget;
    const selectionStart = textarea.selectionStart ?? 0;
    const selectionEnd = textarea.selectionEnd ?? 0;
    const before = userExplanation.slice(0, selectionStart);
    const after = userExplanation.slice(selectionEnd);
    const combined = `${before}${pastedText}${after}`;

    if (countWords(combined) > 100) {
      e.preventDefault();
      const truncated = truncateToMaxWords(combined, 100);
      setUserExplanation(truncated);
      toast.warning("Pasted explanation exceeded the 100-word limit and was trimmed.", {
        id: "feynman-paste-limit",
        duration: 4_000,
      });
    }
  }

  // Reset modal state whenever the active milestone changes
  useEffect(() => {
    if (milestone) {
      setUserExplanation("");
      setResult(null);
      setError(null);
      setIsLoading(false);
    }
  }, [milestone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestone) return;

    if (isListening) {
      toggleListening();
    }

    const trimmed = userExplanation.trim();
    if (trimmed.length < 15) {
      setError("Please write at least 15 characters to explain the concept in your own words.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const evaluation = await evaluateFeynman({
        milestoneTitle: milestone.title,
        milestoneDescription: milestone.description,
        userExplanation: trimmed,
      });

      if (!evaluation.success) {
        setError(evaluation.error ?? "Failed to evaluate your explanation. Please try again.");
        return;
      }

      setResult(evaluation);

      const score = evaluation.clarityScore ?? 0;
      if (score >= 70) {
        // Save to localStorage under learnx_feynman_scores with SSR check
        if (typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem("learnx_feynman_scores");
            const scoresMap: Record<string, { score: number; verifiedAt: string }> = raw
              ? JSON.parse(raw)
              : {};
            const record = {
              score,
              verifiedAt: new Date().toISOString(),
            };
            scoresMap[milestone.id] = record;
            scoresMap[milestone.title] = record;
            localStorage.setItem("learnx_feynman_scores", JSON.stringify(scoresMap));
          } catch {
            // Persistence fallback
          }
        }

        if (onVerified) {
          onVerified(milestone.id, score);
        }

        toast.success(`Feynman Verification Passed: ${score}% Clarity!`, {
          description: "Your pedagogical intuition has been verified by the AI Evaluator.",
        });
      } else {
        toast.info(`Clarity Score: ${score}%`, {
          description: "Review the missing gaps and refined analogy below to strengthen your grasp.",
        });
      }
    } catch {
      setError("An unexpected error occurred while communicating with the evaluator.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  const score = result?.clarityScore ?? existingScore ?? 0;
  const isPassing = score >= 70;

  // SVG circular clarity gauge geometry
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <Dialog open={Boolean(milestone)} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/70 backdrop-blur-md"
        className="w-[95vw] max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-[#0d2818] p-0 text-white shadow-[0_32px_120px_rgba(0,0,0,0.85)] outline-none"
      >
        <div className="flex max-h-[88vh] flex-col overflow-hidden">
          {/* Header */}
          <DialogHeader className="shrink-0 border-b border-white/10 bg-[#0f291e] px-6 py-5 text-left">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-[#b5f23d]/20 text-[#b5f23d]">
                <Brain className="size-4" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#b5f23d]">
                Feynman Technique Evaluator
              </span>
            </div>
            <DialogTitle className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
              {milestone?.title}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-emerald-100/70">
              Explain this concept in simple terms as if teaching a complete beginner. The AI will
              grade your clarity, praise your intuition, and pinpoint technical gaps.
            </DialogDescription>
          </DialogHeader>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {!result ? (
              /* Input View */
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <label
                      htmlFor="user-explanation"
                      className="text-emerald-100/80 font-semibold"
                    >
                      Your Plain-English Explanation:
                    </label>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-[11px]",
                          userExplanation.trim().length >= 15
                            ? "text-[#b5f23d]"
                            : "text-zinc-400"
                        )}
                      >
                        {userExplanation.trim().length} / 15 chars min
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 font-mono text-[10px] font-bold transition-all",
                          isAtLimit
                            ? "border border-amber-400/40 bg-amber-400/20 text-amber-200"
                            : "border border-white/10 bg-white/5 text-white/60"
                        )}
                      >
                        {wordCount}/100 words
                      </span>
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      id="user-explanation"
                      rows={5}
                      value={userExplanation}
                      onChange={handleExplanationChange}
                      onPaste={handleExplanationPaste}
                      placeholder="e.g. Think of a Promise like a restaurant buzzer: you order food, get a ticket, and continue chatting until it either vibrates with your meal or alerts you that the kitchen ran out..."
                      className="w-full resize-none rounded-xl border border-white/15 bg-black/40 p-4 pb-12 text-sm leading-relaxed text-white placeholder:text-zinc-500 focus:border-[#b5f23d] focus:outline-none focus:ring-1 focus:ring-[#b5f23d]"
                    />

                    {/* Mic button for Web Speech API via useSpeechRecognition */}
                    {isSupported !== false && (
                      <button
                        type="button"
                        onClick={toggleListening}
                        aria-label={isListening ? "Stop voice dictation" : "Start voice dictation"}
                        className={cn(
                          "absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all",
                          isListening
                            ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                            : "bg-white/10 text-emerald-100 hover:bg-white/15 hover:text-white border border-white/10"
                        )}
                      >
                        {isListening ? (
                          <>
                            <MicOff className="size-3.5" />
                            <span>Listening...</span>
                          </>
                        ) : (
                          <>
                            <Mic className="size-3.5 text-[#b5f23d]" />
                            <span>Speak</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-200">
                    <AlertCircle className="size-4 shrink-0 text-rose-400 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-relaxed text-emerald-100/70">
                  <span className="font-semibold text-white">💡 Feynman Tip:</span> Avoid relying on
                  jargon or reciting documentation definitions. Use everyday analogies and explain the
                  &ldquo;why&rdquo; behind the mechanism.
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || userExplanation.trim().length < 15}
                    className="inline-flex items-center gap-2 rounded-full bg-[#b5f23d] px-5 py-2.5 text-xs font-bold text-[#091a13] shadow-md transition-all duration-200 hover:bg-[#a3e635] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" />
                        <span>Evaluating Depth...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        <span>Submit for Evaluation</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Result View */
              <div className="space-y-6">
                {/* Clarity Gauge Card */}
                <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-white/10 bg-gradient-to-br from-[#123524] to-[#091a13] p-6 sm:flex-row">
                  <div className="flex items-center gap-5">
                    {/* SVG Gauge */}
                    <div className="relative flex size-24 shrink-0 items-center justify-center">
                      <svg className="size-24 -rotate-90 transform" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r={radius}
                          stroke="rgba(255, 255, 255, 0.1)"
                          strokeWidth="8"
                          fill="transparent"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r={radius}
                          stroke={isPassing ? "#b5f23d" : "#fbbf24"}
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-xl font-extrabold text-white">{score}%</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-100/60">
                          Clarity
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                        {isPassing ? (
                          <span className="flex items-center gap-1 text-[#b5f23d]">
                            <CheckCircle2 className="size-3.5" /> Concept Verified (Passing)
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-400">
                            <AlertCircle className="size-3.5" /> Needs Practice (&lt; 70%)
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-white">
                        {isPassing
                          ? "Mastery Demonstrated!"
                          : "Good First Attempt!"}
                      </h4>
                      <p className="text-xs text-emerald-100/70">
                        {isPassing
                          ? "Your explanation breaks down the essential intuition cleanly."
                          : "Your core idea is forming, but key technical boundaries are missing."}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2 sm:flex-col">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                    >
                      <RotateCcw className="size-3.5" />
                      <span>Refine Explanation</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#b5f23d] px-4 py-2 text-xs font-bold text-[#091a13] transition hover:bg-[#a3e635]"
                    >
                      <Check className="size-3.5" />
                      <span>Done</span>
                    </button>
                  </div>
                </div>

                {/* 3 Insight Cards */}
                <div className="space-y-3.5">
                  {/* 1. What You Nailed */}
                  <div className="rounded-xl border border-emerald-500/20 bg-[#0d2818]/60 p-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#b5f23d]">
                      <CheckCircle2 className="size-4" />
                      <span>What You Nailed</span>
                    </div>
                    <p className="mt-2 text-xs sm:text-sm leading-relaxed text-emerald-100/90">
                      {result.whatYouNailed}
                    </p>
                  </div>

                  {/* 2. Knowledge Gap to Fix */}
                  <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                      <AlertCircle className="size-4" />
                      <span>Knowledge Gap to Fix</span>
                    </div>
                    <p className="mt-2 text-xs sm:text-sm leading-relaxed text-amber-100/90">
                      {result.missingGap}
                    </p>
                  </div>

                  {/* 3. Pro Analogy */}
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
                      <Lightbulb className="size-4" />
                      <span>Refined Real-World Analogy</span>
                    </div>
                    <p className="mt-2 text-xs sm:text-sm leading-relaxed text-cyan-100/90">
                      {result.refinedAnalogy}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
