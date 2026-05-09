import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { fetchStationStatistics } from "../../services/firebase/adminReportsService";
import { GoogleMap } from "@react-google-maps/api";
import StationMarkers from "../../components/Map/StationMarkers";
import { useGoogleMapsLoader } from "../../services/maps/googleMapsLoader";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, MAP_CONTAINER_STYLE, MAP_OPTIONS } from "../../constants/mapConstants";
import type { Station } from "../../models/Station";
import { getStationsWithChargers } from "../../services/firebase/stationService";

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
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
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
    fontSize: "20px",
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
  tableInner: { position: "relative", zIndex: 1 },
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
  loading: {
    marginTop: "14px",
    borderRadius: "16px",
    padding: "12px 14px",
    border: "1px solid rgba(31, 94, 77, 0.16)",
    backgroundColor: "rgba(255,255,255,0.7)",
    fontWeight: 800,
    color: "#37594D",
  },
  mapWrap: {
    marginTop: "14px",
    borderRadius: "18px",
    overflow: "hidden",
    border: "1px solid rgba(31, 94, 77, 0.16)",
    backgroundColor: "rgba(255,255,255,0.86)",
    boxShadow: "0 18px 52px rgba(23,35,31,0.06)",
    transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
    position: "relative",
  },
  mapGlow: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 12% 18%, rgba(169,216,105,0.14), transparent 55%), radial-gradient(circle at 92% 18%, rgba(31,94,77,0.10), transparent 60%)",
    pointerEvents: "none",
    opacity: 0.9,
  },
  mapInnerWrap: { position: "relative", zIndex: 1, height: "100%" },
  mapInner: {
    height: "340px",
  },
  stationDetail: {
    marginTop: "12px",
    borderRadius: "18px",
    border: "1px solid rgba(31, 94, 77, 0.16)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(250,253,250,0.92) 100%)",
    boxShadow: "0 18px 52px rgba(23,35,31,0.08)",
    padding: "14px",
    transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
  },
  stationTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 950,
    color: "#10352E",
    letterSpacing: "-0.01em",
  },
  stationMeta: {
    marginTop: "6px",
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "10px",
  },
  metaItem: {
    borderRadius: "14px",
    border: "1px solid rgba(31, 94, 77, 0.16)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(250,253,250,0.74) 100%)",
    padding: "10px 10px",
    boxShadow: "0 16px 40px rgba(23,35,31,0.06)",
    position: "relative",
    overflow: "hidden",
  },
  metaGlow: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 30% 20%, rgba(169,216,105,0.20), transparent 52%), radial-gradient(circle at 92% 50%, rgba(31,94,77,0.12), transparent 60%)",
    opacity: 0.75,
    pointerEvents: "none",
  },
  metaInner: { position: "relative", zIndex: 1 },
  metaLabel: {
    fontSize: "11px",
    fontWeight: 950,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#4B6B60",
  },
  metaValue: {
    marginTop: "6px",
    fontSize: "16px",
    fontWeight: 1000,
    color: "#10352E",
  },
};

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export default function StationStatisticsScreen() {
  const { isLoaded } = useGoogleMapsLoader();
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [stationsForMap, setStationsForMap] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    mostUsedStation: { stationId: string; stationName: string; sessionCount: number } | null;
    sessionCountByStation: Array<{ stationId: string; stationName: string; count: number }>;
    energyConsumedByStation: Array<{ stationId: string; stationName: string; energy: number }>;
    revenueByStation: Array<{ stationId: string; stationName: string; revenue: number }>;
    stationStatusSummary: { available: number; occupied: number; offline: number };
    reservationCount: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchStationStatistics()
      .then((result) => {
        if (cancelled) return;
        setData(result);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Istasyon istatistikleri alinamadi. Firestore baglantisini kontrol edin.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getStationsWithChargers()
      .then((result) => {
        if (cancelled) return;
        setStationsForMap(result);
      })
      .catch(() => {
        if (cancelled) return;
        setStationsForMap([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sessionRows = useMemo(() => data?.sessionCountByStation ?? [], [data]);
  const energyRows = useMemo(() => data?.energyConsumedByStation ?? [], [data]);
  const revenueRows = useMemo(() => data?.revenueByStation ?? [], [data]);
  const selectedStation = useMemo(
    () => stationsForMap.find((s) => s.id === selectedStationId) ?? null,
    [stationsForMap, selectedStationId],
  );
  const selectedStats = useMemo(() => {
    if (!selectedStationId) return null;
    const sessions = sessionRows.find((r) => r.stationId === selectedStationId)?.count ?? 0;
    const energy = energyRows.find((r) => r.stationId === selectedStationId)?.energy ?? 0;
    const revenue = revenueRows.find((r) => r.stationId === selectedStationId)?.revenue ?? 0;
    return { sessions, energy, revenue };
  }, [selectedStationId, sessionRows, energyRows, revenueRows]);

  return (
    <div>
      <h2 style={styles.title}>Istasyon Istatistikleri</h2>
      <p style={styles.subtitle}>
        Istasyonlarin kullanim yogunlugunu, sarj oturumu sayisini ve tuketilen enerjiyi istasyon
        bazinda goruntuleyin.
      </p>

      {loading && <div style={styles.loading}>Yukleniyor...</div>}
      {!loading && error && <div style={styles.loading}>{error}</div>}

      {!loading && data && (
        <>
          <div className="admin-station-grid" style={styles.grid}>
            <div className="admin-card" style={styles.card}>
              <div style={styles.cardGlow} aria-hidden="true" />
              <div style={styles.cardInner}>
                <div style={styles.label}>Most used station</div>
                <div style={styles.value}>
                  {data.mostUsedStation
                    ? `${data.mostUsedStation.stationName} (${data.mostUsedStation.sessionCount})`
                    : "--"}
                </div>
              </div>
            </div>
            <div className="admin-card" style={styles.card}>
              <div style={styles.cardGlow} aria-hidden="true" />
              <div style={styles.cardInner}>
                <div style={styles.label}>Station status summary</div>
                <div style={styles.value}>
                  {data.stationStatusSummary.available} uygun - {data.stationStatusSummary.occupied} dolu -{" "}
                  {data.stationStatusSummary.offline} offline
                </div>
              </div>
            </div>
            <div className="admin-card" style={styles.card}>
              <div style={styles.cardGlow} aria-hidden="true" />
              <div style={styles.cardInner}>
                <div style={styles.label}>Total reservations</div>
                <div style={styles.value}>{data.reservationCount}</div>
              </div>
            </div>
          </div>

          <div className="admin-card admin-table" style={styles.tableWrap}>
            <div style={styles.tableGlow} aria-hidden="true" />
            <div style={styles.tableInner}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Station</th>
                    <th style={{ ...styles.th, ...styles.right }}>Session count</th>
                    <th style={{ ...styles.th, ...styles.right }}>Energy (kWh)</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionRows.length === 0 && energyRows.length === 0 && (
                    <tr>
                      <td style={styles.td} colSpan={3}>
                        Henuz veri yok.
                      </td>
                    </tr>
                  )}
                  {Array.from(
                    new Set([
                      ...sessionRows.map((r) => r.stationId),
                      ...energyRows.map((r) => r.stationId),
                    ]),
                  ).map((stationId) => {
                    const session = sessionRows.find((r) => r.stationId === stationId);
                    const energy = energyRows.find((r) => r.stationId === stationId);
                    const stationName = session?.stationName ?? energy?.stationName ?? stationId;
                    return (
                      <tr key={stationId} className="admin-row">
                        <td style={styles.td}>{stationName}</td>
                        <td style={{ ...styles.td, ...styles.right }}>{session?.count ?? 0}</td>
                        <td style={{ ...styles.td, ...styles.right }}>
                          {round2(energy?.energy ?? 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="admin-card" style={styles.mapWrap}>
            <div style={styles.mapGlow} aria-hidden="true" />
            <div style={styles.mapInnerWrap}>
              <div style={styles.mapInner}>
                {isLoaded && (
                  <GoogleMap
                    mapContainerStyle={MAP_CONTAINER_STYLE}
                    center={DEFAULT_MAP_CENTER}
                    zoom={DEFAULT_MAP_ZOOM}
                    options={MAP_OPTIONS}
                  >
                    <StationMarkers
                      stations={stationsForMap}
                      selectedStationId={selectedStationId}
                      onSelectStation={(station) => setSelectedStationId(station.id)}
                    />
                  </GoogleMap>
                )}
              </div>
            </div>
          </div>

          {selectedStation && selectedStats && (
            <div className="admin-card" style={styles.stationDetail}>
              <h3 style={styles.stationTitle}>{selectedStation.name}</h3>
              <div style={styles.stationMeta}>
                <div style={styles.metaItem}>
                  <div style={styles.metaGlow} aria-hidden="true" />
                  <div style={styles.metaInner}>
                    <div style={styles.metaLabel}>Session count</div>
                    <div style={styles.metaValue}>{selectedStats.sessions}</div>
                  </div>
                </div>
                <div style={styles.metaItem}>
                  <div style={styles.metaGlow} aria-hidden="true" />
                  <div style={styles.metaInner}>
                    <div style={styles.metaLabel}>Energy (kWh)</div>
                    <div style={styles.metaValue}>{round2(selectedStats.energy)}</div>
                  </div>
                </div>
                <div style={styles.metaItem}>
                  <div style={styles.metaGlow} aria-hidden="true" />
                  <div style={styles.metaInner}>
                    <div style={styles.metaLabel}>Revenue (TL)</div>
                    <div style={styles.metaValue}>{round2(selectedStats.revenue)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        @media (max-width: 980px) {
          .admin-station-grid {
            grid-template-columns: 1fr;
          }
        }

        .admin-card:hover {
          transform: translateY(-1px);
          border-color: rgba(31, 94, 77, 0.24);
          box-shadow: 0 22px 62px rgba(23,35,31,0.12);
        }

        .admin-table .admin-row:hover td {
          background: linear-gradient(90deg, rgba(169,216,105,0.16), rgba(255,255,255,0.82));
        }
      `}</style>
    </div>
  );
}
