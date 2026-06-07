import React from "react";

export function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white/45 px-2 py-3">
      <div className="text-xl font-black">{value}</div>
      <div className="text-xs font-semibold text-slate">{label}</div>
    </div>
  );
}
