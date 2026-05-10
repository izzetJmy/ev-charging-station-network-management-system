import { type CSSProperties, useEffect, useMemo, useState } from "react";
import {
  fetchAdminActivityInsights,
  fetchAdminTimeSeries,
  fetchRevenueReport,
} from "../../services/firebase/adminReportsService";
import TimeSeriesChart from "../../components/charts/TimeSeriesChart";
import { useI18n } from "../../i18n/I18nProvider";

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
  summaryRow: {
    marginTop: "14px",
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
  },
  card: {
    borderRadius: "18px",
    border: "1px solid rgba(31, 94, 77, 0.16)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(250,253,250,0.92) 100%)",
    padding: "14px 14px",
    boxShadow: "0 18px 52px rgba(23,35,31,0.08)",
    position: "relative",
    overflow: "hidden",
    transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
  },
  cardGlow: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 20% 20%, rgba(169,216,105,0.22), transparent 45%), radial-gradient(circle at 90% 40%, rgba(31,94,77,0.18), transparent 55%)",
    opacity: 0.8,
    pointerEvents: "none",
  },
  cardInner: { position: "relative", zIndex: 1 },
  label: {
    fontSize: "12px",
    fontWeight: 900,
    color: "#4B6B60",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  value: {
    marginTop: "8px",
    fontSize: "24px",
    fontWeight: 1000,
    color: "#10352E",
    letterSpacing: "-0.02em",
  },
  tableWrap: {
    marginTop: "14px",
    borderRadius: "18px",
    overflow: "hidden",
    border: "1px solid rgba(31, 94, 77, 0.16)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(250,253,250,0.88) 100%)",
    boxShadow: "0 18px 52px rgba(23,35,31,0.06)",
    transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
    position: "relative",
  },
  tableGlow: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 18% 22%, rgba(169,216,105,0.16), transparent 55%), radial-gradient(circle at 92% 18%, rgba(31,94,77,0.12), transparent 60%)",
    pointerEvents: "none",
    opacity: 0.9,
  },
  tableInner: {
    position: "relative",
    zIndex: 1,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  },
  th: {
    textAlign: "left",
    padding: "12px 12px",
    background:
      "linear-gradient(90deg, rgba(16,53,46,0.10) 0%, rgba(31,94,77,0.06) 60%, rgba(169,216,105,0.08) 120%)",
    color: "#10352E",
    fontWeight: 950,
    letterSpacing: "0.02em",
  },
  td: {
    padding: "12px 12px",
    borderTop: "1px solid rgba(31, 94, 77, 0.10)",
    fontWeight: 800,
    color: "#22352F",
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  right: { textAlign: "right" },
  splitGrid: {
    marginTop: "14px",
    display: "grid",
    gridTemplateColumns: "0.8fr 1.2fr",
    gap: "12px",
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
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function RevenueReportScreen() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    totalRevenue: number;
    averageRevenuePerSession: number;
    revenueByStation: Array<{ stationId: string; stationName: string; revenue: number }>;
  } | null>(null);
  const [timeSeries, setTimeSeries] = useState<Array<{ dateLabel: string; revenue: number }>>([]);
  const [insights, setInsights] = useState<{
    peakHours: Array<{ hourLabel: string; sessionCount: number; revenue: number }>;
    userActivity: Array<{
      userId: string;
      displayName: string;
      vehicleCount: number;
      reservationCount: number;
      chargingSessionCount: number;
      cancelledReservationCount: number;
      revenue: number;
    }>;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([fetchRevenueReport(), fetchAdminTimeSeries(30), fetchAdminActivityInsights()])
      .then(([result, series, activityInsights]) => {
        if (cancelled) return;
        setData(result);
        setTimeSeries(series.map((row) => ({ dateLabel: row.dateLabel, revenue: row.revenue })));
        setInsights(activityInsights);
      })
      .catch(() => {
        if (cancelled) return;
        setError(t("adminRevenue.loadFailed"));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  const rows = useMemo(() => data?.revenueByStation ?? [], [data]);

  return (
    <div>
      <h2 style={styles.title}>{t("adminRevenue.title")}</h2>
      <p style={styles.subtitle}>{t("adminRevenue.subtitle")}</p>

      {loading && <div style={styles.loading}>{t("common.loading")}</div>}
      {!loading && error && <div style={styles.loading}>{error}</div>}

      {!loading && data && (
        <>
          <div style={styles.summaryRow}>
            <div className="admin-card" style={styles.card}>
              <div style={styles.cardGlow} aria-hidden="true" />
              <div style={styles.cardInner}>
                <div style={styles.label}>{t("adminRevenue.totalRevenue")}</div>
                <div style={styles.value}>{formatMoney(data.totalRevenue)}</div>
              </div>
            </div>
            <div className="admin-card" style={styles.card}>
              <div style={styles.cardGlow} aria-hidden="true" />
              <div style={styles.cardInner}>
                <div style={styles.label}>{t("adminRevenue.averageRevenuePerSession")}</div>
                <div style={styles.value}>{formatMoney(data.averageRevenuePerSession)}</div>
              </div>
            </div>
          </div>

          {timeSeries.length > 1 && (
            <div style={{ marginTop: "14px" }}>
              <TimeSeriesChart
                title={t("adminRevenue.revenueTrend")}
                description={t("adminRevenue.revenueTrendDescription")}
                yAxisLabel="TL"
                xAxisLabel={t("adminDashboard.dateAxis")}
                xAxisNote={t("adminDashboard.dateAxisNote")}
                labels={timeSeries.map((row) => row.dateLabel)}
                series={[
                  {
                    name: t("adminRevenue.revenueSeries"),
                    color: "#1F5E4D",
                    data: timeSeries.map((row) => row.revenue),
                  },
                ]}
                valueFormatter={(value) => formatMoney(value)}
              />
            </div>
          )}

          <div className="admin-card admin-table" style={styles.tableWrap}>
            <div style={styles.tableGlow} aria-hidden="true" />
            <div style={styles.tableInner}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>{t("adminRevenue.station")}</th>
                    <th style={{ ...styles.th, ...styles.right }}>{t("adminRevenue.revenue")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td style={styles.td} colSpan={2}>
                        {t("adminRevenue.noSessions")}
                      </td>
                    </tr>
                  )}
                  {rows.map((row) => (
                    <tr key={row.stationId} className="admin-row">
                      <td style={styles.td}>{row.stationName}</td>
                      <td style={{ ...styles.td, ...styles.right }}>
                        {formatMoney(row.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {insights && (
            <div className="admin-report-split" style={styles.splitGrid}>
              <div className="admin-card admin-table" style={styles.tableWrap}>
                <div style={styles.tableGlow} aria-hidden="true" />
                <div style={styles.tableInner}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Peak hour</th>
                        <th style={{ ...styles.th, ...styles.right }}>Sessions</th>
                        <th style={{ ...styles.th, ...styles.right }}>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insights.peakHours.map((row) => (
                        <tr key={row.hourLabel} className="admin-row">
                          <td style={styles.td}>{row.hourLabel}</td>
                          <td style={{ ...styles.td, ...styles.right }}>{row.sessionCount}</td>
                          <td style={{ ...styles.td, ...styles.right }}>{formatMoney(row.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="admin-card admin-table" style={styles.tableWrap}>
                <div style={styles.tableGlow} aria-hidden="true" />
                <div style={styles.tableInner}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>User activity</th>
                        <th style={{ ...styles.th, ...styles.right }}>Vehicles</th>
                        <th style={{ ...styles.th, ...styles.right }}>Reservations</th>
                        <th style={{ ...styles.th, ...styles.right }}>Sessions</th>
                        <th style={{ ...styles.th, ...styles.right }}>Cancelled</th>
                        <th style={{ ...styles.th, ...styles.right }}>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insights.userActivity.map((row) => (
                        <tr key={row.userId} className="admin-row">
                          <td style={styles.td}>{row.displayName}</td>
                          <td style={{ ...styles.td, ...styles.right }}>{row.vehicleCount}</td>
                          <td style={{ ...styles.td, ...styles.right }}>{row.reservationCount}</td>
                          <td style={{ ...styles.td, ...styles.right }}>{row.chargingSessionCount}</td>
                          <td style={{ ...styles.td, ...styles.right }}>{row.cancelledReservationCount}</td>
                          <td style={{ ...styles.td, ...styles.right }}>{formatMoney(row.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <style>{`
            .admin-card:hover {
              transform: translateY(-1px);
              border-color: rgba(31, 94, 77, 0.24);
              box-shadow: 0 22px 62px rgba(23,35,31,0.12);
            }

            .admin-table .admin-row:hover td {
              background: linear-gradient(90deg, rgba(169,216,105,0.16), rgba(255,255,255,0.82));
            }

            @media (max-width: 1100px) {
              .admin-report-split {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>
        </>
      )}
    </div>
  );
}
