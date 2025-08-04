export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  // Validate input parameters
  if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || 
      typeof lat2 !== 'number' || typeof lon2 !== 'number' ||
      isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    throw new Error('Invalid coordinates provided to calculateDistance');
  }

  // Validate coordinate ranges
  if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90) {
    throw new Error('Latitude must be between -90 and 90 degrees');
  }
  if (lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) {
    throw new Error('Longitude must be between -180 and 180 degrees');
  }

  // Convert latitude and longitude to radians
  const lat1Rad = lat1 * Math.PI / 180;
  const lon1Rad = lon1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const lon2Rad = lon2 * Math.PI / 180;
  
  // Calculate differences
  const dLat = lat2Rad - lat1Rad;
  const dLon = lon2Rad - lon1Rad;
  
  // Haversine formula (correct implementation)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Earth's radius in kilometers
  const R = 6371;
  
  // Calculate distance
  const distance = R * c;
  
  // Round to 2 decimal places and ensure it's not negative
  return Math.max(0, Math.round(distance * 100) / 100);
}

export function formatDistance(distance: number): string {
  if (distance < 1) {
    // Convert to meters and round to nearest meter
    const meters = Math.round(distance * 1000);
    return `${meters} m`;
  } else {
    // Show in kilometers with 1 decimal place
    return `${distance.toFixed(1)} km`;
  }
}

// Alternative simpler distance calculation using Math.hypot
export function calculateDistanceSimple(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  // Convert to approximate km (1 degree ≈ 111 km)
  const latDiff = (lat2 - lat1) * 111;
  const lonDiff = (lon2 - lon1) * 111 * Math.cos((lat1 + lat2) / 2 * Math.PI / 180);
  
  // Use Math.hypot for better precision
  const distance = Math.hypot(latDiff, lonDiff);
  
  // Round to 2 decimal places
  return Math.round(distance * 100) / 100;
}

export function parseLocationString(locationString: string): { latitude: number; longitude: number } | null {
  if (!locationString) return null;
  
  // Handle format "(longitude,latitude)"
  const match = locationString.match(/\(([^,]+),([^)]+)\)/);
  if (match) {
    return {
      longitude: parseFloat(match[1]),
      latitude: parseFloat(match[2])
    };
  }
  
  return null;
}

export function calculateDistanceFromLocations(
  location1: { latitude: number; longitude: number } | string | null,
  location2: { latitude: number; longitude: number } | string | null
): number | null {
  if (!location1 || !location2) return null;
  
  let lat1: number, lon1: number, lat2: number, lon2: number;
  
  // Parse location1
  if (typeof location1 === 'string') {
    const parsed1 = parseLocationString(location1);
    if (!parsed1) return null;
    lat1 = parsed1.latitude;
    lon1 = parsed1.longitude;
  } else {
    lat1 = location1.latitude;
    lon1 = location1.longitude;
  }
  
  // Parse location2
  if (typeof location2 === 'string') {
    const parsed2 = parseLocationString(location2);
    if (!parsed2) return null;
    lat2 = parsed2.latitude;
    lon2 = parsed2.longitude;
  } else {
    lat2 = location2.latitude;
    lon2 = location2.longitude;
  }
  
  return calculateDistance(lat1, lon1, lat2, lon2);
} 