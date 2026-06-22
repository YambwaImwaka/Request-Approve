export type ApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "CHANGES_REQUESTED";

export type UserRole = "APPLICANT" | "REVIEWER";

/**
 * Defines which roles can trigger which transitions from a given status.
 * Key: fromStatus → toStatus, Value: role required
 */
const TRANSITIONS: Record<string, Record<string, UserRole>> = {
  DRAFT: {
    SUBMITTED: "APPLICANT",
  },
  SUBMITTED: {
    UNDER_REVIEW: "REVIEWER",
  },
  UNDER_REVIEW: {
    APPROVED: "REVIEWER",
    REJECTED: "REVIEWER",
    CHANGES_REQUESTED: "REVIEWER",
  },
  CHANGES_REQUESTED: {
    DRAFT: "APPLICANT",
  },
};

/**
 * Transitions that require a non-empty comment.
 */
const COMMENT_REQUIRED: Partial<Record<ApplicationStatus, Set<ApplicationStatus>>> = {
  UNDER_REVIEW: new Set<ApplicationStatus>(["REJECTED", "CHANGES_REQUESTED"]),
};

export class WorkflowError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}

/**
 * Validates a workflow transition. Throws WorkflowError if invalid.
 */
export function validateTransition(
  fromStatus: ApplicationStatus,
  toStatus: ApplicationStatus,
  actorRole: UserRole,
  comment?: string | null,
): void {
  const allowed = TRANSITIONS[fromStatus];

  if (!allowed) {
    throw new WorkflowError(
      `No transitions are allowed from status "${fromStatus}"`,
    );
  }

  const requiredRole = allowed[toStatus];

  if (!requiredRole) {
    throw new WorkflowError(
      `Transition from "${fromStatus}" to "${toStatus}" is not allowed`,
    );
  }

  if (actorRole !== requiredRole) {
    throw new WorkflowError(
      `Only a ${requiredRole} can transition an application from "${fromStatus}" to "${toStatus}"`,
      403,
    );
  }

  const commentRequired = COMMENT_REQUIRED[fromStatus];
  if (commentRequired?.has(toStatus)) {
    if (!comment || comment.trim().length === 0) {
      throw new WorkflowError(
        `A comment is required when transitioning to "${toStatus}"`,
      );
    }
  }
}

/**
 * Returns all valid next statuses from a given status for a given role.
 */
export function getAllowedTransitions(
  fromStatus: ApplicationStatus,
  role: UserRole,
): ApplicationStatus[] {
  const allowed = TRANSITIONS[fromStatus] ?? {};
  return Object.entries(allowed)
    .filter(([, requiredRole]) => requiredRole === role)
    .map(([toStatus]) => toStatus as ApplicationStatus);
}
