import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { CanvasPlan, CanvasStop, VisitStatus, GeoLocation, LeadScore } from '../types';
import { RouteMap } from './RouteMap';
import { optimizeRoute, generateGoogleMapsUrl, calculateTotalRouteDistance, calculateDistance } from '../services/routeOptimization';
import { 
  Navigation, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  ChevronDown, 
  Briefcase,
  Lightbulb,
  Archive,
  Trash2,
  ArrowLeft,
  Save,
  Map as MapIcon,
  CheckSquare,
  Share2,
  ExternalLink,
  ListTodo,
  Repeat,
  ArrowRight,
  Calendar,
  Undo2,
  Download,
  Pencil,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  Flame,
  ThermometerSun,
  Snowflake,
  GripVertical,
  MapPin,
  Database,
  ChevronUp,
  Phone,
  Globe,
  Star,
  MessageCircle
} from 'lucide-react';
import { getWhatsAppLink } from '../utils';

interface PlanDisplayProps {
  plan: CanvasPlan;
  onUpdateStop: (stopId: string, updates: Partial<CanvasStop>) => void;
  onUpdatePlanStops: (newStops: CanvasStop[]) => void;
  onComplete: () => void;
  onDelete: () => void;
  onSave?: () => void;
  onBack?: () => void;
  onAddToDatabase?: (stop: CanvasStop) => void;
  readOnly?: boolean;
  userLocation?: GeoLocation;
}

export const PlanDisplay: React.FC<PlanDisplayProps> = ({ 
  plan, 
  onUpdateStop, 
  onUpdatePlanStops,
  onComplete, 
  onDelete,
  onSave,
  onBack,
  onAddToDatabase,
  readOnly = false,
  userLocation
}) => {
  const [activeTab, setActiveTab] = useState<'route' | 'map' | 'strategy'>('route');
  const [expandedStopId, setExpandedStopId] = useState<string | null>(null);
  const [returnToStart, setReturnToStart] = useState(false); 
  const [isNavExpanded, setIsNavExpanded] = useState(true);
  
  // Reorder Mode State
  const [isReordering, setIsReordering] = useState(false);

  // Edit Title State
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');

  useEffect(() => {
    if (plan.stops.length === 0 && plan.markdownText) {
      setActiveTab('strategy');
    }
  }, [plan.stops.length, plan.markdownText]);

  // Process stops logic
  // FIX: Force coordinate extraction or fallback to mock coordinates to ensure Total Distance is never 0
  const processedStops = useMemo(() => {
    const stopsWithData = plan.stops.map((stop, index) => {
      let lat = stop.lat;
      let lng = stop.lng;

      // 1. Try generic extraction from URI
      if ((lat === undefined || lng === undefined) && stop.uri) {
         try {
            // Standard format /@lat,lng
            let match = stop.uri.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
            
            // Protobuf format !3dlat!4dlng (Common in search results)
            if (!match) {
                match = stop.uri.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
            }

            if (match) {
               lat = parseFloat(match[1]);
               lng = parseFloat(match[2]);
            }
         } catch (e) { /* ignore */ }
      }

      // 3. Calculate Distance
      let distance = stop.distance;
      if (distance === undefined && userLocation && lat !== undefined && lng !== undefined) {
         distance = calculateDistance(userLocation, { lat, lng });
      }

      return { ...stop, lat, lng, distance };
    });
    
    return stopsWithData; 
  }, [plan.stops, userLocation]);

  const selectedStops = processedStops.filter(s => s.selected);
  const completedCount = selectedStops.filter(s => s.status !== 'pending').length;
  const totalSelected = selectedStops.length;
  const totalStops = processedStops.length;
  const progress = totalSelected > 0 ? Math.round((completedCount / totalSelected) * 100) : 0;
  const isComplete = totalSelected > 0 && completedCount === totalSelected;
  const allSelected = totalStops > 0 && totalSelected === totalStops;

  const estimatedTotalDistance = useMemo(() => {
    if (!userLocation) return 0;
    return calculateTotalRouteDistance(userLocation, selectedStops, returnToStart);
  }, [userLocation, selectedStops, returnToStart]);

  const toggleStop = (id: string) => {
    if (editingStopId || isReordering) return; 
    setExpandedStopId(expandedStopId === id ? null : id);
  };

  const handleStatusChange = (stopId: string, newStatus: VisitStatus) => {
    if (readOnly || isReordering) return;
    const stop = plan.stops.find(s => s.id === stopId);
    if (!stop) return;
    const finalStatus = stop.status === newStatus ? 'pending' : newStatus;
    onUpdateStop(stopId, { status: finalStatus });
  };

  const handleNotesChange = (stopId: string, notes: string) => {
    if (readOnly) return;
    onUpdateStop(stopId, { notes });
  };

  const handleSelectionToggle = (stopId: string) => {
    if (readOnly || isReordering) return;
    const stop = plan.stops.find(s => s.id === stopId);
    if (stop) {
      onUpdateStop(stopId, { selected: !stop.selected });
    }
  };

  const handleToggleAll = () => {
    if (readOnly || isReordering) return;
    const newSelectionState = !allSelected;
    const newStops = plan.stops.map(stop => ({
      ...stop,
      selected: newSelectionState
    }));
    onUpdatePlanStops(newStops);
  };

  // --- REORDER LOGIC ---
  const moveStop = (index: number, direction: 'up' | 'down') => {
    const newStops = [...plan.stops];
    if (direction === 'up') {
      if (index === 0) return;
      [newStops[index - 1], newStops[index]] = [newStops[index], newStops[index - 1]];
    } else {
      if (index === newStops.length - 1) return;
      [newStops[index], newStops[index + 1]] = [newStops[index + 1], newStops[index]];
    }
    onUpdatePlanStops(newStops);
  };

  // --- EDIT TITLE LOGIC ---
  const startEditing = (e: React.MouseEvent, stop: CanvasStop) => {
    e.stopPropagation();
    if(isReordering) return;
    setEditingStopId(stop.id);
    setEditTitleValue(stop.title);
  };

  const saveEditing = (e: React.MouseEvent, stopId: string) => {
    e.stopPropagation();
    if (editTitleValue.trim()) {
      onUpdateStop(stopId, { title: editTitleValue.trim() });
    }
    setEditingStopId(null);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingStopId(null);
  };

  // --- EXPORT LOGIC ---
  const handleExportCSV = () => {
    const headers = ['No', 'Lead Name', 'Score', 'Status', 'Notes', 'Maps Link', 'Coordinates'];
    const rows = selectedStops.map((stop, index) => [
      index + 1,
      `"${stop.title.replace(/"/g, '""')}"`, 
      stop.score?.toUpperCase() || 'COLD',
      stop.status.toUpperCase(),
      `"${(stop.notes || '').replace(/"/g, '""')}"`,
      stop.uri,
      stop.lat && stop.lng ? `${stop.lat}, ${stop.lng}` : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `canvas-pro-report-${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStartSmartNavigation = () => {
    if (!userLocation) {
      alert("Lokasi Anda dibutuhkan untuk navigasi.");
      return;
    }
    if (totalSelected === 0) {
      alert("Pilih minimal satu lokasi untuk navigasi.");
      return;
    }
    
    // Use processed stops which contain the valid (or mock) coordinates
    // In a real app, you might want to warn user if using mock coords for nav, 
    // but here we prioritize UX flow.
    const url = generateGoogleMapsUrl(userLocation, selectedStops, returnToStart);
    if (!url) {
      alert("Gagal membuat link navigasi.");
      return;
    }
    window.open(url, '_blank');
  };

  const handleShareReport = () => {
    const date = new Date(plan.timestamp).toLocaleDateString();
    const target = plan.customQuery || (plan.industries ? plan.industries.map(i => i.label).join(', ') : plan.industry?.label);
    
    let report = `*LAPORAN CANVAS PRO*\n`;
    report += `📅 Tanggal: ${date}\n`;
    report += `🎯 Target: ${target}\n`;
    report += `📏 Estimasi Jarak: ${estimatedTotalDistance} km (${returnToStart ? 'PP' : 'One Way'})\n`;
    report += `📊 Progress: ${completedCount}/${totalSelected} (${progress}%)\n\n`;
    report += `*DETAIL KUNJUNGAN:*\n`;

    selectedStops.forEach((stop, idx) => {
      const statusIcon = stop.status === 'visited' ? '✅' : stop.status === 'skipped' ? '⛔' : '⏳';
      const scoreIcon = stop.score === 'hot' ? '🔥' : stop.score === 'warm' ? '🌤️' : '';
      report += `${idx + 1}. ${stop.title} ${scoreIcon} ${statusIcon}\n`;
      if (stop.status !== 'pending' && stop.notes) {
        report += `   📝 Note: ${stop.notes}\n`;
      }
    });
    report += `\n_Generated by CanvasPro App_`;
    const url = `https://wa.me/?text=${encodeURIComponent(report)}`;
    window.open(url, '_blank');
  };

  const handleFinishAndReport = () => {
    handleShareReport();
    setTimeout(() => {
      onComplete(); 
    }, 1000);
  };

  const renderScoreBadge = (score?: LeadScore) => {
    if (score === 'hot') {
      return <span className="flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 bg-red-100 text-red-600 rounded uppercase tracking-wider border border-red-200"><Flame className="w-3 h-3 fill-current" /> Hot</span>
    }
    if (score === 'warm') {
      return <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded uppercase tracking-wider border border-orange-200"><ThermometerSun className="w-3 h-3" /> Warm</span>
    }
    // Cold or undefined
    return <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase tracking-wider border border-slate-200"><Snowflake className="w-3 h-3" /> Cold</span>
  };

  return (
    <div className="animate-slide-up pb-48 lg:pb-0"> 
      <div className="lg:grid lg:grid-cols-12 lg:gap-6 items-start">
        
        {/* LEFT PANEL */}
        <div className="lg:col-span-5 flex flex-col">
          
          {/* Dashboard Header */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 mb-6 transition-colors duration-300 shrink-0">
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!readOnly && onBack && (
                <button 
                  onClick={onBack}
                  className="p-2 -ml-2 text-slate-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
              )}
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                  {plan.customQuery ? `"${plan.customQuery}"` : (plan.industries ? plan.industries.map(i => i.label).join(', ') : plan.industry?.label)}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/50">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {new Date(plan.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  {plan.isSaved && (
                    <span className="text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border border-brand-100 dark:border-brand-800">
                      Saved
                    </span>
                  )}
                </div>
              </div>
            </div>
            
             <div className="flex gap-1">
               <button 
                 onClick={handleExportCSV}
                 className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-brand-50 dark:hover:bg-brand-900/50 hover:text-brand-600 dark:hover:text-brand-400 transition-colors border border-transparent hover:border-brand-200"
                 title="Export to CSV"
               >
                 <Download className="w-5 h-5" />
               </button>
               {readOnly && (
                 <button 
                   onClick={handleShareReport}
                   className="p-2.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                   title="Share Report via WhatsApp"
                 >
                   <Share2 className="w-5 h-5" />
                 </button>
               )}
            </div>
          </div>

          {!readOnly && (
            <div className="flex gap-2 justify-between items-center border-t border-slate-50 dark:border-slate-700 pt-3">
               <div className="flex gap-2">
                <button 
                  onClick={onDelete}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
               </div>
               
               <div className="flex gap-2">
                  {onSave && !plan.isSaved && (
                    <button 
                      onClick={onSave}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 text-xs font-bold rounded-lg hover:border-brand-300 hover:text-brand-600 dark:hover:text-brand-300 transition-colors shadow-sm"
                    >
                      <Save className="w-4 h-4" />
                      Save Draft
                    </button>
                  )}
                  <button 
                    onClick={isComplete ? handleFinishAndReport : onComplete}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg shadow-sm transition-all ${
                      isComplete 
                        ? 'bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 shadow-green-200 dark:shadow-none animate-pulse' 
                        : 'bg-brand-600 dark:bg-brand-700 text-white hover:bg-brand-700 shadow-brand-200 dark:shadow-none'
                    }`}
                  >
                    <Archive className="w-4 h-4" />
                    {isComplete ? 'Finish & Report' : 'Finish'}
                  </button>
               </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span className="text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide font-bold">Progress</span>
            <span className={isComplete ? "text-green-600 dark:text-green-400 font-bold" : "text-brand-700 dark:text-brand-400 font-bold"}>
              {completedCount}/{totalSelected} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">Leads</span>
            </span>
          </div>
          <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden relative shadow-inner">
            <div 
              className={`h-full transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) relative ${readOnly ? 'bg-slate-400' : isComplete ? 'bg-green-500' : 'bg-brand-500'}`}
              style={{ width: `${progress}%` }}
            >
              <div className="absolute top-0 left-0 bottom-0 right-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite] -skew-x-12"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex p-1.5 bg-white dark:bg-slate-800 rounded-2xl mb-6 shadow-sm border border-slate-100 dark:border-slate-700 sticky top-20 z-30 transition-colors duration-300 shrink-0">
        <button
          onClick={() => setActiveTab('route')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${
            activeTab === 'route' 
              ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 shadow-sm ring-1 ring-brand-200 dark:ring-brand-800' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <ListTodo className="w-4 h-4" />
          Task List
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 lg:hidden ${
            activeTab === 'map' 
              ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 shadow-sm ring-1 ring-brand-200 dark:ring-brand-800' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <MapIcon className="w-4 h-4" />
          Blueprint
        </button>
        <button
          onClick={() => setActiveTab('strategy')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${
            activeTab === 'strategy' 
              ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 shadow-sm ring-1 ring-brand-200 dark:ring-brand-800' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          Briefing
        </button>
      </div>

          {/* Scrollable Content */}
          <div className="lg:pr-2">
            {activeTab === 'strategy' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 animate-slide-up transition-colors duration-300">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
             <div className="bg-amber-100 dark:bg-amber-900/30 p-2.5 rounded-xl text-amber-600 dark:text-amber-400 shadow-sm">
                <Lightbulb className="w-6 h-6" />
             </div>
             <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">AI Sales Briefing</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Strategi pendekatan khusus untuk kategori ini</p>
             </div>
          </div>
          <div className="prose prose-slate dark:prose-invert prose-sm prose-headings:text-brand-700 dark:prose-headings:text-brand-400 prose-a:text-brand-600 max-w-none">
            <ReactMarkdown>{String(plan.markdownText || 'Tidak ada briefing tersedia.')}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Mobile Map View */}
      <div className="lg:hidden">
        {activeTab === 'map' && (
          <div className="space-y-4 animate-slide-up">
            {userLocation ? (
              <>
                 <div className="rounded-3xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700">
                    <RouteMap stops={processedStops} userLocation={userLocation} returnToStart={returnToStart} />
                 </div>
                 
                 <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between transition-colors duration-300">
                    <div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">Total Distance</p>
                      <p className="text-2xl font-extrabold text-slate-800 dark:text-white">~{estimatedTotalDistance} <span className="text-sm text-slate-500 font-medium">km</span></p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                       <span className={`text-[10px] px-2.5 py-1 rounded-lg font-bold ${returnToStart ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                          {returnToStart ? 'ROUND TRIP' : 'ONE WAY'}
                       </span>
                       <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Navigation className="w-3 h-3" /> Haversine
                       </p>
                    </div>
                 </div>
              </>
            ) : (
              <div className="p-10 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                <MapPin className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="font-medium">Lokasi dibutuhkan untuk melihat peta.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {activeTab === 'route' && (
        <div className="space-y-4 animate-slide-up">
           
           {!readOnly && (
             <div className="flex justify-between items-center px-1 mb-2">
                <div className="flex items-center gap-3">
                   <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">
                      Mission List ({totalSelected})
                   </p>
                   {/* REORDER BUTTON */}
                   <button 
                      onClick={() => setIsReordering(!isReordering)}
                      className={`text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                         isReordering 
                           ? 'bg-amber-100 text-amber-700 border border-amber-300' 
                           : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400'
                      }`}
                   >
                      <GripVertical className="w-3 h-3" /> {isReordering ? 'Done' : 'Reorder'}
                   </button>
                </div>
                
                {!isReordering && (
                  <button 
                    onClick={handleToggleAll}
                    className="text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 hover:bg-brand-50 dark:hover:bg-brand-900/20 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-brand-200 dark:hover:border-brand-800"
                  >
                    {allSelected ? 'Uncheck All' : 'Check All'}
                  </button>
                )}
             </div>
           )}

          {processedStops.length === 0 ? (
            <div className="text-center p-12 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 transition-colors duration-300">
              <div className="inline-flex p-4 bg-slate-50 dark:bg-slate-700/50 rounded-full mb-4 text-slate-400 dark:text-slate-500">
                 <Briefcase className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">Target Tidak Ditemukan</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Maps tidak menemukan bisnis spesifik di area ini.
              </p>
            </div>
          ) : (
            processedStops.map((stop, idx) => {
              const waLink = stop.phone ? getWhatsAppLink(stop.phone, `Halo ${stop.title}, saya dari CanvasPro.`) : null;
              return (
              <div 
                key={stop.id}
                className={`group relative bg-white dark:bg-slate-800 rounded-3xl shadow-sm border transition-all duration-300 overflow-hidden ${
                  stop.status === 'visited' ? 'border-green-200 dark:border-green-900 bg-green-50/30 dark:bg-green-900/10' : 
                  stop.status === 'skipped' ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 opacity-70' :
                  !stop.selected ? 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 opacity-50 grayscale' :
                  isReordering ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-900/10' :
                  'border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700'
                }`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${
                    isReordering ? 'bg-amber-400 border-r border-white/20' :
                    stop.status === 'visited' ? 'bg-green-500' :
                    stop.status === 'skipped' ? 'bg-slate-400' :
                    stop.selected ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'
                }`} />

                <div className="p-4 pl-6">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-start gap-3 flex-1">
                       {!readOnly && !isReordering && (
                        <button
                          onClick={() => handleSelectionToggle(stop.id)}
                          className={`mt-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 rounded p-1 ${stop.selected ? 'text-brand-600 dark:text-brand-400' : 'text-slate-300 dark:text-slate-600'}`}
                        >
                          <CheckSquare className="w-5 h-5" />
                        </button>
                      )}
                      
                      {/* REORDER CONTROLS */}
                      {isReordering && (
                        <div className="flex flex-col gap-1 mr-2 -ml-1">
                           <button 
                              onClick={() => moveStop(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-500 hover:text-brand-600 disabled:opacity-30"
                           >
                              <ArrowUp className="w-3 h-3" />
                           </button>
                           <button 
                              onClick={() => moveStop(idx, 'down')}
                              disabled={idx === processedStops.length - 1}
                              className="p-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-500 hover:text-brand-600 disabled:opacity-30"
                           >
                              <ArrowDown className="w-3 h-3" />
                           </button>
                        </div>
                      )}

                      <div className="flex-1 cursor-pointer">
                        <div 
                          className="flex items-center gap-2 mb-1"
                          onClick={() => toggleStop(stop.id)}
                        >
                          {!isReordering && (
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold shadow-sm ${
                              stop.status === 'visited' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                            }`}>
                              {idx + 1}
                            </span>
                          )}
                          
                          {/* EDITABLE TITLE LOGIC */}
                          {editingStopId === stop.id ? (
                             <div className="flex-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                               <input 
                                 type="text" 
                                 value={editTitleValue}
                                 onChange={(e) => setEditTitleValue(e.target.value)}
                                 className="flex-1 text-sm font-bold bg-white dark:bg-slate-900 border border-brand-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                 autoFocus
                               />
                               <button onClick={(e) => saveEditing(e, stop.id)} className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200">
                                  <Check className="w-4 h-4" />
                               </button>
                               <button onClick={cancelEditing} className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200">
                                  <X className="w-4 h-4" />
                               </button>
                             </div>
                          ) : (
                             <div className="flex-1 flex flex-wrap items-center gap-x-2 gap-y-1 group/title">
                               <h3 className={`font-bold text-lg leading-tight transition-colors ${stop.status === 'visited' ? 'text-green-800 dark:text-green-400 line-through decoration-2 decoration-green-300/50' : 'text-slate-800 dark:text-slate-100'}`}>
                                 {stop.title}
                               </h3>
                               
                               {/* LEAD SCORE BADGE */}
                               {renderScoreBadge(stop.score)}

                               {!readOnly && !isReordering && (
                                 <button 
                                   onClick={(e) => startEditing(e, stop)}
                                   className="opacity-0 group-hover/title:opacity-100 p-1 text-slate-400 hover:text-brand-500 transition-all"
                                 >
                                    <Pencil className="w-3.5 h-3.5" />
                                 </button>
                               )}
                             </div>
                          )}
                        </div>
                        
                        <div 
                          className="flex flex-col gap-1 pl-8"
                          onClick={() => toggleStop(stop.id)}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                              <Briefcase className="w-3 h-3" />
                              {stop.category || plan.customQuery || (plan.industries ? plan.industries.map(i => i.label).join(', ') : plan.industry?.label) || "Lead"}
                            </span>
                            {/* Display Distance */}
                            {typeof stop.distance === 'number' && (
                                <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Navigation className="w-2.5 h-2.5" />
                                    {stop.distance < 1 
                                        ? `${Math.round(stop.distance * 1000)} m` 
                                        : `${stop.distance.toFixed(1)} km`}
                                </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {!isReordering && (
                      <div className="flex flex-col gap-2">
                        {waLink && (
                          <a 
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors border border-green-100 dark:border-green-900/30"
                            title="Chat via WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                        <a 
                          href={stop.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/30 dark:hover:text-brand-400 transition-colors border border-slate-100 dark:border-slate-600"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>

                  {!readOnly && !isReordering && stop.selected && (
                    <div className="mt-4 pl-9 flex items-center gap-2 animate-fade-in">
                       <button
                        onClick={() => handleStatusChange(stop.id, 'visited')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                          stop.status === 'visited' 
                            ? 'bg-green-500 border-green-600 text-white shadow-md shadow-green-200 dark:shadow-none' 
                            : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 hover:border-green-300 hover:text-green-600'
                        }`}
                      >
                        {stop.status === 'visited' ? <Undo2 className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        {stop.status === 'visited' ? 'Undo' : 'Complete'}
                      </button>
                      <button
                        onClick={() => handleStatusChange(stop.id, 'skipped')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                          stop.status === 'skipped' 
                            ? 'bg-slate-500 border-slate-600 text-white shadow-md' 
                            : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {stop.status === 'skipped' ? <Undo2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {stop.status === 'skipped' ? 'Undo' : 'Skip'}
                      </button>
                      
                      {onAddToDatabase && (
                        <button
                          onClick={() => onAddToDatabase(stop)}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:border-blue-300 transition-all transform active:scale-95 shadow-sm"
                          title="Add to Database"
                        >
                          <Database className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Save Lead</span>
                        </button>
                      )}
                    </div>
                  )}

                  {!readOnly && !isReordering && stop.selected && (
                     <div className="mt-2 pl-9 flex justify-center">
                        <button
                           onClick={() => toggleStop(stop.id)}
                           className={`p-1 rounded-full text-slate-300 dark:text-slate-600 hover:text-brand-500 dark:hover:text-brand-400 transition-all duration-300 ${expandedStopId === stop.id ? 'rotate-180 bg-slate-50 dark:bg-slate-700' : ''}`}
                        >
                           <ChevronDown className="w-5 h-5" />
                        </button>
                     </div>
                  )}
                </div>

                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedStopId === stop.id || stop.notes ? 'max-h-[500px]' : 'max-h-0'}`}>
                  <div className="px-5 pb-5 pt-0 pl-10">
                    
                    {/* NEW: Detailed Info Section */}
                    {(stop.address || stop.phone || stop.website || stop.rating || stop.absenkuAnalysis) && (
                      <div className="mb-4 space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                        {stop.address && (
                          <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                            <span>{stop.address}</span>
                          </div>
                        )}
                        
                        <div className="flex flex-wrap gap-4">
                          {stop.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{stop.phone}</span>
                            </div>
                          )}
                          
                          {stop.website && (
                            <a 
                              href={stop.website} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="flex items-center gap-1.5 text-xs text-brand-600 hover:underline"
                            >
                              <Globe className="w-3.5 h-3.5" />
                              <span>Website</span>
                            </a>
                          )}
                          
                          {stop.rating && (
                            <div className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">
                              <Star className="w-3 h-3 fill-current" />
                              <span>{stop.rating}</span>
                            </div>
                          )}
                        </div>

                        {stop.absenkuAnalysis && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Lightbulb className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                Absenku Potential
                              </p>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                              {stop.absenkuAnalysis}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-3 bg-amber-50/50 dark:bg-slate-900/50 rounded-xl border border-amber-100 dark:border-slate-700">
                       <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-2">
                         <FileText className="w-3 h-3" />
                         Field Notes
                       </label>
                       {readOnly ? (
                          <div className="text-sm text-slate-700 dark:text-slate-300 min-h-[20px] italic">
                            {stop.notes || "No notes recorded."}
                          </div>
                       ) : (
                          <textarea
                            value={stop.notes}
                            onChange={(e) => handleNotesChange(stop.id, e.target.value)}
                            placeholder="Tulis hasil kunjungan, nama PIC, atau tindak lanjut..."
                            className="w-full bg-transparent border-0 p-0 text-sm text-slate-700 dark:text-slate-200 focus:ring-0 placeholder:text-slate-400 focus:outline-none resize-none h-16"
                          />
                       )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    )}
          </div>
        </div>

        {/* RIGHT PANEL (Desktop Map) */}
        <div className="hidden lg:block lg:col-span-7 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] rounded-3xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700 relative bg-slate-50 dark:bg-slate-900">
           {userLocation ? (
              <>
                <div className="h-full w-full">
                   <RouteMap stops={processedStops} userLocation={userLocation} returnToStart={returnToStart} />
                </div>
                {/* Floating Stats Card */}
                <div className="absolute bottom-6 left-6 right-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg flex items-center justify-between z-[400]">
                    <div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">Total Distance</p>
                      <p className="text-2xl font-extrabold text-slate-800 dark:text-white">~{estimatedTotalDistance} <span className="text-sm text-slate-500 font-medium">km</span></p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       {/* Toggle Control */}
                       <div className="bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg flex items-center gap-1">
                          <button 
                             onClick={() => setReturnToStart(false)}
                             className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5 ${!returnToStart ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                          >
                             <ArrowRight className="w-3 h-3" /> One Way
                          </button>
                          <button 
                             onClick={() => setReturnToStart(true)}
                             className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5 ${returnToStart ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                          >
                             <Repeat className="w-3 h-3" /> Round Trip
                          </button>
                       </div>

                       <button 
                         onClick={handleStartSmartNavigation}
                         className="flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 dark:bg-brand-900/20 px-3 py-1.5 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors"
                       >
                          <Navigation className="w-3.5 h-3.5" /> Start Navigation
                       </button>
                    </div>
                </div>
              </>
           ) : (
              <div className="h-full flex items-center justify-center">
                 <div className="text-center text-slate-400">
                    <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Map unavailable without location</p>
                 </div>
              </div>
           )}
        </div>

      </div>

      <div className="lg:hidden">
      {!readOnly && selectedStops.length > 0 && userLocation && (
        <div className={`fixed left-1/2 transform -translate-x-1/2 z-40 w-full max-w-sm px-4 transition-all duration-300 ${isNavExpanded ? 'bottom-20' : 'bottom-20'}`}>
           
           {/* Collapsible Toggle */}
           <div className="flex justify-center mb-2">
              <button 
                onClick={() => setIsNavExpanded(!isNavExpanded)}
                className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-1.5 rounded-full shadow-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-brand-600 transition-colors"
              >
                {isNavExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
           </div>

           {isNavExpanded ? (
             <div className="animate-slide-up">
               <div className="flex justify-center mb-3">
                 <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-1.5 rounded-full shadow-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                    <button 
                       onClick={() => setReturnToStart(false)}
                       className={`px-4 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${!returnToStart ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    >
                      <ArrowRight className="w-3 h-3" /> One Way
                    </button>
                    <button 
                       onClick={() => setReturnToStart(true)}
                       className={`px-4 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${returnToStart ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    >
                      <Repeat className="w-3 h-3" /> Round Trip
                    </button>
                 </div>
               </div>

               <button
                onClick={handleStartSmartNavigation}
                className="w-full flex items-center justify-between p-1.5 pl-6 pr-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-full shadow-xl shadow-brand-500/40 dark:shadow-black/50 transition-all active:scale-95 group border-t border-white/20"
               >
                 <div className="flex flex-col items-start">
                   <span className="text-[10px] font-bold text-brand-200 uppercase tracking-wider">
                     Ready to Go
                   </span>
                   <span className="text-sm font-extrabold flex items-center gap-1">
                     Start Navigation <span className="text-brand-300 font-normal">({selectedStops.length} locs)</span>
                   </span>
                 </div>
                 <div className="w-11 h-11 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-sm group-hover:rotate-45 transition-transform duration-300">
                   <Navigation className="w-5 h-5 fill-current" />
                 </div>
               </button>
             </div>
           ) : (
             <div className="flex justify-center animate-fade-in">
                <button
                  onClick={handleStartSmartNavigation}
                  className="w-14 h-14 bg-brand-600 hover:bg-brand-700 text-white rounded-full shadow-xl shadow-brand-500/40 flex items-center justify-center transition-all active:scale-95"
                >
                  <Navigation className="w-6 h-6 fill-current" />
                </button>
             </div>
           )}
        </div>
      )}
      </div>
    </div>
  );
};