
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DeliveryLocation {
  id: string;
  name: string; // Used as display label or store name
  coordinates: Coordinates;
  address?: string; // Full text address
  isDepot?: boolean; 
  // New fields for Order Management
  customerName?: string;
  phoneNumber?: string;
  zone?: string; // e.g., "Bang Na", "Ladprao"
  status?: 'pending' | 'delivered' | 'failed';
}

export interface OptimizedRouteStats {
  totalDistanceKm: number;
  totalTimeMinutes: number;
  fuelCostTHB: number;
  tollCostTHB: number;
  totalCostTHB: number;
  advice: string;
  vehicleType?: string;
}

export interface RouteSegment {
  fromId: string;
  toId: string;
  distanceKm: number;
  timeMinutes: number;
}

export interface NavigationStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuver: {
    type: string;
    modifier?: string;
  };
}

export interface RouteOptimizationResult {
  optimizedOrder: string[]; 
  segments: RouteSegment[];
  stats: OptimizedRouteStats;
  pathPolyline?: Coordinates[];
  navigationInstructions?: NavigationStep[];
}

export enum VehicleType {
  PICKUP_CLOSED = 'กระบะตู้ทึบ',
  PICKUP_OPEN = 'กระบะคอก',
  TRUCK_6W = 'รถบรรทุก 6 ล้อ',
}
