import { Badge } from "@/components/ui/badge";
import { ApplicationStatus } from "@workspace/api-client-react";

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  switch (status) {
    case ApplicationStatus.DRAFT:
      return <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200">DRAFT</Badge>;
    case ApplicationStatus.SUBMITTED:
      return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200">SUBMITTED</Badge>;
    case ApplicationStatus.UNDER_REVIEW:
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200">UNDER REVIEW</Badge>;
    case ApplicationStatus.APPROVED:
      return <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">APPROVED</Badge>;
    case ApplicationStatus.REJECTED:
      return <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">REJECTED</Badge>;
    case ApplicationStatus.CHANGES_REQUESTED:
      return <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200">CHANGES REQUESTED</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
