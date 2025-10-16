"use client";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const equipmentOptions = ["barbell","dumbbell","machine","kettlebell","cable","bodyweight"] as const;
const loadingModeOptions = ["bar","pair","single"] as const;

export default function NewExercisePage() {
  const router = useRouter();
  const convex = useConvex();
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

  const canSave = useMemo(() => name.trim().length > 0 && bodyPart.trim().length > 0, [name, bodyPart]);

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
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
      router.push(`/admin/exercises/${id}`);
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      alert(m || "Failed to create exercise");
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>New Exercise</CardTitle>
            <CardDescription>Create a new exercise with all properties</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={isWeighted} onCheckedChange={setIsWeighted} id="isWeighted" />
                <label htmlFor="isWeighted" className="text-sm">Weighted exercise</label>
              </div>
              <Button onClick={onSave} disabled={!canSave || saving} size="lg">
                {saving ? "Saving..." : "Create Exercise"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


