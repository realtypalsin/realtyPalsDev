'use client';

import { useEffect, useState } from 'react';

interface RadarAxis {
  label: string;
  value: number; // 0-100
  color: string;
}

interface PropertyRadarChartProps {
  axes?: RadarAxis[];

  size?: number;
}

export default function PropertyRadarChart({ axes = [], size = 200 }: PropertyRadarChartProps) {

  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38;
  const levels = 4;
  const angleStep = axes.length > 0 ? (2 * Math.PI) / axes.length : 0;


  // Get point coordinates
  const getPoint = (index: number, value: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const r = (value / 100) * maxR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  // Grid lines
  const gridPaths = Array.from({ length: levels }, (_, level) => {
    const r = ((level + 1) / levels) * maxR;
    const points = axes.map((_, i) => {
      const angle = angleStep * i - Math.PI / 2;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    });
    return `M${points.join('L')}Z`;
  });

  // Data polygon
  const dataPoints = axes.map((a, i) => {
    const val = animated ? a.value : 0;
    const p = getPoint(i, val);
    return `${p.x},${p.y}`;
  });
  const dataPath = `M${dataPoints.join('L')}Z`;

  // Axis lines
  const axisLines = axes.map((_, i) => {
    const p = getPoint(i, 100);
    return { x1: cx, y1: cy, x2: p.x, y2: p.y };
  });

  // Labels
  const labels = axes.map((a, i) => {
    const p = getPoint(i, 120);
    return { ...a, x: p.x, y: p.y };
  });


  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid */}
        {gridPaths.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#e5e7eb" strokeWidth={0.8} className="dark:stroke-gray-700" />
        ))}

        {/* Axis lines */}
        {axisLines.map((line, i) => (
          <line key={i} {...line} stroke="#d1d5db" strokeWidth={0.6} className="dark:stroke-gray-600" />
        ))}

        {/* Data area */}
        <path
          d={dataPath}
          fill="rgba(59, 130, 246, 0.15)"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeLinejoin="round"
          className="transition-all duration-1000 ease-out"
        />

        {/* Data points */}
        {axes.map((a, i) => {
          const p = getPoint(i, animated ? a.value : 0);
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3.5}
              fill={a.color}
              stroke="white"
              strokeWidth={1.5}
              className="transition-all duration-1000 ease-out"
            />
          );
        })}

        {/* Labels */}
        {labels.map((l, i) => (
          <text
            key={i}
            x={l.x}
            y={l.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-gray-500 dark:fill-gray-400 text-[9px] font-medium"
          >
            {l.label}
          </text>
        ))}

      </svg>

      {/* Legend — axis labels only, no fabricated scores */}

      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 justify-center">
        {axes.map((a, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
            <span className="text-[10px] text-gray-500 dark:text-gray-400">{a.label}</span>

          </div>
        ))}
      </div>
    </div>
  );
}
