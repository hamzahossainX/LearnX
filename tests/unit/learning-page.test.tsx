import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), findMany: vi.fn(), findUser: vi.fn(), redirect: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/db", () => ({ db: { query: { aiRoadmaps: { findMany: mocks.findMany }, users: { findFirst: mocks.findUser } } } }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import StudentPage from "@/app/(dashboard)/student/page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.redirect.mockImplementation(() => { throw new Error("redirect"); });
  mocks.findMany.mockResolvedValue([]);
  mocks.findUser.mockResolvedValue({ id: "user-1" });
});

describe("My Learning access", () => {
  it("redirects guests before querying roadmaps", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(StudentPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect");
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
  it("scopes the query to the session email and bounds pagination", async () => {
    mocks.auth.mockResolvedValue({ user: { email: "learner@example.com" } });
    await StudentPage({ searchParams: Promise.resolve({ page: "-9" }) });
    const query = mocks.findMany.mock.calls[0][0];
    expect(query.where).toBeDefined();
    expect(query.offset).toBe(0);
    expect(query.limit).toBe(13);
    expect(mocks.findUser).toHaveBeenCalledWith(expect.objectContaining({ columns: { id: true } }));
  });
  it("loads later pages without returning all records", async () => {
    mocks.auth.mockResolvedValue({ user: { email: "learner@example.com" } });
    await StudentPage({ searchParams: Promise.resolve({ page: "2" }) });
    expect(mocks.findMany.mock.calls[0][0].offset).toBe(12);
  });
});
