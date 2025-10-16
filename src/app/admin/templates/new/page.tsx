"use client";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dumbbell, Plus, Trash2, GripVertical, Save } from "lucide-react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type Exercise = { _id: Id<'exercises'>; name: string; bodyPart: string };

type SetInput = { reps: number; weight?: number; restSec?: number };
type ItemInput = { exerciseId: Id<'exercises'> | ""; order: number; sets: SetInput[]; groupId?: string; groupOrder?: number };

export default function NewTemplatePage() {
  const router = useRouter();
  const convex = useConvex();
  const allExercises = (useQuery(api.exercises.listAll, {}) || []) as Exercise[];
  
  const [name, setName] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [items, setItems] = useState<ItemInput[]>([]);
  const [saving, setSaving] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newBodyPart, setNewBodyPart] = useState("");

  const bodyParts = useMemo(() => {
    const parts = new Set<string>();
    allExercises.forEach((e) => {
      if (e.bodyPart) parts.add(e.bodyPart);
    });
    return Array.from(parts).sort();
  }, [allExercises]);

  const filteredExercises = useMemo(() => {
    if (!bodyPart) return allExercises;
    return allExercises.filter((e) => e.bodyPart === bodyPart);
  }, [allExercises, bodyPart]);

  const addExercise = () => {
    const order = items.length + 1;
    setItems([...items, { exerciseId: "", order, sets: [{ reps: 10, restSec: 90 }] }]);
  };

  const removeExercise = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx).map((item, i) => ({ ...item, order: i + 1 })));
  };

  const updateExercise = (idx: number, exerciseId: string) => {
    const copy = [...items];
    copy[idx].exerciseId = exerciseId as Id<'exercises'>;
    setItems(copy);
  };

  const addSet = (itemIdx: number) => {
    const copy = [...items];
    const lastSet = copy[itemIdx].sets[copy[itemIdx].sets.length - 1];
    copy[itemIdx].sets.push({ reps: lastSet?.reps || 10, restSec: lastSet?.restSec || 90 });
    setItems(copy);
  };

  const removeSet = (itemIdx: number, setIdx: number) => {
    const copy = [...items];
    if (copy[itemIdx].sets.length > 1) {
      copy[itemIdx].sets = copy[itemIdx].sets.filter((_, i) => i !== setIdx);
      setItems(copy);
    }
  };

  const updateSet = (itemIdx: number, setIdx: number, field: keyof SetInput, value: number | undefined) => {
    const copy = [...items];
    copy[itemIdx].sets[setIdx] = { ...copy[itemIdx].sets[setIdx], [field]: value };
    setItems(copy);
  };

  const canSubmit = useMemo(() => {
    if (!name.trim() || !bodyPart) return false;
    if (items.length === 0) return false;
    return items.every(item => item.exerciseId && item.sets.length > 0 && item.sets.every(s => s.reps > 0));
  }, [name, bodyPart, items]);

  const handleSave = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const sanitized = items.map((it) => ({
        exerciseId: it.exerciseId as Id<'exercises'>,
        order: it.order,
        sets: it.sets,
        groupId: it.groupId,
        groupOrder: it.groupOrder,
      }));
      const id = await convex.mutation(api.templates.createTemplate, {
        name: name.trim(),
        bodyPart,
        items: sanitized,
      });
      router.push(`/admin/templates/${id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      alert(message || "Failed to create workout");
      setSaving(false);
    }
  };

  const handleBodyPartChange = (value: string) => {
    if (value === "__new__") {
      setIsAddingNew(true);
      setBodyPart("");
    } else {
      setIsAddingNew(false);
      setBodyPart(value);
    }
  };

  const handleCreateNewBodyPart = () => {
    const trimmed = newBodyPart.trim().toLowerCase();
    if (trimmed && !bodyParts.includes(trimmed)) {
      setBodyPart(trimmed);
      setIsAddingNew(false);
      setNewBodyPart("");
    }
  };

  const getExerciseName = (exerciseId: string) => {
    const ex = allExercises.find((e) => e._id === (exerciseId as unknown as Id<'exercises'>));
    return ex?.name || "Unknown";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Plus className="h-8 w-8 text-primary" />
            Create New Workout
          </h1>
          <p className="text-muted-foreground mt-1">
            Build a custom workout template with exercises and sets
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Workout Details</CardTitle>
              <CardDescription>Basic information about your workout</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Workout Name *</label>
                <Input
                  placeholder="e.g., Push Day 1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Body Part / Category *</label>
                {!isAddingNew ? (
                  <Select value={bodyPart} onValueChange={handleBodyPartChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select or create category" />
                    </SelectTrigger>
                    <SelectContent>
                      {bodyParts.map((part) => (
                        <SelectItem key={part} value={part}>
                          {part.charAt(0).toUpperCase() + part.slice(1)}
                        </SelectItem>
                      ))}
                      <Separator className="my-1" />
                      <SelectItem value="__new__">
                        <div className="flex items-center gap-2 text-primary font-medium">
                          <Plus className="h-3 w-3" />
                          Add New Category
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., core, forearms"
                      value={newBodyPart}
                      onChange={(e) => setNewBodyPart(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateNewBodyPart();
                        }
                      }}
                      autoFocus
                    />
                    <Button onClick={handleCreateNewBodyPart} size="sm" disabled={!newBodyPart.trim()}>
                      Add
                    </Button>
                    <Button onClick={() => { setIsAddingNew(false); setNewBodyPart(""); }} variant="outline" size="sm">
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="text-sm font-medium">Summary</div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>Exercises: {items.length}</div>
                  <div>Total Sets: {items.reduce((sum, item) => sum + item.sets.length, 0)}</div>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={!canSubmit || saving}
                className="w-full"
                size="lg"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Workout"}
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Exercises</CardTitle>
                  <CardDescription>Add exercises and configure sets</CardDescription>
                </div>
                <Button onClick={addExercise} disabled={!bodyPart}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Exercise
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!bodyPart ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Dumbbell className="h-12 w-12 text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Select a body part first to add exercises
                  </p>
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Dumbbell className="h-12 w-12 text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    No exercises added yet
                  </p>
                  <Button onClick={addExercise} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Exercise
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="space-y-4 pr-4">
                    {items.map((item, idx) => (
                      <div key={idx} className="rounded-lg border border-border/40 bg-background/50 p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-5 w-5 text-muted-foreground" />
                          <Badge variant="outline" className="font-mono">#{item.order}</Badge>
                          <Select
                            value={item.exerciseId}
                            onValueChange={(val) => updateExercise(idx, val)}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select exercise" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredExercises.map((ex: any) => (
                                <SelectItem key={ex._id} value={ex._id}>
                                  {ex.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeExercise(idx)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        {item.exerciseId && (
                          <div className="space-y-2 ml-8">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium">Sets</div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addSet(idx)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Set
                              </Button>
                            </div>
                            <div className="grid gap-2">
                              {item.sets.map((set, sIdx) => (
                                <div key={sIdx} className="flex items-center gap-2">
                                  <Badge variant="secondary" className="w-12 justify-center">
                                    {sIdx + 1}
                                  </Badge>
                                  <Input
                                    type="number"
                                    placeholder="Reps"
                                    value={set.reps || ""}
                                    onChange={(e) => updateSet(idx, sIdx, "reps", e.target.value ? Number(e.target.value) : undefined)}
                                    className="w-20"
                                  />
                                  <span className="text-xs text-muted-foreground">reps</span>
                                  <Input
                                    type="number"
                                    step="0.5"
                                    placeholder="Weight"
                                    value={set.weight ?? ""}
                                    onChange={(e) => updateSet(idx, sIdx, "weight", e.target.value ? Number(e.target.value) : undefined)}
                                    className="w-20"
                                  />
                                  <span className="text-xs text-muted-foreground">kg</span>
                                  <Input
                                    type="number"
                                    placeholder="Rest"
                                    value={set.restSec ?? ""}
                                    onChange={(e) => updateSet(idx, sIdx, "restSec", e.target.value ? Number(e.target.value) : undefined)}
                                    className="w-20"
                                  />
                                  <span className="text-xs text-muted-foreground">sec</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeSet(idx, sIdx)}
                                    disabled={item.sets.length === 1}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


