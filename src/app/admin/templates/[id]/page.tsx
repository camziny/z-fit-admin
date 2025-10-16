"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useConvex, useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Save, Trash2, ExternalLink, Plus, ArrowUp, ArrowDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function TemplateDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const convex = useConvex();
  const templateId = params.id as Id<'templates'>;
  const data = useQuery(api.templates.getById, { templateId });
  const [name, setName] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [description, setDescription] = useState("");
  const [variation, setVariation] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const exercises = useQuery(api.exercises.getMultiple, data ? { exerciseIds: (data.items || []).map((i: any) => i.exerciseId as Id<'exercises'>) } : "skip") || [];
  const availableForPart = useQuery(api.exercises.byBodyPart, bodyPart ? { bodyPart } : "skip") || [];
  const [editMode, setEditMode] = useState(false);

  const bodyParts = useMemo(() => {
    const parts = new Set<string>();
    exercises.forEach((e: any) => { if (e?.bodyPart) parts.add(e.bodyPart); });
    return Array.from(parts).sort();
  }, [exercises]);

  useEffect(() => {
    if (data) {
      setName(data.name || "");
      setBodyPart(data.bodyPart || "");
      setDescription(data.description || "");
      setVariation(data.variation || "");
      setItems([...(data.items || [])].sort((a: any, b: any) => a.order - b.order));
    }
  }, [data]);

  const updateSet = (itemIdx: number, setIdx: number, field: "reps" | "weight" | "restSec", value: number | undefined) => {
    const copy = [...items];
    copy[itemIdx].sets[setIdx] = { ...copy[itemIdx].sets[setIdx], [field]: value };
    setItems(copy);
  };

  const addSet = (itemIdx: number) => {
    const copy = [...items];
    const last = copy[itemIdx].sets[copy[itemIdx].sets.length - 1];
    copy[itemIdx].sets.push({ reps: last?.reps || 8, weight: last?.weight, restSec: last?.restSec });
    setItems(copy);
  };

  const removeSet = (itemIdx: number, setIdx: number) => {
    const copy = [...items];
    if (copy[itemIdx].sets.length <= 1) return;
    copy[itemIdx].sets = copy[itemIdx].sets.filter((_: any, i: number) => i !== setIdx);
    setItems(copy);
  };

  const saveChanges = async () => {
    const payload = { templateId, name: name.trim(), bodyPart, description: description.trim(), variation: variation.trim(), items } as any;
    await convex.mutation(api.templates.updateTemplate, payload);
  };

  const deleteTemplate = async () => {
    const ok = await convex.mutation(api.templates.deleteTemplate, { templateId });
    if (ok) router.push("/admin/templates");
  };

  if (!data) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <Card className="border-border/40 bg-card/50 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Edit Workout</CardTitle>
            <div className="text-sm text-muted-foreground">Update workout info and sets</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Edit mode</span>
              <Switch checked={editMode} onCheckedChange={setEditMode} />
            </div>
            <Button onClick={saveChanges}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this workout?</AlertDialogTitle>
                  <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteTemplate}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workout name" disabled={!editMode} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Body Part</label>
              <Select value={bodyPart} onValueChange={setBodyPart} disabled={!editMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select body part" />
                </SelectTrigger>
                <SelectContent>
                  {bodyParts.map((p) => (
                    <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Workout description" disabled={!editMode} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Variation</label>
              <Input value={variation} onChange={(e) => setVariation(e.target.value)} placeholder="e.g., push1" disabled={!editMode} />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Exercises</div>
            {editMode && (
              <div className="flex items-center gap-2">
                <Select
                  onValueChange={(val) => {
                    const next = [...items];
                    const order = next.length + 1;
                    next.push({ exerciseId: val, order, sets: [{ reps: 10, restSec: 90 }] });
                    setItems(next);
                  }}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder={bodyPart ? "Add exercise" : "Select body part first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableForPart.map((ex: any) => (
                      <SelectItem key={ex._id} value={ex._id}>{ex.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" disabled>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            )}
          </div>

          <ScrollArea className="h-[calc(100vh-340px)] pr-4">
            <div className="space-y-4">
              {items.map((item: any, idx: number) => {
                const ex = exercises.find((e: any) => e?._id === item.exerciseId);
                return (
                  <div key={idx} className="rounded-lg border border-border/40 bg-background/50 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">#{idx + 1}</Badge>
                        {!editMode ? (
                          <div className="font-medium">{ex?.name || item.exerciseId}</div>
                        ) : (
                          <Select
                            value={item.exerciseId}
                            onValueChange={(val) => {
                              const copy = [...items];
                              copy[idx].exerciseId = val;
                              setItems(copy);
                            }}
                          >
                            <SelectTrigger className="w-72">
                              <SelectValue placeholder="Select exercise" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableForPart.map((opt: any) => (
                                <SelectItem key={opt._id} value={opt._id}>{opt.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {ex && !editMode && (
                          <Link className="text-xs text-primary inline-flex items-center gap-1" href={`/admin/exercises/${ex._id}`}>
                            Edit exercise <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                      {editMode && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (idx === 0) return;
                              const copy = [...items];
                              const tmp = copy[idx - 1];
                              copy[idx - 1] = copy[idx];
                              copy[idx] = tmp;
                              copy.forEach((it, i) => (it.order = i + 1));
                              setItems(copy);
                            }}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (idx === items.length - 1) return;
                              const copy = [...items];
                              const tmp = copy[idx + 1];
                              copy[idx + 1] = copy[idx];
                              copy[idx] = tmp;
                              copy.forEach((it, i) => (it.order = i + 1));
                              setItems(copy);
                            }}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const copy = items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, order: i + 1 }));
                              setItems(copy);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {!editMode ? (
                        <>
                          {item.groupId && <div className="text-xs text-muted-foreground">Group: {item.groupId}</div>}
                          {item.groupOrder != null && <div className="text-xs text-muted-foreground">Group Order: {item.groupOrder}</div>}
                        </>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Group ID</label>
                            <Input value={item.groupId || ""} onChange={(e) => {
                              const copy = [...items];
                              copy[idx].groupId = e.target.value || undefined;
                              setItems(copy);
                            }} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Group Order</label>
                            <Input type="number" value={item.groupOrder ?? ""} onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : undefined;
                              const copy = [...items];
                              copy[idx].groupOrder = val as any;
                              setItems(copy);
                            }} />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="grid gap-2">
                      {item.sets.map((s: any, sIdx: number) => (
                        <div key={sIdx} className="flex items-center gap-2">
                          <Badge variant="secondary" className="w-12 justify-center">{sIdx + 1}</Badge>
                          <Input type="number" className="w-24" placeholder="Reps" value={s.reps || ""} onChange={(e) => updateSet(idx, sIdx, "reps", e.target.value ? Number(e.target.value) : undefined)} disabled={!editMode} />
                          <span className="text-xs text-muted-foreground">reps</span>
                          <Input type="number" step="0.5" className="w-24" placeholder="Weight" value={s.weight ?? ""} onChange={(e) => updateSet(idx, sIdx, "weight", e.target.value ? Number(e.target.value) : undefined)} disabled={!editMode} />
                          <span className="text-xs text-muted-foreground">kg</span>
                          <Input type="number" className="w-24" placeholder="Rest" value={s.restSec ?? ""} onChange={(e) => updateSet(idx, sIdx, "restSec", e.target.value ? Number(e.target.value) : undefined)} disabled={!editMode} />
                          <span className="text-xs text-muted-foreground">sec</span>
                          {editMode && (
                            <Button variant="outline" size="sm" onClick={() => removeSet(idx, sIdx)} disabled={item.sets.length <= 1}>Remove</Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {editMode && (
                      <div className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => addSet(idx)}>Add set</Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
