import { useEffect, useState } from "react";
import { DirectionsRenderer, GoogleMap, Marker } from "@react-google-maps/api";
import type { Station } from "../../models/Station";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  FOCUSED_MAP_ZOOM,
  MAP_CONTAINER_STYLE,
  MAP_OPTIONS,
  USER_MARKER_COLOR,
} from "../../constants/mapConstants";
import { useGoogleMapsLoader } from "../../services/maps/googleMapsLoader";
import type { UserCoordinates } from "../../services/maps/locationService";
import StationMarkers from "./StationMarkers";

interface MapViewProps {
  userLocation: UserCoordinates;
  stations: Station[];
  selectedStationId: string | null;
  directionsResult: google.maps.DirectionsResult | null;
  onSelectStation: (station: Station) => void;
}

function getUserMarkerIcon(): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: USER_MARKER_COLOR,
    fillOpacity: 1,
    strokeColor: "#FFFFFF",
    strokeWeight: 3,
    scale: 9,
  };
}

function MapView({
  userLocation,
  stations,
  selectedStationId,
  directionsResult,
  onSelectStation,
}: MapViewProps) {
  const { isLoaded } = useGoogleMapsLoader();
  const [map, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    if (!map) {
      return;
    }

    map.panTo(userLocation);
    map.setZoom(FOCUSED_MAP_ZOOM);
  }, [map, userLocation]);

  useEffect(() => {
    if (!map || !selectedStationId) {
      return;
    }

    const station = stations.find((candidate) => candidate.id === selectedStationId);
    if (!station) {
      return;
    }

    map.panTo({ lat: station.latitude, lng: station.longitude });
    map.setZoom(FOCUSED_MAP_ZOOM);
  }, [map, selectedStationId, stations]);

  const handleMapLoad = (instance: google.maps.Map) => {
    setMap(instance);
  };

  const handleSelectStation = (station: Station) => {
    onSelectStation(station);

    if (!map) {
      return;
    }

    map.panTo({ lat: station.latitude, lng: station.longitude });
    map.setZoom(FOCUSED_MAP_ZOOM);
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <GoogleMap
      onLoad={handleMapLoad}
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={userLocation ?? DEFAULT_MAP_CENTER}
      zoom={DEFAULT_MAP_ZOOM}
      options={MAP_OPTIONS}
    >
      <Marker
        position={userLocation}
        title="Guncel konumunuz"
        icon={getUserMarkerIcon()}
      />

      <StationMarkers
        stations={stations}
        selectedStationId={selectedStationId}
        onSelectStation={handleSelectStation}
      />

      {directionsResult && (
        <DirectionsRenderer
          directions={directionsResult}
          options={{
            preserveViewport: false,
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: "#24705B",
              strokeOpacity: 0.9,
              strokeWeight: 6,
            },
          }}
        />
      )}
    </GoogleMap>
  );
}

export default MapView;
