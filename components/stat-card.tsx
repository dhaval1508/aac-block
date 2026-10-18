import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  tone = "navy",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "navy" | "amber" | "emerald" | "sky" | "violet";
}) {
  const tones = {
    navy: "bg-white",
    amber: "bg-white",
    emerald: "bg-white",
    sky: "bg-white",
    violet: "bg-white",
  };

  const valueColor = {
    navy: "text-navy",
    amber: "text-amber-600",
    emerald: "text-emerald-600",
    sky: "text-sky-600",
    violet: "text-violet-600",
  };

  return (
    <div className={cn("card p-4", tones[tone])}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tracking-tight lg:text-3xl", valueColor[tone])}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}
