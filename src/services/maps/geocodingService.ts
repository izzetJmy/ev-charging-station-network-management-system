import type { UserCoordinates } from "./locationService";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GeocodeResult {
  formatted_address: string;
  address_components: AddressComponent[];
  types: string[];
}

interface GeocodeResponse {
  status: string;
  results: GeocodeResult[];
}

function pickComponent(components: AddressComponent[], type: string) {
  return components.find((component) => component.types.includes(type)) ?? null;
}

function formatDistrictCity(components: AddressComponent[]) {
  const district =
    pickComponent(components, "administrative_area_level_2") ??
    pickComponent(components, "sublocality") ??
    pickComponent(components, "locality");

  const city =
    pickComponent(components, "administrative_area_level_1") ??
    pickComponent(components, "locality");

  const districtName = district?.long_name?.trim() ?? "";
  const cityName = city?.long_name?.trim() ?? "";

  if (districtName && cityName && districtName !== cityName) {
    return `${districtName}, ${cityName}`;
  }

  return districtName || cityName || "";
}

export interface ReverseGeocodeResult {
  label: string;
  fullAddress: string;
}

export async function reverseGeocodeCoordinates(
  coords: UserCoordinates,
): Promise<ReverseGeocodeResult | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    return null;
  }

  const params = new URLSearchParams({
    latlng: `${coords.lat},${coords.lng}`,
    key: GOOGLE_MAPS_API_KEY,
    language: "tr",
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as GeocodeResponse;
  if (data.status !== "OK" || !data.results?.length) {
    return null;
  }

  const best = data.results[0];
  const label = formatDistrictCity(best.address_components) || best.formatted_address;

  return {
    label,
    fullAddress: best.formatted_address,
  };
}

