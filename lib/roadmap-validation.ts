import { z } from "zod";

export const MAX_PROMPT_WORDS = 100;

export const ROADMAP_PROMPT_WORD_LIMIT_ERROR =
  "Your learning goal must be 100 words or fewer. Please shorten your prompt.";

export const ROADMAP_PROMPT_ERROR =
  "Please enter a concise, valid topic (max 100 words).";

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function truncateToMaxWords(text: string, maxWords: number = MAX_PROMPT_WORDS): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ");
}

export const roadmapPromptSchema = z
  .string()
  .trim()
  .min(3, ROADMAP_PROMPT_ERROR)
  .max(1200, ROADMAP_PROMPT_WORD_LIMIT_ERROR)
  .refine(
    (value) => countWords(value) <= MAX_PROMPT_WORDS,
    { message: ROADMAP_PROMPT_WORD_LIMIT_ERROR },
  )
  .refine(
    (value) => /\p{L}/u.test(value),
    { message: ROADMAP_PROMPT_ERROR },
  );
