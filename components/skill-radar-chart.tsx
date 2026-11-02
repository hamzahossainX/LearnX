"use client";

import { useMemo } from "react";
import { Shield, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type SkillRadarChartProps = {
  totalMilestones: number;
  completedMilestoneIndices: number[];
  securityFocus?: boolean;
  speedrunMode?: boolean;
  className?: string;
};

type DimensionDef = {
  key: string;
  label: string;
  shortLabel: string;
};

const DIMENSIONS: DimensionDef[] = [
  { key: "fundamentals", label: "Fundamentals", shortLabel: "Fund." },
  { key: "implementation", label: "Implementation", shortLabel: "Impl." },
  { key: "architecture", label: "Architecture", shortLabel: "Arch." },
  { key: "problemSolving", label: "Problem Solving", shortLabel: "Prob. Solv." },
  { key: "security", label: "Security & Best Practices", shortLabel: "Security" },
];

export function SkillRadarChart({
  totalMilestones,
  completedMilestoneIndices,
  securityFocus = false,
  speedrunMode = false,
  className,
}: SkillRadarChartProps) {
  // Deterministic math strictly based on specifications:
  // baseProgress = totalMilestones > 0 ? (completed / total) * 100 : 15 (min 15 so polygon is always visible)
  const completedCount = completedMilestoneIndices.length;
  const baseProgress =
    totalMilestones > 0
      ? (completedCount / totalMilestones) * 100
      : 15;
  const effectiveBase = Math.max(15, baseProgress);

  const scores = useMemo(() => {
    return [
      Math.min(100, Math.round(effectiveBase * 1.15 + 10)), // Fundamentals
      Math.min(100, Math.round(effectiveBase * 1.05 + 5)),  // Implementation
      Math.min(100, Math.round(effectiveBase * 0.95 + 10)), // Architecture
      Math.min(100, Math.round(effectiveBase * (speedrunMode ? 1.25 : 1.0) + 5)), // Problem Solving
      Math.min(100, Math.round(effectiveBase * (securityFocus ? 1.3 : 0.9) + 10)), // Security
    ];
  }, [effectiveBase, securityFocus, speedrunMode]);

  const overallMastery = useMemo(() => {
    const sum = scores.reduce((acc, curr) => acc + curr, 0);
    return Math.round(sum / scores.length);
  }, [scores]);

  // SVG Geometry constants: viewBox 0 0 300 300, cx=150, cy=150, max R=95
  const cx = 150;
  const cy = 150;
  const R = 95;
  const numAxes = 5;

  // Helper to convert polar coordinates to cartesian:
  // theta_i = 2 * pi * i / 5 - pi / 2
  // x_i = cx + r * cos(theta_i)
  // y_i = cy + r * sin(theta_i)
  const getCoordinates = (radius: number, index: number) => {
    const angle = (2 * Math.PI * index) / numAxes - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  };

  // 4 concentric background pentagon grid webs at 25%, 50%, 75%, 100%
  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridPolygons = gridLevels.map((level) => {
    const radius = R * level;
    const points = Array.from({ length: numAxes }, (_, i) => {
      const { x, y } = getCoordinates(radius, i);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(" ");
    return { level, points };
  });

  // 5 axis spokes from (150, 150) to outer vertices (R)
  const spokes = Array.from({ length: numAxes }, (_, i) => {
    const { x, y } = getCoordinates(R, i);
    return { x1: cx, y1: cy, x2: x, y2: y };
  });

  // Active data polygon points based on computed scores (0 - 100 mapped to 0 - R)
  const activePolygonPoints = scores
    .map((score, i) => {
      const radius = (Math.max(10, score) / 100) * R;
      const { x, y } = getCoordinates(radius, i);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  // Active vertex node positions
  const activeNodes = scores.map((score, i) => {
    const radius = (Math.max(10, score) / 100) * R;
    return getCoordinates(radius, i);
  });

  // Text label positions at radius R + 24
  const labels = DIMENSIONS.map((dim, i) => {
    const { x, y } = getCoordinates(R + 24, i);
    let textAnchor: "middle" | "start" | "end" = "middle";
    if (i === 1 || i === 2) textAnchor = "start";
    else if (i === 3 || i === 4) textAnchor = "end";

    // Small vertical adjustment for top vertex
    const dy = i === 0 ? -4 : i === 2 || i === 3 ? 12 : 4;

    return {
      name: dim.shortLabel,
      fullName: dim.label,
      score: scores[i],
      x,
      y: y + dy,
      textAnchor,
    };
  });

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-[#0d2818] p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:p-6",
        className,
      )}
    >
      {/* Header with LearnX Design System Typography */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-[#b5f23d]">
            <Sparkles className="size-3.5" aria-hidden="true" />
            <span>Skill Competency Matrix</span>
          </div>
          <h3 className="mt-1 text-base font-bold tracking-tight text-white sm:text-lg">
            Pedagogical Growth Radar
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {securityFocus && (
            <span
              title="Security Focus active (+30% security weighting)"
              className="inline-flex items-center gap-1 rounded-full border border-[#b5f23d]/30 bg-[#b5f23d]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#b5f23d]"
            >
              <Shield className="size-3" /> Sec-Focus
            </span>
          )}
          {speedrunMode && (
            <span
              title="Speedrun Mode active (+25% problem solving weighting)"
              className="inline-flex items-center gap-1 rounded-full border border-[#b5f23d]/30 bg-[#b5f23d]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#b5f23d]"
            >
              <Zap className="size-3" /> Speedrun
            </span>
          )}
          <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-100/70">
              Mastery
            </span>
            <span className="text-sm font-black text-[#b5f23d]">
              {overallMastery}%
            </span>
          </div>
        </div>
      </div>

      {/* Zero-Dependency SVG Radar Chart */}
      <div className="relative mx-auto mt-4 flex items-center justify-center">
        <svg
          viewBox="0 0 300 300"
          className="size-64 sm:size-72"
          role="img"
          aria-label="Skill Competency Radar Matrix"
        >
          {/* Concentric Pentagon Background Grid Webs */}
          {gridPolygons.map(({ level, points }) => (
            <polygon
              key={`grid-${level}`}
              points={points}
              fill="none"
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="1"
              strokeDasharray={level === 1.0 ? "none" : "2,3"}
            />
          ))}

          {/* 5 Axis Spokes from center (150, 150) */}
          {spokes.map((spoke, idx) => (
            <line
              key={`spoke-${idx}`}
              x1={spoke.x1}
              y1={spoke.y1}
              x2={spoke.x2}
              y2={spoke.y2}
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="1"
            />
          ))}

          {/* Active Data Filled Polygon with smooth transition */}
          <polygon
            points={activePolygonPoints}
            fill="rgba(181, 242, 61, 0.22)"
            stroke="#b5f23d"
            strokeWidth="2.5"
            strokeLinejoin="round"
            className="transition-all duration-500 ease-out"
          />

          {/* Active Vertex Nodes */}
          {activeNodes.map((node, idx) => (
            <g key={`node-${idx}`}>
              {/* Outer soft glow ring */}
              <circle
                cx={node.x}
                cy={node.y}
                r="7"
                fill="rgba(181, 242, 61, 0.25)"
                className="transition-all duration-500 ease-out"
              />
              {/* Inner solid lime node */}
              <circle
                cx={node.x}
                cy={node.y}
                r="4"
                fill="#b5f23d"
                stroke="#0d2818"
                strokeWidth="1.5"
                className="transition-all duration-500 ease-out"
              />
            </g>
          ))}

          {/* Dimension Text Labels */}
          {labels.map((label, idx) => (
            <g key={`label-${idx}`}>
              <text
                x={label.x}
                y={label.y}
                textAnchor={label.textAnchor}
                className="fill-zinc-300 text-[10px] font-semibold tracking-wide"
              >
                {label.name}
              </text>
              <text
                x={label.x}
                y={label.y + 11}
                textAnchor={label.textAnchor}
                className="fill-[#b5f23d] text-[10px] font-black"
              >
                {label.score}%
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Granular Dimension Breakdown Pills */}
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-4 sm:grid-cols-3">
        {DIMENSIONS.map((dim, idx) => (
          <div
            key={dim.key}
            className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-xs transition-colors hover:bg-white/[0.06]"
          >
            <span className="truncate text-emerald-100/70" title={dim.label}>
              {dim.label}
            </span>
            <span className="ml-2 font-mono font-bold text-[#b5f23d]">
              {scores[idx]}%
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-xl border border-[#b5f23d]/20 bg-[#b5f23d]/10 px-3 py-2 text-xs font-semibold text-[#b5f23d]">
          <span>Milestones</span>
          <span className="font-mono">
            {completedCount}/{totalMilestones}
          </span>
        </div>
      </div>
    </div>
  );
}
