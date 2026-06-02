import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { useAudit, type AuditEntry } from "@/hooks/api";

export const Route = createFileRoute("/audit")({
  head: () => ({ meta: [{ title: "Audit Trail — AgroTrace" }] }),
  component: AuditPage,
});

function AuditPage() {
  const { data: auditLog = [] } = useAudit();

  return (
    <>
      <PageHeader title="Audit Trail" description="Immutable log of every record change across the system." actions={<Button variant="outline">Export</Button>} />
      <div className="p-6">
        <DataTable<AuditEntry>
          data={auditLog}
          columns={[
            { key: "time", header: "Timestamp" },
            { key: "user", header: "User" },
            { key: "action", header: "Action" },
            { key: "entityType", header: "Type" },
            { key: "entityId", header: "Record", render: (row) => row.entityId },
          ]}
        />
      </div>
    </>
  );
}
