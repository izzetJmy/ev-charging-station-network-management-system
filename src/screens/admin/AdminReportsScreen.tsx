import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import type { Charger } from "../../models/Charger";
import type { Station } from "../../models/Station";
import { updateChargerStatus } from "../../services/firebase/chargerService";
import { getReports, type ReportIssueType, type ReportRecord } from "../../services/firebase/reportService";
import { getStationsWithChargers, upsertStation } from "../../services/firebase/stationService";

const styles: Record<string, CSSProperties> = {
  title: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 950,
    letterSpacing: "-0.02em",
  },
  subtitle: {
    margin: "6px 0 0",
    color: "#5B736A",
    fontSize: "13px",
    fontWeight: 800,
    lineHeight: 1.6,
    maxWidth: "760px",
  },
  toolbar: {
    marginTop: "14px",
    display: "grid",
    gridTemplateColumns: "1.2fr 0.9fr 0.9fr",
    gap: "12px",
    alignItems: "end",
  },
  field: {
    display: "grid",
    gap: "8px",
  },
  label: {
    fontSize: "12px",
    fontWeight: 950,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#4B6B60",
  },
  input: {
    width: "100%",
    minHeight: "44px",
    borderRadius: "14px",
    border: "1px solid rgba(31, 94, 77, 0.18)",
    backgroundColor: "rgba(255,255,255,0.86)",
    padding: "10px 12px",
    fontFamily: "inherit",
    fontWeight: 850,
    color: "#17231F",
    outline: "none",
    boxSizing: "border-box",
  },
  metaRow: {
    marginTop: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
  },
  count: {
    fontSize: "12px",
    fontWeight: 900,
    color: "#5B736A",
  },
  loading: {
    marginTop: "14px",
    borderRadius: "16px",
    padding: "12px 14px",
    border: "1px solid rgba(31, 94, 77, 0.16)",
    backgroundColor: "rgba(255,255,255,0.7)",
    fontWeight: 800,
    color: "#37594D",
  },
  grid: {
    marginTop: "14px",
    display: "grid",
    gap: "12px",
  },
  card: {
    borderRadius: "20px",
    border: "1px solid rgba(31, 94, 77, 0.16)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(250,253,250,0.92) 100%)",
    boxShadow: "0 18px 52px rgba(23,35,31,0.08)",
    padding: "14px",
    position: "relative",
    overflow: "hidden",
    transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
  },
  glow: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 18% 22%, rgba(169,216,105,0.18), transparent 55%), radial-gradient(circle at 92% 18%, rgba(31,94,77,0.12), transparent 60%)",
    pointerEvents: "none",
    opacity: 0.9,
  },
  inner: { position: "relative", zIndex: 1 },
  top: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
  },
  station: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 1000,
    color: "#10352E",
    letterSpacing: "-0.01em",
  },
  badge: {
    borderRadius: "999px",
    padding: "8px 10px",
    fontSize: "12px",
    fontWeight: 950,
    whiteSpace: "nowrap",
    border: "1px solid rgba(31, 94, 77, 0.20)",
    backgroundColor: "rgba(239, 248, 231, 0.8)",
    color: "#1F5E4D",
  },
  details: {
    marginTop: "10px",
    color: "#37594D",
    fontSize: "13px",
    lineHeight: 1.6,
    fontWeight: 800,
  },
  desc: {
    marginTop: "10px",
    borderRadius: "16px",
    border: "1px solid rgba(31, 94, 77, 0.12)",
    backgroundColor: "rgba(255,255,255,0.74)",
    padding: "12px",
    color: "#22352F",
    fontSize: "13px",
    lineHeight: 1.6,
    fontWeight: 850,
  },
  actionRow: {
    marginTop: "12px",
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    flexWrap: "wrap",
  },
  dangerButton: {
    minHeight: "40px",
    borderRadius: "14px",
    border: "1px solid rgba(166, 62, 48, 0.24)",
    backgroundColor: "#FFF3F1",
    color: "#A63E30",
    padding: "0 12px",
    fontFamily: "inherit",
    fontSize: "13px",
    fontWeight: 950,
    cursor: "pointer",
  },
  empty: {
    marginTop: "14px",
    borderRadius: "18px",
    border: "1px dashed rgba(31, 94, 77, 0.22)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(239,247,240,0.92) 100%)",
    padding: "18px",
    color: "#66756E",
    fontSize: "14px",
    lineHeight: 1.7,
    textAlign: "center",
    fontWeight: 850,
  },
};

const ISSUE_LABELS: Record<ReportIssueType, string> = {
  charger_not_working: "adminReports.issueTypes.charger_not_working",
  wrong_price: "adminReports.issueTypes.wrong_price",
  station_offline: "adminReports.issueTypes.station_offline",
  location_problem: "adminReports.issueTypes.location_problem",
  payment_problem: "adminReports.issueTypes.payment_problem",
  other: "adminReports.issueTypes.other",
};

function formatCreatedAt(createdAt: unknown) {
  const asAny = createdAt as { toDate?: () => Date } | null;
  const date = asAny?.toDate?.() ?? null;
  if (!date) return "--";
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

type TargetFilter = "all" | "station" | "charger";

export default function AdminReportsScreen() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [stationsById, setStationsById] = useState<Record<string, Station>>({});
  const [chargersById, setChargersById] = useState<Record<string, Charger>>({});
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const [queryText, setQueryText] = useState("");
  const [issueType, setIssueType] = useState<ReportIssueType | "all">("all");
  const [target, setTarget] = useState<TargetFilter>("all");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([getReports(), getStationsWithChargers()])
      .then(([items, stations]) => {
        if (cancelled) return;
        setReports(items);

        const stationMap: Record<string, Station> = {};
        const chargerMap: Record<string, Charger> = {};
        for (const station of stations) {
          stationMap[station.id] = station;
          for (const charger of station.chargers ?? []) {
            chargerMap[charger.id] = charger;
          }
        }
        setStationsById(stationMap);
        setChargersById(chargerMap);
      })
      .catch(() => {
        if (cancelled) return;
        setError(t("adminReports.reportLoadFailed"));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  const filtered = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return reports.filter((r) => {
      if (issueType !== "all" && r.issueType !== issueType) return false;
      if (target === "station" && r.chargerId) return false;
      if (target === "charger" && !r.chargerId) return false;

      if (!q) return true;
      const stationName = stationsById[r.stationId]?.name ?? r.stationId;
      const chargerLabel = r.chargerId
        ? chargersById[r.chargerId]?.connectorType ?? r.chargerId
        : "";

      const blob = `${stationName} ${r.stationId} ${chargerLabel} ${r.chargerId ?? ""} ${ISSUE_LABELS[r.issueType] ?? r.issueType} ${r.description}`.toLowerCase();
      return blob.includes(q);
    });
  }, [reports, queryText, issueType, target, stationsById, chargersById]);

  const refreshStations = async () => {
    const stations = await getStationsWithChargers();
    const stationMap: Record<string, Station> = {};
    const chargerMap: Record<string, Charger> = {};

    for (const station of stations) {
      stationMap[station.id] = station;
      for (const charger of station.chargers ?? []) {
        chargerMap[charger.id] = charger;
      }
    }

    setStationsById(stationMap);
    setChargersById(chargerMap);
  };

  const handleMarkOutOfService = async (report: ReportRecord) => {
    const station = stationsById[report.stationId] ?? null;
    const charger = report.chargerId ? chargersById[report.chargerId] ?? null : null;
    if (!station && !charger) return;

    setActionLoadingId(report.id);
    setActionMessage("");

    try {
      if (charger) {
        await updateChargerStatus(charger.id, "offline");
      } else if (station) {
        await upsertStation({
          ...station,
          status: "offline",
          manualOffline: true,
        });
      }

      await refreshStations();
      setActionMessage("Out-of-service action applied. Active reservations were cancelled and users were notified.");
    } catch {
      setActionMessage("Out-of-service action could not be completed.");
    } finally {
      setActionLoadingId("");
    }
  };

  return (
    <div>
      <h2 style={styles.title}>{t("adminReports.title")}</h2>
      <p style={styles.subtitle}>{t("adminReports.subtitle")}</p>

      <div className="admin-reports-toolbar" style={styles.toolbar}>
        <div style={styles.field}>
          <div style={styles.label}>{t("adminReports.search")}</div>
          <input
            style={styles.input}
            placeholder={t("adminReports.searchPlaceholder")}
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
          />
        </div>

        <div style={styles.field}>
          <div style={styles.label}>{t("adminReports.type")}</div>
          <select
            style={styles.input}
            value={issueType}
            onChange={(e) => setIssueType(e.target.value as ReportIssueType | "all")}
          >
            <option value="all">{t("adminReports.all")}</option>
            {Object.entries(ISSUE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {t(label)}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.field}>
          <div style={styles.label}>{t("adminReports.scope")}</div>
          <select style={styles.input} value={target} onChange={(e) => setTarget(e.target.value as TargetFilter)}>
            <option value="all">{t("adminReports.all")}</option>
            <option value="station">{t("adminReports.stationOnly")}</option>
            <option value="charger">{t("adminReports.chargerOnly")}</option>
          </select>
        </div>
      </div>

      <div style={styles.metaRow}>
        <div style={styles.count}>{t("adminReports.reportsCount", { count: filtered.length })}</div>
      </div>
      {actionMessage && <div style={styles.loading}>{actionMessage}</div>}

      {loading && <div style={styles.loading}>{t("adminReports.loading")}</div>}
      {!loading && error && <div style={styles.loading}>{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div style={styles.empty}>{t("adminReports.noResults")}</div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div style={styles.grid}>
          {filtered.map((report) => {
            const station = stationsById[report.stationId] ?? null;
            const charger = report.chargerId ? chargersById[report.chargerId] ?? null : null;
            const stationName = station?.name ?? report.stationId;
            const issue = t(ISSUE_LABELS[report.issueType] ?? report.issueType);
            const badgeText = charger ? `${t("adminReports.charger")} - ${issue}` : `${t("adminReports.station")} - ${issue}`;
            const chargerLine = charger
              ? `${charger.connectorType} - ${charger.powerOutput} - ${charger.type}`
              : "--";

            return (
              <article key={report.id} className="admin-card" style={styles.card}>
                <div style={styles.glow} aria-hidden="true" />
                <div style={styles.inner}>
                  <div style={styles.top}>
                    <p style={styles.station}>{stationName}</p>
                    <span style={styles.badge}>{badgeText}</span>
                  </div>

                  <div style={styles.details}>
                    {t("adminReports.date")}: {formatCreatedAt(report.createdAt)} <br />
                    {t("adminReports.stationId")}: {report.stationId} <br />
                    {t("adminReports.charger")}: {report.chargerId ? chargerLine : "--"}
                  </div>

                  <div style={styles.desc}>{report.description || "--"}</div>
                  <div style={styles.actionRow}>
                    <button
                      type="button"
                      style={styles.dangerButton}
                      onClick={() => void handleMarkOutOfService(report)}
                      disabled={actionLoadingId === report.id}
                    >
                      {actionLoadingId === report.id
                        ? "Applying..."
                        : "Mark out of service"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <style>{`
        @media (max-width: 980px) {
          .admin-reports-toolbar {
            grid-template-columns: 1fr !important;
          }
        }

        .admin-card:hover {
          transform: translateY(-1px);
          border-color: rgba(31, 94, 77, 0.24);
          box-shadow: 0 22px 62px rgba(23,35,31,0.12);
        }
      `}</style>
    </div>
  );
}
