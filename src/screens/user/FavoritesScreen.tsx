import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Station } from "../../models/Station";
import { getOrCreateLocalUserId } from "../../services/auth/localUser";
import { getStationsWithChargers } from "../../services/firebase/stationService";
import { removeFavoriteStation } from "../../services/firebase/favoriteService";
import { useFavoriteStations } from "../../hooks/useFavoriteStations";

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#F6F8F4",
    backgroundImage:
      "linear-gradient(90deg, rgba(21, 101, 87, 0.07) 1px, transparent 1px), linear-gradient(180deg, rgba(21, 101, 87, 0.06) 1px, transparent 1px), linear-gradient(135deg, #F6F8F4 0%, #ECF5EE 48%, #F9FBF6 100%)",
    backgroundSize: "34px 34px, 34px 34px, 100% 100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 18px",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#17231F",
    boxSizing: "border-box",
  },
  shell: {
    width: "min(980px, 100%)",
    borderRadius: "28px",
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    border: "1px solid rgba(31, 94, 77, 0.16)",
    boxShadow:
      "0 24px 80px rgba(28, 74, 61, 0.16), 0 4px 18px rgba(23, 35, 31, 0.06)",
  },
  header: {
    padding: "28px 30px",
    background:
      "linear-gradient(155deg, #10352E 0%, #1F5E4D 48%, #A9D869 140%)",
    color: "#FFFFFF",
  },
  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 12px",
    borderRadius: "999px",
    backgroundColor: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.22)",
    fontSize: "12px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  signalDot: {
    width: "8px",
    height: "8px",
    borderRadius: "999px",
    backgroundColor: "#B8F061",
    boxShadow: "0 0 16px rgba(184,240,97,0.9)",
  },
  title: {
    margin: "18px 0 8px",
    fontSize: "34px",
    fontWeight: 900,
  },
  subtitle: {
    margin: 0,
    maxWidth: "560px",
    color: "rgba(255,255,255,0.78)",
    fontSize: "14px",
    lineHeight: 1.7,
  },
  body: {
    padding: "26px 30px 30px",
  },
  list: {
    display: "grid",
    gap: "12px",
  },
  card: {
    borderRadius: "18px",
    border: "1px solid #DCE8DF",
    backgroundColor: "#FFFFFF",
    padding: "14px",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "14px",
    alignItems: "center",
    boxShadow: "0 12px 28px rgba(31,94,77,0.06)",
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  heart: {
    color: "#C94A3B",
    fontSize: "20px",
    lineHeight: 1,
  },
  stationName: {
    margin: 0,
    color: "#17231F",
    fontSize: "16px",
    fontWeight: 950,
  },
  meta: {
    marginTop: "6px",
    color: "#66756E",
    fontSize: "13px",
    lineHeight: 1.55,
    fontWeight: 700,
  },
  actions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  primaryButton: {
    minHeight: "44px",
    padding: "10px 14px",
    background: "linear-gradient(135deg, #173C34 0%, #24705B 100%)",
    border: "none",
    borderRadius: "14px",
    color: "#FFFFFF",
    fontSize: "13px",
    fontWeight: 900,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  secondaryButton: {
    minHeight: "44px",
    padding: "10px 14px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #AFCDBB",
    borderRadius: "14px",
    color: "#1F5E4D",
    fontSize: "13px",
    fontWeight: 900,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  empty: {
    borderRadius: "18px",
    border: "1px dashed #AFCDBB",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(239,247,240,0.92))",
    padding: "18px",
    color: "#66756E",
    fontSize: "14px",
    lineHeight: 1.7,
    textAlign: "center",
  },
  message: {
    marginBottom: "14px",
    padding: "12px 14px",
    borderRadius: "14px",
    backgroundColor: "#FFF3F1",
    border: "1px solid #F4B8AE",
    color: "#A63E30",
    fontSize: "13px",
    lineHeight: 1.55,
  },
  footer: {
    marginTop: "16px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
  },
};

function FavoritesScreen() {
  const navigate = useNavigate();
  const userId = useMemo(() => getOrCreateLocalUserId(), []);
  const { favorites, loading, error } = useFavoriteStations(userId);
  const [stations, setStations] = useState<Station[]>([]);
  const [stationsError, setStationsError] = useState("");
  const [removingStationId, setRemovingStationId] = useState("");

  useEffect(() => {
    let cancelled = false;

    getStationsWithChargers()
      .then((result) => {
        if (cancelled) return;
        setStations(result);
      })
      .catch(() => {
        if (cancelled) return;
        setStationsError("Istasyon verileri alinamadi.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stationsById = useMemo(() => {
    const map: Record<string, Station> = {};
    stations.forEach((station) => {
      map[station.id] = station;
    });
    return map;
  }, [stations]);

  const handleOpenStation = (stationId: string) => {
    navigate("/station-map", { state: { stationId } });
  };

  const handleRemove = async (stationId: string) => {
    setRemovingStationId(stationId);

    try {
      await removeFavoriteStation(userId, stationId);
    } finally {
      setRemovingStationId("");
    }
  };

  return (
    <div style={styles.page}>
      <main style={styles.shell}>
        <header style={styles.header}>
          <div style={styles.eyebrow}>
            <span style={styles.signalDot} />
            EV Network
          </div>
          <h1 style={styles.title}>Favorite Stations</h1>
          <p style={styles.subtitle}>
            Favori istasyonlariniz burada listelenir. Bir istasyonu actiginizda
            haritada secili olarak gorunur.
          </p>
        </header>

        <section style={styles.body}>
          {(error || stationsError) && (
            <div style={styles.message}>{error || stationsError}</div>
          )}

          {!loading && favorites.length === 0 && (
            <div style={styles.empty}>
              Henuz favori istasyon yok. Haritadan kalp ikonuna basarak favori
              ekleyebilirsiniz.
            </div>
          )}

          <div style={styles.list}>
            {favorites.map((favorite) => {
              const station = stationsById[favorite.stationId] ?? null;
              const stationName = station?.name ?? favorite.stationName;

              return (
                <article key={favorite.stationId} style={styles.card}>
                  <div>
                    <div style={styles.titleRow}>
                      <span style={styles.heart}>♥</span>
                      <h2 style={styles.stationName}>{stationName}</h2>
                    </div>
                    <div style={styles.meta}>
                      {station?.address ?? "Station detail bekleniyor"}
                      <br />
                      Durum: {station?.status ?? "--"} · Charger:{" "}
                      {station?.chargers.length ?? "--"}
                    </div>
                  </div>

                  <div style={styles.actions}>
                    <button
                      type="button"
                      style={styles.primaryButton}
                      onClick={() => handleOpenStation(favorite.stationId)}
                    >
                      Haritada Ac
                    </button>
                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={() => void handleRemove(favorite.stationId)}
                      disabled={removingStationId === favorite.stationId}
                    >
                      Favoriden Cikar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div style={styles.footer}>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => navigate("/station-map")}
            >
              Haritaya Don
            </button>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => navigate("/app")}
            >
              Kayitli Araclar
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default FavoritesScreen;
