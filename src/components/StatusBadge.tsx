import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  Approved: "bg-primary/10 text-primary border-primary/20",
  Released: "bg-primary/10 text-primary border-primary/20",
  Pass: "bg-primary/10 text-primary border-primary/20",
  Delivered: "bg-primary/10 text-primary border-primary/20",
  Closed: "bg-muted text-muted-foreground border-border",
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  "Pending QC": "bg-amber-50 text-amber-700 border-amber-200",
  "In Process": "bg-blue-50 text-blue-700 border-blue-200",
  "In Transit": "bg-blue-50 text-blue-700 border-blue-200",
  "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
  Packaging: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Dispatched: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Quarantined: "bg-orange-50 text-orange-700 border-orange-200",
  Rejected: "bg-destructive/10 text-destructive border-destructive/20",
  Fail: "bg-destructive/10 text-destructive border-destructive/20",
  Open: "bg-destructive/10 text-destructive border-destructive/20",
  Recalled: "bg-destructive/10 text-destructive border-destructive/20",
  Returned: "bg-orange-50 text-orange-700 border-orange-200",
  Low: "bg-primary/10 text-primary border-primary/20",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  High: "bg-destructive/10 text-destructive border-destructive/20",
  Valid: "bg-primary/10 text-primary border-primary/20",
  Expiring: "bg-amber-50 text-amber-700 border-amber-200",
  Expired: "bg-destructive/10 text-destructive border-destructive/20",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[status] ?? "bg-muted text-muted-foreground border-border",
      )}
    >
      {status}
    </span>
  );
}
