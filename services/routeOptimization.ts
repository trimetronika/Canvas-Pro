import { CanvasStop, GeoLocation } from "../types";

// Konversi derajat ke radian
const deg2rad = (deg: number) => {
  return deg * (Math.PI / 180);
};

// Menghitung jarak Haversine (km)
export const calculateDistance = (p1: GeoLocation, p2: GeoLocation): number => {
  const R = 6371; // Radius bumi km
  const dLat = deg2rad(p2.lat - p1.lat);
  const dLng = deg2rad(p2.lng - p1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(p1.lat)) * Math.cos(deg2rad(p2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Menghitung total jarak rute dalam KM
 */
export const calculateTotalRouteDistance = (start: GeoLocation, stops: CanvasStop[], returnToStart: boolean = false): number => {
  if (stops.length === 0) return 0;
  
  let totalDist = 0;
  let current = start;

  // Jarak dari Start ke titik pertama
  // Dan titik ke titik berikutnya
  stops.forEach(stop => {
    if (stop.lat && stop.lng) {
      const stopLoc = { lat: stop.lat, lng: stop.lng };
      totalDist += calculateDistance(current, stopLoc);
      current = stopLoc;
    }
  });

  // Jika Round Trip, hitung jarak dari titik terakhir kembali ke Start
  if (returnToStart) {
    totalDist += calculateDistance(current, start);
  }

  return parseFloat(totalDist.toFixed(2));
};

/**
 * ALGORITMA TSP HYBRID:
 * 1. Nearest Neighbor (Inisialisasi Cepat)
 * 2. 2-Opt Local Search (Refinement untuk menghilangkan jalur menyilang)
 */
export const optimizeRoute = (
  startLocation: GeoLocation, 
  stops: CanvasStop[],
  returnToStart: boolean = false
): CanvasStop[] => {
  const selectedStops = stops.filter(s => s.selected);
  const unselectedStops = stops.filter(s => !s.selected);

  if (selectedStops.length <= 1) return stops;

  // 1. Siapkan data dengan koordinat valid
  // Kita pisahkan data untuk algoritma agar tidak mengotori object asli
  const validPoints = selectedStops
    .map((stop, idx) => ({
      originalIndex: idx, // Melacak posisi di array selectedStops
      lat: stop.lat,
      lng: stop.lng,
      id: stop.id
    }))
    .filter(p => p.lat !== undefined && p.lng !== undefined) as { originalIndex: number, lat: number, lng: number, id: string }[];

  const invalidPoints = selectedStops.filter(s => s.lat === undefined || s.lng === undefined);

  if (validPoints.length === 0) return stops;

  // --- PHASE 1: Nearest Neighbor Construction ---
  const tour: typeof validPoints = [];
  const visited = new Set<string>();
  let currentLoc = startLocation;

  while (tour.length < validPoints.length) {
    let nearestIdx = -1;
    let minDesc = Infinity;

    for (let i = 0; i < validPoints.length; i++) {
      if (!visited.has(validPoints[i].id)) {
        const dist = calculateDistance(currentLoc, validPoints[i]);
        if (dist < minDesc) {
          minDesc = dist;
          nearestIdx = i;
        }
      }
    }

    if (nearestIdx !== -1) {
      visited.add(validPoints[nearestIdx].id);
      tour.push(validPoints[nearestIdx]);
      currentLoc = validPoints[nearestIdx];
    } else {
      break;
    }
  }

  // --- PHASE 2: 2-Opt Optimization (Refinement) ---
  let improved = true;
  const maxIterations = 50; // Safety break
  let iter = 0;

  // Helper untuk hitung total jarak tour saat ini
  const getTourDistance = (currentTour: typeof validPoints): number => {
    if (currentTour.length === 0) return 0;
    let dist = calculateDistance(startLocation, currentTour[0]); // Start -> First
    for (let i = 0; i < currentTour.length - 1; i++) {
      dist += calculateDistance(currentTour[i], currentTour[i+1]);
    }
    if (returnToStart) {
      dist += calculateDistance(currentTour[currentTour.length - 1], startLocation); // Last -> Start
    }
    return dist;
  };

  while (improved && iter < maxIterations) {
    improved = false;
    iter++;
    
    // 2-Opt swap check
    for (let i = 0; i < tour.length - 1; i++) {
      for (let k = i + 1; k < tour.length; k++) {
        // Coba balikkan segmen dari i ke k
        const newTour = [...tour];
        // Reverse sub-array dari i ke k
        const segment = newTour.slice(i, k + 1).reverse();
        newTour.splice(i, segment.length, ...segment);

        if (getTourDistance(newTour) < getTourDistance(tour)) {
          tour.splice(0, tour.length, ...newTour); // Update tour
          improved = true;
        }
      }
    }
  }

  // --- Reconstruct Final Array ---
  const optimizedSelectedStops = tour.map(p => selectedStops[p.originalIndex]);

  // Return optimized valid stops, followed by invalid stops, followed by unselected stops
  return [...optimizedSelectedStops, ...invalidPoints, ...unselectedStops];
};

/**
 * Generate Google Maps URL
 * Supports Round Trip (Start -> A -> B -> ... -> Start)
 */
export const generateGoogleMapsUrl = (
  origin: GeoLocation, 
  stops: CanvasStop[], 
  returnToStart: boolean = false
): string => {
  const validStops = stops.filter(s => s.selected);
  if (validStops.length === 0) return '';

  // Limit stops to 9 intermediate waypoints if using origin/dest structure carefully
  // Google maps supports approx 10 points total in standard dir URLs
  const stopsToNavigate = validStops.slice(0, 9); // Safety limit

  const originStr = `${origin.lat},${origin.lng}`;
  
  // Jika Round Trip: Destinasi adalah Origin
  // Jika One Way: Destinasi adalah titik terakhir
  const destinationStr = returnToStart 
    ? originStr 
    : (stopsToNavigate[stopsToNavigate.length - 1].lat && stopsToNavigate[stopsToNavigate.length - 1].lng)
      ? `${stopsToNavigate[stopsToNavigate.length - 1].lat},${stopsToNavigate[stopsToNavigate.length - 1].lng}`
      : encodeURIComponent(stopsToNavigate[stopsToNavigate.length - 1].title);

  // Waypoints
  // Jika Round Trip: Semua titik adalah waypoint
  // Jika One Way: Semua titik KECUALI yang terakhir adalah waypoint
  let waypointsList = returnToStart 
    ? stopsToNavigate 
    : stopsToNavigate.slice(0, stopsToNavigate.length - 1);

  let url = `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destinationStr}`;

  if (waypointsList.length > 0) {
    const waypointsStr = waypointsList
      .map(s => (s.lat && s.lng) ? `${s.lat},${s.lng}` : encodeURIComponent(s.title))
      .join('|');
    url += `&waypoints=${waypointsStr}`;
  }

  url += `&travelmode=driving`;
  return url;
};