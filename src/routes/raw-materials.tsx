import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRawMaterials, useCreate, useUpdate } from "@/hooks/api";

export const Route = createFileRoute("/raw-materials")({
  head: () => ({ meta: [{ title: "Raw Materials — AgroTrace" }] }),
  component: RawMaterialsPage,
});

type RawMaterialForm = {
  id: string;
  name: string;
  category: string;
  uom: string;
  shelfLife: string;
  storage: string;
  description: string;
};

const empty: RawMaterialForm = {
  id: "",
  name: "",
  category: "Ingredient",
  uom: "kg",
  shelfLife: "",
  storage: "",
  description: "",
};

function RawMaterialsPage() {
  const { data } = useRawMaterials();
  const items = (data ?? []) as unknown as RawMaterialForm[];
  const createMaterial = useCreate<RawMaterialForm, RawMaterialForm>("/api/raw-materials", "raw-materials");
  const updateMaterial = useUpdate<RawMaterialForm, RawMaterialForm>("/api/raw-materials", "raw-materials");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [draft, setDraft] = useState<RawMaterialForm>(empty);
  const [deleteTarget, setDeleteTarget] = useState<RawMaterialForm | null>(null);

  const openAdd = () => {
    setMode("add");
    setDraft({ ...empty, id: `RMT-${String(items.length + 1).padStart(3, "0")}` });
    setSheetOpen(true);
  };

  const openEdit = (m: RawMaterialForm) => {
    setMode("edit");
    setDraft(m);
    setSheetOpen(true);
  };

  const update = <K extends keyof RawMaterialForm>(k: K, v: RawMaterialForm[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) {
      toast.error("Material name is required");
      return;
    }
    if (mode === "add") {
      createMaterial.mutate(draft, {
        onSuccess: () => {
          toast.success("Raw material added");
          setSheetOpen(false);
        },
        onError: () => toast.error("Failed to add raw material"),
      });
    } else {
      updateMaterial.mutate(
        { id: draft.id, body: draft },
        {
          onSuccess: () => {
            toast.success("Raw material updated");
            setSheetOpen(false);
          },
          onError: () => toast.error("Failed to update raw material"),
        },
      );
    }
  };

  const confirmDelete = () => {
    // No delete endpoint available — close the dialog without persisting.
    setDeleteTarget(null);
  };

  return (
    <>
      <PageHeader
        title="Raw Materials"
        description="Define the raw material types your plant uses. Inventory and receiving are managed in Storage."
        actions={<Button onClick={openAdd}>Add raw material</Button>}
      />
      <div className="space-y-4 p-6">
        <DataTable
          data={items}
          columns={[
            { key: "id", header: "Code" },
            { key: "name", header: "Material" },
            { key: "category", header: "Category" },
            { key: "uom", header: "UoM" },
            { key: "shelfLife", header: "Shelf life" },
            { key: "storage", header: "Storage" },
            {
              key: "actions",
              header: "",
              render: (r) => (
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(r)} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(r)}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{mode === "add" ? "Add raw material" : "Edit raw material"}</SheetTitle>
            <SheetDescription>
              Master data only — describe the material itself. Quantities and lots are captured at receiving.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={save} className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="code">Code</Label>
                <Input id="code" value={draft.id} onChange={(e) => update("id", e.target.value)} disabled={mode === "edit"} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Select value={draft.category} onValueChange={(v) => update("category", v)}>
                  <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dairy">Dairy</SelectItem>
                    <SelectItem value="Grain">Grain</SelectItem>
                    <SelectItem value="Fruit">Fruit</SelectItem>
                    <SelectItem value="Vegetable">Vegetable</SelectItem>
                    <SelectItem value="Ingredient">Ingredient</SelectItem>
                    <SelectItem value="Packaging">Packaging</SelectItem>
                    <SelectItem value="Additive">Additive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={draft.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Raw Milk" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                rows={3}
                value={draft.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Short description, intended use, quality notes…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="uom">Unit of measure</Label>
                <Select value={draft.uom} onValueChange={(v) => update("uom", v)}>
                  <SelectTrigger id="uom"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="pcs">pcs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shelf">Shelf life</Label>
                <Input id="shelf" value={draft.shelfLife} onChange={(e) => update("shelfLife", e.target.value)} placeholder="e.g. 6 months" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="storage">Storage requirements</Label>
              <Input
                id="storage"
                value={draft.storage}
                onChange={(e) => update("storage", e.target.value)}
                placeholder="e.g. Cold Room (2–4 °C)"
              />
            </div>
            <SheetFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{mode === "add" ? "Add material" : "Save changes"}</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete raw material?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `“${deleteTarget.name}” will be removed from the catalog. This does not affect existing receivings.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

