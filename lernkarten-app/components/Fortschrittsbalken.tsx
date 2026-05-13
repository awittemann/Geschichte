'use client';

type Props = {
  aktuell: number;
  gesamt: number;
  /** Optionales Label oberhalb des Balkens. */
  label?: string;
  /** Optionale, kompakte Darstellung (Höhe h-2 statt h-3). */
  kompakt?: boolean;
};

/**
 * Einfacher horizontaler Fortschrittsbalken (slate-200 / blue-600).
 */
export default function Fortschrittsbalken({
  aktuell,
  gesamt,
  label,
  kompakt,
}: Props) {
  const safeGesamt = gesamt > 0 ? gesamt : 1;
  const prozent = Math.max(
    0,
    Math.min(100, Math.round((aktuell / safeGesamt) * 100)),
  );
  return (
    <div className="w-full">
      {label ? (
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-sm text-slate-600">{label}</span>
          <span className="text-xs text-slate-500" aria-hidden="true">
            {aktuell} / {gesamt}
          </span>
        </div>
      ) : null}
      <div
        className={`w-full rounded-full bg-slate-200 ${kompakt ? 'h-2' : 'h-3'}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={gesamt}
        aria-valuenow={aktuell}
        aria-label={label ?? 'Fortschritt'}
      >
        <div
          className={`rounded-full bg-blue-600 ${kompakt ? 'h-2' : 'h-3'} transition-[width] duration-300`}
          style={{ width: `${prozent}%` }}
        />
      </div>
    </div>
  );
}
