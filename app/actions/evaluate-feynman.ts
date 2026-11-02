"use server";

import Groq from "groq-sdk";
import { z } from "zod";

const inputSchema = z.object({
  milestoneTitle: z.string().trim().min(1).max(200),
  milestoneDescription: z.string().trim().max(1000),
  userExplanation: z.string().trim().min(15, "Please write at least 15 characters to explain the concept in your own words."),
});

const feynmanResponseSchema = z.object({
  clarityScore: z.number().min(0).max(100),
  whatYouNailed: z.string().trim().min(5).max(400),
  missingGap: z.string().trim().min(5).max(400),
  refinedAnalogy: z.string().trim().min(5).max(400),
});

export type FeynmanEvaluationResult = {
  success: boolean;
  error?: string;
  clarityScore?: number;
  whatYouNailed?: string;
  missingGap?: string;
  refinedAnalogy?: string;
  isFallback?: boolean;
};

const DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";
const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
const API_TIMEOUT_MS = 12_000;

function extractJsonEnvelope(content: string): string {
  const withoutFence = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const objStart = withoutFence.indexOf("{");
  const objEnd = withoutFence.lastIndexOf("}");
  if (objStart >= 0 && objEnd > objStart) {
    return withoutFence.slice(objStart, objEnd + 1);
  }
  return withoutFence;
}

function getDeterministicFallback(milestoneTitle: string): FeynmanEvaluationResult {
  return {
    success: true,
    clarityScore: 78,
    whatYouNailed: `You demonstrated a solid practical understanding of the primary workflow and intuition behind ${milestoneTitle}.`,
    missingGap: `Make sure to also consider edge-case failure modes, input sanitation, and how state transitions propagate to parent components.`,
    refinedAnalogy: `Think of ${milestoneTitle} like a postal distribution hub: each parcel is inspected, sorted by destination, and handed off without delaying neighboring deliveries.`,
    isFallback: true,
  };
}

export async function evaluateFeynman(
  input: {
    milestoneTitle: string;
    milestoneDescription: string;
    userExplanation: string;
  },
): Promise<FeynmanEvaluationResult> {
  const parsedInput = inputSchema.safeParse(input);
  if (!parsedInput.success) {
    const issue = parsedInput.error.issues[0]?.message ?? "Invalid input provided.";
    return {
      success: false,
      error: issue,
    };
  }

  const { milestoneTitle, milestoneDescription, userExplanation } = parsedInput.data;

  const systemPrompt = `You are the LearnX Feynman Pedagogical Evaluator. The user is explaining the concept '${milestoneTitle}' (${milestoneDescription}) in their own words as if teaching a beginner. Evaluate their explanation strictly and return ONLY valid JSON matching this exact schema: { "clarityScore": number (0-100), "whatYouNailed": "string (1 concise sentence praising accurate intuition)", "missingGap": "string (1 concise sentence pointing out the key technical detail or edge-case they missed)", "refinedAnalogy": "string (1 crisp real-world analogy to lock in their understanding)" }.`;

  const userPrompt = `Student Explanation: "${userExplanation}"`;

  async function requestGroq(apiKey: string, providerName: string): Promise<z.infer<typeof feynmanResponseSchema>> {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL,
      temperature: 0.35,
      max_completion_tokens: 500,
      reasoning_effort: "low",
      reasoning_format: "hidden",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }, {
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      maxRetries: 0,
    });

    const content = completion.choices[0]?.message.content ?? "";
    if (!content.trim()) throw new Error(`${providerName} returned empty content.`);

    const sanitized = extractJsonEnvelope(content);
    const parsed = JSON.parse(sanitized);
    return feynmanResponseSchema.parse(parsed);
  }

  async function requestGemini(apiKey: string): Promise<z.infer<typeof feynmanResponseSchema>> {
    const model = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [{
            role: "user",
            parts: [{ text: userPrompt }],
          }],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 600,
            responseMimeType: "application/json",
          },
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini request failed with status ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!rawText.trim()) throw new Error("Gemini returned empty parts.");

    const sanitized = extractJsonEnvelope(rawText);
    const parsed = JSON.parse(sanitized);
    return feynmanResponseSchema.parse(parsed);
  }

  // 4-tier fallback: GROQ_API_KEY_1 -> GROQ_API_KEY_2 -> GROQ_API_KEY_3 -> GEMINI_API_KEY
  const groqKeys = [
    { name: "Groq tier 1", key: process.env.GROQ_API_KEY_1 ?? process.env.GROQ_API_KEY },
    { name: "Groq tier 2", key: process.env.GROQ_API_KEY_2 ?? process.env.GROQ_BACKUP_API_KEY },
    { name: "Groq tier 3", key: process.env.GROQ_API_KEY_3 },
  ];

  const seenKeys = new Set<string>();

  for (const tier of groqKeys) {
    const cleanKey = tier.key?.trim();
    if (!cleanKey || seenKeys.has(cleanKey)) continue;
    seenKeys.add(cleanKey);

    try {
      const result = await requestGroq(cleanKey, tier.name);
      return {
        success: true,
        clarityScore: Math.round(result.clarityScore),
        whatYouNailed: result.whatYouNailed,
        missingGap: result.missingGap,
        refinedAnalogy: result.refinedAnalogy,
      };
    } catch (err) {
      console.warn(`${tier.name} failed for Feynman evaluation:`, err);
    }
  }

  // Fallback to Gemini
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    try {
      const result = await requestGemini(geminiKey);
      return {
        success: true,
        clarityScore: Math.round(result.clarityScore),
        whatYouNailed: result.whatYouNailed,
        missingGap: result.missingGap,
        refinedAnalogy: result.refinedAnalogy,
      };
    } catch (err) {
      console.warn("Gemini fallback failed for Feynman evaluation:", err);
    }
  }

  // Guaranteed fallback safety: if all AI tiers fail, never crash the UI
  console.warn("All AI tiers failed; returning deterministic Feynman evaluation fallback.");
  return getDeterministicFallback(milestoneTitle);
}
