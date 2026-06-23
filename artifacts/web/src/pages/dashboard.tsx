import { useAuth } from "@/hooks/use-auth";
import {
  useListApplications,
  useGetApplicationStats,
  getListApplicationsQueryKey,
  ApplicationStatus,
  Application,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { format } from "date-fns";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Loader2,
  ArrowRight,
  ClipboardCheck,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

export default function Dashboard() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const isReviewer = user?.role === "REVIEWER";

  const { data: stats } = useGetApplicationStats();

  const queryParams =
    statusFilter !== "ALL"
      ? { status: statusFilter as ApplicationStatus }
      : undefined;
  const { data: applications, isLoading } = useListApplications(queryParams, {
    query: { queryKey: getListApplicationsQueryKey(queryParams) },
  });

  // For reviewers: separate queue items that need action
  const { data: reviewQueue, isLoading: isQueueLoading } = useListApplications(
    { status: ApplicationStatus.SUBMITTED },
    {
      query: {
        queryKey: getListApplicationsQueryKey({ status: ApplicationStatus.SUBMITTED }),
        enabled: isReviewer,
      },
    }
  );
  const { data: inReviewItems } = useListApplications(
    { status: ApplicationStatus.UNDER_REVIEW },
    {
      query: {
        queryKey: getListApplicationsQueryKey({ status: ApplicationStatus.UNDER_REVIEW }),
        enabled: isReviewer,
      },
    }
  );

  const actionableApps: Application[] = isReviewer
    ? [...(reviewQueue ?? []), ...(inReviewItems ?? [])]
    : [];

  const filteredApps = (applications ?? []).filter(
    (app) =>
      search === "" ||
      app.companyName.toLowerCase().includes(search.toLowerCase()) ||
      app.registrationNumber.toLowerCase().includes(search.toLowerCase())
  );

  const AppTable = ({ apps }: { apps: Application[] }) => (
    <div className="relative overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Reg Number</TableHead>
            <TableHead>Beneficial Owner</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apps.map((app) => (
            <TableRow
              key={app.id}
              className="hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <TableCell className="font-medium">
                <Link href={`/applications/${app.id}`}>{app.companyName}</Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {app.registrationNumber}
              </TableCell>
              <TableCell>
                <div>{app.beneficialOwnerName}</div>
                <div className="text-xs text-muted-foreground">
                  {app.ownershipPercentage}%
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {format(new Date(app.updatedAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                <StatusBadge status={app.status} />
              </TableCell>
              <TableCell className="text-right">
                <Link href={`/applications/${app.id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                  >
                    {isReviewer &&
                    (app.status === ApplicationStatus.SUBMITTED ||
                      app.status === ApplicationStatus.UNDER_REVIEW)
                      ? "Review"
                      : "View"}
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isReviewer ? "Review Dashboard" : "Dashboard"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isReviewer
              ? "Manage and review beneficial ownership change requests."
              : "Manage your beneficial ownership change requests."}
          </p>
        </div>
        {!isReviewer && (
          <Link href="/applications/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Request
            </Button>
          </Link>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Awaiting Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">
                {(stats.byStatus[ApplicationStatus.SUBMITTED] ?? 0) +
                  (stats.byStatus[ApplicationStatus.UNDER_REVIEW] ?? 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {isReviewer ? "Changes Requested" : "Changes Needed"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {stats.byStatus[ApplicationStatus.CHANGES_REQUESTED] ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {stats.byStatus[ApplicationStatus.APPROVED] ?? 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── REVIEWER REVIEW QUEUE ── */}
      {isReviewer && (
        <Card className="border-2 border-amber-300">
          <CardHeader className="bg-amber-50 border-b border-amber-200">
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <ClipboardCheck className="w-5 h-5" />
              Review Queue
              {actionableApps.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-amber-600 text-white text-xs font-bold w-6 h-6">
                  {actionableApps.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isQueueLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : actionableApps.length === 0 ? (
              <div className="text-center py-10">
                <ClipboardCheck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No applications are waiting for review right now.
                </p>
              </div>
            ) : (
              <AppTable apps={actionableApps} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Applicant: show CHANGES_REQUESTED items prominently */}
      {!isReviewer && (stats?.byStatus[ApplicationStatus.CHANGES_REQUESTED] ?? 0) > 0 && (
        <Card className="border-orange-200 bg-orange-50/40">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orange-900">
                Action required — changes requested
              </p>
              <p className="text-xs text-orange-700 mt-0.5">
                A reviewer has requested changes on one or more of your applications. Filter by "Changes Requested" below or click the application to view feedback.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All applications table */}
      <Card>
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">
              {isReviewer ? "All Applications" : "My Requests"}
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search company or reg #..."
                className="pl-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value={ApplicationStatus.DRAFT}>Draft</SelectItem>
                  <SelectItem value={ApplicationStatus.SUBMITTED}>
                    Submitted
                  </SelectItem>
                  <SelectItem value={ApplicationStatus.UNDER_REVIEW}>
                    Under Review
                  </SelectItem>
                  <SelectItem value={ApplicationStatus.CHANGES_REQUESTED}>
                    Changes Requested
                  </SelectItem>
                  <SelectItem value={ApplicationStatus.APPROVED}>
                    Approved
                  </SelectItem>
                  <SelectItem value={ApplicationStatus.REJECTED}>
                    Rejected
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No requests found</h3>
            <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
              {search || statusFilter !== "ALL"
                ? "Try adjusting your filters."
                : isReviewer
                ? "No applications exist in the system yet."
                : "You haven't created any change requests yet."}
            </p>
            {!isReviewer && !search && statusFilter === "ALL" && (
              <Link href="/applications/new">
                <Button className="mt-4">Create your first request</Button>
              </Link>
            )}
          </div>
        ) : (
          <AppTable apps={filteredApps} />
        )}
      </Card>
    </div>
  );
}
