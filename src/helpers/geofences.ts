import axios from "axios";

const RADAR_API_KEY = process.env.RADAR_SECRET_KEY || "";
const RADAR_BASE_URL = "https://api.radar.io/v1";

if (!RADAR_API_KEY) {
  throw new Error("RADAR_SECRET_KEY is required");
}

export async function calculateDistance(
  userLat: number,
  userLng: number,
  workLat: number,
  workLng: number
): Promise<{ distance: number }> {
  try {
    if (!validateCoordinates(userLat, userLng) || !validateCoordinates(workLat, workLng)) {
      throw new Error("Invalid coordinates provided");
    }

    const response = await axios.get(`${RADAR_BASE_URL}/route/distance`, {
      params: {
        origin: `${userLat},${userLng}`,
        destination: `${workLat},${workLng}`,
        modes: "car",
        units: "metric"
      },
      headers: {
        Authorization: RADAR_API_KEY,
        "Content-Type": "application/json"
      }
    });

    const geodesic = response.data?.routes?.geodesic;

    if (geodesic && geodesic.distance?.value) {
      return {
        distance: geodesic.distance.value
      };
    }

    return {
      distance: calculateStraightLineDistance(userLat, userLng, workLat, workLng)
    };
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error("Status:", error.response?.status);
      console.error("Headers:", error.response?.headers);
      console.error("Data:", error.response?.data);
    }

    return {
      distance: calculateStraightLineDistance(userLat, userLng, workLat, workLng)
    };
  }
}

/**
 * Alternative: Menggunakan Radar.io Geocoding API untuk mendapatkan distance
 */
export async function calculateDistanceAlternative(
  userLat: number,
  userLng: number,
  workLat: number,
  workLng: number
): Promise<{ distance: number; duration?: number }> {
  try {
    // Menggunakan search endpoint sebagai alternatif
    const response = await axios.get(
      `${RADAR_BASE_URL}/search/places`,
      {
        params: {
          near: `${userLat},${userLng}`,
          radius: 50000, // 50km radius
          limit: 1
        },
        headers: {
          Authorization: RADAR_API_KEY
        }
      }
    );

    return {
      distance: calculateStraightLineDistance(userLat, userLng, workLat, workLng)
    };
  } catch (error) {
    console.error("Alternative API error:", error);
    return {
      distance: calculateStraightLineDistance(userLat, userLng, workLat, workLng)
    };
  }
}

/**
 * Hitung straight-line distance dengan rumus Haversine.
 */
export function calculateStraightLineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Radius bumi (meter)
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Validasi koordinat.
 */
export function validateCoordinates(lat: number, lng: number): boolean {
  return (
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    !isNaN(lat) && !isNaN(lng)
  );
}

/**
 * Test function untuk debugging
 */
export async function testRadarConnection(): Promise<void> {
  try {
    const response = await axios.get(
      `${RADAR_BASE_URL}/search/places`,
      {
        params: {
          near: "-6.2088,106.8456", // Jakarta coordinates
          radius: 1000,
          limit: 1
        },
        headers: {
          Authorization: RADAR_API_KEY
        }
      }
    );

  } catch (error: any) {
    console.error("Connection test failed:", error.response?.data || error.message);
  }
}

/**
 * Membuat geofence (opsional).
 */
export async function createGeofence(
  locationId: string,
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<boolean> {
  try {
    await axios.post(
      `${RADAR_BASE_URL}/geofences`,
      {
        _id: locationId,
        description: `Work Location - ${locationId}`,
        tag: "work-location",
        type: "circle",
        coordinates: [lng, lat],
        radiusMeters
      },
      {
        headers: {
          Authorization: RADAR_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );
    return true;
  } catch (error) {
    console.error("Failed to create geofence:", error);
    return false;
  }
}