import { describe, it, expect } from "vitest";
import {
  validateTransition,
  getAllowedTransitions,
  WorkflowError,
} from "../lib/workflow.js";

// ── Legal transitions ────────────────────────────────────────────────────────

describe("validateTransition – legal transitions", () => {
  it("APPLICANT: DRAFT → SUBMITTED", () => {
    expect(() =>
      validateTransition("DRAFT", "SUBMITTED", "APPLICANT"),
    ).not.toThrow();
  });

  it("REVIEWER: SUBMITTED → UNDER_REVIEW", () => {
    expect(() =>
      validateTransition("SUBMITTED", "UNDER_REVIEW", "REVIEWER"),
    ).not.toThrow();
  });

  it("REVIEWER: UNDER_REVIEW → APPROVED (no comment required)", () => {
    expect(() =>
      validateTransition("UNDER_REVIEW", "APPROVED", "REVIEWER"),
    ).not.toThrow();
  });

  it("REVIEWER: UNDER_REVIEW → REJECTED (with comment)", () => {
    expect(() =>
      validateTransition("UNDER_REVIEW", "REJECTED", "REVIEWER", "Insufficient evidence"),
    ).not.toThrow();
  });

  it("REVIEWER: UNDER_REVIEW → CHANGES_REQUESTED (with comment)", () => {
    expect(() =>
      validateTransition(
        "UNDER_REVIEW",
        "CHANGES_REQUESTED",
        "REVIEWER",
        "Please provide updated ownership breakdown.",
      ),
    ).not.toThrow();
  });

  it("APPLICANT: CHANGES_REQUESTED → DRAFT", () => {
    expect(() =>
      validateTransition("CHANGES_REQUESTED", "DRAFT", "APPLICANT"),
    ).not.toThrow();
  });
});

// ── Illegal transitions — wrong role ────────────────────────────────────────

describe("validateTransition – wrong role (403)", () => {
  it("REVIEWER cannot submit (DRAFT → SUBMITTED)", () => {
    expect(() =>
      validateTransition("DRAFT", "SUBMITTED", "REVIEWER"),
    ).toThrow(WorkflowError);

    try {
      validateTransition("DRAFT", "SUBMITTED", "REVIEWER");
    } catch (e) {
      expect(e).toBeInstanceOf(WorkflowError);
      expect((e as WorkflowError).statusCode).toBe(403);
    }
  });

  it("APPLICANT cannot start review (SUBMITTED → UNDER_REVIEW)", () => {
    try {
      validateTransition("SUBMITTED", "UNDER_REVIEW", "APPLICANT");
    } catch (e) {
      expect(e).toBeInstanceOf(WorkflowError);
      expect((e as WorkflowError).statusCode).toBe(403);
    }
  });

  it("APPLICANT cannot approve (UNDER_REVIEW → APPROVED)", () => {
    try {
      validateTransition("UNDER_REVIEW", "APPROVED", "APPLICANT");
    } catch (e) {
      expect(e).toBeInstanceOf(WorkflowError);
      expect((e as WorkflowError).statusCode).toBe(403);
    }
  });

  it("APPLICANT cannot reject (UNDER_REVIEW → REJECTED)", () => {
    try {
      validateTransition("UNDER_REVIEW", "REJECTED", "APPLICANT", "bad reason");
    } catch (e) {
      expect(e).toBeInstanceOf(WorkflowError);
      expect((e as WorkflowError).statusCode).toBe(403);
    }
  });

  it("APPLICANT cannot request changes (UNDER_REVIEW → CHANGES_REQUESTED)", () => {
    try {
      validateTransition("UNDER_REVIEW", "CHANGES_REQUESTED", "APPLICANT", "fix this");
    } catch (e) {
      expect(e).toBeInstanceOf(WorkflowError);
      expect((e as WorkflowError).statusCode).toBe(403);
    }
  });
});

// ── Illegal transitions — invalid path ──────────────────────────────────────

describe("validateTransition – invalid state paths (400)", () => {
  it("cannot skip SUBMITTED → APPROVED directly", () => {
    expect(() =>
      validateTransition("SUBMITTED", "APPROVED", "REVIEWER"),
    ).toThrow(WorkflowError);
  });

  it("cannot go APPROVED → anything (terminal state)", () => {
    expect(() =>
      validateTransition("APPROVED", "DRAFT", "REVIEWER"),
    ).toThrow(WorkflowError);
  });

  it("cannot go REJECTED → anything (terminal state)", () => {
    expect(() =>
      validateTransition("REJECTED", "DRAFT", "APPLICANT"),
    ).toThrow(WorkflowError);
  });

  it("cannot go DRAFT → UNDER_REVIEW directly", () => {
    expect(() =>
      validateTransition("DRAFT", "UNDER_REVIEW", "REVIEWER"),
    ).toThrow(WorkflowError);
  });
});

// ── Comment requirements ─────────────────────────────────────────────────────

describe("validateTransition – comment requirements", () => {
  it("REJECTED requires a non-empty comment", () => {
    expect(() =>
      validateTransition("UNDER_REVIEW", "REJECTED", "REVIEWER"),
    ).toThrow(WorkflowError);
  });

  it("REJECTED with whitespace-only comment is rejected", () => {
    expect(() =>
      validateTransition("UNDER_REVIEW", "REJECTED", "REVIEWER", "   "),
    ).toThrow(WorkflowError);
  });

  it("CHANGES_REQUESTED requires a non-empty comment", () => {
    expect(() =>
      validateTransition("UNDER_REVIEW", "CHANGES_REQUESTED", "REVIEWER", ""),
    ).toThrow(WorkflowError);
  });

  it("APPROVED does not require a comment", () => {
    expect(() =>
      validateTransition("UNDER_REVIEW", "APPROVED", "REVIEWER", undefined),
    ).not.toThrow();
  });
});

// ── getAllowedTransitions ─────────────────────────────────────────────────────

describe("getAllowedTransitions", () => {
  it("APPLICANT from DRAFT can only SUBMIT", () => {
    expect(getAllowedTransitions("DRAFT", "APPLICANT")).toEqual(["SUBMITTED"]);
  });

  it("REVIEWER from DRAFT has no transitions", () => {
    expect(getAllowedTransitions("DRAFT", "REVIEWER")).toEqual([]);
  });

  it("REVIEWER from SUBMITTED can only start review", () => {
    expect(getAllowedTransitions("SUBMITTED", "REVIEWER")).toEqual([
      "UNDER_REVIEW",
    ]);
  });

  it("REVIEWER from UNDER_REVIEW has three options", () => {
    const allowed = getAllowedTransitions("UNDER_REVIEW", "REVIEWER");
    expect(allowed).toHaveLength(3);
    expect(allowed).toContain("APPROVED");
    expect(allowed).toContain("REJECTED");
    expect(allowed).toContain("CHANGES_REQUESTED");
  });

  it("APPLICANT from CHANGES_REQUESTED can revert to DRAFT", () => {
    expect(getAllowedTransitions("CHANGES_REQUESTED", "APPLICANT")).toEqual([
      "DRAFT",
    ]);
  });

  it("APPLICANT from terminal APPROVED has no transitions", () => {
    expect(getAllowedTransitions("APPROVED", "APPLICANT")).toEqual([]);
  });
});
