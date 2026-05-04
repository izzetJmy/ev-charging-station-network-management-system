import mockStations from "../data/mockStations";

const PRIORITY = ["CCS2", "Type 2", "CHAdeMO", "Tesla"] as const;

export const CONNECTOR_TYPE_OPTIONS = (() => {
  const seen = new Set<string>();

  for (const station of mockStations) {
    for (const charger of station.chargers ?? []) {
      if (charger?.connectorType) seen.add(charger.connectorType);
    }
  }

  const all = Array.from(seen);

  all.sort((a, b) => {
    const ai = PRIORITY.indexOf(a as (typeof PRIORITY)[number]);
    const bi = PRIORITY.indexOf(b as (typeof PRIORITY)[number]);
    const ap = ai === -1 ? Number.POSITIVE_INFINITY : ai;
    const bp = bi === -1 ? Number.POSITIVE_INFINITY : bi;
    if (ap !== bp) return ap - bp;
    return a.localeCompare(b, "tr");
  });

  return all;
})();

