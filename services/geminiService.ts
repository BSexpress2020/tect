
import { GoogleGenAI, Type } from "@google/genai";
import { DeliveryLocation, RouteOptimizationResult, VehicleType, Coordinates, NavigationStep } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// OSRM Servers (Main and Backup)
const OSRM_SERVERS = [
  'https://router.project-osrm.org/route/v1/driving',
  'https://routing.openstreetmap.de/routed-car/route/v1/driving' 
];

// Helper to translate OSRM maneuver types to Thai
const translateManeuver = (type: string, modifier: string | undefined, name: string): string => {
  const roadName = name && name !== '' ? `เข้าสู่ ${name}` : '';
  
  // Basic maneuvers
  if (type === 'depart') return `เริ่มต้นเดินทาง ${roadName}`;
  if (type === 'arrive') return `ถึงจุดหมาย`;
  if (type === 'roundabout') return `ที่วงเวียน ใช้ทางออก ${modifier || ''} ${roadName}`;
  
  // Modifiers
  switch (modifier) {
    case 'left': return `เลี้ยวซ้าย ${roadName}`;
    case 'right': return `เลี้ยวขวา ${roadName}`;
    case 'slight left': return `เบี่ยงซ้ายเล็กน้อย ${roadName}`;
    case 'slight right': return `เบี่ยงขวาเล็กน้อย ${roadName}`;
    case 'sharp left': return `เลี้ยวซ้ายหักศอก ${roadName}`;
    case 'sharp right': return `เลี้ยวขวาหักศอก ${roadName}`;
    case 'uturn': return `กลับรถ`;
    case 'straight': return `ตรงไป ${roadName}`;
    default: return `${type} ${roadName}`.trim();
  }
};

// Helper to fetch actual road geometry and steps from OSRM
const fetchRouteData = async (orderedLocations: DeliveryLocation[]): Promise<{ geometry: Coordinates[], steps: NavigationStep[] }> => {
  try {
    const coordsString = orderedLocations
      .map(l => `${l.coordinates.lng},${l.coordinates.lat}`)
      .join(';');

    for (const baseUrl of OSRM_SERVERS) {
      try {
        const url = `${baseUrl}/${coordsString}?overview=full&geometries=geojson&steps=true`;
        const response = await fetch(url);
        
        if (!response.ok) continue;

        const data = await response.json();
        
        if (data.code === 'Ok' && data.routes && data.routes[0]) {
           const route = data.routes[0];
           const geometry = route.geometry.coordinates.map((c: number[]) => ({
             lat: c[1],
             lng: c[0]
           }));

           let allSteps: NavigationStep[] = [];
           if (route.legs) {
             route.legs.forEach((leg: any, legIndex: number) => {
               if (leg.steps) {
                 const legSteps = leg.steps.map((s: any) => ({
                   instruction: translateManeuver(s.maneuver.type, s.maneuver.modifier, s.name),
                   distanceMeters: s.distance,
                   durationSeconds: s.duration,
                   maneuver: s.maneuver
                 }));
                 allSteps = [...allSteps, ...legSteps];
                 
                 if (legIndex < route.legs.length - 1) {
                    allSteps.push({
                      instruction: `ถึงจุดส่งสินค้าที่ ${legIndex + 1}`,
                      distanceMeters: 0,
                      durationSeconds: 0,
                      maneuver: { type: 'arrive', modifier: undefined }
                    });
                 }
               }
             });
           }

           return { geometry, steps: allSteps };
        }
      } catch (err) {
        console.warn(`Failed to fetch from ${baseUrl}`, err);
      }
    }
  } catch (e) {
    console.warn("All OSRM servers failed, falling back to straight lines.", e);
  }
  return { geometry: [], steps: [] };
};

export const parseOrdersWithGemini = async (rawText: string): Promise<any[]> => {
  const prompt = `
    You are a smart logistics assistant for Thailand.
    Extract delivery orders from the following raw text.
    
    Raw Text:
    "${rawText}"

    Tasks:
    1. Identify each distinct order.
    2. Extract Customer Name, Phone Number, and Address.
    3. Assign a "Zone" based on the district/sub-district (e.g., "Bang Kapi", "Siam", "Nonthaburi"). If unknown, use "General".
    4. Return valid JSON only.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            customerName: { type: Type.STRING },
            phoneNumber: { type: Type.STRING },
            address: { type: Type.STRING },
            zone: { type: Type.STRING },
          },
          required: ["customerName", "address", "zone"],
        },
      },
    },
  });

  return JSON.parse(response.text || "[]");
};

export const optimizeRouteWithGemini = async (
  locations: DeliveryLocation[],
  vehicleType: VehicleType
): Promise<RouteOptimizationResult> => {
  
  if (locations.length < 2) {
    throw new Error("ต้องมีจุดส่งสินค้าอย่างน้อย 2 จุดเพื่อคำนวณเส้นทาง");
  }

  const depot = locations.find(l => l.isDepot) || locations[0];
  const stops = locations.filter(l => l.id !== depot.id);

  // Vehicle-specific configuration
  let vehicleSpecs = "";
  if (vehicleType === VehicleType.TRUCK_6W) {
    vehicleSpecs = `
      - Vehicle: 6-Wheel Truck (รถบรรทุก 6 ล้อ).
      - Fuel: ~7 km/L (Diesel).
      - Tolls: 6-wheel vehicle rates (higher than cars).
      - Constraints: Avoid narrow residential alleys. Consider time restrictions in Bangkok (No-entry hours for trucks).
    `;
  } else {
    vehicleSpecs = `
      - Vehicle: Pickup Truck (กระบะ).
      - Fuel: ~12 km/L (Diesel).
      - Tolls: standard 4-wheel vehicle rates.
      - Constraints: None (Can enter all areas).
    `;
  }

  const prompt = `
    You are an expert logistics route planner for Thailand.
    
    Task: Optimize the delivery route starting from the Depot, visiting all Stops exactly once, and optionally returning to Depot.
    
    Vehicle Configuration:
    ${vehicleSpecs}
    
    Price Context (Approx): Diesel ~33 THB/L.
    
    Locations:
    Depot: ${JSON.stringify({ id: depot.id, lat: depot.coordinates.lat, lng: depot.coordinates.lng })}
    Stops: ${JSON.stringify(stops.map(s => ({ id: s.id, lat: s.coordinates.lat, lng: s.coordinates.lng, zone: s.zone })))}

    Requirements:
    1. Sort stops efficiently (TSP). Group stops in the same 'zone' if efficient.
    2. Estimate realistic driving distance/time.
    3. Calculate estimated Fuel Cost and Toll Fees based on ${vehicleType} specs.
    4. Provide advice in Thai (e.g. mention if the truck might hit time restrictions).
    5. Provide stats for each segment.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          optimizedOrder: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "The sequence of Location IDs, starting with the Depot ID.",
          },
          segments: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                fromId: { type: Type.STRING },
                toId: { type: Type.STRING },
                distanceKm: { type: Type.NUMBER },
                timeMinutes: { type: Type.NUMBER },
              },
              required: ["fromId", "toId", "distanceKm", "timeMinutes"],
            },
            description: "Detailed stats for the leg between each consecutive stop.",
          },
          stats: {
            type: Type.OBJECT,
            properties: {
              totalDistanceKm: { type: Type.NUMBER },
              totalTimeMinutes: { type: Type.NUMBER },
              fuelCostTHB: { type: Type.NUMBER },
              tollCostTHB: { type: Type.NUMBER },
              totalCostTHB: { type: Type.NUMBER },
              advice: { type: Type.STRING, description: "Advice in Thai language" },
            },
            required: ["totalDistanceKm", "totalTimeMinutes", "fuelCostTHB", "tollCostTHB", "totalCostTHB", "advice"],
          },
        },
        required: ["optimizedOrder", "segments", "stats"],
      },
    },
  });

  const resultText = response.text || "{}";
  const result = JSON.parse(resultText) as RouteOptimizationResult;
  result.stats.vehicleType = vehicleType;
  
  if (result.optimizedOrder && result.optimizedOrder.length > 0 && result.optimizedOrder[0] !== depot.id) {
     if (!result.optimizedOrder.includes(depot.id)) {
        result.optimizedOrder.unshift(depot.id);
     }
  }

  if (!result.segments) {
    result.segments = [];
  }

  if (result.optimizedOrder && result.optimizedOrder.length > 0) {
    const orderedLocations = result.optimizedOrder
      .map(id => locations.find(l => l.id === id))
      .filter((l): l is DeliveryLocation => !!l);
      
    if (orderedLocations.length > 1) {
      const { geometry, steps } = await fetchRouteData(orderedLocations);
      result.pathPolyline = geometry;
      result.navigationInstructions = steps;
    }
  }

  return result;
};
