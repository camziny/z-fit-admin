"use client";
import Link from "next/link";
import { useConvex } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";

type Template = { _id: string; name: string; bodyPart: string; variation?: string };

export default function TemplatesList() {
  const convex = useConvex();
  const [bodyPart, setBodyPart] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const list = bodyPart
          ? await convex.query(api.templates.byBodyPart, { bodyPart })
          : await convex.query(api.templates.listAll, {});
        if (!cancelled) setTemplates(list as Template[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [bodyPart, convex]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input className="border rounded px-3 py-2" placeholder="Filter by body part (e.g., chest)" value={bodyPart} onChange={(e) => setBodyPart(e.target.value)} />
      </div>
      {loading ? <div>Loading…</div> : (
        <div className="grid gap-2">
          {templates.map(t => (
            <Link key={t._id} className="border rounded p-3 hover:bg-gray-50" href={`/admin/templates/${t._id}`}>
              <div className="font-medium">{t.name}</div>
              <div className="text-sm text-gray-500">{t.bodyPart}{t.variation ? ` • ${t.variation}` : ''}</div>
            </Link>
          ))}
          {!templates.length && bodyPart && <div className="text-sm text-gray-500">No templates for "{bodyPart}"</div>}
        </div>
      )}
    </div>
  );
}


