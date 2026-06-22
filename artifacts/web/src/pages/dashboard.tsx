import { useAuth } from "@/hooks/use-auth";
import { useListApplications, useGetApplicationStats, getListApplicationsQueryKey, ApplicationStatus, Application } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { format } from "date-fns";
import { FileText, Plus, Search, Filter, Loader2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function Dashboard() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const { data: stats } = useGetApplicationStats();
  
  const queryParams = statusFilter !== "ALL" ? { status: statusFilter as ApplicationStatus } : undefined;
  const { data: applications, isLoading } = useListApplications(queryParams, {
    query: {
      queryKey: getListApplicationsQueryKey(queryParams)
    }
  });

  const isReviewer = user?.role === "REVIEWER";

  const filteredApps = applications?.filter(app => 
    search === "" || 
    app.companyName.toLowerCase().includes(search.toLowerCase()) || 
    app.registrationNumber.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {isReviewer ? "Manage and review beneficial ownership change requests." : "Manage your beneficial ownership change requests."}
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

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Under Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.byStatus[ApplicationStatus.UNDER_REVIEW] || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Changes Requested</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.byStatus[ApplicationStatus.CHANGES_REQUESTED] || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.byStatus[ApplicationStatus.APPROVED] || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search company or reg #..."
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value={ApplicationStatus.DRAFT}>Draft</SelectItem>
                <SelectItem value={ApplicationStatus.SUBMITTED}>Submitted</SelectItem>
                <SelectItem value={ApplicationStatus.UNDER_REVIEW}>Under Review</SelectItem>
                <SelectItem value={ApplicationStatus.CHANGES_REQUESTED}>Changes Requested</SelectItem>
                <SelectItem value={ApplicationStatus.APPROVED}>Approved</SelectItem>
                <SelectItem value={ApplicationStatus.REJECTED}>Rejected</SelectItem>
              </SelectContent>
            </Select>
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
                ? "Try adjusting your filters to see more results." 
                : "You don't have any change requests yet."}
            </p>
            {!isReviewer && !search && statusFilter === "ALL" && (
              <Link href="/applications/new">
                <Button className="mt-4">Create your first request</Button>
              </Link>
            )}
          </div>
        ) : (
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
                {filteredApps.map((app) => (
                  <TableRow key={app.id} className="hover:bg-muted/50 cursor-pointer transition-colors group">
                    <TableCell className="font-medium">
                      <Link href={`/applications/${app.id}`} className="flex items-center gap-2">
                        {app.companyName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{app.registrationNumber}</TableCell>
                    <TableCell>
                      <div>{app.beneficialOwnerName}</div>
                      <div className="text-xs text-muted-foreground">{app.ownershipPercentage}%</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(app.updatedAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={app.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/applications/${app.id}`}>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          View <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
