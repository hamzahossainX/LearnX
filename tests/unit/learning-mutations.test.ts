import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => ({ email: vi.fn(), update: vi.fn(), set: vi.fn(), where: vi.fn(), returning: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/require-session", () => ({ requireSignedInEmail: mocks.email }));
vi.mock("@/db", () => ({ db: { update: mocks.update } }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { toggleMilestone } from "@/app/actions/toggle-milestone";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.email.mockResolvedValue("owner@example.com");
  mocks.update.mockReturnValue({ set: mocks.set });
  mocks.set.mockReturnValue({ where: mocks.where });
  mocks.where.mockReturnValue({ returning: mocks.returning });
});

describe("saved progress ownership", () => {
  it("checks ownership in the update and stops when no accessible milestone matches", async () => {
    mocks.returning.mockResolvedValue([]);
    await expect(toggleMilestone("123e4567-e89b-12d3-a456-426614174000", true)).rejects.toThrow("Milestone not found");
    const compiled = new PgDialect().sqlToQuery(mocks.where.mock.calls[0][0]);
    expect(compiled.sql).toContain("r.user_id = (select id from users where email =");
    expect(compiled.params).toContain("owner@example.com");
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("refreshes My Learning after a successful completion update", async () => {
    mocks.returning.mockResolvedValue([{ id: "milestone", roadmapId: "roadmap" }]);
    await toggleMilestone("123e4567-e89b-12d3-a456-426614174000", true);
    expect(mocks.revalidate).toHaveBeenCalledWith("/student");
  });
});
