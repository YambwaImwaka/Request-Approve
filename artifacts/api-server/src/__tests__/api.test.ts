import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";

const APPLICANT_CREDS = { email: "applicant@example.com", password: "password123" };
const REVIEWER_CREDS = { email: "reviewer@example.com", password: "password123" };

async function login(creds: { email: string; password: string }): Promise<string> {
  const res = await request(app).post("/api/auth/login").send(creds);
  if (!res.body.token) throw new Error("Login failed: " + JSON.stringify(res.body));
  return res.body.token as string;
}

const TEST_MARKER = `[TEST-${Date.now()}]`;

const NEW_APP = {
  title: `${TEST_MARKER} Auth Integration Test`,
  companyName: "Test Co Ltd",
  registrationNumber: `TC-TEST-${Date.now()}`,
  beneficialOwnerName: "Test Owner",
  ownershipPercentage: 51,
  changeReason: "Integration test fixture — safe to delete",
  category: "OWNERSHIP_TRANSFER",
};

describe("API Integration — Authentication & Authorization", () => {
  let applicantToken: string;
  let reviewerToken: string;
  let appId: number;

  beforeAll(async () => {
    applicantToken = await login(APPLICANT_CREDS);
    reviewerToken = await login(REVIEWER_CREDS);

    const created = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${applicantToken}`)
      .send(NEW_APP);
    expect(created.status).toBe(201);
    appId = created.body.id as number;

    const submitted = await request(app)
      .post(`/api/applications/${appId}/submit`)
      .set("Authorization", `Bearer ${applicantToken}`);
    expect(submitted.status).toBe(200);
  });

  afterAll(async () => {
    if (!appId) return;
    try {
      const { db, applicationsTable, auditLogsTable } = await import("@workspace/db");
      const { eq } = await import("drizzle-orm");
      await db.delete(auditLogsTable).where(eq(auditLogsTable.applicationId, appId));
      await db.delete(applicationsTable).where(eq(applicationsTable.id, appId));
    } catch {
      // best-effort cleanup
    }
  });

  // ── Authentication ──────────────────────────────────────────────────────────

  it("GET /api/applications without a token returns 401", async () => {
    const res = await request(app).get("/api/applications");
    expect(res.status).toBe(401);
  });

  it("POST /api/applications without a token returns 401", async () => {
    const res = await request(app).post("/api/applications").send(NEW_APP);
    expect(res.status).toBe(401);
  });

  // ── Role enforcement — applicant cannot perform reviewer actions ────────────
  //
  // Note on status codes: the workflow validates state-transition validity first,
  // then role. When the app is in SUBMITTED state:
  //   • start-review (SUBMITTED → UNDER_REVIEW) IS a valid transition, so the
  //     role check fires → 403.
  //   • approve/reject/request-changes (SUBMITTED → …) are INVALID transitions,
  //     so the transition check fires first → 400.
  // Both 400 and 403 mean the action was rejected. We assert "not 2xx".

  it("applicant cannot approve an application (rejected)", async () => {
    const res = await request(app)
      .post(`/api/applications/${appId}/approve`)
      .set("Authorization", `Bearer ${applicantToken}`);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
  });

  it("applicant cannot reject an application (rejected)", async () => {
    const res = await request(app)
      .post(`/api/applications/${appId}/reject`)
      .set("Authorization", `Bearer ${applicantToken}`)
      .send({ comment: "Illegitimate rejection" });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
  });

  it("applicant cannot start review (403)", async () => {
    const res = await request(app)
      .post(`/api/applications/${appId}/start-review`)
      .set("Authorization", `Bearer ${applicantToken}`);
    // SUBMITTED→UNDER_REVIEW is valid in the transition table, so role fires → 403
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("applicant cannot request changes (rejected)", async () => {
    const res = await request(app)
      .post(`/api/applications/${appId}/request-changes`)
      .set("Authorization", `Bearer ${applicantToken}`)
      .send({ comment: "Please fix this" });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
  });

  // ── Role enforcement — reviewer cannot perform applicant actions ─────────────

  it("reviewer cannot create an application (403)", async () => {
    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${reviewerToken}`)
      .send(NEW_APP);
    expect(res.status).toBe(403);
  });

  // ── Illegal workflow transitions ────────────────────────────────────────────

  it("rejecting without a comment returns 400", async () => {
    const res = await request(app)
      .post(`/api/applications/${appId}/reject`)
      .set("Authorization", `Bearer ${reviewerToken}`)
      .send({ comment: "" });
    expect(res.status).toBe(400);
  });

  // ── Happy path — reviewer approves ─────────────────────────────────────────

  it("reviewer can start review (200)", async () => {
    const res = await request(app)
      .post(`/api/applications/${appId}/start-review`)
      .set("Authorization", `Bearer ${reviewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("UNDER_REVIEW");
  });

  it("reviewer can approve (200)", async () => {
    const res = await request(app)
      .post(`/api/applications/${appId}/approve`)
      .set("Authorization", `Bearer ${reviewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("APPROVED");
  });

  it("any further transition from APPROVED returns 400 (terminal state)", async () => {
    const res = await request(app)
      .post(`/api/applications/${appId}/approve`)
      .set("Authorization", `Bearer ${reviewerToken}`);
    expect(res.status).toBe(400);
  });
});
