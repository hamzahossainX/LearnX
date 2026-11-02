import { describe, expect, it } from "vitest";
import {
  MAX_PROMPT_WORDS,
  ROADMAP_PROMPT_WORD_LIMIT_ERROR,
  countWords,
  roadmapPromptSchema,
  truncateToMaxWords,
} from "@/lib/roadmap-validation";

describe("100-Word Input Limit Validation", () => {
  it("counts words correctly across various whitespace and newline formats", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
    expect(countWords("Learn Next.js")).toBe(2);
    expect(countWords("Learn   Next.js\n\tand\r\nTypeScript")).toBe(4);
    expect(countWords("One two three four five")).toBe(5);
  });

  it("truncates text to exactly 100 words when exceeded", () => {
    const words120 = Array.from({ length: 120 }, (_, i) => `word${i + 1}`).join(" ");
    expect(countWords(words120)).toBe(120);

    const truncated = truncateToMaxWords(words120, MAX_PROMPT_WORDS);
    expect(countWords(truncated)).toBe(100);
    expect(truncated.startsWith("word1 word2")).toBe(true);
    expect(truncated.endsWith("word100")).toBe(true);
  });

  it("does not truncate text within the 100-word limit", () => {
    const text = "Mastering Full-Stack Next.js 15 in 3 months with PostgreSQL and Tailwind CSS.";
    expect(truncateToMaxWords(text, 100)).toBe(text);
  });

  it("validates that roadmapPromptSchema accepts prompts with up to 100 words", () => {
    const validPrompt = Array.from({ length: 99 }, () => "learn").join(" ");
    const result = roadmapPromptSchema.safeParse(validPrompt);
    expect(result.success).toBe(true);
  });

  it("strictly rejects prompts exceeding 100 words before calling any API", () => {
    const prompt101Words = Array.from({ length: 101 }, () => "code").join(" ");
    const result = roadmapPromptSchema.safeParse(prompt101Words);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(ROADMAP_PROMPT_WORD_LIMIT_ERROR);
    }
  });

  it("rejects empty or whitespace-only inputs", () => {
    const emptyResult = roadmapPromptSchema.safeParse("   ");
    expect(emptyResult.success).toBe(false);
  });
});
