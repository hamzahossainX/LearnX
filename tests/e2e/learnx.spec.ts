import { expect, test } from "@playwright/test";

test("My Learning redirects signed-out visitors to login", async ({ page }) => {
  await page.goto("/student");
  await expect(page).toHaveURL(/\/login$/);
});

test("landing page exposes the builder, live 100-word counter, and command palette", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Turn ambition into/i })).toBeVisible();
  await page.getByRole("button", { name: /Start learning/i }).click();
  const prompt = page.getByPlaceholder("I want to learn Python in 3 months...");
  await expect(prompt).toBeVisible();

  // Test 100-word limit counter
  await expect(page.getByText("0/100 words")).toBeVisible();
  await prompt.fill("Master Full-Stack Next.js 15 in 3 months with real projects");
  await expect(page.getByText("10/100 words")).toBeVisible();

  await page.getByRole("button", { name: "Start judge tour" }).click();
  await expect(page.getByRole("dialog", { name: "LearnX guided tour" })).toBeVisible();
  await expect(page.getByText("One goal, one clear path")).toBeVisible();
  await page.getByRole("button", { name: "Close guided tour" }).click();

  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog", { name: "LearnX Commands" })).toBeVisible();
  await expect(page.getByRole("option", { name: /Open offline demo/i })).toBeVisible();
});

test("offline demo supports skill-radar matrix, feynman evaluator, and comparison", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Try demo roadmap/i }).click();
  await expect(page).toHaveURL(/\/roadmap\/demo\?roadmap=/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /Full-Stack Next.js Developer/i })).toBeVisible();

  // Test Skill-Radar Competency Matrix
  await expect(page.getByText("Skill Competency Matrix")).toBeVisible();
  await expect(page.getByText("Pedagogical Growth Radar")).toBeVisible();

  // Test Feynman Evaluator button on milestone card
  const feynmanButton = page.getByRole("button", { name: /Feynman technique check for/i }).first();
  await expect(feynmanButton).toBeVisible();
  await feynmanButton.click();

  // Verify Feynman Evaluator modal opens with 100-word counter
  await expect(page.getByText("Feynman Technique Evaluator")).toBeVisible();
  await expect(page.getByText("0/100 words").last()).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  // Test Roadmap Comparison
  await page.getByRole("button", { name: /Compare/i }).click();
  await expect(page.getByRole("heading", { name: "Compare two learning paths" })).toBeVisible();
  await page.getByRole("button", { name: /Compare with offline demo/i }).click();
  await expect(page.getByText("Planned schedule")).toBeVisible();
});

test("strict 100-word limit enforces paste truncation and live word counter in Section 2", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start learning/i }).click();
  const prompt = page.getByPlaceholder("I want to learn Python in 3 months...");
  await expect(prompt).toBeVisible();

  // Initially 0/100 words
  const counter = page.getByText(/0\/100 words/i);
  await expect(counter).toBeVisible();

  // Test typing a concise prompt
  await prompt.fill("Learn Next.js, React, and TypeScript fundamentals");
  await expect(page.getByText("6/100 words")).toBeVisible();

  // Test pasting 130 words into the prompt field
  const long130Words = Array.from({ length: 130 }, (_, i) => `concept${i + 1}`).join(" ");
  await prompt.fill(long130Words);

  // Trigger change/input so our handler processes word truncation
  await prompt.dispatchEvent("change");

  // Counter should reflect capped 100 words
  await expect(page.getByText("100/100 words")).toBeVisible();
  await expect(page.getByText(/Maximum 100-word limit reached/i)).toBeVisible();

  // Clicking a suggestion pill resets to the suggestion's exact word count
  const suggestionBtn = page.getByRole("button", { name: /Use prompt: Full-Stack Next.js Developer/i });
  await suggestionBtn.click();
  await expect(page.getByText("6/100 words")).toBeVisible();
});

