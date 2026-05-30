/**
 * StatsChart — Simple SVG bar chart for session byte transfer
 *
 * Intentionally pure SVG — no external charting library deps.
 */

import type { Session } from '@/api/types';
import { formatBytes } from '@/utils/formatting';

interface StatsChartProps {
  sessions: Session[];
  height?: number;
}

export function StatsChart({ sessions, height = 140 }: StatsChartProps) {
  if (sessions.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
        No session data to display
      </div>
    );
  }

  // Show top 8 sessions by total bytes
  const top8 = [...sessions]
    .sort((a, b) => (b.bytes_up + b.bytes_down) - (a.bytes_up + a.bytes_down))
    .slice(0, 8);

  const maxTotal = Math.max(...top8.map(s => s.bytes_up + s.bytes_down), 1);
  const barWidth = 28;
  const gap = 14;
  const chartWidth = top8.length * (barWidth + gap);
  const chartHeight = height - 30; // leave room for labels

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={Math.max(chartWidth, 300)} height={height} aria-label="Session bandwidth chart">
        <defs>
          <linearGradient id="bar-up" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="bar-down" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {top8.map((session, i) => {
          const x = i * (barWidth + gap) + gap / 2;
          const upRatio = session.bytes_up / maxTotal;
          const downRatio = session.bytes_down / maxTotal;
          const halfBar = barWidth / 2 - 1;

          const upH = Math.max(upRatio * chartHeight, 2);
          const downH = Math.max(downRatio * chartHeight, 2);

          const label = (session.username ?? `u${session.user_id}`).slice(0, 6);

          return (
            <g key={session.id}>
              {/* Upload bar (left half) */}
              <rect
                x={x}
                y={chartHeight - upH}
                width={halfBar}
                height={upH}
                fill="url(#bar-up)"
                rx={2}
              >
                <title>↑ {formatBytes(session.bytes_up)} ({session.username ?? `user:${session.user_id}`})</title>
              </rect>

              {/* Download bar (right half) */}
              <rect
                x={x + halfBar + 2}
                y={chartHeight - downH}
                width={halfBar}
                height={downH}
                fill="url(#bar-down)"
                rx={2}
              >
                <title>↓ {formatBytes(session.bytes_down)} ({session.username ?? `user:${session.user_id}`})</title>
              </rect>

              {/* X-axis label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 16}
                textAnchor="middle"
                fill="var(--text-secondary)"
                fontSize="10"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '2px', display: 'inline-block' }} />
          Upload
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ width: '10px', height: '10px', background: '#06b6d4', borderRadius: '2px', display: 'inline-block' }} />
          Download
        </span>
      </div>
    </div>
  );
}
