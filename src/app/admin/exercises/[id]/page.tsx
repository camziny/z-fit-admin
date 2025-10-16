"use client";
import { useRouter } from "next/navigation";
import { useConvex, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const equipmentOptions = ["barbell","dumbbell","machine","kettlebell","cable","bodyweight"] as const;
const loadingModeOptions = ["bar","pair","single"] as const;

export default function ExerciseEditPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const convex = useConvex();
  const exerciseId = params.id as Id<'exercises'>;
  const data = useQuery(api.exercises.getById, { exerciseId });

  const [name, setName] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [isWeighted, setIsWeighted] = useState(true);
  const [equipment, setEquipment] = useState<string | undefined>(undefined);
  const [loadingMode, setLoadingMode] = useState<string | undefined>(undefined);
  const [roundingKg, setRoundingKg] = useState<string>("");
  const [roundingLb, setRoundingLb] = useState<string>("");
  const [gifUrl, setGifUrl] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setName(data.name || "");
      setBodyPart(data.bodyPart || "");
      setIsWeighted(!!data.isWeighted);
      setEquipment(data.equipment || undefined);
      setLoadingMode(data.loadingMode || undefined);
      setRoundingKg(data.roundingIncrementKg != null ? String(data.roundingIncrementKg) : "");
      setRoundingLb(data.roundingIncrementLbs != null ? String(data.roundingIncrementLbs) : "");
      setGifUrl(data.gifUrl || "");
      setDescription(data.description || "");
    }
  }, [data]);

  const canSave = useMemo(() => name.trim().length > 0 && bodyPart.trim().length > 0, [name, bodyPart]);

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await convex.mutation(api.exercises.updateExercise, {
        exerciseId,
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
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    const ok = await convex.mutation(api.exercises.deleteExercise, { exerciseId });
    if (ok) router.push("/admin/exercises");
  };

  if (!data) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Edit Exercise</CardTitle>
              <CardDescription>Update properties for this exercise</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={onSave} disabled={!canSave || saving}>{saving ? "Saving..." : "Save"}</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Delete</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this exercise?</AlertDialogTitle>
                    <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Body Part *</label>
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
            </div>

            <Separator />

            <div className="flex items-center gap-2">
              <Switch checked={isWeighted} onCheckedChange={setIsWeighted} id="isWeighted" />
              <label htmlFor="isWeighted" className="text-sm">Weighted exercise</label>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


