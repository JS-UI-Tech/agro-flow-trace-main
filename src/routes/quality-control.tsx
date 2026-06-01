import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/quality-control")({
  head: () => ({ meta: [{ title: "Quality Control — AgroTrace" }] }),
  component: QCPage,
});

function QCPage() {
  return (
    <>
      <PageHeader title="Quality Control" description="Intake, in-process, and finished goods inspections." />
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Coming Soon</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Quality Control inspections, test records, and compliance dashboards are under development.
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
