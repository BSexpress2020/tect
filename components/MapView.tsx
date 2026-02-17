import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { DeliveryLocation, Coordinates } from '../types';
import { createMarkerHtml } from './Icons';
import { Navigation, Crosshair } from 'lucide-react';

interface MapViewProps {
  locations: DeliveryLocation[];
  optimizedOrder: string[];
  routePolyline?: Coordinates[];
  onMapClick: (coords: Coordinates) => void;
  onLocationSelect: (id: string) => void;
  selectedId: string | null;
}

// Handle Map Clicks
const MapEvents = ({ onMapClick }: { onMapClick: (coords: Coordinates) => void }) => {
  useMapEvents({
    click(e) {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
};

// Locate Me Control
const LocateControl = () => {
  const map = useMap();
  const [loading, setLoading] = useState(false);

  const handleLocate = () => {
    setLoading(true);
    map.locate().on("locationfound", function (e) {
      map.flyTo(e.latlng, 15, { duration: 2 });
      setLoading(false);
    }).on("locationerror", function () {
      alert("ไม่สามารถระบุตำแหน่งของคุณได้");
      setLoading(false);
    });
  };

  return (
    <div className="leaflet-bottom leaflet-right !mb-24 md:!mb-8 !mr-4 pointer-events-auto z-[400]">
       <button 
         onClick={handleLocate}
         className="bg-white p-3 rounded-xl shadow-lg border border-slate-100 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-95"
         title="ตำแหน่งปัจจุบัน"
       >
         {loading ? (
           <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
         ) : (
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
         )}
       </button>
    </div>
  );
};

// Controller for Auto-Zoom and Flying
const MapController = ({ locations, selectedId }: { locations: DeliveryLocation[], selectedId: string | null }) => {
  const map = useMap();
  
  // Initial fit (only once or when list drastically changes/clears)
  useEffect(() => {
    if (locations.length > 0 && !selectedId && locations.length < 2) {
      const lastLoc = locations[locations.length - 1];
      map.panTo([lastLoc.coordinates.lat, lastLoc.coordinates.lng]);
    } else if (locations.length > 1 && !selectedId) {
       // Optional: Fit bounds if needed, but usually user wants to pan manually
    }
  }, [locations.length]);

  // Fly to selected
  useEffect(() => {
    if (selectedId) {
      const loc = locations.find(l => l.id === selectedId);
      if (loc) {
        map.flyTo([loc.coordinates.lat, loc.coordinates.lng], 16, {
          duration: 1.2,
          easeLinearity: 0.25
        });
      }
    }
  }, [selectedId]);

  return null;
};

const MapView: React.FC<MapViewProps> = ({ locations, optimizedOrder, routePolyline, onMapClick, onLocationSelect, selectedId }) => {
  const defaultCenter: [number, number] = [13.7563, 100.5018];

  const getLocation = (id: string) => locations.find(l => l.id === id);

  // Fallback path if no road geometry
  const straightLinePositions = optimizedOrder
    .map(id => getLocation(id))
    .filter((l): l is DeliveryLocation => !!l)
    .map(l => [l.coordinates.lat, l.coordinates.lng] as [number, number]);

  const displayPositions = routePolyline && routePolyline.length > 0
    ? routePolyline.map(c => [c.lat, c.lng] as [number, number])
    : straightLinePositions;

  return (
    <MapContainer 
      center={defaultCenter} 
      zoom={12} 
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
      className="outline-none"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        // Use a lighter, cleaner map style if possible, or standard OSM
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapEvents onMapClick={onMapClick} />
      <MapController locations={locations} selectedId={selectedId} />
      <LocateControl />

      {/* Navigation Line (Outline) */}
      {displayPositions.length > 1 && (
        <Polyline 
          positions={displayPositions} 
          pathOptions={{ 
            color: '#1e3a8a', 
            weight: 9, 
            opacity: 0.4, 
            lineCap: 'round', 
            lineJoin: 'round', 
          }} 
        />
      )}

      {/* Navigation Line (Main) */}
      {displayPositions.length > 1 && (
        <Polyline 
          positions={displayPositions} 
          pathOptions={{ 
            color: '#3b82f6', 
            weight: 6, 
            opacity: 1, 
            lineCap: 'round', 
            lineJoin: 'round', 
          }} 
        />
      )}

      {/* Markers */}
      {locations.map((loc) => {
        let displayIndex = 0;
        if (optimizedOrder.length > 0) {
          displayIndex = optimizedOrder.indexOf(loc.id);
        } else {
           displayIndex = locations.findIndex(l => l.id === loc.id);
        }

        const labelIndex = displayIndex === -1 ? locations.length : displayIndex;
        const isSelected = loc.id === selectedId;

        const customIcon = L.divIcon({
          html: createMarkerHtml(labelIndex, !!loc.isDepot, isSelected),
          className: 'leaflet-div-icon',
          iconSize: [40, 40],
          iconAnchor: [20, 40],
          popupAnchor: [0, -40],
        });

        return (
          <Marker 
            key={loc.id} 
            position={[loc.coordinates.lat, loc.coordinates.lng]} 
            icon={customIcon}
            eventHandlers={{
              click: () => onLocationSelect(loc.id)
            }}
            zIndexOffset={isSelected ? 1000 : 0}
          >
            <Popup className="font-sarabun" closeButton={false}>
              <div className="text-center p-2">
                <h3 className="font-bold text-slate-800 text-sm">{loc.name}</h3>
                <div className="text-[10px] text-slate-500 mt-0.5">
                   {loc.coordinates.lat.toFixed(5)}, {loc.coordinates.lng.toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Empty State Hint (Floating on Map) */}
      {locations.length === 0 && (
        <div className="leaflet-top leaflet-left !mt-20 !ml-4 md:!ml-12 pointer-events-none">
           <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-xl shadow-lg border border-white/50 animate-bounce">
              <p className="text-slate-700 text-sm font-medium">👇 แตะที่แผนที่เพื่อเริ่มใช้งาน</p>
           </div>
        </div>
      )}
    </MapContainer>
  );
};

export default MapView;