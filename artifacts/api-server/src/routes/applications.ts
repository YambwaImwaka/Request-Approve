import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, usersTable, applicationsTable, auditLogsTable } from "@workspace/db";
import {
  CreateApplicationBody,
  UpdateApplicationBody,
  UpdateApplicationParams,
  GetApplicationParams,
  ListApplicationsQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { validateTransition, WorkflowError, type ApplicationStatus } from "../lib/workflow";

const router: IRouter = Router();

/**
 * Serialize an application row with its user for API responses.
 */
async function serializeApplication(app: typeof applicationsTable.$inferSelect) {
  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, app.userId));

  return {
    ...app,
    ownershipPercentage: parseFloat(app.ownershipPercentage as unknown as string),
    user: user ?? null,
  };
}

// GET /applications
router.get("/applications", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const queryParsed = ListApplicationsQueryParams.safeParse(req.query);
  const statusFilter = queryParsed.success ? queryParsed.data.status : undefined;

  const user = req.user!;

  let query = db
    .select()
    .from(applicationsTable)
    .orderBy(desc(applicationsTable.updatedAt))
    .$dynamic();

  // Applicants only see their own applications
  if (user.role === "APPLICANT") {
    query = query.where(
      statusFilter
        ? and(
            eq(applicationsTable.userId, user.userId),
            eq(applicationsTable.status, statusFilter),
          )
        : eq(applicationsTable.userId, user.userId),
    );
  } else if (statusFilter) {
    query = query.where(eq(applicationsTable.status, statusFilter));
  }

  const apps = await query;
  const serialized = await Promise.all(apps.map(serializeApplication));
  res.json(serialized);
});

// GET /applications/stats - must be before /applications/:id
router.get("/applications/stats", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;

  let baseQuery = db
    .select({
      status: applicationsTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(applicationsTable)
    .$dynamic();

  if (user.role === "APPLICANT") {
    baseQuery = baseQuery.where(eq(applicationsTable.userId, user.userId));
  }

  const rows = await baseQuery.groupBy(applicationsTable.status);

  const byStatus: Record<string, number> = {};
  let total = 0;

  for (const row of rows) {
    byStatus[row.status] = row.count;
    total += row.count;
  }

  res.json({ total, byStatus });
});

// POST /applications
router.post("/applications", requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (req.user!.role !== "APPLICANT") {
    res.status(403).json({ success: false, message: "Only applicants may create applications" });
    return;
  }

  const parsed = CreateApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: parsed.error.message });
    return;
  }

  const [app] = await db
    .insert(applicationsTable)
    .values({
      ...parsed.data,
      ownershipPercentage: String(parsed.data.ownershipPercentage),
      userId: req.user!.userId,
      status: "DRAFT",
    })
    .returning();

  res.status(201).json(await serializeApplication(app));
});

// GET /applications/:id
router.get("/applications/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = GetApplicationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ success: false, message: "Invalid application id" });
    return;
  }

  const [app] = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.id, params.data.id));

  if (!app) {
    res.status(404).json({ success: false, message: "Application not found" });
    return;
  }

  // Applicants can only view their own applications
  if (req.user!.role === "APPLICANT" && app.userId !== req.user!.userId) {
    res.status(403).json({ success: false, message: "Access denied" });
    return;
  }

  const auditEntries = await db
    .select()
    .from(auditLogsTable)
    .where(eq(auditLogsTable.applicationId, app.id))
    .orderBy(auditLogsTable.timestamp);

  const auditWithUsers = await Promise.all(
    auditEntries.map(async (entry) => {
      const [user] = await db
        .select({ id: usersTable.id, email: usersTable.email, role: usersTable.role })
        .from(usersTable)
        .where(eq(usersTable.id, entry.userId));
      return { ...entry, user: user ?? null };
    }),
  );

  const serialized = await serializeApplication(app);
  res.json({ ...serialized, auditLog: auditWithUsers });
});

// PATCH /applications/:id
router.patch("/applications/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = UpdateApplicationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ success: false, message: "Invalid application id" });
    return;
  }

  const parsed = UpdateApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: parsed.error.message });
    return;
  }

  const [app] = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.id, params.data.id));

  if (!app) {
    res.status(404).json({ success: false, message: "Application not found" });
    return;
  }

  if (app.userId !== req.user!.userId) {
    res.status(403).json({ success: false, message: "Only the owner may edit this application" });
    return;
  }

  if (app.status !== "DRAFT") {
    res.status(403).json({ success: false, message: "Only DRAFT applications can be edited" });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.ownershipPercentage !== undefined) {
    updateData.ownershipPercentage = String(parsed.data.ownershipPercentage);
  }

  const [updated] = await db
    .update(applicationsTable)
    .set(updateData)
    .where(eq(applicationsTable.id, params.data.id))
    .returning();

  res.json(await serializeApplication(updated));
});

/**
 * Generic workflow transition handler factory.
 */
function transitionHandler(toStatus: ApplicationStatus, requireCommentInBody: boolean) {
  return async (req: Request, res: Response): Promise<void> => {
    const rawId = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
    const id = parseInt(rawId, 10);

    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid application id" });
      return;
    }

    const [app] = await db
      .select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, id));

    if (!app) {
      res.status(404).json({ success: false, message: "Application not found" });
      return;
    }

    const user = req.user!;
    const comment: string | undefined = (req.body as { comment?: string } | undefined)?.comment;

    try {
      validateTransition(app.status as ApplicationStatus, toStatus, user.role, comment);
    } catch (err) {
      if (err instanceof WorkflowError) {
        res.status(err.statusCode).json({ success: false, message: err.message });
        return;
      }
      throw err;
    }

    if (requireCommentInBody && (!comment || comment.trim().length === 0)) {
      res.status(400).json({ success: false, message: "A comment is required for this action" });
      return;
    }

    const previousStatus = app.status as ApplicationStatus;

    const [updated] = await db
      .update(applicationsTable)
      .set({ status: toStatus })
      .where(eq(applicationsTable.id, id))
      .returning();

    await db.insert(auditLogsTable).values({
      applicationId: id,
      userId: user.userId,
      userRole: user.role,
      previousStatus,
      newStatus: toStatus,
      comment: comment?.trim() ?? null,
    });

    res.json(await serializeApplication(updated));
  };
}

router.post("/applications/:id/submit", requireAuth, transitionHandler("SUBMITTED", false));
router.post("/applications/:id/start-review", requireAuth, transitionHandler("UNDER_REVIEW", false));
router.post("/applications/:id/approve", requireAuth, transitionHandler("APPROVED", false));
router.post("/applications/:id/reject", requireAuth, transitionHandler("REJECTED", true));
router.post("/applications/:id/request-changes", requireAuth, transitionHandler("CHANGES_REQUESTED", true));

export default router;
