import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
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
import { Plus, Trash2, ArrowLeft } from "lucide-react";

type StepKind = "check" | "input";

interface Ingredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
}

interface ProcessStep {
  id: string;
  title: string;
  detail: string;
  kind: StepKind;
  unit?: string;
  expected?: string;
}

interface Recipe extends Record<string, unknown> {
  code: string;
  product: string;
  version: string;
  yield: string;
  shelf: string;
  status: string;
  ingredients: Ingredient[];
  steps: ProcessStep[];
}

const uid = () => Math.random().toString(36).slice(2, 9);

function emptyRecipe(): Recipe {
  return {
    code: "",
    product: "",
    version: "v1.0",
    yield: "",
    shelf: "",
    status: "Pending",
    ingredients: [{ id: uid(), name: "", quantity: "", unit: "kg" }],
    steps: [{ id: uid(), title: "", detail: "", kind: "check" }],
  };
}

export const Route = createFileRoute("/recipes_/editor")({
  validateSearch: (s: Record<string, unknown>) => ({
    code: typeof s.code === "string" ? s.code : undefined,
  }),
  head: () => ({ meta: [{ title: "Recipe editor — AgroTrace" }] }),
  component: RecipeEditorPage,
});

function RecipeEditorPage() {
  const { code } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const editing = !!code;

  const [draft, setDraft] = useState<Recipe>(() => emptyRecipe());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    apiFetch<Recipe>("/api/recipes/" + code)
      .then((recipe) => {
        if (cancelled || !recipe) return;
        setDraft({
          ...emptyRecipe(),
          ...recipe,
          ingredients: (recipe.ingredients ?? []).map((ing) => ({
            id: ing.id ?? uid(),
            name: ing.name ?? "",
            quantity: ing.quantity ?? "",
            unit: ing.unit ?? "",
          })),
          steps: (recipe.steps ?? []).map((step) => ({
            id: step.id ?? uid(),
            title: step.title ?? "",
            detail: step.detail ?? "",
            kind: (step.kind as StepKind) ?? "check",
            unit: step.unit,
            expected: step.expected,
          })),
        });
      })
      .catch((err) => {
        toast.error(
          err instanceof Error ? err.message : "Failed to load recipe",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  async function save() {
    if (!draft.code || !draft.product || saving) return;
    setSaving(true);
    try {
      if (editing) {
        await apiFetch<Recipe>("/api/recipes/" + draft.code, {
          method: "PATCH",
          body: JSON.stringify(draft),
        });
      } else {
        await apiFetch<Recipe>("/api/recipes", {
          method: "POST",
          body: JSON.stringify(draft),
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast.success(editing ? "Recipe updated" : "Recipe created");
      navigate({ to: "/recipes" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save recipe");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title={editing ? "Edit recipe" : "New recipe"}
        description="Define product, ingredients and process steps."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/recipes">
                <ArrowLeft /> Back
              </Link>
            </Button>
            <Button
              onClick={save}
              disabled={!draft.code || !draft.product || saving}
            >
              {editing ? "Save changes" : "Create recipe"}
            </Button>
          </>
        }
      />

      <div className="mx-auto max-w-4xl space-y-8 p-6">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Product details
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Code</Label>
              <Input
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                placeholder="REC-XX-000"
                disabled={editing}
              />
            </div>
            <div className="space-y-1">
              <Label>Version</Label>
              <Input
                value={draft.version}
                onChange={(e) => setDraft({ ...draft, version: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>Product</Label>
              <Input
                value={draft.product}
                onChange={(e) => setDraft({ ...draft, product: e.target.value })}
                placeholder="Mango Juice 500ml"
              />
            </div>
            <div className="space-y-1">
              <Label>Expected yield</Label>
              <Input
                value={draft.yield}
                onChange={(e) => setDraft({ ...draft, yield: e.target.value })}
                placeholder="4,800 L / batch"
              />
            </div>
            <div className="space-y-1">
              <Label>Shelf life</Label>
              <Input
                value={draft.shelf}
                onChange={(e) => setDraft({ ...draft, shelf: e.target.value })}
                placeholder="180 days"
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={draft.status}
                onValueChange={(v) => setDraft({ ...draft, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Ingredients
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setDraft({
                  ...draft,
                  ingredients: [
                    ...draft.ingredients,
                    { id: uid(), name: "", quantity: "", unit: "kg" },
                  ],
                })
              }
            >
              <Plus /> Add ingredient
            </Button>
          </div>
          <div className="mt-4 space-y-2">
            {draft.ingredients.map((ing, idx) => (
              <div key={ing.id} className="grid grid-cols-[1fr,100px,90px,40px] gap-2">
                <Input
                  placeholder="Ingredient"
                  value={ing.name}
                  onChange={(e) => {
                    const next = [...draft.ingredients];
                    next[idx] = { ...ing, name: e.target.value };
                    setDraft({ ...draft, ingredients: next });
                  }}
                />
                <Input
                  placeholder="Qty"
                  value={ing.quantity}
                  onChange={(e) => {
                    const next = [...draft.ingredients];
                    next[idx] = { ...ing, quantity: e.target.value };
                    setDraft({ ...draft, ingredients: next });
                  }}
                />
                <Input
                  placeholder="Unit"
                  value={ing.unit}
                  onChange={(e) => {
                    const next = [...draft.ingredients];
                    next[idx] = { ...ing, unit: e.target.value };
                    setDraft({ ...draft, ingredients: next });
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      ingredients: draft.ingredients.filter((_, i) => i !== idx),
                    })
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Process steps
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setDraft({
                  ...draft,
                  steps: [
                    ...draft.steps,
                    { id: uid(), title: "", detail: "", kind: "check" },
                  ],
                })
              }
            >
              <Plus /> Add step
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {draft.steps.map((step, idx) => (
              <div
                key={step.id}
                className="rounded-md border border-border bg-background p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Step {idx + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        steps: draft.steps.filter((_, i) => i !== idx),
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
                <Input
                  placeholder="Step title"
                  value={step.title}
                  onChange={(e) => {
                    const next = [...draft.steps];
                    next[idx] = { ...step, title: e.target.value };
                    setDraft({ ...draft, steps: next });
                  }}
                />
                <Textarea
                  placeholder="Instructions / detail"
                  value={step.detail}
                  onChange={(e) => {
                    const next = [...draft.steps];
                    next[idx] = { ...step, detail: e.target.value };
                    setDraft({ ...draft, steps: next });
                  }}
                />
                <div className="grid grid-cols-3 gap-2">
                  <Select
                    value={step.kind}
                    onValueChange={(v: StepKind) => {
                      const next = [...draft.steps];
                      next[idx] = { ...step, kind: v };
                      setDraft({ ...draft, steps: next });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="input">Input</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Unit (e.g. °C)"
                    value={step.unit ?? ""}
                    disabled={step.kind !== "input"}
                    onChange={(e) => {
                      const next = [...draft.steps];
                      next[idx] = { ...step, unit: e.target.value };
                      setDraft({ ...draft, steps: next });
                    }}
                  />
                  <Input
                    placeholder="Expected"
                    value={step.expected ?? ""}
                    disabled={step.kind !== "input"}
                    onChange={(e) => {
                      const next = [...draft.steps];
                      next[idx] = { ...step, expected: e.target.value };
                      setDraft({ ...draft, steps: next });
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <Button variant="outline" asChild>
            <Link to="/recipes">Cancel</Link>
          </Button>
          <Button
            onClick={save}
            disabled={!draft.code || !draft.product || saving}
          >
            {editing ? "Save changes" : "Create recipe"}
          </Button>
        </div>
      </div>
    </>
  );
}