"use client";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dumbbell, Plus, Trash2, ArrowRight, ArrowLeft, Check, Info, Sparkles } from "lucide-react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

type Exercise = { _id: Id<'exercises'>; name: string; bodyPart: string };

type SetInput = { reps: number; weightPercentage?: number; restSec?: number };
type ItemInput = { exerciseId: Id<'exercises'> | ""; order: number; sets: SetInput[]; groupId?: string; groupOrder?: number };

const STEPS = [
  { id: 1, title: "Basic Info", description: "Name and category" },
  { id: 2, title: "Add Exercises", description: "Build your workout" },
  { id: 3, title: "Configure Sets", description: "Reps, weight & rest" },
  { id: 4, title: "Review & Save", description: "Final check" },
];

export default function NewTemplatePage() {
  const router = useRouter();
  const convex = useConvex();
  const allExercises = (useQuery(api.exercises.listAll, {}) || []) as Exercise[];
  
  const [currentStep, setCurrentStep] = useState(1);
  const [name, setName] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [description, setDescription] = useState("");
  const [variation, setVariation] = useState("");
  const [defaultUnit, setDefaultUnit] = useState<"lbs" | "kg">("lbs");
  const [items, setItems] = useState<ItemInput[]>([]);
  const [saving, setSaving] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newBodyPart, setNewBodyPart] = useState("");
  const [showCreateExercise, setShowCreateExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseEquipment, setNewExerciseEquipment] = useState<string | undefined>(undefined);
  const [newExerciseIsWeighted, setNewExerciseIsWeighted] = useState(true);
  const [creatingExercise, setCreatingExercise] = useState(false);

  const bodyParts = useMemo(() => {
    const parts = new Set<string>();
    allExercises.forEach((e) => {
      if (e.bodyPart) parts.add(e.bodyPart);
    });
    return Array.from(parts).sort();
  }, [allExercises]);

  const filteredExercises = useMemo(() => {
    const filtered = !bodyPart ? allExercises : allExercises.filter((e) => e.bodyPart === bodyPart);
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [allExercises, bodyPart]);

  const addExercise = (exerciseId: Id<'exercises'>) => {
    const order = items.length + 1;
    setItems([...items, { exerciseId, order, sets: [{ reps: 10, restSec: 90 }] }]);
  };

  const removeExercise = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx).map((item, i) => ({ ...item, order: i + 1 })));
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

  const updateItemGroup = (itemIdx: number, field: 'groupId' | 'groupOrder', value: string | number | undefined) => {
    const copy = [...items];
    copy[itemIdx][field] = value as any;
    setItems(copy);
  };

  const canGoToStep2 = name.trim().length > 0 && bodyPart.length > 0;
  const canGoToStep3 = items.length > 0;
  const canGoToStep4 = items.every(item => item.sets.length > 0 && item.sets.every(s => s.reps > 0));

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

  const handleCreateExercise = async () => {
    if (!newExerciseName.trim() || !bodyPart) return;
    setCreatingExercise(true);
    try {
      const payload: any = {
        name: newExerciseName.trim(),
        bodyPart: bodyPart,
        isWeighted: newExerciseIsWeighted,
      };
      if (newExerciseEquipment) payload.equipment = newExerciseEquipment as any;
      const id = await convex.mutation((api as any).exercises.createExercise, payload);
      addExercise(id);
      setShowCreateExercise(false);
      setNewExerciseName("");
      setNewExerciseEquipment(undefined);
      setNewExerciseIsWeighted(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      alert(message || "Failed to create exercise");
    } finally {
      setCreatingExercise(false);
    }
  };

  const handleSave = async () => {
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
        description: description.trim() || undefined,
        bodyPart,
        variation: variation.trim() || undefined,
        defaultUnit,
        items: sanitized,
      });
      router.push(`/admin/templates/${id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      alert(message || "Failed to create workout");
      setSaving(false);
    }
  };

  const getExerciseName = (exerciseId: Id<'exercises'> | "") => {
    if (!exerciseId) return "Unknown";
    const ex = allExercises.find((e) => e._id === exerciseId);
    return ex?.name || "Unknown";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-5xl mx-auto p-4 lg:p-6 space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Dumbbell className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
            Create New Workout
          </h1>
          <p className="text-muted-foreground mt-1 text-sm lg:text-base">Follow the steps to build your custom workout template</p>
        </div>

        <div className="relative">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => (
              <div key={step.id} className="flex flex-col items-center relative z-10" style={{ width: '25%' }}>
                <div className={`flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 rounded-full border-2 transition-all ${
                  currentStep > step.id ? "bg-primary border-primary text-primary-foreground" :
                  currentStep === step.id ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20" :
                  "bg-background border-border text-muted-foreground"
                }`}>
                  {currentStep > step.id ? <Check className="h-4 w-4 lg:h-5 lg:w-5" /> : <span className="font-semibold text-sm lg:text-base">{step.id}</span>}
                </div>
                <div className="text-center mt-2 px-1">
                  <div className={`text-xs lg:text-sm font-medium ${currentStep >= step.id ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.title}
                  </div>
                  <div className="text-xs text-muted-foreground hidden md:block">{step.description}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="absolute top-5 lg:top-6 left-0 right-0 h-0.5 bg-border -z-0" style={{ left: '12.5%', right: '12.5%' }}>
            <div 
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        <Card className="border-border/40 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30">
          <CardContent className="pt-6">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Step 1: Basic Information</div>
                    <div className="text-sm text-muted-foreground mt-1">Give your workout a name and select which body part or category it belongs to.</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Workout Name *</label>
                    <Input
                      placeholder="e.g., Push Day 1, Leg Day Advanced"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description (Optional)</label>
                    <Textarea
                      placeholder="Brief description of this workout"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Default Weight Unit *</label>
                      <Select value={defaultUnit} onValueChange={(val) => setDefaultUnit(val as "lbs" | "kg")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                          <SelectItem value="kg">Kilograms (kg)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">This determines which unit users will see by default</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Variation (Optional)</label>
                    <Input
                      placeholder="e.g., push1, beginner"
                      value={variation}
                      onChange={(e) => setVariation(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Step 2: Add Exercises</div>
                    <div className="text-sm text-muted-foreground mt-1">Select exercises to include in your workout. You can reorder them later.</div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">
                    {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''} available
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowCreateExercise(true)}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create New Exercise
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto p-1">
                  {filteredExercises.map((ex) => {
                    const isAdded = items.some(item => item.exerciseId === ex._id);
                    return (
                      <button
                        key={ex._id}
                        onClick={() => !isAdded && addExercise(ex._id)}
                        disabled={isAdded}
                        className={`text-left p-4 rounded-lg border transition-all ${
                          isAdded
                            ? "bg-primary/10 border-primary/40 cursor-not-allowed"
                            : "bg-card/30 border-border/40 hover:border-primary/50 hover:bg-card/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="font-medium">{ex.name}</div>
                            <Badge variant="outline" className="text-xs mt-1">{ex.bodyPart}</Badge>
                          </div>
                          {isAdded && <Check className="h-5 w-5 text-primary" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {items.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-sm font-medium mb-3">Selected Exercises ({items.length})</div>
                      <div className="space-y-2">
                        {items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <Badge variant="outline" className="font-mono">#{idx + 1}</Badge>
                            <div className="flex-1 font-medium">{getExerciseName(item.exerciseId)}</div>
                            <Button variant="ghost" size="sm" onClick={() => removeExercise(idx)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Step 3: Configure Sets</div>
                    <div className="text-sm text-muted-foreground mt-1">Define the sets, reps, weight, and rest for each exercise.</div>
                  </div>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto p-1">
                  {items.map((item, idx) => (
                    <div key={idx} className="border border-border/40 rounded-lg p-4 bg-card/30">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">#{idx + 1}</Badge>
                          <div className="font-medium">{getExerciseName(item.exerciseId)}</div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => addSet(idx)}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add Set
                        </Button>
                      </div>

                      <div className="space-y-3 mb-4">
                        {item.sets.map((set, sIdx) => (
                          <div key={sIdx} className="flex items-start gap-3">
                            <div className="flex flex-col items-center pt-2">
                              <div className="text-xs text-muted-foreground mb-1">Set</div>
                              <Badge variant="secondary" className="w-10 h-10 rounded-full flex items-center justify-center font-bold">
                                {sIdx + 1}
                              </Badge>
                            </div>
                            <div className="flex-1 grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">Reps</label>
                                <Input
                                  type="number"
                                  placeholder="10"
                                  value={set.reps || ""}
                                  onChange={(e) => updateSet(idx, sIdx, "reps", e.target.value ? Number(e.target.value) : undefined)}
                                  className="h-10"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">Weight (%)</label>
                                <Input
                                  type="number"
                                  step="1"
                                  placeholder="75"
                                  value={set.weightPercentage ?? ""}
                                  onChange={(e) => updateSet(idx, sIdx, "weightPercentage", e.target.value ? Number(e.target.value) : undefined)}
                                  className="h-10"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">Rest (sec)</label>
                                <Input
                                  type="number"
                                  placeholder="90"
                                  value={set.restSec ?? ""}
                                  onChange={(e) => updateSet(idx, sIdx, "restSec", e.target.value ? Number(e.target.value) : undefined)}
                                  className="h-10"
                                />
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSet(idx, sIdx)}
                              disabled={item.sets.length === 1}
                              className="mt-6"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Group ID (Optional)</label>
                          <Input
                            value={item.groupId || ""}
                            onChange={(e) => updateItemGroup(idx, 'groupId', e.target.value || undefined)}
                            placeholder="e.g., ss1"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Group Order (Optional)</label>
                          <Input
                            type="number"
                            value={item.groupOrder ?? ""}
                            onChange={(e) => updateItemGroup(idx, 'groupOrder', e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="e.g., 1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Step 4: Review & Save</div>
                    <div className="text-sm text-muted-foreground mt-1">Review your workout and save when ready.</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground">Workout Name</div>
                        <div className="font-medium mt-1">{name}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Category</div>
                        <div className="font-medium mt-1 capitalize">{bodyPart}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Default Unit</div>
                        <div className="font-medium mt-1">{defaultUnit === "lbs" ? "Pounds (lbs)" : "Kilograms (kg)"}</div>
                      </div>
                      {variation && (
                        <div>
                          <div className="text-xs text-muted-foreground">Variation</div>
                          <div className="text-sm mt-1">{variation}</div>
                        </div>
                      )}
                      {description && (
                        <div className="col-span-2">
                          <div className="text-xs text-muted-foreground">Description</div>
                          <div className="text-sm mt-1">{description}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="text-sm font-medium mb-3">Exercises & Sets ({items.length} exercises, {items.reduce((sum, item) => sum + item.sets.length, 0)} total sets)</div>
                    <div className="space-y-3">
                      {items.map((item, idx) => (
                        <div key={idx} className="p-3 rounded-lg border border-border/40 bg-card/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="font-mono">#{idx + 1}</Badge>
                            <div className="font-medium">{getExerciseName(item.exerciseId)}</div>
                            {item.groupId && <Badge variant="secondary" className="text-xs">Group {item.groupId}</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {item.sets.length} set{item.sets.length !== 1 ? 's' : ''}: {item.sets.map(s => `${s.reps} reps`).join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="text-sm text-muted-foreground text-center order-first sm:order-none">
            Step {currentStep} of {STEPS.length}
          </div>

          {currentStep < 4 ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={
                (currentStep === 1 && !canGoToStep2) ||
                (currentStep === 2 && !canGoToStep3) ||
                (currentStep === 3 && !canGoToStep4)
              }
              className="w-full sm:w-auto"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving} size="lg" className="w-full sm:w-auto">
              {saving ? "Saving..." : "Create Workout"}
              <Check className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showCreateExercise} onOpenChange={setShowCreateExercise}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Exercise</DialogTitle>
            <DialogDescription>Add a new exercise to your library</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Exercise Name *</label>
              <Input
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                placeholder="e.g., Dumbbell Bench Press"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Equipment</label>
              <Select value={newExerciseEquipment} onValueChange={setNewExerciseEquipment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select equipment (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="barbell">Barbell</SelectItem>
                  <SelectItem value="dumbbell">Dumbbell</SelectItem>
                  <SelectItem value="machine">Machine</SelectItem>
                  <SelectItem value="kettlebell">Kettlebell</SelectItem>
                  <SelectItem value="cable">Cable</SelectItem>
                  <SelectItem value="bodyweight">Bodyweight</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newExerciseIsWeighted}
                onCheckedChange={setNewExerciseIsWeighted}
                id="newExerciseWeighted"
              />
              <label htmlFor="newExerciseWeighted" className="text-sm">Weighted exercise</label>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              This exercise will be added to the <span className="font-medium capitalize">{bodyPart}</span> category and immediately added to your workout.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateExercise(false)}>Cancel</Button>
            <Button
              onClick={handleCreateExercise}
              disabled={!newExerciseName.trim() || creatingExercise}
            >
              {creatingExercise ? "Creating..." : "Create & Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
