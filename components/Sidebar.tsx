
import React, { useEffect, useRef, useState } from 'react';
import { DeliveryLocation, OptimizedRouteStats, RouteSegment, NavigationStep, VehicleType } from '../types';
import { Trash2, MapPin, Navigation, Clock, Truck, ArrowDown, Home, CornerUpLeft, CornerUpRight, ArrowUp, RotateCcw, List, Upload, FileText, Phone, User, Layers } from './Icons';
import { ChevronLeft, ChevronRight, X, Package } from 'lucide-react';

interface SidebarProps {
  locations: DeliveryLocation[];
  optimizedOrder: string[];
  segments?: RouteSegment[];
  navigationInstructions?: NavigationStep[];
  stats: OptimizedRouteStats | null;
  onRemoveLocation: (id: string) => void;
  onCalculate: () => void;
  isCalculating: boolean;
  onReset: () => void;
  selectedId: string | null;
  onLocationSelect: (id: string) => void;
  onImportOrders: (text: string) => void;
  vehicleType: VehicleType;
  onVehicleChange: (type: VehicleType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  locations, 
  optimizedOrder, 
  segments,
  navigationInstructions,
  stats, 
  onRemoveLocation, 
  onCalculate, 
  isCalculating,
  onReset,
  selectedId,
  onLocationSelect,
  onImportOrders,
  vehicleType,
  onVehicleChange
}) => {
  
  const itemRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'nav'>('list');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");

  // Auto-expand if calculate is done
  useEffect(() => {
    if (stats) {
       setIsOpen(true);
       setActiveTab('list');
    }
  }, [stats]);

  // Sort locations
  const displayedLocations = optimizedOrder.length > 0 
    ? optimizedOrder.map(id => locations.find(l => l.id === id)).filter((l): l is DeliveryLocation => !!l)
    : locations;

  // Auto-scroll
  useEffect(() => {
    if (selectedId && itemRefs.current[selectedId] && isOpen && activeTab === 'list') {
      itemRefs.current[selectedId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedId, isOpen, activeTab]);

  // Group by Zone if not optimized
  const groupedLocations: Record<string, DeliveryLocation[]> = React.useMemo(() => {
     if (optimizedOrder.length > 0) return { 'เส้นทางจัดส่ง': displayedLocations };
     
     const groups: Record<string, DeliveryLocation[]> = {};
     displayedLocations.forEach(loc => {
        const zone = loc.zone || (loc.isDepot ? 'คลังสินค้า' : 'ทั่วไป');
        if (!groups[zone]) groups[zone] = [];
        groups[zone].push(loc);
     });
     // Ensure Depot comes first
     const sortedGroups: Record<string, DeliveryLocation[]> = {};
     if (groups['คลังสินค้า']) {
         sortedGroups['คลังสินค้า'] = groups['คลังสินค้า'];
         delete groups['คลังสินค้า'];
     }
     return { ...sortedGroups, ...groups };
  }, [displayedLocations, optimizedOrder]);

  const getNavIcon = (modifier: string | undefined, type: string) => {
    if (type === 'uturn' || modifier === 'uturn') return <RotateCcw className="w-5 h-5 text-slate-700" />;
    if (modifier?.includes('left')) return <CornerUpLeft className="w-5 h-5 text-slate-700" />;
    if (modifier?.includes('right')) return <CornerUpRight className="w-5 h-5 text-slate-700" />;
    if (type === 'arrive') return <MapPin className="w-5 h-5 text-red-500" />;
    if (type === 'depart') return <Truck className="w-5 h-5 text-blue-500" />;
    return <ArrowUp className="w-5 h-5 text-slate-700" />;
  };

  const handleImportSubmit = () => {
    if (importText.trim()) {
      onImportOrders(importText);
      setImportText("");
      setShowImportModal(false);
    }
  };

  return (
    <>
      <div className={`
        pointer-events-auto transition-all duration-500 ease-in-out z-40
        fixed md:absolute
        bottom-0 left-0 right-0 md:top-0 md:bottom-auto md:right-auto md:h-full
        bg-white/90 md:bg-white/80 backdrop-blur-xl shadow-2xl border-t md:border-r border-white/40
        flex flex-col
        ${isOpen 
          ? 'h-[75vh] md:w-[400px]' 
          : 'h-[140px] md:h-full md:w-[60px]'}
        rounded-t-3xl md:rounded-none
      `}>
        
        {/* Toggle Button (Desktop) */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="hidden md:flex absolute -right-4 top-1/2 transform -translate-y-1/2 w-8 h-16 bg-white shadow-md rounded-r-xl items-center justify-center border-y border-r border-gray-100 text-gray-400 hover:text-blue-500 transition-colors z-50"
        >
          {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        {/* Toggle Handle (Mobile) */}
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden w-full flex justify-center pt-3 pb-1 cursor-pointer active:opacity-70"
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
        </div>

        {/* Main Content */}
        <div className={`flex flex-col h-full overflow-hidden ${!isOpen ? 'hidden md:hidden' : 'block'}`}>
          
          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20 text-white">
                 <Truck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800 leading-tight">SmartRoute</h1>
                <p className="text-xs text-slate-500">วางแผนขนส่งอัจฉริยะ</p>
              </div>
            </div>
            <div className="flex gap-1">
               <button onClick={() => setShowImportModal(true)} className="text-slate-500 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-full transition-colors" title="นำเข้าออเดอร์">
                  <Upload className="w-4 h-4" />
               </button>
               <button onClick={onReset} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors" title="เริ่มใหม่">
                  <Trash2 className="w-4 h-4" />
               </button>
            </div>
          </div>

          {/* Vehicle Selector */}
          <div className="px-6 pb-4 shrink-0">
             <div className="bg-slate-100/50 p-1 rounded-xl flex gap-1 border border-slate-200/50">
                {[VehicleType.PICKUP_CLOSED, VehicleType.PICKUP_OPEN, VehicleType.TRUCK_6W].map((type) => (
                  <button
                    key={type}
                    onClick={() => onVehicleChange(type)}
                    className={`flex-1 flex flex-col items-center py-2 px-1 rounded-lg transition-all duration-300 gap-1
                    ${vehicleType === type 
                      ? 'bg-white shadow-md text-blue-600 ring-1 ring-slate-200' 
                      : 'text-slate-400 hover:text-slate-600 hover:bg-white/40'}`}
                  >
                    {type === VehicleType.TRUCK_6W ? <Package size={16}/> : <Truck size={16}/>}
                    <span className="text-[10px] font-bold whitespace-nowrap">{type}</span>
                  </button>
                ))}
             </div>
          </div>

          {/* Navigation Tabs */}
          {stats && (
             <div className="px-6 pb-4 flex gap-2 shrink-0">
                <button 
                   onClick={() => setActiveTab('list')}
                   className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2
                   ${activeTab === 'list' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                   <List size={16}/> จุดส่งสินค้า
                </button>
                <button 
                   onClick={() => setActiveTab('nav')}
                   className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2
                   ${activeTab === 'nav' ? 'bg-blue-100 text-blue-700' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                   <Navigation size={16}/> นำทาง
                </button>
             </div>
          )}

          {/* Stats Card */}
          {stats && activeTab === 'list' && (
            <div className="px-5 pb-2 shrink-0 animate-in slide-in-from-left duration-500">
               <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-4 border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                     <Navigation className="w-24 h-24 text-blue-600 transform rotate-12" />
                  </div>
                  
                  <div className="flex items-end justify-between mb-3 relative z-10">
                     <div>
                        <div className="flex items-center gap-1.5 mb-1">
                           <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full uppercase">{stats.vehicleType || vehicleType}</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-0.5">ระยะทางรวม</p>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">{stats.totalDistanceKm.toFixed(1)} <span className="text-sm font-normal text-slate-500">กม.</span></h3>
                     </div>
                     <div className="text-right">
                        <p className="text-xs text-slate-500 mb-1">เวลาเดินทาง</p>
                        <h3 className="text-xl font-bold text-blue-600">
                          {Math.floor(stats.totalTimeMinutes / 60)}<span className="text-xs text-slate-400 mx-0.5">ชม.</span>
                          {stats.totalTimeMinutes % 60}<span className="text-xs text-slate-400 mx-0.5">น.</span>
                        </h3>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs relative z-10 mb-2">
                     <div className="bg-orange-50/50 rounded-lg p-2 flex flex-col">
                        <span className="text-orange-600/70 font-medium mb-0.5">ค่าน้ำมัน (est.)</span>
                        <span className="font-bold text-slate-700">{stats.fuelCostTHB.toLocaleString()} ฿</span>
                     </div>
                     <div className="bg-yellow-50/50 rounded-lg p-2 flex flex-col">
                        <span className="text-yellow-600/70 font-medium mb-0.5">ค่าทางด่วน (est.)</span>
                        <span className="font-bold text-slate-700">{stats.tollCostTHB.toLocaleString()} ฿</span>
                     </div>
                  </div>

                  {stats.advice && (
                    <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100/50">
                       <p className="text-[10px] text-blue-800 leading-relaxed italic">" {stats.advice} "</p>
                    </div>
                  )}
               </div>
            </div>
          )}

          {/* List View */}
          {activeTab === 'list' && (
            <div className="flex-1 overflow-y-auto px-5 py-2 space-y-4 scroll-smooth">
              {locations.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm">
                      <MapPin className="w-8 h-8 text-blue-400" />
                    </div>
                    <h4 className="font-bold text-slate-600">ยังไม่มีจุดส่งสินค้า</h4>
                    <p className="text-xs text-slate-400 mt-1 mb-4">แตะบนแผนที่ หรือ นำเข้าออเดอร์</p>
                    <div className="flex gap-2">
                       <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 text-xs text-white bg-blue-600 px-3 py-1.5 rounded-full hover:bg-blue-700">
                          <Upload className="w-3 h-3" /> นำเข้าออเดอร์
                       </button>
                    </div>
                </div>
              ) : (
                <div className="relative pb-6">
                    {Object.entries(groupedLocations).map(([zoneName, zoneLocs]) => (
                      <div key={zoneName} className="mb-4">
                          {optimizedOrder.length === 0 && (
                            <div className="flex items-center gap-2 mb-2 px-2 sticky top-0 bg-white/90 backdrop-blur z-20 py-1">
                               <Layers className="w-4 h-4 text-slate-400" />
                               <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{zoneName} ({zoneLocs.length})</span>
                               <div className="h-px flex-1 bg-slate-100"></div>
                            </div>
                          )}

                          <div className="relative">
                              {optimizedOrder.length > 0 && (
                                  <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-blue-500 via-slate-300 to-slate-200"></div>
                              )}

                              {zoneLocs.map((loc, index) => {
                                  const isDepot = !!loc.isDepot;
                                  const isSelected = loc.id === selectedId;
                                  
                                  let labelIndex = 0;
                                  if (optimizedOrder.length > 0) {
                                    labelIndex = optimizedOrder.indexOf(loc.id);
                                  } else {
                                    labelIndex = locations.findIndex(l => l.id === loc.id);
                                  }
                                  
                                  let segmentInfo = null;
                                  if (optimizedOrder.length > 0) {
                                      const nextId = optimizedOrder[labelIndex + 1];
                                      if (nextId && segments) {
                                          segmentInfo = segments.find(s => s.fromId === loc.id && s.toId === nextId);
                                      }
                                  }

                                  return (
                                  <div key={loc.id} ref={el => { itemRefs.current[loc.id] = el; }}>
                                      <div className="relative pl-10 py-1 group">
                                      <div 
                                          className={`absolute left-0 top-1/2 transform -translate-y-1/2 w-10 h-10 rounded-full border-[3px] z-10 flex items-center justify-center transition-all duration-300 cursor-pointer
                                          ${isSelected 
                                              ? 'bg-blue-600 border-white shadow-lg scale-110' 
                                              : isDepot 
                                              ? 'bg-blue-100 border-white shadow-md' 
                                              : 'bg-white border-slate-200 shadow-sm group-hover:border-blue-300'}`}
                                          onClick={() => onLocationSelect(loc.id)}
                                      >
                                          {isDepot ? <Truck size={16} className={isSelected ? 'text-white' : 'text-blue-600'} /> : <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-500'}`}>{labelIndex}</span>}
                                      </div>

                                      <div 
                                          onClick={() => onLocationSelect(loc.id)}
                                          className={`p-3.5 rounded-2xl transition-all duration-300 cursor-pointer border relative overflow-hidden
                                          ${isSelected 
                                              ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-md translate-x-1' 
                                              : 'bg-white border-transparent hover:border-slate-200 hover:shadow-sm hover:bg-slate-50'}`}
                                      >
                                          <div className="flex justify-between items-start relative z-10">
                                              <div className="min-w-0 flex-1 mr-2">
                                                  {loc.customerName && (
                                                      <div className="flex items-center gap-1.5 mb-0.5">
                                                          <User size={12} className="text-slate-400"/>
                                                          <span className="text-xs font-semibold text-slate-800">{loc.customerName}</span>
                                                      </div>
                                                  )}
                                                  
                                                  <h4 className={`font-bold text-sm truncate ${isSelected ? 'text-blue-800' : 'text-slate-700'}`}>{loc.name}</h4>
                                                  
                                                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{loc.address || `${loc.coordinates.lat.toFixed(4)}, ${loc.coordinates.lng.toFixed(4)}`}</p>
                                                  {loc.phoneNumber && (
                                                      <div className="flex items-center gap-1 mt-1">
                                                          <Phone size={10} className="text-slate-400"/>
                                                          <span className="text-[10px] text-slate-500">{loc.phoneNumber}</span>
                                                      </div>
                                                  )}
                                              </div>
                                              <button 
                                                  onClick={(e) => { e.stopPropagation(); onRemoveLocation(loc.id); }}
                                                  className={`p-1.5 rounded-full transition-all flex-shrink-0 ${isSelected ? 'text-blue-300 hover:text-red-500 hover:bg-white' : 'text-transparent group-hover:text-slate-300 hover:!text-red-500'}`}
                                              >
                                                  <Trash2 className="w-4 h-4" />
                                              </button>
                                          </div>
                                      </div>
                                      </div>

                                      {segmentInfo && (
                                      <div className="pl-12 py-1">
                                          <div className="bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-100 inline-flex items-center gap-3 text-[10px] font-medium text-slate-500 shadow-sm">
                                              <span className="flex items-center gap-1"><Clock size={10} className="text-blue-400"/> {segmentInfo.timeMinutes} น.</span>
                                              <span className="w-px h-2.5 bg-slate-300"></span>
                                              <span className="flex items-center gap-1">{segmentInfo.distanceKm} กม.</span>
                                          </div>
                                      </div>
                                      )}
                                  </div>
                                  );
                              })}
                          </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Navigation View */}
          {activeTab === 'nav' && (
            <div className="flex-1 overflow-y-auto px-0 bg-slate-50 scroll-smooth">
              {!navigationInstructions || navigationInstructions.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mb-3">
                       <Navigation className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-medium">ไม่มีข้อมูลนำทาง</p>
                    <p className="text-xs text-slate-400">กรุณาคำนวณเส้นทางใหม่อีกครั้ง</p>
                 </div>
              ) : (
                 <div className="divide-y divide-slate-100">
                    {navigationInstructions.map((step, idx) => (
                      <div key={idx} className="bg-white p-4 flex gap-4 hover:bg-slate-50 transition-colors">
                         <div className="mt-1 flex-shrink-0">
                            {getNavIcon(step.maneuver.modifier, step.maneuver.type)}
                         </div>
                         <div>
                            <p className="text-sm font-bold text-slate-800 leading-snug">{step.instruction}</p>
                            {step.distanceMeters > 0 && (
                               <p className="text-xs text-slate-500 mt-1">
                                  อีก {step.distanceMeters >= 1000 ? (step.distanceMeters/1000).toFixed(1) + ' กม.' : step.distanceMeters + ' ม.'}
                               </p>
                            )}
                         </div>
                      </div>
                    ))}
                 </div>
              )}
            </div>
          )}

          {/* Action Button */}
          {activeTab === 'list' && (
            <div className="p-4 bg-white/60 backdrop-blur-md border-t border-slate-100 z-20 shrink-0">
              <button
                onClick={onCalculate}
                disabled={locations.length < 2 || isCalculating}
                className={`w-full py-4 rounded-2xl font-bold text-white shadow-xl flex items-center justify-center gap-2 transition-all transform active:scale-95
                  ${locations.length < 2 || isCalculating
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30'
                  }`}
              >
                {isCalculating ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>กำลังคำนวณ...</span>
                  </div>
                ) : (
                  <>
                    <Navigation className="w-5 h-5 fill-current" />
                    <span>คำนวณเส้นทาง ({vehicleType})</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="absolute inset-0 z-[60] bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 animate-in zoom-in-50 duration-200">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="text-blue-600" size={20}/> นำเข้าออเดอร์
                 </h3>
                 <button onClick={() => setShowImportModal(false)} className="p-1 hover:bg-slate-100 rounded-full">
                    <X size={20} className="text-slate-400"/>
                 </button>
              </div>
              <p className="text-sm text-slate-500 mb-3">
                 วางข้อความออเดอร์ที่นี่ (ชื่อ, เบอร์, ที่อยู่) AI จะช่วยแยกข้อมูลและจัดโซนให้
              </p>
              <textarea 
                className="w-full h-40 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none mb-4"
                placeholder={`ตัวอย่าง:\nคุณสมชาย 0812345678 123 ถนนสุขุมวิท เขตวัฒนา\nร้านกาแฟอารีย์ 023334444 ซอยอารีย์ 1 พญาไท`}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              ></textarea>
              <div className="flex gap-2">
                 <button onClick={() => setShowImportModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50">ยกเลิก</button>
                 <button onClick={handleImportSubmit} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20">
                    แปลผลด้วย AI
                 </button>
              </div>
           </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
