"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DashboardDay } from "@/lib/admin-dashboard";
import { formatGbp } from "@/lib/money";

type Props = {
  days: DashboardDay[];
};

export function AdminTrendChart({ days }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const update = (nextWidth: number) => {
      const w = Math.max(0, Math.floor(nextWidth));
      setWidth(w);
      setCompact(w > 0 && w < 520);
    };

    update(host.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      update(entry.contentRect.width);
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const height = compact ? 200 : 260;
  const padX = compact ? 16 : 28;
  const padTop = 20;
  const padBottom = compact ? 36 : 40;
  const chartW = Math.max(1, width - padX * 2);
  const chartH = height - padTop - padBottom;

  const maxEnrol = Math.max(1, ...days.map((d) => d.enrolments));
  const maxPaid = Math.max(1, ...days.map((d) => d.paidPence));

  const geometry = useMemo(() => {
    function xAt(index: number) {
      if (days.length <= 1) return padX + chartW / 2;
      return padX + (index / (days.length - 1)) * chartW;
    }
    function yEnrol(value: number) {
      return padTop + chartH - (value / maxEnrol) * chartH;
    }
    function yPaid(value: number) {
      return padTop + chartH - (value / maxPaid) * chartH;
    }

    const enrolLine = days
      .map((day, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yEnrol(day.enrolments).toFixed(1)}`)
      .join(" ");
    const enrolArea =
      days.length > 0
        ? `${enrolLine} L ${xAt(days.length - 1).toFixed(1)} ${(padTop + chartH).toFixed(1)} L ${xAt(0).toFixed(1)} ${(padTop + chartH).toFixed(1)} Z`
        : "";
    const paidLine = days
      .map((day, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yPaid(day.paidPence).toFixed(1)}`)
      .join(" ");

    return { xAt, yEnrol, enrolLine, enrolArea, paidLine };
  }, [chartH, chartW, days, maxEnrol, maxPaid, padX, padTop]);

  const totalEnrolments = days.reduce((sum, d) => sum + d.enrolments, 0);
  const totalPaid = days.reduce((sum, d) => sum + d.paidPence, 0);
  const peak = days.reduce(
    (best, day) => (day.enrolments > best.enrolments ? day : best),
    days[0] ?? { date: "", label: "—", enrolments: 0, seats: 0, paidPence: 0 },
  );

  const tickIndexes = useMemo(() => {
    if (days.length === 0) return [] as number[];
    if (compact) {
      if (days.length <= 4) return days.map((_, i) => i);
      return [0, Math.floor((days.length - 1) / 2), days.length - 1];
    }
    if (days.length <= 8) return days.map((_, i) => i);
    const step = Math.ceil(days.length / 7);
    const indexes: number[] = [];
    for (let i = 0; i < days.length; i += step) indexes.push(i);
    if (indexes[indexes.length - 1] !== days.length - 1) indexes.push(days.length - 1);
    return indexes;
  }, [compact, days]);

  return (
    <div className="w-full">
      <div className="flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:pt-6">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink">Enrolment trend</h3>
          <p className="text-sm text-ink/50">Last {days.length} days · bookings and paid revenue</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink/60">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-burgundy" aria-hidden />
            Enrolments ({totalEnrolments})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-gold" aria-hidden />
            Paid ({totalPaid ? formatGbp(totalPaid) : "£0"})
          </span>
        </div>
      </div>

      <div ref={hostRef} className="mt-4 w-full sm:mt-5">
        {width > 0 ? (
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="admin-trend-chart block w-full"
            role="img"
            aria-label={`Enrolments over the last ${days.length} days. Peak ${peak.enrolments} on ${peak.label}.`}
          >
            <defs>
              <linearGradient id="enrolFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#75294d" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#75294d" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {[0.25, 0.5, 0.75, 1].map((fraction) => {
              const y = padTop + chartH * (1 - fraction);
              return (
                <line
                  key={fraction}
                  x1={padX}
                  x2={width - padX}
                  y1={y}
                  y2={y}
                  stroke="rgba(117,41,77,0.1)"
                  strokeWidth="1"
                />
              );
            })}

            {geometry.enrolArea ? <path d={geometry.enrolArea} fill="url(#enrolFill)" /> : null}
            {geometry.enrolLine ? (
              <path
                d={geometry.enrolLine}
                fill="none"
                stroke="#75294d"
                strokeWidth={compact ? 2.25 : 2.75}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null}
            {geometry.paidLine ? (
              <path
                d={geometry.paidLine}
                fill="none"
                stroke="#d6a348"
                strokeWidth={compact ? 1.75 : 2.1}
                strokeDasharray="5 4"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity="0.95"
              />
            ) : null}

            {days.map((day, i) => (
              <circle
                key={day.date}
                cx={geometry.xAt(i)}
                cy={geometry.yEnrol(day.enrolments)}
                r={day.enrolments > 0 ? (compact ? 3.25 : 3.75) : 2}
                fill={day.enrolments > 0 ? "#75294d" : "rgba(117,41,77,0.25)"}
              >
                <title>
                  {day.label}: {day.enrolments} enrolment{day.enrolments === 1 ? "" : "s"}
                  {day.paidPence ? ` · ${formatGbp(day.paidPence)} paid` : ""}
                </title>
              </circle>
            ))}

            {tickIndexes.map((i) => {
              const day = days[i];
              if (!day) return null;
              return (
                <text
                  key={`tick-${day.date}`}
                  x={geometry.xAt(i)}
                  y={height - (compact ? 10 : 12)}
                  textAnchor="middle"
                  fill="rgba(40,33,42,0.45)"
                  style={{ fontSize: compact ? 10 : 11 }}
                >
                  {day.label}
                </text>
              );
            })}
          </svg>
        ) : (
          <div className="h-[12.5rem] w-full animate-pulse bg-burgundy/[0.04] sm:h-[16.25rem]" aria-hidden />
        )}
      </div>

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        {totalEnrolments === 0 ? (
          <p className="text-sm text-ink/55">
            No enrolments in this window yet — the chart will fill as bookings arrive.
          </p>
        ) : (
          <p className="text-sm text-ink/55">
            Peak day: <span className="font-medium text-ink">{peak.label}</span> with {peak.enrolments}{" "}
            enrolment{peak.enrolments === 1 ? "" : "s"}.
          </p>
        )}
      </div>
    </div>
  );
}
