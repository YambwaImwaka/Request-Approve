import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetApplication,
  useSubmitApplication,
  useStartReview,
  useApproveApplication,
  useRejectApplication,
  useRequestChanges,
  getGetApplicationQueryKey,
  getListApplicationsQueryKey,
  getGetApplicationStatsQueryKey,
  ApplicationStatus,
  UserRole,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/status-badge";
import { getCategoryLabel } from "@/lib/category";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Loader2,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  FileText,
  User as UserIcon,
  Clock,
  RotateCcw,
  Paperclip,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { format, parseISO } from "date-fns";

export default function ApplicationDetail() {
  const { id } = useParams();
  const applicationId = id ? parseInt(id, 10) : 0;
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [comment, setComment] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const {
    data: app,
    isLoading,
    refetch,
  } = useGetApplication(applicationId, {
    query: {
      enabled: !!applicationId && !isNaN(applicationId),
      queryKey: getGetApplicationQueryKey(applicationId),
      refetchOnWindowFocus: true,
    },
  });

  const submitMutation = useSubmitApplication();
  const startReviewMutation = useStartReview();
  const approveMutation = useApproveApplication();
  const rejectMutation = useRejectApplication();
  const requestChangesMutation = useRequestChanges();

  const isApplicant = user?.role === UserRole.APPLICANT;
  const isReviewer = user?.role === UserRole.REVIEWER;

  const isWorking =
    submitMutation.isPending ||
    startReviewMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    requestChangesMutation.isPending;

  const invalidateAll = () => {
    queryClient.invalidateQueries({
      queryKey: getGetApplicationQueryKey(applicationId),
    });
    queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
    queryClient.invalidateQueries({
      queryKey: getGetApplicationStatsQueryKey(),
    });
    refetch();
  };

  const showError = (err: unknown, fallback: string) => {
    const e = err as { data?: { message?: string }; message?: string } | null;
    const message = e?.data?.message ?? e?.message ?? fallback;
    toast({ title: "Action Failed", description: message, variant: "destructive" });
  };

  const runReviewerAction = (actionLabel: string, run: () => void) => {
    if (!app) return;
    if (app.status === ApplicationStatus.SUBMITTED) {
      setPendingAction(actionLabel);
      startReviewMutation.mutate(
        { id: applicationId },
        {
          onSuccess: () => run(),
          onError: (err) => {
            setPendingAction(null);
            showError(err, "Failed to start review");
          },
        },
      );
    } else {
      run();
    }
  };

  const handleApprove = () => {
    runReviewerAction("Approving", () => {
      approveMutation.mutate(
        {
          id: applicationId,
          data: comment.trim() ? { comment: comment.trim() } : undefined,
        },
        {
          onSuccess: () => {
            setPendingAction(null);
            setComment("");
            invalidateAll();
            toast({ title: "Approved", description: "The application has been approved." });
          },
          onError: (err) => {
            setPendingAction(null);
            showError(err, "Failed to approve application");
          },
        },
      );
    });
  };

  const handleReject = () => {
    if (!comment.trim()) {
      toast({
        title: "Comment required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return;
    }
    runReviewerAction("Rejecting", () => {
      rejectMutation.mutate(
        { id: applicationId, data: { comment: comment.trim() } },
        {
          onSuccess: () => {
            setPendingAction(null);
            setComment("");
            invalidateAll();
            toast({ title: "Rejected", description: "The application has been rejected." });
          },
          onError: (err) => {
            setPendingAction(null);
            showError(err, "Failed to reject application");
          },
        },
      );
    });
  };

  const handleRequestChanges = () => {
    if (!comment.trim()) {
      toast({
        title: "Comment required",
        description: "Please describe the changes needed.",
        variant: "destructive",
      });
      return;
    }
    runReviewerAction("Requesting changes", () => {
      requestChangesMutation.mutate(
        { id: applicationId, data: { comment: comment.trim() } },
        {
          onSuccess: () => {
            setPendingAction(null);
            setComment("");
            invalidateAll();
            toast({
              title: "Changes Requested",
              description: "The application has been returned to the applicant.",
            });
          },
          onError: (err) => {
            setPendingAction(null);
            showError(err, "Failed to request changes");
          },
        },
      );
    });
  };

  const handleSubmit = () => {
    submitMutation.mutate(
      { id: applicationId },
      {
        onSuccess: () => {
          invalidateAll();
          toast({
            title: "Submitted",
            description: "Your application has been submitted for review.",
          });
        },
        onError: (err) => {
          showError(err, "Failed to submit application");
        },
      },
    );
  };

  if (isLoading || !app) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const auditLog = app.auditLog ?? [];
  const isReviewable =
    isReviewer &&
    (app.status === ApplicationStatus.SUBMITTED ||
      app.status === ApplicationStatus.UNDER_REVIEW);

  const isFinalState =
    app.status === ApplicationStatus.APPROVED ||
    app.status === ApplicationStatus.REJECTED;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/dashboard">
          <Button variant="outline" size="icon" className="mt-1 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {app.title || app.companyName}
            </h1>
            <StatusBadge status={app.status} />
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            {app.category && (
              <Badge variant="secondary" className="text-xs">
                {getCategoryLabel(app.category)}
              </Badge>
            )}
            <p className="text-muted-foreground text-sm">
              {app.companyName} ·{" "}
              <span className="font-mono">{app.registrationNumber}</span>
              {app.user && (
                <span className="ml-2">· by {app.user.email}</span>
              )}
            </p>
          </div>
        </div>
        {isApplicant && app.status === ApplicationStatus.DRAFT && (
          <div className="flex gap-2 shrink-0">
            <Link href={`/applications/${app.id}/edit`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Edit className="w-4 h-4" /> Edit
              </Button>
            </Link>
            <Button
              onClick={handleSubmit}
              disabled={isWorking}
              size="sm"
              className="gap-2"
            >
              {submitMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Submit for Review
            </Button>
          </div>
        )}
        {isApplicant &&
          app.status === ApplicationStatus.CHANGES_REQUESTED && (
            <div className="flex gap-2 shrink-0">
              <Link href={`/applications/${app.id}/edit`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Edit className="w-4 h-4" /> Edit & Resubmit
                </Button>
              </Link>
            </div>
          )}
      </div>

      {/* ── REVIEWER ACTION PANEL ── */}
      {isReviewable && (
        <Card className="border-2 border-amber-300 shadow-md">
          <CardHeader className="bg-amber-50 border-b border-amber-200 pb-4">
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertCircle className="w-5 h-5" />
              Review this Request
            </CardTitle>
            <p className="text-sm text-amber-800 mt-1">
              {app.status === ApplicationStatus.SUBMITTED
                ? "This request is awaiting review. Select an action below — it will automatically be moved to Under Review first."
                : "You are actively reviewing this request. Select an outcome below."}
            </p>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="reviewer-comment" className="text-sm font-semibold">
                Reviewer Comment
                <span className="ml-1 text-muted-foreground font-normal">
                  (required for Reject and Request Changes)
                </span>
              </Label>
              <Textarea
                id="reviewer-comment"
                placeholder="Provide feedback or reasoning for your decision..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[110px] resize-y"
                disabled={isWorking}
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <Button
                onClick={handleApprove}
                disabled={isWorking}
                className="bg-green-600 hover:bg-green-700 text-white gap-2 min-w-[110px]"
              >
                {approveMutation.isPending || pendingAction === "Approving" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Approve
              </Button>

              <Button
                onClick={handleRequestChanges}
                disabled={isWorking}
                variant="outline"
                className="border-orange-400 text-orange-700 hover:bg-orange-50 gap-2 min-w-[160px]"
              >
                {requestChangesMutation.isPending ||
                pendingAction === "Requesting changes" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                Request Changes
              </Button>

              <Button
                onClick={handleReject}
                disabled={isWorking}
                variant="outline"
                className="border-red-400 text-red-700 hover:bg-red-50 gap-2 min-w-[100px]"
              >
                {rejectMutation.isPending || pendingAction === "Rejecting" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Reject
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Approve does not require a comment. Reject and Request Changes
              require one.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Final state banner */}
      {isReviewer && isFinalState && (
        <Card
          className={`border ${
            app.status === ApplicationStatus.APPROVED
              ? "border-green-200 bg-green-50/50"
              : "border-red-200 bg-red-50/50"
          }`}
        >
          <CardContent className="p-4 flex items-center gap-3">
            {app.status === ApplicationStatus.APPROVED ? (
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <p
              className={`text-sm font-medium ${
                app.status === ApplicationStatus.APPROVED
                  ? "text-green-800"
                  : "text-red-800"
              }`}
            >
              This application was{" "}
              {app.status === ApplicationStatus.APPROVED
                ? "approved"
                : "rejected"}
              . No further action is required.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Changes requested banner (applicant) */}
      {isApplicant && app.status === ApplicationStatus.CHANGES_REQUESTED && (
        <Card className="border-orange-200 bg-orange-50/60">
          <CardContent className="p-4 flex items-start gap-3">
            <RotateCcw className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orange-900">
                Changes Requested
              </p>
              <p className="text-sm text-orange-800 mt-1">
                The reviewer has requested changes. Review their feedback in the
                audit timeline below, then edit and resubmit.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Application details — 2/3 width */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Application Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Key fields grid */}
              <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Company Name
                  </p>
                  <p className="text-sm font-medium">{app.companyName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Registration Number
                  </p>
                  <p className="text-sm font-mono">{app.registrationNumber}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Beneficial Owner
                  </p>
                  <p className="text-sm font-medium">{app.beneficialOwnerName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Ownership Percentage
                  </p>
                  <p className="text-sm font-mono font-semibold">
                    {app.ownershipPercentage}%
                  </p>
                </div>
                {app.effectiveDate && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Effective Date
                    </p>
                    <p className="text-sm flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      {format(parseISO(app.effectiveDate), "MMMM d, yyyy")}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Category
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {getCategoryLabel(app.category ?? "")}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Reason for Change
                </p>
                <div className="bg-muted/30 p-3 rounded-md border text-sm whitespace-pre-wrap">
                  {app.changeReason}
                </div>
              </div>

              {app.supportingNotes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Supporting Notes
                  </p>
                  <div className="bg-muted/30 p-3 rounded-md border text-sm whitespace-pre-wrap">
                    {app.supportingNotes}
                  </div>
                </div>
              )}

              {/* Attachment */}
              {app.attachmentUrl && app.attachmentName && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Supporting Document
                  </p>
                  <a
                    href={app.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/20 hover:bg-muted/50 transition-colors text-sm"
                  >
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                    <span className="truncate max-w-[200px]">
                      {app.attachmentName}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  </a>
                </div>
              )}

              <div className="flex gap-6 pt-2 text-xs text-muted-foreground border-t">
                <span>
                  Created:{" "}
                  {format(new Date(app.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </span>
                <span>
                  Updated:{" "}
                  {format(new Date(app.updatedAt), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audit timeline — 1/3 width */}
        <div>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="w-4 h-4" />
                Audit Trail
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {auditLog.length}{" "}
                  {auditLog.length === 1 ? "entry" : "entries"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLog.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    No activity yet.
                  </p>
                  {isApplicant &&
                    app.status === ApplicationStatus.DRAFT && (
                      <p className="text-xs text-muted-foreground">
                        Submit this request to begin the review process.
                      </p>
                    )}
                </div>
              ) : (
                <div className="space-y-5">
                  {auditLog.map((entry, index) => (
                    <div key={entry.id} className="relative pl-5">
                      {index < auditLog.length - 1 && (
                        <div className="absolute left-[7px] top-4 bottom-0 w-px bg-border" />
                      )}
                      <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-primary bg-background" />

                      <div className="space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-semibold leading-none">
                            {entry.previousStatus} → {entry.newStatus}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(
                            new Date(entry.timestamp),
                            "MMM d, yyyy · h:mm a",
                          )}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <UserIcon className="w-3 h-3 shrink-0" />
                          <span className="truncate">
                            {entry.user?.email ?? `User ${entry.userId}`}
                          </span>
                          <span className="shrink-0 px-1 py-0.5 bg-muted rounded text-[10px] uppercase tracking-wide font-medium">
                            {entry.userRole}
                          </span>
                        </div>
                        {entry.comment && (
                          <blockquote className="mt-2 pl-2 border-l-2 border-muted-foreground/30 text-xs italic text-foreground/70">
                            {entry.comment}
                          </blockquote>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
