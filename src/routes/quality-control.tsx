import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { useQcChecks } from "@/hooks/api";

export const Route = createFileRoute("/quality-control")({
  head: () => ({ meta: [{ title: "Quality Control — AgroTrace" }] }),
  component: QCPage,
});

function QCPage() {
  const { data: checks = [] } = useQcChecks();
  return (
    <>
      <PageHeader title="Quality Control" description="Intake, in-process, and finished goods inspections." />
      <div className="p-6">
        <DataTable
          data={checks}
          columns={[
            { key: "id", header: "Check" },
            { key: "batch", header: "Batch" },
            { key: "checkpoint", header: "Checkpoint" },
            { key: "value", header: "Value" },
            { key: "limit", header: "Limit" },
            { key: "inspector", header: "Inspector" },
            { key: "time", header: "Time" },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      </div>
    </>
  );
}
