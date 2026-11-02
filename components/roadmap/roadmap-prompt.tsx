"use client";

import { type FormEvent, useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowUpRight, Mic, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generateRoadmap, type GenerateRoadmapState } from "@/app/actions/generate-roadmap";
import { LoginRequiredDialog } from "@/components/roadmap/login-required-dialog";
import { ServiceFallbackCard } from "@/components/roadmap/service-fallback-card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import {
  AUTH_REQUIRED_ERROR,
  DAILY_LIMIT_MESSAGE,
  LIMIT_REACHED_ERROR,
} from "@/lib/roadmap-access";
import {
  MAX_PROMPT_WORDS,
  ROADMAP_PROMPT_ERROR,
  ROADMAP_PROMPT_WORD_LIMIT_ERROR,
  countWords,
  roadmapPromptSchema,
  truncateToMaxWords,
} from "@/lib/roadmap-validation";
import { cn } from "@/lib/utils";

const initialState: GenerateRoadmapState = {};
const BUSY_SERVER_MESSAGE =
  "Servers are currently experiencing high traffic. Please wait a moment and try again.";
const INCOMPLETE_GENERATION_MESSAGE =
  "Generation incomplete. The AI response ended too early, so nothing was saved. Please try again.";
const suggestions = [
  "Full-Stack Next.js Developer in 3 months",
  "Cybersecurity & Bug Bounty basics in 8 weeks",
  "Master Python & Machine Learning in 2 months",
  "UI/UX Design for beginners in 4 weeks",
] as const;
const demoModels = [
  { value: "gemini-3-8-flash", label: "Gemini 3.8 Flash" },
  { value: "chatgpt-5-6-soul", label: "ChatGPT 5.6 Soul" },
  { value: "groq-ultra-speed", label: "Groq Ultra-Speed" },
] as const;

async function submitRoadmap(
  previousState: GenerateRoadmapState,
  formData: FormData,
): Promise<GenerateRoadmapState> {
  const parsedPrompt = roadmapPromptSchema.safeParse(formData.get("prompt"));
  if (!parsedPrompt.success) {
    const errorMsg = parsedPrompt.error.issues[0]?.message ?? ROADMAP_PROMPT_ERROR;
    toast.warning(errorMsg, { duration: 15_000 });
    return {
      success: false,
      isValidationError: true,
      error: errorMsg,
    };
  }

  try {
    const result = await generateRoadmap(previousState, formData);

    if (result.isGibberish) {
      toast.warning(
        "We couldn't understand that. Please enter a meaningful skill or topic you want to learn.",
        { duration: 20_000 },
      );
      return {
        success: false,
        isGibberish: true,
      };
    }

    if (result.isPolicyViolation) {
      const violationReason = result.violationReason ?? "prohibited harmful activity";
      toast.error("Security Alert", {
        description: `You are attempting to learn about ${violationReason}. We cannot generate this content. This request violates our platform's safety rules and educational guidelines.`,
        duration: 25_000,
      });
      return {
        success: false,
        isPolicyViolation: true,
        violationReason,
      };
    }

    if (result.warning) {
      toast.warning(result.warning, { duration: 20_000 });
      return result;
    }

    if (result.isGenerationIncomplete) {
      toast.warning(INCOMPLETE_GENERATION_MESSAGE, { duration: 20_000 });
      return {
        success: false,
        error: "GENERATION_INCOMPLETE",
        isGenerationIncomplete: true,
        shouldOfferOfflineDemo: true,
        offlineFallbackAt: Date.now(),
      };
    }

    if (
      result.error
      && result.error !== LIMIT_REACHED_ERROR
      && result.error !== AUTH_REQUIRED_ERROR
    ) {
      if (result.isValidationError) {
        const errorMsg = result.error ?? ROADMAP_PROMPT_ERROR;
        toast.warning(errorMsg, { duration: 20_000 });
        return {
          success: false,
          isValidationError: true,
          error: errorMsg,
        };
      }

      toast.error(BUSY_SERVER_MESSAGE, { duration: 20_000 });
      return {
        success: false,
        error: BUSY_SERVER_MESSAGE,
        shouldOfferOfflineDemo: true,
        offlineFallbackAt: Date.now(),
      };
    }

    return result;
  } catch {
    // Never expose Server Action exceptions or raw backend messages in the UI
    // or the browser console. Server-side logs remain available for diagnosis.
    toast.error(BUSY_SERVER_MESSAGE, { duration: 20_000 });
    return {
      success: false,
      error: BUSY_SERVER_MESSAGE,
      shouldOfferOfflineDemo: true,
      offlineFallbackAt: Date.now(),
    };
  }
}

type RoadmapPromptProps = { isAuthenticated: boolean };

export function RoadmapPrompt({ isAuthenticated }: RoadmapPromptProps) {
  // Second of two gates on the client. `handleSubmit` stops the event before
  // React starts the action, which is what keeps the button out of its pending
  // state; this wrapper guarantees no Server Action call is ever issued from a
  // signed-out client even if a submit reaches it another way. Neither is a
  // security boundary — the Server Action checks the session itself.
  const guardedSubmit = useCallback(
    async (previousState: GenerateRoadmapState, formData: FormData) => {
      if (!isAuthenticated) {
        return { success: false, error: AUTH_REQUIRED_ERROR, authRequiredAt: Date.now() };
      }
      return submitRoadmap(previousState, formData);
    },
    [isAuthenticated],
  );
  const [state, action] = useActionState(guardedSubmit, initialState);
  const [prompt, setPrompt] = useState("");
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [isSecurityFocused, setIsSecurityFocused] = useState(false);
  const [selectedModel, setSelectedModel] = useState("groq-ultra-speed");
  const [limitOpen, setLimitOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [offlineFallbackOpen, setOfflineFallbackOpen] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = useMemo(() => countWords(prompt), [prompt]);
  const isAtLimit = wordCount >= MAX_PROMPT_WORDS;
  const isExceeded = wordCount > MAX_PROMPT_WORDS;

  function handlePromptChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const rawVal = event.target.value;
    const words = countWords(rawVal);
    if (words > MAX_PROMPT_WORDS) {
      const truncated = truncateToMaxWords(rawVal, MAX_PROMPT_WORDS);
      setPrompt(truncated);
      toast.warning("Maximum limit reached: prompt capped at 100 words.", {
        id: "prompt-word-limit",
        duration: 4_000,
      });
    } else {
      setPrompt(rawVal);
    }
  }

  function handlePromptPaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const pastedText = event.clipboardData.getData("text");
    if (!pastedText) return;

    const textarea = event.currentTarget;
    const selectionStart = textarea.selectionStart ?? 0;
    const selectionEnd = textarea.selectionEnd ?? 0;
    const before = prompt.slice(0, selectionStart);
    const after = prompt.slice(selectionEnd);
    const prospective = `${before}${pastedText}${after}`;

    if (countWords(prospective) > MAX_PROMPT_WORDS) {
      event.preventDefault();
      const truncated = truncateToMaxWords(prospective, MAX_PROMPT_WORDS);
      setPrompt(truncated);
      toast.warning("Pasted content exceeded the 100-word limit and was automatically trimmed.", {
        id: "prompt-paste-limit",
        duration: 5_000,
      });
    }
  }

  const handleVoiceTranscript = useCallback((transcript: string) => {
    const words = countWords(transcript);
    const safeTranscript = words > MAX_PROMPT_WORDS
      ? truncateToMaxWords(transcript, MAX_PROMPT_WORDS)
      : transcript;
    if (words > MAX_PROMPT_WORDS) {
      toast.warning("Voice dictation reached the 100-word limit and was capped.", {
        id: "prompt-voice-limit",
      });
    }
    setPrompt(safeTranscript);
    requestAnimationFrame(() => {
      promptRef.current?.focus();
      promptRef.current?.setSelectionRange(safeTranscript.length, safeTranscript.length);
    });
  }, []);

  const handleVoiceError = useCallback((message: string) => {
    toast.warning(message, { duration: 8_000 });
  }, []);

  const { isListening, isSupported, toggleListening } = useSpeechRecognition({
    maxLength: 1200,
    onTranscript: handleVoiceTranscript,
    onError: handleVoiceError,
  });

  useEffect(() => {
    if (state.error === LIMIT_REACHED_ERROR) setLimitOpen(true);
  }, [state.error, state.limitReachedAt]);

  // Covers the case where the session expires between page render and submit:
  // the server rejects it and the same dialog opens. The timestamp is in the
  // dependency list so a repeat attempt reopens a dialog the learner dismissed.
  useEffect(() => {
    if (state.error === AUTH_REQUIRED_ERROR) setLoginOpen(true);
  }, [state.error, state.authRequiredAt]);

  useEffect(() => {
    if (state.shouldOfferOfflineDemo) setOfflineFallbackOpen(true);
  }, [state.shouldOfferOfflineDemo, state.offlineFallbackAt]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!isAuthenticated) {
      event.preventDefault();
      setLoginOpen(true);
      return;
    }

    const words = countWords(prompt);
    if (words > MAX_PROMPT_WORDS) {
      event.preventDefault();
      toast.warning(ROADMAP_PROMPT_WORD_LIMIT_ERROR, { duration: 8_000 });
      return;
    }

    if (words === 0 || prompt.trim().length < 3) {
      event.preventDefault();
      toast.warning("Please enter a learning goal (at least 3 characters).", { duration: 8_000 });
      return;
    }

    setOfflineFallbackOpen(false);
  }

  function selectSuggestion(suggestion: string) {
    setPrompt(suggestion);
    requestAnimationFrame(() => {
      promptRef.current?.focus();
      promptRef.current?.setSelectionRange(suggestion.length, suggestion.length);
    });
  }

  return (
    <>
      <form
        action={action}
        onSubmit={handleSubmit}
        noValidate
        className="relative overflow-hidden rounded-3xl bg-[#173f2c] p-4 text-white shadow-[0_24px_80px_rgba(23,63,44,.18)] sm:p-6 md:rounded-[2rem] md:p-9"
      >
        <div className="absolute -right-16 -top-20 size-56 rounded-full bg-[#c8ff65]/10 blur-2xl" />
        <div className="relative">
          <div className="mb-5 flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-[#c8ff65]">
            <Sparkles size={16} /> <span className="hidden min-[390px]:inline">AI path builder</span><span className="min-[390px]:hidden">AI builder</span>
          </div>
          <label htmlFor="roadmap-prompt" className="block text-xl font-black tracking-tight sm:text-2xl md:text-3xl">
            What do you want to become great at?
          </label>
          <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <p className="max-w-2xl text-sm leading-6 text-white/55">
              Include your goal, experience level, and available time (up to 100 words). LearnX will turn it into a practical path.
            </p>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger
                aria-label="Choose AI model"
                className="w-full min-w-0 sm:w-[13.5rem] sm:shrink-0"
              >
                <SelectValue placeholder="Select AI model" />
              </SelectTrigger>
              <SelectContent align="end">
                {demoModels.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-6 flex w-full flex-col gap-2 rounded-2xl bg-white p-2 md:flex-row md:gap-3">
            <div className="relative min-w-0 flex-1">
              <textarea
                ref={promptRef}
                id="roadmap-prompt"
                name="prompt"
                value={prompt}
                onChange={handlePromptChange}
                onPaste={handlePromptPaste}
                required
                minLength={3}
                rows={2}
                placeholder="I want to learn Python in 3 months..."
                className={cn(
                  "min-h-24 w-full resize-none rounded-xl px-3 py-3 pr-16 text-sm leading-6 text-[#17211b] outline-none placeholder:text-black/35 focus:ring-4 focus:ring-[#c8ff65]/35 sm:px-4 sm:pr-16 sm:text-[15px] md:min-h-16",
                  isAtLimit && "focus:ring-amber-400/40",
                )}
              />
              <button
                type="button"
                onClick={toggleListening}
                aria-label={isListening ? "Stop voice input" : "Dictate learning goal"}
                aria-pressed={isListening}
                title={isSupported === false ? "Voice input is not supported by this browser" : isListening ? "Stop listening" : "Use voice input"}
                className={`absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border p-2 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3c7156] ${isListening ? "border-[#3c7156] bg-[#173f2c] text-[#c8ff65] shadow-[0_0_0_4px_rgba(60,113,86,.12)]" : isSupported === false ? "border-black/5 bg-black/[.03] text-black/25" : "border-black/8 bg-[#f2f7ed] text-[#28583f] hover:scale-105 hover:border-[#3c7156]/30 hover:bg-[#e8f4dc]"}`}
              >
                {isListening && <span className="absolute inset-1 animate-ping rounded-full bg-[#c8ff65]/20" aria-hidden="true" />}
                <Mic className="relative size-5" aria-hidden="true" />
              </button>
              <span className="sr-only" role="status" aria-live="polite">
                {isListening ? "Listening for your learning goal." : ""}
              </span>
            </div>
            <SubmitButton isAdvanced={isAdvanced} disabled={isExceeded} />
          </div>

          {/* Live 100-Word Counter & Friendly Feedback */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
            <div className="flex items-center gap-1.5">
              {isAtLimit ? (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
                  <span role="img" aria-label="warning">⚠️</span> Maximum 100-word limit reached
                </span>
              ) : (
                <span className="text-white/45">
                  Describe your objective, current level, or target timeframe.
                </span>
              )}
            </div>
            <div
              role="status"
              aria-live="polite"
              aria-label={`${wordCount} of 100 words`}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold transition-all",
                isAtLimit
                  ? "border border-amber-400/40 bg-amber-400/20 text-amber-200"
                  : wordCount >= 85
                  ? "border border-yellow-400/30 bg-yellow-400/10 text-yellow-200"
                  : "border border-white/10 bg-white/5 text-white/60",
              )}
            >
              <span>{wordCount}/100 words</span>
            </div>
          </div>

          <input type="hidden" name="isAdvanced" value={String(isAdvanced)} />
          <input type="hidden" name="securityFocus" value={String(isSecurityFocused)} />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-[#c8ff65]/30 hover:bg-white/8">
              <label htmlFor="advanced-mode" className="min-w-0 flex-1 cursor-pointer">
                <span className="block text-sm font-bold text-white">Advanced Mode</span>
                <span className="mt-0.5 block text-xs leading-5 text-white/50">Deep Dive &amp; Interview Prep</span>
              </label>
              <Switch id="advanced-mode" checked={isAdvanced} onCheckedChange={setIsAdvanced} aria-label="Advanced Mode: Deep Dive and Interview Prep" />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-[#c8ff65]/30 hover:bg-white/8">
              <label htmlFor="security-focus" className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#c8ff65]" aria-hidden="true" />
                <span>
                  <span className="block text-sm font-bold text-white">Security Focus</span>
                  <span className="mt-0.5 block text-xs leading-5 text-white/50">Secure coding &amp; OWASP guidance</span>
                </span>
              </label>
              <Switch id="security-focus" checked={isSecurityFocused} onCheckedChange={setIsSecurityFocused} aria-label="Security Focus: secure coding and OWASP guidance" />
            </div>
          </div>
          <div className="mt-4 flex max-w-full flex-wrap items-center gap-2 text-xs text-white/45">
            <span className="mr-1 font-semibold text-white/55">Try:</span>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => selectSuggestion(suggestion)}
                aria-label={`Use prompt: ${suggestion}`}
                className="max-w-full break-words rounded-full border border-white/15 px-3 py-2 text-left leading-4 text-white/65 transition hover:-translate-y-0.5 hover:border-[#c8ff65]/50 hover:bg-[#c8ff65]/10 hover:text-[#c8ff65] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8ff65]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </form>
      {offlineFallbackOpen && <ServiceFallbackCard onDismiss={() => setOfflineFallbackOpen(false)} />}
      <Dialog open={limitOpen} onOpenChange={setLimitOpen}>
        <DialogContent className="max-w-md border-white/10 bg-[#fffefa] dark:bg-[#111512] dark:text-white">
          <DialogHeader>
            <div className="mb-3 grid size-14 place-items-center rounded-2xl bg-[#c8ff65] text-2xl shadow-[0_0_35px_rgba(200,255,101,.25)]">
              🚀
            </div>
            <DialogTitle>Daily Limit Reached</DialogTitle>
            <DialogDescription className="dark:text-white/55">
              {DAILY_LIMIT_MESSAGE} Your allowance resets at midnight.
            </DialogDescription>
          </DialogHeader>
          <button
            type="button"
            onClick={() => setLimitOpen(false)}
            className="mt-5 min-h-11 w-full rounded-xl bg-[#173f2c] px-5 font-black text-white transition hover:bg-[#21573d] dark:bg-[#c8ff65] dark:text-[#17211b]"
          >
            Got it
          </button>
        </DialogContent>
      </Dialog>
      <LoginRequiredDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
}

function SubmitButton({ isAdvanced, disabled }: { isAdvanced: boolean; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending || disabled}
      className="flex min-h-14 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#c8ff65] px-6 font-black text-[#17211b] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
    >
      {pending ? (
        <>
          <span className="size-4 animate-spin rounded-full border-2 border-[#17211b]/25 border-t-[#17211b]" />{" "}
          {isAdvanced ? "Crafting deep dive..." : "Forging..."}
        </>
      ) : (
        <>
          Forge my path <ArrowUpRight size={17} />
        </>
      )}
    </button>
  );
}
