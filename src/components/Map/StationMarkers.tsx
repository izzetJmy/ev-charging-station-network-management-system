import { Marker } from "@react-google-maps/api";
import type { Station } from "../../models/Station";
import { STATION_STATUS_COLORS } from "../../constants/mapConstants";

interface StationMarkersProps {
  stations: Station[];
  selectedStationId: string | null;
  onSelectStation: (station: Station) => void;
}

function getStationMarkerIcon(
  color: string,
  isSelected: boolean,
): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#FFFFFF",
    strokeWeight: isSelected ? 3 : 2,
    scale: isSelected ? 10 : 8,
  };
}

function StationMarkers({
  stations,
  selectedStationId,
  onSelectStation,
}: StationMarkersProps) {
  return (
    <>
      {stations.map((station) => {
        const isSelected = station.id === selectedStationId;

        return (
          <Marker
            key={station.id}
            position={{ lat: station.latitude, lng: station.longitude }}
            title={station.name}
            onClick={() => onSelectStation(station)}
            animation={
              isSelected ? google.maps.Animation.BOUNCE : undefined
            }
            icon={getStationMarkerIcon(
              STATION_STATUS_COLORS[station.status],
              isSelected,
            )}
          />
        );
      })}
    </>
  );
}

export default StationMarkers;
