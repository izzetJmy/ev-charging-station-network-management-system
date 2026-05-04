import { type CSSProperties, useEffect, useState } from "react";
import {
  fetchAdminDashboardMetrics,
  fetchAdminTimeSeries,
} from "../../services/firebase/adminReportsService";
import TimeSeriesChart from "../../components/charts/TimeSeriesChart";

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
  grid: {
    marginTop: "14px",
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
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
  hint: {
    marginTop: "6px",
    fontSize: "12px",
    fontWeight: 800,
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
  chartWrap: {
    marginTop: "14px",
  },
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function AdminDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<{
    totalReservations: number;
    totalChargingSessions: number;
    totalRevenue: number;
    totalEnergyConsumed: number;
  } | null>(null);
  const [series, setSeries] = useState<
    Array<{
      dateLabel: string;
      reservations: number;
      sessions: number;
    }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([fetchAdminDashboardMetrics(), fetchAdminTimeSeries(14)])
      .then(([data, timeSeries]) => {
        if (cancelled) return;
        setMetrics(data);
        setSeries(
          timeSeries.map((row) => ({
            dateLabel: row.dateLabel,
            reservations: row.reservations,
            sessions: row.sessions,
          })),
        );
      })
      .catch(() => {
        if (cancelled) return;
        setError("Özet metrikler alınamadı. Firestore bağlantısını kontrol edin.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h2 style={styles.title}>Genel Özet</h2>
      <p style={styles.subtitle}>
        Firestore verilerine göre rezervasyon ve tamamlanan şarj oturumlarının genel durumunu
        görüntüleyin.
      </p>

      {loading && <div style={styles.loading}>Yükleniyor…</div>}
      {!loading && error && <div style={styles.loading}>{error}</div>}

      {!loading && metrics && (
        <>
          <div className="admin-grid" style={styles.grid}>
            <div className="admin-card" style={styles.card}>
              <div style={styles.cardGlow} aria-hidden="true" />
              <div style={styles.cardInner}>
                <div style={styles.label}>Total Reservations</div>
                <div style={styles.value}>{metrics.totalReservations}</div>
                <div style={styles.hint}>reservations</div>
              </div>
            </div>
            <div className="admin-card" style={styles.card}>
              <div style={styles.cardGlow} aria-hidden="true" />
              <div style={styles.cardInner}>
                <div style={styles.label}>Total Charging Sessions</div>
                <div style={styles.value}>{metrics.totalChargingSessions}</div>
                <div style={styles.hint}>chargingSessions</div>
              </div>
            </div>
            <div className="admin-card" style={styles.card}>
              <div style={styles.cardGlow} aria-hidden="true" />
              <div style={styles.cardInner}>
                <div style={styles.label}>Total Revenue</div>
                <div style={styles.value}>{formatMoney(metrics.totalRevenue)}</div>
                <div style={styles.hint}>Toplam gelir</div>
              </div>
            </div>
            <div className="admin-card" style={styles.card}>
              <div style={styles.cardGlow} aria-hidden="true" />
              <div style={styles.cardInner}>
                <div style={styles.label}>Total Energy Consumed</div>
                <div style={styles.value}>{metrics.totalEnergyConsumed} kWh</div>
                <div style={styles.hint}>Toplam tüketim</div>
              </div>
            </div>
          </div>

          {series.length > 1 && (
            <div style={styles.chartWrap}>
              <TimeSeriesChart
                title="Kullanım Trendi"
                description="Son 14 gün rezervasyon ve şarj oturumu sayısı."
                yAxisLabel="Adet"
                xAxisLabel="Tarih"
                xAxisNote="X ekseni: Tarih (gg.aa)"
                labels={series.map((row) => row.dateLabel)}
                series={[
                  {
                    name: "Rezervasyon",
                    color: "#A9D869",
                    data: series.map((row) => row.reservations),
                  },
                  {
                    name: "Şarj oturumu",
                    color: "#1F5E4D",
                    data: series.map((row) => row.sessions),
                  },
                ]}
                valueFormatter={(value) => `${value} adet`}
              />
            </div>
          )}
        </>
      )}

      <style>{`
        @media (max-width: 980px) {
          .admin-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 520px) {
          .admin-grid {
            grid-template-columns: 1fr;
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
