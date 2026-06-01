import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { QrCode, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/verify")({
  head: () => ({ meta: [{ title: "Product Verification — AgroTrace" }] }),
  component: VerifyPage,
});

function VerifyPage() {
  return (
    <>
      <PageHeader title="Consumer Product Verification" description="Public verification page powered by QR codes." />
      <div className="p-6">
        <div className="mx-auto max-w-xl rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-primary/10 p-3 text-primary"><QrCode className="h-6 w-6" /></div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Scan or enter QR code</h3>
              <p className="text-xs text-muted-foreground">Verify authenticity &amp; freshness of any AgroTrace product</p>
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <input className="h-10 flex-1 rounded-md border border-input bg-background px-3" placeholder="e.g. FG-2026-0990" />
            <Button>Verify</Button>
          </div>

          <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-5">
            <div className="flex items-center gap-2 text-primary"><CheckCircle2 className="h-5 w-5" /><span className="font-medium">Authentic product</span></div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-muted-foreground">Product</dt><dd className="font-medium">Pasteurized Milk 1L</dd></div>
              <div><dt className="text-xs text-muted-foreground">Batch</dt><dd className="font-medium">PB-2026-0450</dd></div>
              <div><dt className="text-xs text-muted-foreground">MFG date</dt><dd className="font-medium">2026-05-19</dd></div>
              <div><dt className="text-xs text-muted-foreground">Expiry</dt><dd className="font-medium">2026-06-02</dd></div>
              <div><dt className="text-xs text-muted-foreground">Manufacturer</dt><dd className="font-medium">AgroTrace Foods Ltd</dd></div>
              <div><dt className="text-xs text-muted-foreground">Status</dt><dd><StatusBadge status="Released" /></dd></div>
            </dl>
            <div className="mt-4">
              <label className="text-xs text-muted-foreground">Feedback or complaint (optional)</label>
              <textarea className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm" rows={3} />
              <div className="mt-2 flex justify-end"><Button size="sm" variant="outline">Submit</Button></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
