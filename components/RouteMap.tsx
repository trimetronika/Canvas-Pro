import React, { useState, useMemo } from 'react';
import { CanvasStop, GeoLocation } from '../types';
import { calculateDistance } from '../services/routeOptimization';
import { MapPin, Navigation, Compass, ExternalLink, Ruler, AlertTriangle } from 'lucide-react';

interface RouteMapProps {
  stops: CanvasStop[];
  userLocation: GeoLocation;
  returnToStart?: boolean;
  height?: number;
  /** Called when a non-start map marker is clicked; receives the stop id. */
  onPointClick?: (stopId: string) => void;
}

export const RouteMap: React.FC<RouteMapProps> = ({ stops, userLocation, returnToStart = false, height = 350, onPointClick }) => {
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  // All active (selected) stops — used to count missing-coord ones for the legend.
  const activeStops = stops.filter(s => s.selected);
  const noCoordCount = activeStops.filter(s => !Number.isFinite(s.lat) || !Number.isFinite(s.lng)).length;

  // Combine all points (user location + stops that have valid coordinates)
  const points = useMemo(() => {
    return [
      { id: 'start', lat: userLocation.lat, lng: userLocation.lng, label: 'S', isStart: true, status: 'visited', title: 'Start Location', uri: '' },
      ...activeStops
        .filter(s => Number.isFinite(s.lat) && Number.isFinite(s.lng))
        .map((s, i) => ({
          id: s.id,
          lat: s.lat as number,
          lng: s.lng as number,
          label: (i + 1).toString(),
          isStart: false,
          status: s.status,
          title: s.title,
          uri: s.uri,
        }))
    ];
  }, [userLocation, activeStops]);

  // Calculate Bounds
  const { minLat, maxLat, minLng, maxLng } = useMemo(() => {
    if (points.length === 0) return { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
    return points.reduce((acc, p) => ({
      minLat: Math.min(acc.minLat, p.lat),
      maxLat: Math.max(acc.maxLat, p.lat),
      minLng: Math.min(acc.minLng, p.lng),
      maxLng: Math.max(acc.maxLng, p.lng)
    }), { minLat: points[0].lat, maxLat: points[0].lat, minLng: points[0].lng, maxLng: points[0].lng });
  }, [points]);

  const latSpan = maxLat - minLat || 0.01;
  const lngSpan = maxLng - minLng || 0.01;
  const paddingLat = latSpan * 0.1;
  const paddingLng = lngSpan * 0.1;

  // Scale Text
  const scaleText = useMemo(() => {
     // Approx distance of span
     const dist = calculateDistance(
        { lat: minLat, lng: minLng }, 
        { lat: minLat, lng: maxLng }
     );
     if (dist < 1) return `${Math.round(dist * 1000)} m`;
     return `${dist.toFixed(1)} km`;
  }, [minLat, minLng, maxLng]);

  // Aspect Ratio & ViewBox
  // We use an arbitrary internal height for the coordinate system, and calculate width based on aspect ratio.
  // The SVG will then scale to fit the container using width="100%" height="100%".
  const internalHeight = 1000;
  const aspectRatio = (lngSpan + 2 * paddingLng) / (latSpan + 2 * paddingLat);
  const internalWidth = Math.max(internalHeight * aspectRatio, 1000); // Ensure minimum width

  const normalize = (lat: number, lng: number) => {
    const x = ((lng - (minLng - paddingLng)) / (lngSpan + 2 * paddingLng)) * internalWidth;
    const y = internalHeight - (((lat - (minLat - paddingLat)) / (latSpan + 2 * paddingLat)) * internalHeight);
    return { x, y };
  };

  const normalizedPoints = points.map(p => ({
    ...p,
    ...normalize(p.lat, p.lng)
  }));

  // --- Generate Segments for Coloring ---
  const segments = [];
  for (let i = 0; i < normalizedPoints.length - 1; i++) {
    const start = normalizedPoints[i];
    const end = normalizedPoints[i + 1];
    
    let type = 'pending';
    if (end.status === 'visited') type = 'visited';
    if (end.status === 'skipped') type = 'skipped';

    segments.push({ start, end, type });
  }
  
  if (returnToStart && normalizedPoints.length > 1) {
     segments.push({
        start: normalizedPoints[normalizedPoints.length - 1],
        end: normalizedPoints[0],
        type: 'pending'
     });
  }

  const handlePointClick = (id: string) => {
    setSelectedPointId(selectedPointId === id ? null : id);
    if (id !== 'start' && onPointClick) {
      onPointClick(id);
    }
  };

  const resetView = () => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
    setSelectedPointId(null);
  };

  const selectedPointData = normalizedPoints.find(p => p.id === selectedPointId);

  return (
    <div className="relative w-full h-full bg-slate-50 dark:bg-slate-900 overflow-hidden group select-none">
      
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-[0.07] dark:opacity-[0.1]" 
           style={{ 
             backgroundImage: 'linear-gradient(#64748b 1px, transparent 1px), linear-gradient(90deg, #64748b 1px, transparent 1px)', 
             backgroundSize: '40px 40px' 
           }}>
      </div>

      {/* Header Info */}
      <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur border border-slate-200 dark:border-slate-600 px-2.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-brand-500" />
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
            TACTICAL MAP
          </span>
        </div>
        
        <button 
          onClick={resetView}
          className="bg-white/90 dark:bg-slate-800/90 backdrop-blur border border-slate-200 dark:border-slate-600 p-1.5 rounded-lg shadow-sm text-slate-500 hover:text-brand-600 transition-colors"
          title="Reset View"
        >
          <Navigation className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="w-full h-full">
        <svg 
          width="100%" 
          height="100%" 
          viewBox={`0 0 ${internalWidth} ${internalHeight}`}
          preserveAspectRatio="xMidYMid meet"
          className="mx-auto"
        >
          <defs>
            <marker id="arrow-pending" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#94a3b8" />
            </marker>
             <marker id="arrow-visited" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#22c55e" />
            </marker>
          </defs>

          {/* Draw Segments */}
          {segments.map((seg, idx) => (
             <line 
               key={`seg-${idx}`}
               x1={seg.start.x} y1={seg.start.y}
               x2={seg.end.x} y2={seg.end.y}
               stroke={seg.type === 'visited' ? '#22c55e' : seg.type === 'skipped' ? '#ef4444' : '#94a3b8'}
               strokeWidth={seg.type === 'visited' ? 3 : 2}
               strokeDasharray={seg.type === 'pending' ? '6 4' : 'none'}
               strokeOpacity={seg.type === 'skipped' ? 0.3 : 0.8}
               markerMid={seg.type === 'visited' ? "url(#arrow-visited)" : "url(#arrow-pending)"}
             />
          ))}

          {/* Points */}
          {normalizedPoints.map((p) => {
             const isSelected = selectedPointId === p.id;
             const isVisited = p.status === 'visited';
             
             return (
              <g 
                key={p.id}
                onClick={(e) => { e.stopPropagation(); handlePointClick(p.id); }}
                className="cursor-pointer transition-all duration-200"
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              >
                {/* Hit Area */}
                <circle cx={p.x} cy={p.y} r="15" fill="transparent" />

                {/* Selection Ring */}
                {isSelected && (
                  <circle 
                    cx={p.x} cy={p.y} r="12" 
                    fill="none" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.5"
                    className="animate-ping" 
                  />
                )}
                
                {/* Visual Circle */}
                <circle 
                  cx={p.x} cy={p.y} r={p.isStart ? 6 : 5} 
                  fill={p.isStart ? "#ef4444" : isVisited ? "#22c55e" : "#1e293b"} 
                  stroke="white"
                  strokeWidth="2"
                  className="shadow-sm"
                />
                
                {/* Label inside circle */}
                <text 
                  x={p.x} y={p.y} 
                  dy=".3em" 
                  textAnchor="middle" 
                  fontSize="3.5" 
                  fontWeight="bold" 
                  fill="white"
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Scale Bar */}
      <div className="absolute bottom-12 right-4 flex flex-col items-end pointer-events-none">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono mb-1">
             <Ruler className="w-3 h-3" /> Scale
          </div>
          <div className="flex flex-col items-end">
             <div className="h-2 border-l border-r border-b border-slate-400 dark:border-slate-500 w-16 opacity-60"></div>
             <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">{scaleText}</span>
          </div>
      </div>

      {/* Selected Point Popover (Tooltip) */}
      {selectedPointData && (
        <div className="absolute bottom-0 left-0 right-0 p-4 animate-slide-up z-20">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-600">
             <div className="flex justify-between items-start mb-2">
                <div>
                   <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${selectedPointData.isStart ? 'bg-red-100 text-red-600' : 'bg-brand-100 text-brand-600'}`}>
                      {selectedPointData.isStart ? 'Start Point' : `Stop #${selectedPointData.label}`}
                   </span>
                   <h4 className="font-bold text-slate-800 dark:text-white mt-1 line-clamp-1">{selectedPointData.title}</h4>
                   {selectedPointData.status !== 'pending' && !selectedPointData.isStart && (
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1 mt-0.5">
                         ● {selectedPointData.status === 'visited' ? 'Completed' : 'Skipped'}
                      </span>
                   )}
                </div>
                <button 
                  onClick={() => setSelectedPointId(null)}
                  className="p-1 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-400"
                >
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>
             
             {!selectedPointData.isStart && selectedPointData.uri && (
                <div className="flex gap-2 mt-3">
                   <a 
                     href={selectedPointData.uri} 
                     target="_blank" 
                     rel="noreferrer"
                     className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                   >
                      <Navigation className="w-3.5 h-3.5" /> Navigate
                   </a>
                   <a 
                     href={selectedPointData.uri.replace('maps', 'maps/search')} // Fallback heuristic for generic map
                     target="_blank" 
                     rel="noreferrer"
                     className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 p-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                     title="Open in Maps"
                   >
                      <ExternalLink className="w-4 h-4" />
                   </a>
                </div>
             )}
          </div>
        </div>
      )}

      {/* Legend Footer */}
      <div className="bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 p-2.5 flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400">
         <div className="flex gap-3 overflow-x-auto">
           <div className="flex items-center gap-1.5 whitespace-nowrap">
             <span className="w-2 h-2 rounded-full bg-green-500"></span> Visited
           </div>
           <div className="flex items-center gap-1.5 whitespace-nowrap">
             <span className="w-2 h-0.5 bg-slate-400 border-t border-dashed border-slate-400 w-4"></span> Pending
           </div>
           {noCoordCount > 0 && (
             <div className="flex items-center gap-1 whitespace-nowrap text-amber-500 dark:text-amber-400 font-semibold">
               <AlertTriangle className="w-3 h-3" />
               {noCoordCount} no coords
             </div>
           )}
         </div>
      </div>
    </div>
  );
};