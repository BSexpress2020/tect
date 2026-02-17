import React from 'react';
import { 
  Truck, MapPin, Navigation, Clock, Coins, Fuel, Info, Plus, Trash2, Home, CheckCircle, ArrowDown,
  CornerUpLeft, CornerUpRight, ArrowUp, RotateCcw, Map as MapIcon, List, Upload, FileText, Phone, User, Map, Layers
} from 'lucide-react';

// Exporting UI components directly for use
export { 
  Truck, MapPin, Navigation, Clock, Coins, Fuel, Info, Plus, Trash2, Home, CheckCircle, ArrowDown,
  CornerUpLeft, CornerUpRight, ArrowUp, RotateCcw, MapIcon, List, Upload, FileText, Phone, User, Map, Layers
};

// Helper to create HTML for Leaflet DivIcon
export const createMarkerHtml = (index: number, isDepot: boolean, isSelected: boolean, zone?: string) => {
  const colorClass = isDepot ? 'bg-blue-600' : 'bg-red-500';
  const borderClass = isSelected ? 'border-4 border-white shadow-xl scale-125' : 'border-2 border-white shadow-md';
  const zIndex = isSelected ? 50 : 10;
  
  return `
    <div class="relative flex items-center justify-center w-8 h-8 rounded-full ${colorClass} ${borderClass} transition-all duration-300" style="z-index: ${zIndex}">
      ${isDepot 
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' 
        : `<span class="text-white font-bold text-sm">${index}</span>`
      }
    </div>
  `;
};