"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Home, ListChecks, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/admin",
      label: "Workouts",
      icon: Home,
      description: "Browse all workouts",
      exact: true,
    },
    {
      href: "/admin/exercises",
      label: "Exercises",
      icon: ListChecks,
      description: "Manage exercise library",
    },
    {
      href: "/admin/templates/new",
      label: "Create Workout",
      icon: Plus,
      description: "Build a new workout",
      highlight: true,
    },
  ];

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r border-border/40 bg-card/30 backdrop-blur p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-primary" />
          <div className="text-xl font-bold">Z-Fit Admin</div>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-start gap-3 rounded-lg p-3 transition-all duration-200",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : item.highlight
                    ? "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                    : "hover:bg-accent/50",
                )}
              >
                <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium">{item.label}</div>
                  <div className={cn(
                    "text-xs mt-0.5",
                    active ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>
      <section className="flex-1 overflow-auto">{children}</section>
    </div>
  );
}


