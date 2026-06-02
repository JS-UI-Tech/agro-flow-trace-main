import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useRecipes } from "@/hooks/api";

type Ingredient = { id: string; name: string; quantity: string; unit: string };
type Step = {
  id: string;
  title: string;
  kind: string;
  unit?: string;
  detail?: string;
  expected?: string;
};

export const Route = createFileRoute("/recipes")({
  head: () => ({ meta: [{ title: "Recipes / BOM — AgroTrace" }] }),
  component: RecipesPage,
});

function RecipesPage() {
  const { data: recipes = [] } = useRecipes();
  const navigate = useNavigate();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const selected = useMemo(
    () => recipes.find((r) => r.code === selectedCode) ?? null,
    [recipes, selectedCode],
  );

  function handleDelete(code: string) {
    if (selectedCode === code) setSelectedCode(null);
    setConfirmDelete(null);
  }

  return (
    <>
      <PageHeader
        title="Recipes / Bill of Materials"
        description="Formulation versions, ingredients and process steps."
        actions={
          <Button onClick={() => navigate({ to: "/recipes/editor" })}>
            <Plus /> New recipe
          </Button>
        }
      />
      <div className="p-6">
        <DataTable
          data={recipes}
          columns={[
            { key: "code", header: "Code" },
            { key: "product", header: "Product" },
            { key: "version", header: "Version" },
            { key: "yield", header: "Expected yield" },
            { key: "shelf", header: "Shelf life" },
            {
              key: "status",
              header: "Status",
              render: (r) => <StatusBadge status={r.status} />,
            },
            {
              key: "actions",
              header: "",
              render: (r) => (
                <Button variant="outline" size="sm" onClick={() => setSelectedCode(r.code)}>
                  View
                </Button>
              ),
            },
          ]}
        />
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedCode(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.product}</SheetTitle>
                <SheetDescription>
                  {selected.code} • {selected.version} • {selected.status}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border border-border bg-card p-3">
                  <div className="text-xs uppercase text-muted-foreground">Expected yield</div>
                  <div className="font-medium">{selected.yield}</div>
                </div>
                <div className="rounded-md border border-border bg-card p-3">
                  <div className="text-xs uppercase text-muted-foreground">Shelf life</div>
                  <div className="font-medium">{selected.shelf}</div>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Ingredients
                </div>
                <ul className="mt-2 divide-y divide-border rounded-md border border-border">
                  {(selected.ingredients as Ingredient[]).map((i) => (
                    <li key={i.id} className="flex justify-between px-3 py-2 text-sm">
                      <span>{i.name}</span>
                      <span className="text-muted-foreground">
                        {i.quantity} {i.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Process steps
                </div>
                <ol className="mt-2 space-y-2">
                  {(selected.steps as Step[]).map((s, idx) => (
                    <li
                      key={s.id}
                      className="rounded-md border border-border bg-card p-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {idx + 1}. {s.title}
                        </span>
                        <span className="text-xs uppercase text-muted-foreground">
                          {s.kind === "input" ? `Input · ${s.unit ?? ""}` : "Check"}
                        </span>
                      </div>
                      {s.detail && (
                        <p className="mt-1 text-muted-foreground">{s.detail}</p>
                      )}
                      {s.kind === "input" && s.expected && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Expected: {s.expected}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>

              <SheetFooter className="mt-6">
                <Button
                  variant="destructive"
                  onClick={() => setConfirmDelete(selected.code)}
                >
                  <Trash2 /> Delete
                </Button>
                <Button
                  onClick={() =>
                    navigate({
                      to: "/recipes/editor",
                      search: { code: selected.code },
                    })
                  }
                >
                  <Pencil /> Edit
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recipe?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {confirmDelete} permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && handleDelete(confirmDelete)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}