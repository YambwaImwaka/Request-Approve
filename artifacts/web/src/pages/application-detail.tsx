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
  UserRole
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Send, CheckCircle, XCircle, Clock, AlertCircle, Edit, FileText, User as UserIcon } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function ApplicationDetail() {
  const { id } = useParams();
  const applicationId = id ? parseInt(id, 10) : 0;
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [comment, setComment] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isRequestChangesDialogOpen, setIsRequestChangesDialogOpen] = useState(false);

  const { data: app, isLoading } = useGetApplication(applicationId, {
    query: {
      enabled: !!applicationId,
      queryKey: getGetApplicationQueryKey(applicationId)
    }
  });

  const submitMutation = useSubmitApplication();
  const startReviewMutation = useStartReview();
  const approveMutation = useApproveApplication();
  const rejectMutation = useRejectApplication();
  const requestChangesMutation = useRequestChanges();

  const isApplicant = user?.role === UserRole.APPLICANT;
  const isReviewer = user?.role === UserRole.REVIEWER;

  const handleAction = (
    actionName: string, 
    mutation: any, 
    data: any = undefined, 
    onSuccessCb?: () => void
  ) => {
    const payload = data !== undefined ? { id: applicationId, data } : { id: applicationId };
    
    mutation.mutate(payload, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetApplicationQueryKey(applicationId) });
        queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetApplicationStatsQueryKey() });
        toast({
          title: "Success",
          description: `Application ${actionName.toLowerCase()} successfully.`,
        });
        setComment("");
        if (onSuccessCb) onSuccessCb();
      },
      onError: (err: any) => {
        toast({
          title: "Error",
          description: err.message || `Failed to ${actionName.toLowerCase()} application.`,
          variant: "destructive",
        });
      }
    });
  };

  if (isLoading || !app) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isWorking = submitMutation.isPending || 
                    startReviewMutation.isPending || 
                    approveMutation.isPending || 
                    rejectMutation.isPending || 
                    requestChangesMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{app.companyName}</h1>
            <StatusBadge status={app.status} />
          </div>
          <p className="text-muted-foreground mt-1">Registration: {app.registrationNumber}</p>
        </div>
        {isApplicant && app.status === ApplicationStatus.DRAFT && (
          <div className="flex gap-2">
            <Link href={`/applications/${app.id}/edit`}>
              <Button variant="outline" className="gap-2">
                <Edit className="w-4 h-4" /> Edit
              </Button>
            </Link>
            <Button 
              onClick={() => handleAction("Submitted", submitMutation)}
              disabled={isWorking}
              className="gap-2"
            >
              <Send className="w-4 h-4" /> Submit for Review
            </Button>
          </div>
        )}
      </div>

      {isReviewer && app.status === ApplicationStatus.SUBMITTED && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-blue-900">Ready for Review</h3>
                <p className="text-sm text-blue-700">This request has been submitted and is waiting for a reviewer.</p>
              </div>
            </div>
            <Button 
              onClick={() => handleAction("Started Review", startReviewMutation)}
              disabled={isWorking}
            >
              Start Review
            </Button>
          </CardContent>
        </Card>
      )}

      {isReviewer && app.status === ApplicationStatus.UNDER_REVIEW && (
        <Card className="border-amber-200 shadow-md">
          <CardHeader className="bg-amber-50/50 border-b border-amber-100">
            <CardTitle className="text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Review Actions
            </CardTitle>
            <CardDescription className="text-amber-800">
              You are currently reviewing this application.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="comment">Reviewer Comment (required for rejection or changes)</Label>
                <Textarea 
                  id="comment"
                  placeholder="Provide feedback to the applicant..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={() => handleAction("Approved", approveMutation, { comment: comment || undefined })}
                  disabled={isWorking}
                  className="bg-green-600 hover:bg-green-700 text-white gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Approve
                </Button>
                
                <Dialog open={isRequestChangesDialogOpen} onOpenChange={setIsRequestChangesDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="border-orange-200 text-orange-700 hover:bg-orange-50 gap-2"
                      disabled={!comment.trim() || isWorking}
                    >
                      <FileText className="w-4 h-4" /> Request Changes
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Request Changes</DialogTitle>
                      <DialogDescription>
                        This will send the application back to the applicant to address your comments.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="p-4 bg-muted/50 rounded-md text-sm border border-border">
                      <strong>Your comment:</strong>
                      <p className="mt-2 whitespace-pre-wrap">{comment}</p>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsRequestChangesDialogOpen(false)}>Cancel</Button>
                      <Button 
                        onClick={() => handleAction("Changes Requested", requestChangesMutation, { comment }, () => setIsRequestChangesDialogOpen(false))}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        Confirm Request Changes
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="border-red-200 text-red-700 hover:bg-red-50 gap-2"
                      disabled={!comment.trim() || isWorking}
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reject Application</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to reject this application? This action cannot be easily undone.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="p-4 bg-muted/50 rounded-md text-sm border border-border">
                      <strong>Your comment:</strong>
                      <p className="mt-2 whitespace-pre-wrap">{comment}</p>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
                      <Button 
                        onClick={() => handleAction("Rejected", rejectMutation, { comment }, () => setIsRejectDialogOpen(false))}
                        variant="destructive"
                      >
                        Confirm Rejection
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Company Name</h4>
                  <p className="text-base">{app.companyName}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Registration Number</h4>
                  <p className="text-base font-mono">{app.registrationNumber}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Beneficial Owner</h4>
                  <p className="text-base">{app.beneficialOwnerName}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Ownership Percentage</h4>
                  <p className="text-base font-mono">{app.ownershipPercentage}%</p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Reason for Change</h4>
                <div className="bg-muted/30 p-4 rounded-md border border-border">
                  <p className="whitespace-pre-wrap text-sm">{app.changeReason}</p>
                </div>
              </div>

              {app.supportingNotes && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Supporting Notes</h4>
                  <div className="bg-muted/30 p-4 rounded-md border border-border">
                    <p className="whitespace-pre-wrap text-sm">{app.supportingNotes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" /> Audit Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {app.auditLog.map((log, index) => (
                  <div key={log.id} className="relative pl-6 pb-2">
                    {index !== app.auditLog.length - 1 && (
                      <div className="absolute left-2 top-2 bottom-0 w-px bg-border -translate-x-1/2 translate-y-2"></div>
                    )}
                    <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-background bg-primary -translate-x-1/2"></div>
                    
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">
                          {log.previousStatus} → {log.newStatus}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.timestamp), "MMM d, h:mm a")}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <UserIcon className="w-3 h-3" />
                        <span>{log.user?.email || `User ${log.userId}`} ({log.userRole})</span>
                      </div>
                      
                      {log.comment && (
                        <div className="mt-2 text-sm bg-muted p-2 rounded border border-border italic text-foreground/80">
                          "{log.comment}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
