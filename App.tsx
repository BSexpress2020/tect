
import React, { useState, useEffect } from 'react';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import { DeliveryLocation, Coordinates, RouteOptimizationResult, VehicleType } from './types';
import { optimizeRouteWithGemini, parseOrdersWithGemini } from './services/geminiService';
import { Truck } from 'lucide-react';

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15);
};

const STORAGE_KEY = 'smartroute_thai_data_v2';

const App: React.FC = () => {
  // Initialize state from localStorage if available
  const [locations, setLocations] = useState<DeliveryLocation[]>(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        return parsed.locations || [];
      }
    } catch (e) {
      console.warn("Failed to load locations from localStorage", e);
    }
    return [];
  });

  const [optimizedRoute, setOptimizedRoute] = useState<RouteOptimizationResult | null>(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        return parsed.optimizedRoute || null;
      }
    } catch (e) {
      console.warn("Failed to load route from localStorage", e);
    }
    return null;
  });

  const [vehicleType, setVehicleType] = useState<VehicleType>(VehicleType.PICKUP_CLOSED);
  const [isCalculating, setIsCalculating] = useState(false);
  const [importingStatus, setImportingStatus] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      const dataToSave = {
        locations,
        optimizedRoute
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      console.error("Failed to save to localStorage", e);
    }
  }, [locations, optimizedRoute]);

  const handleMapClick = (coords: Coordinates) => {
    if (locations.length >= 30) {
      setError("เพิ่มจุดส่งได้สูงสุด 30 จุด เพื่อประสิทธิภาพสูงสุด");
      return;
    }

    const isFirst = locations.length === 0;
    const newId = generateId();
    const newLocation: DeliveryLocation = {
      id: newId,
      name: isFirst ? "คลังสินค้า (Start)" : `จุดส่งสินค้า ${locations.length}`,
      coordinates: coords,
      isDepot: isFirst,
      zone: isFirst ? 'HQ' : 'ทั่วไป'
    };

    setLocations([...locations, newLocation]);
    setSelectedId(newId);
    setOptimizedRoute(null);
    setError(null);
  };

  const handleRemoveLocation = (id: string) => {
    const newLocations = locations.filter(l => l.id !== id);
    
    if (newLocations.length > 0 && locations[0].id === id) {
       newLocations[0].isDepot = true;
       newLocations[0].name = "คลังสินค้า (Start)";
    }

    const reordered = newLocations.map((loc, idx) => {
       if (loc.isDepot) return loc;
       if (loc.name.startsWith("จุดส่งสินค้า")) {
           return { ...loc, name: `จุดส่งสินค้า ${idx}` };
       }
       return loc;
    });

    setLocations(reordered);
    setOptimizedRoute(null);
    if (selectedId === id) setSelectedId(null);
  };

  const handleCalculateRoute = async () => {
    if (locations.length < 2) return;

    setIsCalculating(true);
    setError(null);

    try {
      const result = await optimizeRouteWithGemini(locations, vehicleType);
      setOptimizedRoute(result);
    } catch (err: any) {
      console.error(err);
      setError("ไม่สามารถคำนวณเส้นทางได้: " + (err.message || "เกิดข้อผิดพลาดจากระบบ AI"));
    } finally {
      setIsCalculating(false);
    }
  };

  const handleImportOrders = async (text: string) => {
    setImportingStatus("กำลังวิเคราะห์ข้อมูลด้วย AI...");
    try {
      const parsedOrders = await parseOrdersWithGemini(text);
      
      if (parsedOrders.length === 0) {
        throw new Error("ไม่พบข้อมูลออเดอร์ในข้อความ");
      }

      setImportingStatus(`กำลังค้นหาพิกัด ${parsedOrders.length} รายการ...`);
      
      const newLocations: DeliveryLocation[] = [];
      const isFirst = locations.length === 0;

      for (let i = 0; i < parsedOrders.length; i++) {
         const order = parsedOrders[i];
         const isDepot = isFirst && i === 0;
         
         try {
           const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(order.address)}&limit=1`);
           const data = await response.json();

           if (data && data.length > 0) {
             newLocations.push({
                id: generateId(),
                name: order.customerName || `จุดส่ง ${i+1}`,
                coordinates: { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) },
                address: order.address,
                customerName: order.customerName,
                phoneNumber: order.phoneNumber,
                zone: order.zone,
                isDepot: isDepot
             });
           } else {
             newLocations.push({
                id: generateId(),
                name: `${order.customerName || 'Unknown'} (ไม่พบพิกัด)`,
                coordinates: { lat: 13.7563 + (Math.random()*0.01), lng: 100.5018 + (Math.random()*0.01) },
                address: order.address,
                customerName: order.customerName,
                phoneNumber: order.phoneNumber,
                zone: 'Unresolved',
                isDepot: isDepot
             });
           }
         } catch (e) {
           console.warn(`Geocoding failed for ${order.address}`);
         }
         
         await new Promise(r => setTimeout(r, 800));
      }

      setLocations(prev => [...prev, ...newLocations]);
      setImportingStatus(null);

    } catch (err: any) {
      console.error(err);
      setError("การนำเข้าข้อมูลล้มเหลว: " + err.message);
      setImportingStatus(null);
    }
  };

  const handleReset = () => {
    if(window.confirm("ยืนยันการล้างข้อมูลจุดส่งทั้งหมด?")) {
        setLocations([]);
        setOptimizedRoute(null);
        setError(null);
        setSelectedId(null);
        localStorage.removeItem(STORAGE_KEY); 
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-100 font-sarabun text-slate-900">
      
      {/* 1. Map Layer (Background) */}
      <div className="absolute inset-0 z-0">
        <MapView 
          locations={locations}
          optimizedOrder={optimizedRoute?.optimizedOrder || []}
          routePolyline={optimizedRoute?.pathPolyline}
          onMapClick={handleMapClick}
          onLocationSelect={setSelectedId}
          selectedId={selectedId}
        />
      </div>

      {/* 2. UI Layer (Foreground) */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col md:flex-row">
        
        {/* Sidebar Floating Panel */}
        <Sidebar 
          locations={locations}
          optimizedOrder={optimizedRoute?.optimizedOrder || []}
          segments={optimizedRoute?.segments || []}
          navigationInstructions={optimizedRoute?.navigationInstructions || []}
          stats={optimizedRoute?.stats || null}
          onRemoveLocation={handleRemoveLocation}
          onCalculate={handleCalculateRoute}
          isCalculating={isCalculating}
          onReset={handleReset}
          selectedId={selectedId}
          onLocationSelect={setSelectedId}
          onImportOrders={handleImportOrders}
          vehicleType={vehicleType}
          onVehicleChange={setVehicleType}
        />

        {/* Loading Overlay (Route Calc) */}
        {isCalculating && (
          <div className="absolute inset-0 z-50 bg-black/20 backdrop-blur-sm flex flex-col items-center justify-center p-4 pointer-events-auto">
            <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 max-w-sm w-full text-center relative overflow-hidden ring-1 ring-black/5">
               <div className="mb-6 relative">
                  <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
                     <Truck className="w-10 h-10 text-white animate-pulse" />
                  </div>
                  <div className="absolute top-0 right-0 w-full h-full border-4 border-blue-100 rounded-full animate-ping opacity-20"></div>
               </div>
               <h3 className="text-xl font-bold text-slate-800 mb-2">กำลังค้นหาเส้นทางที่ดีที่สุด</h3>
               <p className="text-slate-600 text-sm">AI กำลังวิเคราะห์ระยะทางและต้นทุนสำหรับ {vehicleType}...</p>
            </div>
          </div>
        )}

        {/* Importing Overlay */}
        {importingStatus && (
          <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-4 pointer-events-auto">
             <div className="bg-white p-6 rounded-2xl shadow-xl flex items-center gap-4">
                 <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                 <span className="font-medium text-slate-700">{importingStatus}</span>
             </div>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 md:top-8 md:left-auto md:right-8 md:translate-x-0 bg-red-500/90 backdrop-blur text-white px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-4 max-w-md animate-slide-up pointer-events-auto border border-white/20">
            <div>
              <p className="font-bold text-sm">เกิดข้อผิดพลาด</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-white/70 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg">
               ✕
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slide-up-mobile {
           from { opacity: 0; transform: translate(-50%, 20px); }
           to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes slide-up-desktop {
           from { opacity: 0; transform: translateY(20px); }
           to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
           animation: slide-up-mobile 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @media (min-width: 768px) {
          .animate-slide-up {
             animation: slide-up-desktop 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
