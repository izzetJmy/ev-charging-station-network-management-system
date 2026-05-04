import { type CSSProperties, useMemo, useState } from "react";

type Series = {
  name: string;
  color: string;
  data: number[];
};

export interface TimeSeriesChartProps {
  title: string;
  description?: string;
  labels: string[];
  series: Series[];
  height?: number;
  valueFormatter?: (value: number, seriesName: string) => string;
  yAxisLabel?: string;
  xAxisLabel?: string;
  xAxisNote?: string;
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    width: "100%",
    borderRadius: "18px",
    border: "1px solid rgba(31, 94, 77, 0.16)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(250,253,250,0.92) 100%)",
    boxShadow: "0 18px 52px rgba(23,35,31,0.08)",
    padding: "14px 14px 12px",
    boxSizing: "border-box",
    position: "relative",
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 12% 18%, rgba(169,216,105,0.18), transparent 52%), radial-gradient(circle at 92% 12%, rgba(31,94,77,0.14), transparent 52%)",
    pointerEvents: "none",
    opacity: 0.9,
  },
  inner: { position: "relative", zIndex: 1 },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    fontSize: "14px",
    fontWeight: 1000,
    letterSpacing: "-0.01em",
    color: "#10352E",
  },
  desc: {
    margin: "4px 0 0",
    fontSize: "12px",
    fontWeight: 850,
    color: "#5B736A",
    lineHeight: 1.55,
  },
  legend: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
    fontWeight: 900,
    color: "#3F6B5E",
  },
  dot: {
    width: "10px",
    height: "10px",
    borderRadius: "999px",
    boxShadow: "0 0 0 2px rgba(255,255,255,0.8)",
  },
  svg: {
    width: "100%",
    display: "block",
    marginTop: "10px",
  },
  axis: {
    fontSize: "11px",
    fill: "#5B736A",
    fontWeight: 850,
  },
  yAxisLabel: {
    fontSize: "11px",
    fill: "#4B6B60",
    fontWeight: 950,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  xAxisLabel: {
    fontSize: "11px",
    fill: "#4B6B60",
    fontWeight: 950,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  noteRow: {
    marginTop: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
  },
  note: {
    fontSize: "11px",
    fontWeight: 850,
    color: "#5B736A",
    letterSpacing: "0.01em",
  },
  tooltip: {
    position: "absolute",
    transform: "translate(-50%, calc(-100% - 10px))",
    background: "rgba(10, 22, 18, 0.82)",
    border: "1px solid rgba(255,255,255,0.16)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    color: "#FFFFFF",
    borderRadius: "14px",
    padding: "10px 10px",
    minWidth: "180px",
    boxShadow: "0 18px 46px rgba(0,0,0,0.26)",
    pointerEvents: "none",
  },
  tooltipTitle: { fontSize: "12px", fontWeight: 950, margin: 0, opacity: 0.92 },
  tooltipRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    marginTop: "8px",
    fontSize: "12px",
    fontWeight: 900,
    opacity: 0.95,
  },
  tooltipLeft: { display: "inline-flex", alignItems: "center", gap: "8px" },
};

function buildPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

export default function TimeSeriesChart({
  title,
  description,
  labels,
  series,
  height = 160,
  valueFormatter,
  yAxisLabel,
  xAxisLabel,
  xAxisNote,
}: TimeSeriesChartProps) {
  const width = 860;
  const paddingX = 18;
  const paddingY = 18;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tooltipX, setTooltipX] = useState<number>(0);
  const [tooltipY, setTooltipY] = useState<number>(0);

  const flatValues = useMemo(() => series.flatMap((s) => s.data), [series]);
  const maxValue = Math.max(1, ...flatValues);

  const plot = useMemo(() => {
    const n = Math.max(labels.length, 1);
    const innerW = width - paddingX * 2;
    const innerH = height - paddingY * 2;
    const dx = n === 1 ? 0 : innerW / (n - 1);

    return series.map((s, seriesIndex) => {
      const points = s.data.map((value, idx) => ({
        x: paddingX + dx * idx,
        y: paddingY + innerH - (innerH * value) / maxValue,
      }));
      const area =
        points.length > 0
          ? `${buildPath(points)} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
          : "";
      return { ...s, seriesIndex, points, d: buildPath(points), area };
    });
  }, [labels.length, series, height, maxValue]);

  const yTopLabel = String(maxValue);
  const xAxisCount = Math.max(labels.length, 1);
  const innerW = width - paddingX * 2;
  const dx = xAxisCount === 1 ? 0 : innerW / (xAxisCount - 1);

  const activeIndex = hoverIndex ?? null;
  const activeLabel = activeIndex != null ? labels[activeIndex] : null;
  const activeValues =
    activeIndex != null
      ? plot.map((s) => ({
          name: s.name,
          color: s.color,
          value: s.data[activeIndex] ?? 0,
        }))
      : [];

  const tickIndices = useMemo(() => {
    const n = labels.length;
    if (n <= 1) return [0];
    if (n <= 5) return Array.from({ length: n }, (_, i) => i);
    return [0, Math.round((n - 1) * 0.25), Math.round((n - 1) * 0.5), Math.round((n - 1) * 0.75), n - 1];
  }, [labels.length]);

  function formatValue(value: number, seriesName: string) {
    if (valueFormatter) return valueFormatter(value, seriesName);
    return String(value);
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.glow} aria-hidden="true" />
      <div style={styles.inner}>
        <div style={styles.header}>
          <div>
            <p style={styles.title}>{title}</p>
            {description && <p style={styles.desc}>{description}</p>}
          </div>
          <div style={styles.legend} aria-label="Legend">
            {series.map((s) => (
              <span key={s.name} style={styles.legendItem}>
                <span style={{ ...styles.dot, backgroundColor: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
        </div>

        {activeIndex != null && activeLabel && (
          <div style={{ ...styles.tooltip, left: tooltipX, top: tooltipY }}>
            <p style={styles.tooltipTitle}>{activeLabel}</p>
            {activeValues.map((v) => (
              <div key={v.name} style={styles.tooltipRow}>
                <span style={styles.tooltipLeft}>
                  <span style={{ ...styles.dot, backgroundColor: v.color }} />
                  {v.name}
                </span>
                <span>{formatValue(v.value, v.name)}</span>
              </div>
            ))}
          </div>
        )}

        <svg
          style={styles.svg}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Time series chart"
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(event) => {
            const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * width;
            const idx = Math.max(
              0,
              Math.min(labels.length - 1, Math.round((x - paddingX) / (dx || 1))),
            );
            setHoverIndex(Number.isFinite(idx) ? idx : null);
            setTooltipX(event.clientX - rect.left);
            setTooltipY(event.clientY - rect.top);
          }}
        >
          <defs>
            <linearGradient id="gridFade" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(31,94,77,0.12)" />
              <stop offset="100%" stopColor="rgba(31,94,77,0.04)" />
            </linearGradient>
            {plot.map((s) => (
              <linearGradient
                key={`${s.name}-area`}
                id={`area-${s.seriesIndex}`}
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop offset="0%" stopColor={s.color} stopOpacity="0.26" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
              </linearGradient>
            ))}
          </defs>

          <rect x="0" y="0" width={width} height={height} fill="transparent" rx="16" />

          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="url(#gridFade)"
            strokeWidth="1"
          />
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="rgba(31,94,77,0.10)"
            strokeWidth="1"
          />

          {activeIndex != null && (
            <line
              x1={paddingX + dx * activeIndex}
              y1={paddingY}
              x2={paddingX + dx * activeIndex}
              y2={height - paddingY}
              stroke="rgba(31,94,77,0.14)"
              strokeWidth="2"
            />
          )}

          {plot.map((s) => (
            <path
              key={`${s.name}-area`}
              d={s.area}
              fill={`url(#area-${s.seriesIndex})`}
              stroke="none"
            />
          ))}

          {plot.map((s) => (
            <path
              key={s.name}
              d={s.d}
              fill="none"
              stroke={s.color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {activeIndex != null &&
            plot.map((s) => {
              const p = s.points[activeIndex];
              if (!p) return null;
              return (
                <g key={`${s.name}-active`}>
                  <circle cx={p.x} cy={p.y} r="5" fill={s.color} />
                  <circle cx={p.x} cy={p.y} r="9" fill={s.color} opacity="0.18" />
                </g>
              );
            })}

          <text x={paddingX} y={paddingY - 6} style={styles.axis}>
            {yTopLabel}
          </text>
          {yAxisLabel && (
            <text x={paddingX} y={paddingY - 20} style={styles.yAxisLabel}>
              {yAxisLabel}
            </text>
          )}
          {xAxisLabel && (
            <text
              x={width - paddingX}
              y={height - paddingY + 28}
              textAnchor="end"
              style={styles.xAxisLabel}
            >
              {xAxisLabel}
            </text>
          )}

          {tickIndices.map((idx) => (
            <text
              key={idx}
              x={paddingX + dx * idx}
              y={height - 4}
              textAnchor={idx === 0 ? "start" : idx === labels.length - 1 ? "end" : "middle"}
              style={styles.axis}
            >
              {labels[idx] ?? ""}
            </text>
          ))}
        </svg>

        {(xAxisNote || xAxisLabel) && (
          <div style={styles.noteRow}>
            <div style={styles.note}>
              {xAxisNote ?? (xAxisLabel ? `X ekseni: ${xAxisLabel.toLowerCase()}` : "")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
