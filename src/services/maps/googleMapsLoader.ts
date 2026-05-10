import { useMemo } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { GOOGLE_MAPS_LIBRARIES } from "../../constants/mapConstants";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();

export function useGoogleMapsLoader() {
  const isApiKeyMissing = !GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    id: "ev-network-google-map",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY ?? "",
    libraries: GOOGLE_MAPS_LIBRARIES,
    preventGoogleFontsLoading: true,
  });

  const errorMessage = useMemo(() => {
    if (isApiKeyMissing) {
      return "VITE_GOOGLE_MAPS_API_KEY must be defined in the .env file to display Google Maps.";
    }

    if (loadError) {
      return "An error occurred while loading Google Maps.";
    }

    return "";
  }, [isApiKeyMissing, loadError]);

  return {
    isLoaded: !isApiKeyMissing && isLoaded,
    isLoading: !isApiKeyMissing && !isLoaded && !loadError,
    errorMessage,
  };
}
