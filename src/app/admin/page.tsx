"use client";
import { useMemo, useState, useEffect } from "react";
import { useConvex, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeSelector } from "@/components/theme-selector";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Dumbbell, Search, Calendar, Filter } from "lucide-react";

interface TemplateItem {
  exerciseId: Id<"exercises">;
  order: number;
  sets: Array<{ reps: number; weight?: number; restSec?: number }>;
  groupId?: string;
  groupOrder?: number;
}

interface Template {
  _id: Id<"templates">;
  name: string;
  bodyPart: string;
  variation?: string;
  description?: string;
  items: TemplateItem[];
}

interface Exercise {
  _id: Id<"exercises">;
  name: string;
  bodyPart: string;
}

export default function AdminHome() {
  const convex = useConvex();
  const templates = useQuery(api.templates.listAll, {}) as Template[] | undefined;
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<Id<"templates"> | null>(null);
  const [isMetaOpen, setIsMetaOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBodyPart, setEditBodyPart] = useState("");
  const [isSetsOpen, setIsSetsOpen] = useState(false);
  const [editingExerciseIdx, setEditingExerciseIdx] = useState<number | null>(null);
  const [editingSets, setEditingSets] = useState<Array<{ reps?: number; weight?: number; restSec?: number }>>([]);

  const categoriesWithCounts = useMemo(() => {
    const bodyPartCounts: Record<string, number> = {};
    (templates || []).forEach((t: Template) => {
      if (t.bodyPart) {
        bodyPartCounts[t.bodyPart] = (bodyPartCounts[t.bodyPart] || 0) + 1;
      }
    });
    
    const sortedCategories = Object.keys(bodyPartCounts).sort();
    const totalCount = (templates || []).length;
    
    return [
      { value: "all", label: "All Categories", count: totalCount },
      ...sortedCategories.map(cat => ({
        value: cat,
        label: cat.charAt(0).toUpperCase() + cat.slice(1),
        count: bodyPartCounts[cat]
      }))
    ];
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    let items = templates || [];
    
    if (selectedCategory !== "all") {
      items = items.filter((t: Template) => t.bodyPart === selectedCategory);
    }
    
    if (!q) return items;
    return items.filter((t: Template) =>
      t.name.toLowerCase().includes(q) || (t.bodyPart || "").toLowerCase().includes(q) || (t.variation || "").toLowerCase().includes(q)
    );
  }, [templates, query, selectedCategory]);

  useEffect(() => {
    if (filteredTemplates && filteredTemplates.length > 0) {
      if (!selectedId || !filteredTemplates.find((t: Template) => t._id === selectedId)) {
        setSelectedId(filteredTemplates[0]._id);
      }
    } else {
      setSelectedId(null);
    }
  }, [filteredTemplates, selectedId]);

  const template = useQuery(api.templates.getById, selectedId ? { templateId: selectedId } : "skip") as Template | undefined;
  const exerciseList = useQuery(
    api.exercises.getMultiple,
    template ? { exerciseIds: template.items.map((i) => i.exerciseId) } : "skip"
  ) as Exercise[] | undefined;

  const exerciseById = useMemo(() => {
    const map: Record<string, Exercise> = {};
    (exerciseList || []).forEach((e: Exercise) => { if (e?._id) map[e._id] = e; });
    return map;
  }, [exerciseList]);

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

  useEffect(() => {
    if (template) {
      setEditName(template.name || "");
      setEditBodyPart(template.bodyPart || "");
    }
  }, [template]);

  const openEditSets = (exerciseIdx: number) => {
    if (!template) return;
    setEditingExerciseIdx(exerciseIdx);
    const sets = [...(template.items?.find((it) => it.order === exerciseIdx + 1)?.sets || [])];
    setEditingSets(sets);
    setIsSetsOpen(true);
  };

  const updateEditingSet = (idx: number, field: "reps" | "weight" | "restSec", value: number | undefined) => {
    const copy = [...editingSets];
    copy[idx] = { ...copy[idx], [field]: value };
    setEditingSets(copy);
  };

  const saveMeta = async () => {
    if (!selectedId) return;
    await convex.mutation(api.templates.updateTemplate, { templateId: selectedId, name: editName.trim(), bodyPart: editBodyPart });
    setIsMetaOpen(false);
  };

  const saveSets = async () => {
    if (!selectedId || !template || editingExerciseIdx === null) return;
    const items = [...template.items].map((it) => ({ ...it }));
    const target = items.find((it) => it.order === editingExerciseIdx + 1);
    if (target) target.sets = editingSets.map((s) => ({ reps: s.reps || 0, weight: s.weight, restSec: s.restSec }));
    await convex.mutation(api.templates.updateTemplate, { templateId: selectedId, items });
    setIsSetsOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="space-y-6 p-4 lg:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <Dumbbell className="h-8 w-8 text-primary" />
                Workout Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Browse and manage your workout templates
              </p>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <ThemeSelector />
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground font-medium">Filter by Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[240px] bg-card/50 border-border/40">
                    <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesWithCounts.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center justify-between gap-3 w-full">
                          <span>{cat.label}</span>
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {cat.count}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {categoriesWithCounts.slice(1).map((cat) => {
              const isActive = selectedCategory === cat.value;
              const colorClass = getBodyPartColor(cat.value);
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`group relative rounded-lg border p-4 transition-all duration-200 ${
                    isActive
                      ? `${colorClass} shadow-lg`
                      : "border-border/40 bg-card/30 hover:border-primary/30 hover:bg-card/50"
                  }`}
                >
                  <div className="text-center space-y-1">
                    <div className={`text-2xl font-bold ${isActive ? "" : "text-muted-foreground group-hover:text-foreground"}`}>
                      {cat.count}
                    </div>
                    <div className={`text-sm font-medium capitalize ${isActive ? "" : "text-muted-foreground group-hover:text-foreground"}`}>
                      {cat.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          <Card className="border-border/40 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Dumbbell className="h-5 w-5 text-primary" />
                Workouts
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {filteredTemplates.length} workout{filteredTemplates.length !== 1 ? "s" : ""} 
                {selectedCategory !== "all" && ` in ${selectedCategory}`}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, body part..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 bg-background/50"
              />
            </div>
            <ScrollArea className="h-[calc(100vh-420px)] pr-2">
              <div className="grid gap-2">
                {(filteredTemplates || []).map((t: Template) => (
                  <button
                    key={t._id}
                    onClick={() => setSelectedId(t._id)}
                    className={`group relative text-left rounded-lg border p-4 transition-all duration-200 ${
                      selectedId === t._id
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/5"
                        : "border-border/40 bg-card/30 hover:border-primary/50 hover:bg-card/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <div className="font-medium leading-tight group-hover:text-primary transition-colors">
                          {t.name}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-xs font-medium border ${getBodyPartColor(t.bodyPart)}`}>
                            {t.bodyPart}
                          </Badge>
                          {!!t.variation && (
                            <Badge variant="outline" className="text-xs">
                              {t.variation}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {!filteredTemplates?.length && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Dumbbell className="h-12 w-12 text-muted-foreground/20 mb-3" />
                    <p className="text-sm text-muted-foreground">No workouts found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Calendar className="h-5 w-5 text-primary" />
              Workout Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!template ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Calendar className="h-16 w-16 text-muted-foreground/20 mb-4" />
                <p className="text-sm text-muted-foreground">Select a workout to view details</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-280px)] pr-4">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h2 className="text-2xl font-bold tracking-tight">{template.name}</h2>
                          <Dialog open={isMetaOpen} onOpenChange={setIsMetaOpen}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">Edit</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Workout</DialogTitle>
                                <DialogDescription>Update name and category</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-3">
                                <div className="space-y-1">
                                  <label className="text-sm">Name</label>
                                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-sm">Category</label>
                                  <Select value={editBodyPart} onValueChange={setEditBodyPart}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {categoriesWithCounts.filter(c => c.value !== "all").map((c) => (
                                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button onClick={saveMeta}>Save</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`font-medium border ${getBodyPartColor(template.bodyPart)}`}>
                            {template.bodyPart}
                          </Badge>
                          {template.variation && (
                            <Badge variant="outline" className="font-medium">
                              {template.variation}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {template.description}
                      </p>
                    )}
                  </div>

                  <Separator className="bg-border/50" />

                  <div className="space-y-4">
                    {[...(template.items || [])]
                      .sort((a, b) => a.order - b.order)
                      .map((it, idx: number) => {
                        const ex = exerciseById[it.exerciseId];
                        return (
                          <div
                            key={`detail-${idx}`}
                            className="group relative rounded-xl border border-border/40 bg-gradient-to-br from-card/40 to-card/20 backdrop-blur-sm p-6 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                          >
                            <div className="flex items-start justify-between gap-4 mb-5">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 border border-primary/20">
                                    <span className="text-sm font-bold text-primary">{it.order}</span>
                                  </div>
                                  <div>
                                    <h3 className="text-xl font-bold tracking-tight leading-tight">
                                      {ex?.name || it.exerciseId}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      {ex?.bodyPart && (
                                        <span className="text-sm text-muted-foreground capitalize">
                                          {ex.bodyPart}
                                        </span>
                                      )}
                                      {it.groupId && (
                                        <>
                                          <span className="text-muted-foreground">•</span>
                                          <Badge variant="secondary" className="text-xs font-medium">
                                            Superset {it.groupId}
                                          </Badge>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => openEditSets(idx)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                Edit
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                              {(it.sets || []).map((s, i: number) => (
                                <div
                                  key={i}
                                  className="relative rounded-lg border border-border/30 bg-background/60 backdrop-blur-sm p-4 transition-all hover:border-primary/40 hover:bg-background/80 hover:shadow-md group/set"
                                >
                                  <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center">
                                    <span className="text-xs font-bold text-primary">{i + 1}</span>
                                  </div>
                                  <div className="space-y-2 mt-1">
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-3xl font-bold text-primary">{s.reps}</span>
                                      <span className="text-sm text-muted-foreground">reps</span>
                                    </div>
                                    {s.weight !== undefined && (
                                      <div className="flex items-baseline gap-1">
                                        <span className="text-lg font-semibold">{s.weight}</span>
                                        <span className="text-xs text-muted-foreground">kg</span>
                                      </div>
                                    )}
                                    {s.restSec !== undefined && (
                                      <div className="flex items-baseline gap-1 text-muted-foreground">
                                        <span className="text-sm">{s.restSec}s</span>
                                        <span className="text-xs">rest</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <Dialog open={isSetsOpen && editingExerciseIdx === idx} onOpenChange={setIsSetsOpen}>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle className="text-xl">Edit Sets - {ex?.name}</DialogTitle>
                                  <DialogDescription>Update reps, weight, and rest for each set</DialogDescription>
                                </DialogHeader>
                                <ScrollArea className="max-h-[60vh] pr-4">
                                  <div className="space-y-3">
                                    {editingSets.map((s, si) => (
                                      <div key={si} className="flex items-center gap-3 p-3 rounded-lg border bg-card/50">
                                        <Badge variant="secondary" className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold">{si + 1}</Badge>
                                        <div className="flex-1 grid grid-cols-3 gap-3">
                                          <div className="space-y-1">
                                            <label className="text-xs text-muted-foreground">Reps</label>
                                            <Input type="number" className="h-12 text-lg font-semibold" placeholder="10" value={s.reps ?? ""} onChange={(e) => updateEditingSet(si, "reps", e.target.value ? Number(e.target.value) : undefined)} />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-xs text-muted-foreground">Weight (kg)</label>
                                            <Input type="number" step="0.5" className="h-12 text-lg" placeholder="20" value={s.weight ?? ""} onChange={(e) => updateEditingSet(si, "weight", e.target.value ? Number(e.target.value) : undefined)} />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-xs text-muted-foreground">Rest (sec)</label>
                                            <Input type="number" className="h-12 text-lg" placeholder="90" value={s.restSec ?? ""} onChange={(e) => updateEditingSet(si, "restSec", e.target.value ? Number(e.target.value) : undefined)} />
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </ScrollArea>
                                <DialogFooter>
                                  <Button onClick={saveSets} size="lg" className="w-full">Save Changes</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        );
                      })}
                  </div>
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


