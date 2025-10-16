"use client";
import { useConvex } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";

type Exercise = { _id: string; name: string; bodyPart: string };

export default function ExercisesPage() {
  const convex = useConvex();
  const [bodyPart, setBodyPart] = useState("");
  const [items, setItems] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!bodyPart) {
        setItems([]);
        return;
      }
      setLoading(true);
      try {
        const list = await convex.query(api.exercises.byBodyPart, { bodyPart });
        if (!cancelled) setItems(list as Exercise[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [bodyPart, convex]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Exercises</h1>
      <input className="border rounded px-3 py-2" placeholder="Body part (e.g., legs)" value={bodyPart} onChange={(e) => setBodyPart(e.target.value)} />
      {loading ? <div>Loading…</div> : (
        <ul className="grid gap-2">
          {items.map(e => (
            <li key={e._id} className="border rounded p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{e.name}</div>
                <div className="text-xs text-gray-500">{e.bodyPart}</div>
              </div>
              <div className="font-mono text-xs">{e._id}</div>
            </li>
          ))}
          {!items.length && bodyPart && <div className="text-sm text-gray-500">No exercises for "{bodyPart}"</div>}
        </ul>
      )}
    </div>
  );
}


