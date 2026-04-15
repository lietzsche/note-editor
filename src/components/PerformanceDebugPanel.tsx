import { buildPerfConsoleLine, formatPerfDuration, type PerfSample } from "../lib/performanceDebug";

type PerformanceDebugPanelProps = {
  samples: PerfSample[];
};

export function PerformanceDebugPanel({ samples }: PerformanceDebugPanelProps) {
  return (
    <aside style={styles.panel} aria-label="성능 디버그 패널">
      <div style={styles.header}>
        <strong>Perf Debug</strong>
        <span style={styles.caption}>최근 {samples.length}건</span>
      </div>
      <div style={styles.list}>
        {samples.map((sample) => (
          <div key={sample.id} style={styles.item} title={buildPerfConsoleLine(sample)}>
            <div style={styles.itemHeader}>
              <span style={styles.kind}>{sample.kind === "group-switch" ? "그룹 전환" : "노트 열기"}</span>
              <strong>{formatPerfDuration(sample.durationMs)}</strong>
            </div>
            <div style={styles.label}>{sample.label}</div>
            <div style={styles.summary}>{sample.summary}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: "fixed",
    right: "16px",
    bottom: "16px",
    width: "min(280px, calc(100vw - 32px))",
    maxHeight: "45vh",
    overflowY: "auto",
    padding: "12px",
    borderRadius: "12px",
    background: "rgba(15, 23, 42, 0.9)",
    color: "#fff",
    boxShadow: "0 18px 48px rgba(15, 23, 42, 0.28)",
    zIndex: 1100,
    backdropFilter: "blur(10px)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
    fontSize: "12px",
  },
  caption: {
    color: "rgba(255,255,255,0.68)",
    fontSize: "11px",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  item: {
    borderRadius: "10px",
    padding: "10px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  itemHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
    marginBottom: "4px",
    fontSize: "12px",
  },
  kind: {
    color: "rgba(255,255,255,0.72)",
  },
  label: {
    fontSize: "12px",
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  summary: {
    marginTop: "3px",
    fontSize: "11px",
    color: "rgba(255,255,255,0.72)",
  },
};
