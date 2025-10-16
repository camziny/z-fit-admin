"use client";
import Link from "next/link";
import { useConvex, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, Dumbbell, Edit } from "lucide-react";

type Exercise = { _id: string; name: string; bodyPart: string; equipment?: string };

const equipmentOptions = ["barbell","dumbbell","machine","kettlebell","cable","bodyweight"] as const;
const loadingModeOptions = ["bar","pair","single"] as const;

export default function ExercisesPage() {
  const convex = useConvex();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useQuery(
    api.exercises.getById,
    selectedId ? { exerciseId: selectedId as any } : "skip"
  ) as any;

  const [name, setName] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [isWeighted, setIsWeighted] = useState(true);
  const [equipment, setEquipment] = useState<string | undefined>(undefined);
  const [loadingMode, setLoadingMode] = useState<string | undefined>(undefined);
  const [roundingKg, setRoundingKg] = useState<string>("");
  const [roundingLb, setRoundingLb] = useState<string>("");
  const [gifUrl, setGifUrl] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const list = await convex.query(api.exercises.listAll, {});
        if (!cancelled) setItems(list as Exercise[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [convex]);

  useEffect(() => {
    if (selected) {
      setName(selected.name || "");
      setBodyPart(selected.bodyPart || "");
      setIsWeighted(!!selected.isWeighted);
      setEquipment(selected.equipment || undefined);
      setLoadingMode(selected.loadingMode || undefined);
      setRoundingKg(selected.roundingIncrementKg != null ? String(selected.roundingIncrementKg) : "");
      setRoundingLb(selected.roundingIncrementLbs != null ? String(selected.roundingIncrementLbs) : "");
      setGifUrl(selected.gifUrl || "");
      setDescription(selected.description || "");
    }
  }, [selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(e => e.name.toLowerCase().includes(q) || e.bodyPart.toLowerCase().includes(q) || (e.equipment || "").toLowerCase().includes(q));
  }, [items, query]);

  const getBodyPartColor = (bodyPart: string) => {
    const colors: Record<string, string> = {
      legs: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      chest: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      back: "bg-green-500/10 text-green-400 border-green-500/20",
      arms: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      shoulders: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    };
    return colors[bodyPart.toLowerCase()] || "bg-gray-500/10 text-gray-400 border-gray-500/20";
  };

  const openEditor = (id: string) => {
    setSelectedId(id);
    setEditOpen(true);
  };

  const openAddModal = () => {
    setName("");
    setBodyPart("");
    setIsWeighted(true);
    setEquipment(undefined);
    setLoadingMode(undefined);
    setRoundingKg("");
    setRoundingLb("");
    setGifUrl("");
    setDescription("");
    setAddOpen(true);
  };

  const onSave = async () => {
    if (!selectedId) return;
    await convex.mutation(api.exercises.updateExercise, {
      exerciseId: selectedId as any,
      name: name.trim(),
      bodyPart: bodyPart.trim(),
      isWeighted,
      equipment: equipment as any,
      loadingMode: loadingMode as any,
      roundingIncrementKg: roundingKg ? Number(roundingKg) : undefined,
      roundingIncrementLbs: roundingLb ? Number(roundingLb) : undefined,
      gifUrl: gifUrl.trim() || undefined,
      description: description.trim() || undefined,
    });
    setItems(prev => prev.map(e => e._id === selectedId ? { ...e, name, bodyPart, equipment } : e));
    setEditOpen(false);
  };

  const onAdd = async () => {
    if (!name.trim() || !bodyPart.trim()) return;
    const payload: any = {
      name: name.trim(),
      bodyPart: bodyPart.trim(),
      isWeighted,
    };
    if (equipment) payload.equipment = equipment as any;
    if (loadingMode) payload.loadingMode = loadingMode as any;
    if (roundingKg) payload.roundingIncrementKg = Number(roundingKg);
    if (roundingLb) payload.roundingIncrementLbs = Number(roundingLb);
    if (gifUrl.trim()) payload.gifUrl = gifUrl.trim();
    if (description.trim()) payload.description = description.trim();
    const id = await convex.mutation((api as any).exercises.createExercise, payload);
    const newEx = { _id: id, name: name.trim(), bodyPart: bodyPart.trim(), equipment };
    setItems(prev => [...prev, newEx]);
    setAddOpen(false);
  };

  const onDelete = async () => {
    if (!selectedId) return;
    const ok = await convex.mutation(api.exercises.deleteExercise, { exerciseId: selectedId as any });
    if (ok) {
      setItems(prev => prev.filter(e => e._id !== selectedId));
      setEditOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="space-y-6 p-4 lg:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <Dumbbell className="h-8 w-8 text-primary" />
                Exercise Library
              </h1>
              <p className="text-muted-foreground mt-1">
                Browse and manage your exercise database
              </p>
            </div>
            <Button size="lg" onClick={openAddModal}>
              <Plus className="h-4 w-4 mr-2" />
              Add Exercise
            </Button>
          </div>
        </div>

        <Card className="border-border/40 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Dumbbell className="h-5 w-5 text-primary" />
              All Exercises
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {filtered.length} exercise{filtered.length !== 1 ? "s" : ""}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, body part, equipment..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 bg-background/50"
              />
            </div>
            <ScrollArea className="h-[calc(100vh-340px)] pr-2">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-sm text-muted-foreground">Loading exercises...</div>
                </div>
              ) : (
                <div className="grid gap-2">
                  {filtered.map(e => (
                    <button
                      key={e._id}
                      onClick={() => openEditor(e._id)}
                      className="group relative w-full text-left rounded-lg border border-border/40 bg-card/30 hover:border-primary/50 hover:bg-card/50 p-4 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="font-medium leading-tight group-hover:text-primary transition-colors">
                            {e.name}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`text-xs font-medium border ${getBodyPartColor(e.bodyPart)}`}>
                              {e.bodyPart}
                            </Badge>
                            {e.equipment && (
                              <Badge variant="outline" className="text-xs">
                                {e.equipment}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Edit className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                  {!filtered.length && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Dumbbell className="h-12 w-12 text-muted-foreground/20 mb-3" />
                      <p className="text-sm text-muted-foreground">No exercises found</p>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Exercise</DialogTitle>
            <DialogDescription>Update properties and save</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Body Part</label>
              <Input value={bodyPart} onChange={(e) => setBodyPart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Equipment</label>
              <Select value={equipment} onValueChange={setEquipment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent>
                  {equipmentOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Loading Mode</label>
              <Select value={loadingMode} onValueChange={setLoadingMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select loading mode" />
                </SelectTrigger>
                <SelectContent>
                  {loadingModeOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rounding Increment (kg)</label>
              <Input type="number" step="0.5" value={roundingKg} onChange={(e) => setRoundingKg(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rounding Increment (lbs)</label>
              <Input type="number" step="0.5" value={roundingLb} onChange={(e) => setRoundingLb(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">GIF URL</label>
              <Input value={gifUrl} onChange={(e) => setGifUrl(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Switch checked={isWeighted} onCheckedChange={setIsWeighted} id="isWeighted" />
              <label htmlFor="isWeighted" className="text-sm">Weighted exercise</label>
            </div>
          </div>
          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <Button variant="destructive" onClick={onDelete}>Delete</Button>
              <Button onClick={onSave}>Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Exercise</DialogTitle>
            <DialogDescription>Create a new exercise</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Barbell Bench Press" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Body Part *</label>
              <Input value={bodyPart} onChange={(e) => setBodyPart(e.target.value)} placeholder="e.g., chest, back, legs" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Equipment</label>
              <Select value={equipment} onValueChange={setEquipment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent>
                  {equipmentOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Loading Mode</label>
              <Select value={loadingMode} onValueChange={setLoadingMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select loading mode" />
                </SelectTrigger>
                <SelectContent>
                  {loadingModeOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rounding Increment (kg)</label>
              <Input type="number" step="0.5" value={roundingKg} onChange={(e) => setRoundingKg(e.target.value)} placeholder="e.g., 2.5" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rounding Increment (lbs)</label>
              <Input type="number" step="0.5" value={roundingLb} onChange={(e) => setRoundingLb(e.target.value)} placeholder="e.g., 5" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">GIF URL</label>
              <Input value={gifUrl} onChange={(e) => setGifUrl(e.target.value)} placeholder="https://...gif" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Helpful cues or notes" />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Switch checked={isWeighted} onCheckedChange={setIsWeighted} id="isWeightedAdd" />
              <label htmlFor="isWeightedAdd" className="text-sm">Weighted exercise</label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={onAdd} disabled={!name.trim() || !bodyPart.trim()}>Create Exercise</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


