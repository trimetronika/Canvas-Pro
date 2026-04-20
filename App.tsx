import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  MapPin, 
  Building2, 
  Briefcase, 
  Coffee, 
  Factory, 
  Zap, 
  Target, 
  AlertTriangle, 
  Users,
  GraduationCap,
  Stethoscope,
  RefreshCw,
  FolderOpen,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Search,
  Sparkles,
  Command,
  Menu
} from 'lucide-react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { GeoLocation, CanvasPlan, IndustryOption, CanvasStop, DatabaseItem } from './types';
import { generateCanvasRoute } from './services/geminiService';
import { PlanDisplay } from './components/PlanDisplay';
import { LoadingState } from './components/LoadingState';
import { Sidebar } from './components/Sidebar';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { DatabaseView } from './components/DatabaseView';
import { DEFAULT_GEMINI_MODEL, GEMINI_MODEL_OPTIONS, isValidGeminiModel, LOCAL_STORAGE_GEMINI_MODEL_KEY } from './geminiModels';

import { LocationPicker } from './components/LocationPicker';

// Optimized queries for Google Maps Search (shorter, more keyword-focused)
const INDUSTRY_OPTIONS: IndustryOption[] = [
  { id: 'ai-recommendation', label: 'AI Auto', query: 'Best B2B Industries', icon: 'sparkles' },
  { id: 'corporate', label: 'Office', query: 'Perkantoran, Office Building', icon: 'building' },
  { id: 'industrial', label: 'Factory', query: 'Pabrik, Gudang, Kawasan Industri', icon: 'factory' },
  { id: 'outsourcing', label: 'Outsource', query: 'Jasa Keamanan, Cleaning Service, Yayasan', icon: 'users' },
  { id: 'education', label: 'Education', query: 'Sekolah Swasta, Universitas, Course', icon: 'school' },
  { id: 'health', label: 'Medical', query: 'Klinik, Rumah Sakit, Apotek Besar', icon: 'health' },
  { id: 'retail', label: 'Retail', query: 'Distributor, Toko Grosir, Supermarket', icon: 'briefcase' },
  { id: 'hospitality', label: 'Horeca', query: 'Hotel, Restoran, Cafe', icon: 'coffee' },
  { id: 'startup', label: 'Tech', query: 'Software House, Digital Agency', icon: 'zap' },
];

const LOCAL_STORAGE_ACTIVE_KEY = 'canvasPro_activePlan';
const LOCAL_STORAGE_HISTORY_KEY = 'canvasPro_history';
const LOCAL_STORAGE_SAVED_KEY = 'canvasPro_savedRoutes';
const LOCAL_STORAGE_DATABASE_KEY = 'canvasPro_database';
const LOCAL_STORAGE_MAX_RADIUS_KEY = 'canvasPro_maxRadius';
const LOCAL_STORAGE_USER_EMAIL_KEY = 'canvasPro_userEmail';
const LOCAL_STORAGE_WHATSAPP_TEMPLATE_KEY = 'canvasPro_whatsappTemplate';

type AppView = 'active' | 'history' | 'settings' | 'database';
type GeminiRateLimitBannerState = {
  model: string;
  retryAfterSeconds?: number;
};

const App: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  const [currentView, setCurrentView] = useState<AppView>('active');
  const [selectedHistoryPlan, setSelectedHistoryPlan] = useState<CanvasPlan | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [loadingLoc, setLoadingLoc] = useState(true);
  const [locError, setLocError] = useState<string | null>(null);
  
  const [targetArea, setTargetArea] = useState('');
  const [targetLocation, setTargetLocation] = useState<GeoLocation | null>(null); // For manual selection
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [radius, setRadius] = useState(1); // Default 1km
  const [maxRadius, setMaxRadius] = useState(10); // Default max 10km

  const [selectedIndustries, setSelectedIndustries] = useState<IndustryOption[]>([INDUSTRY_OPTIONS[0]]);
  const [customSearchTerm, setCustomSearchTerm] = useState('');
  
  const [activePlan, setActivePlan] = useState<CanvasPlan | null>(null);
  const [history, setHistory] = useState<CanvasPlan[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<CanvasPlan[]>([]);
  const [database, setDatabase] = useState<DatabaseItem[]>([]);
  
  const [userEmail, setUserEmail] = useState<string>('');
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [whatsappTemplate, setWhatsappTemplate] = useState<string>('');
  const [geminiModel, setGeminiModel] = useState<string>(DEFAULT_GEMINI_MODEL);
  const [geminiRateLimitWarning, setGeminiRateLimitWarning] = useState<GeminiRateLimitBannerState | null>(null);

  // Prevents auto-sync from firing while we are applying cloud data
  const isHydratingFromCloud = useRef(false);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from Local Storage on mount
  useEffect(() => {
    try {
      const savedActive = localStorage.getItem(LOCAL_STORAGE_ACTIVE_KEY);
      if (savedActive) {
        setActivePlan(JSON.parse(savedActive));
      }

      const savedHistory = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }

      const savedRoutesData = localStorage.getItem(LOCAL_STORAGE_SAVED_KEY);
      if (savedRoutesData) {
        setSavedRoutes(JSON.parse(savedRoutesData));
      }

      const savedDatabase = localStorage.getItem(LOCAL_STORAGE_DATABASE_KEY);
      if (savedDatabase) {
        setDatabase(JSON.parse(savedDatabase));
      }

      const savedMaxRadius = localStorage.getItem(LOCAL_STORAGE_MAX_RADIUS_KEY);
      if (savedMaxRadius) {
        setMaxRadius(parseInt(savedMaxRadius));
      }

      const savedEmail = localStorage.getItem(LOCAL_STORAGE_USER_EMAIL_KEY);
      if (savedEmail) {
        setUserEmail(savedEmail);
      }

      const savedWhatsappTemplate = localStorage.getItem(LOCAL_STORAGE_WHATSAPP_TEMPLATE_KEY);
      if (savedWhatsappTemplate !== null) {
        setWhatsappTemplate(savedWhatsappTemplate);
      }

      const savedGeminiModel = localStorage.getItem(LOCAL_STORAGE_GEMINI_MODEL_KEY);
      if (savedGeminiModel && isValidGeminiModel(savedGeminiModel)) {
        setGeminiModel(savedGeminiModel);
      }
      
      setIsLoaded(true);
    } catch (e) {
      console.error("Failed to load saved data", e);
      setIsLoaded(true);
    }
  }, []);

  // Save Active Plan
  useEffect(() => {
    if (!isLoaded) return;
    if (activePlan) {
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_KEY, JSON.stringify(activePlan));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_ACTIVE_KEY);
    }
  }, [activePlan, isLoaded]);

  // Save History
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(history));
  }, [history, isLoaded]);

  // Save Routes (Drafts)
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(LOCAL_STORAGE_SAVED_KEY, JSON.stringify(savedRoutes));
  }, [savedRoutes, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(LOCAL_STORAGE_DATABASE_KEY, JSON.stringify(database));
  }, [database, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(LOCAL_STORAGE_MAX_RADIUS_KEY, maxRadius.toString());
  }, [maxRadius, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    if (userEmail) {
      localStorage.setItem(LOCAL_STORAGE_USER_EMAIL_KEY, userEmail);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_USER_EMAIL_KEY);
    }
  }, [userEmail, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(LOCAL_STORAGE_WHATSAPP_TEMPLATE_KEY, whatsappTemplate);
  }, [whatsappTemplate, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(LOCAL_STORAGE_GEMINI_MODEL_KEY, geminiModel);
  }, [geminiModel, isLoaded]);

  // Cloud Sync Logic
  const applyCloudData = useCallback((cloudData: Record<string, unknown>) => {
    if (cloudData.history && Array.isArray(cloudData.history)) {
      setHistory(cloudData.history as CanvasPlan[]);
    }
    if (cloudData.savedRoutes && Array.isArray(cloudData.savedRoutes)) {
      setSavedRoutes(cloudData.savedRoutes as CanvasPlan[]);
    }
    if (cloudData.database && Array.isArray(cloudData.database)) {
      setDatabase(cloudData.database as DatabaseItem[]);
    }
    if (typeof cloudData.maxRadius === 'number') {
      setMaxRadius(cloudData.maxRadius);
    }
    if (typeof cloudData.lastSynced === 'number') {
      setLastSynced(cloudData.lastSynced);
    }
  }, []);

  const handleCloudSync = async (emailToSync?: string, dataOverrides?: { history?: CanvasPlan[], savedRoutes?: CanvasPlan[], database?: DatabaseItem[], maxRadius?: number }) => {
    const email = emailToSync || userEmail;
    if (!email) return;

    setSyncing(true);
    try {
      // Push current local data (or overrides) to cloud.
      // The server performs a read→merge→write union so no data is lost.
      const payload = {
        history: dataOverrides?.history || history,
        savedRoutes: dataOverrides?.savedRoutes || savedRoutes,
        database: dataOverrides?.database || database,
        maxRadius: dataOverrides?.maxRadius || maxRadius
      };

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, payload })
      });

      if (!response.ok) throw new Error('Failed to push data');

      const result = await response.json();

      // Apply the merged result returned by the server so local state is
      // immediately consistent with the union of all devices.
      if (result.data) {
        isHydratingFromCloud.current = true;
        applyCloudData(result.data as Record<string, unknown>);
        isHydratingFromCloud.current = false;
      } else if (result.lastSynced) {
        setLastSynced(result.lastSynced);
      }
    } catch (err) {
      console.error("Sync error:", err);
      setError("Gagal sinkronisasi dengan cloud.");
    } finally {
      setSyncing(false);
    }
  };

  // Initial pull: when email becomes available, fetch cloud data first so a
  // new device does not immediately overwrite cloud with its empty local state.
  useEffect(() => {
    if (!isLoaded || !userEmail) return;
    let cancelled = false;
    const pull = async () => {
      try {
        const fetchRes = await fetch(`/api/sync/${userEmail}`);
        if (!fetchRes.ok || cancelled) return;
        const cloudData = await fetchRes.json();
        if (cloudData && !cancelled) {
          isHydratingFromCloud.current = true;
          applyCloudData(cloudData as Record<string, unknown>);
          isHydratingFromCloud.current = false;
        }
      } catch (err) {
        console.error("Initial cloud pull error:", err);
      }
    };
    pull();
    return () => { cancelled = true; };
  // applyCloudData is stable (useCallback with no deps) so omitting it is safe.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail, isLoaded]);

  // Auto-sync on data changes (debounced)
  useEffect(() => {
    if (!isLoaded || !userEmail) return;
    // Skip the push triggered by applying cloud data to avoid echo loops
    if (isHydratingFromCloud.current) return;
    
    const timer = setTimeout(() => {
      handleCloudSync();
    }, 5000); // Sync every 5 seconds after last change

    return () => clearTimeout(timer);
  }, [history, savedRoutes, database, maxRadius, userEmail, isLoaded]);

  const fetchLocation = useCallback(() => {
    setLoadingLoc(true);
    setLocError(null);

    if (!("geolocation" in navigator)) {
      setLocError("Geolocation not supported.");
      setLoadingLoc(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLoadingLoc(false);
        setLocError(null);
      },
      (err) => {
        console.error(err);
        setLocError("Location access denied.");
        setLoadingLoc(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  const handleGenerate = async () => {
    if (useCurrentLocation && !location) {
      fetchLocation();
      return;
    }

    if (!useCurrentLocation && (!targetArea.trim() || !targetLocation)) {
      setError("Silakan pilih area target pada peta.");
      return;
    }

    if (selectedIndustries.length === 0 && !customSearchTerm.trim()) {
      setError("Pilih setidaknya satu industri atau masukkan kata kunci pencarian.");
      return;
    }
    
    setGenerating(true);
    setError(null);
    setGeminiRateLimitWarning(null);

    try {
      // Pass the custom search term if it exists, otherwise undefined
      const result = await generateCanvasRoute(
        useCurrentLocation ? location : targetLocation, 
        selectedIndustries, 
        customSearchTerm.trim() !== '' ? customSearchTerm : undefined,
        useCurrentLocation ? undefined : targetArea,
        radius,
        geminiModel
      );
      setActivePlan(result);
      setCustomSearchTerm(''); // Reset after use
    } catch (e: any) {
      console.error("Generate error", e);
      const isRateLimited = Boolean(e?.isRateLimitError);
      if (isRateLimited) {
        setGeminiRateLimitWarning({
          model: e?.model || geminiModel,
          retryAfterSeconds: e?.retryAfterSeconds,
        });
        setError(null);
        return;
      }
      let msg = "Gagal membuat rencana canvassing.";
      if (e instanceof Error) {
        msg = e.message;
      }
      setError(String(msg));
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateStop = (stopId: string, updates: Partial<CanvasStop>) => {
    if (!activePlan) return;
    const updatedStops = activePlan.stops.map(stop => 
      stop.id === stopId ? { ...stop, ...updates } : stop
    );
    setActivePlan({ ...activePlan, stops: updatedStops });
    
    if (activePlan.isSaved) {
       const updatedSaved = savedRoutes.map(r => r.id === activePlan.id ? { ...activePlan, stops: updatedStops } : r);
       setSavedRoutes(updatedSaved);
    }
  };

  const handleUpdatePlanStops = (newStops: CanvasStop[]) => {
    if (!activePlan) return;
    const newPlan = { ...activePlan, stops: newStops };
    setActivePlan(newPlan);
    
    if (activePlan.isSaved) {
       const updatedSaved = savedRoutes.map(r => r.id === activePlan.id ? newPlan : r);
       setSavedRoutes(updatedSaved);
    }
  };

  const handleSaveRoute = () => {
    if (!activePlan) return;
    if (activePlan.isSaved) return;

    const savedPlan = { ...activePlan, isSaved: true };
    setActivePlan(savedPlan);
    
    const newSaved = [savedPlan, ...savedRoutes];
    setSavedRoutes(newSaved);
    
    // Immediate local storage save
    localStorage.setItem(LOCAL_STORAGE_SAVED_KEY, JSON.stringify(newSaved));
    
    // Immediate cloud sync
    if (userEmail) {
      handleCloudSync(undefined, { savedRoutes: newSaved });
    }
  };

  const handleDeleteActive = () => {
    if (window.confirm("Hapus rencana aktif ini?")) {
      setActivePlan(null);
    }
  };

  const handleBackFromActive = () => {
    if (!activePlan) {
      setActivePlan(null);
      return;
    }
    if (activePlan.isSaved) {
      setActivePlan(null);
      return;
    }
    const hasInteractions = activePlan.stops.some(stop => stop.status !== 'pending' || stop.notes);
    if (hasInteractions) {
      if (window.confirm("Simpan rute ini sebelum kembali? (Cancel untuk buang)")) {
         handleSaveRoute();
         setActivePlan(null);
      } else {
        setActivePlan(null);
      }
    } else {
      setActivePlan(null);
    }
  };

  const handleCompleteRun = () => {
    if (!activePlan) return;
    
    const unvisitedSelected = activePlan.stops.filter(s => s.selected && s.status === 'pending').length;
    
    if (unvisitedSelected > 0) {
      if (!window.confirm(`Anda masih memiliki ${unvisitedSelected} target kunjungan yang belum didatangi. Selesaikan sesi ini?`)) {
        return;
      }
    } else {
      if (!window.confirm("Selesaikan sesi canvassing ini dan simpan ke history?")) {
        return;
      }
    }

    // Create a deep copy to ensure history doesn't point to activePlan that gets nulled
    const planToSave = JSON.parse(JSON.stringify(activePlan));
    const newHistory = [planToSave, ...history];
    
    setHistory(newHistory);
    
    // Immediate local storage save for history to prevent loss on refresh
    localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(newHistory));

    if (activePlan.isSaved) {
      const newSaved = savedRoutes.filter(r => r.id !== activePlan.id);
      setSavedRoutes(newSaved);
      localStorage.setItem(LOCAL_STORAGE_SAVED_KEY, JSON.stringify(newSaved));
    }
    
    setActivePlan(null);
    localStorage.removeItem(LOCAL_STORAGE_ACTIVE_KEY);
    
    setCurrentView('history');
    
    // Trigger cloud sync immediately for history
    if (userEmail) {
      handleCloudSync(undefined, { history: newHistory });
    }
  };

  const handleClearHistory = () => {
     if(window.confirm("Clear all history?")) {
        setHistory([]);
     }
  };

  const handleClearSaved = () => {
    if(window.confirm("Clear all saved routes?")) {
       setSavedRoutes([]);
    }
  };

  const resumeSavedRoute = (plan: CanvasPlan) => {
     if (activePlan && !activePlan.isSaved && activePlan.stops.some(s => s.status !== 'pending')) {
        if(!window.confirm("Rute aktif saat ini belum tersimpan. Ganti dengan rute tersimpan?")) {
           return;
        }
     }
     setActivePlan(plan);
     window.scrollTo(0,0);
  };

  const deleteSavedRoute = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if(window.confirm("Hapus rute tersimpan ini permanen?")) {
       setSavedRoutes(savedRoutes.filter(r => r.id !== id));
    }
  };

  const resetToHome = () => {
     if (activePlan && !activePlan.isSaved) {
        if(!window.confirm("Kembali ke menu awal? Rute aktif yang belum disimpan akan hilang.")) return;
     }
     setActivePlan(null);
     setCurrentView('active');
  };

  const handleAddToDatabase = (stop: CanvasStop) => {
    // Check if already exists
    if (database.some(item => item.id === stop.id || (item.title === stop.title && item.uri === stop.uri))) {
      alert("Lead ini sudah ada di database.");
      return;
    }

    const newItem: DatabaseItem = {
      ...stop,
      savedAt: Date.now(),
      sourcePlanId: activePlan?.id
    };

    const newDatabase = [newItem, ...database];
    setDatabase(newDatabase);
    
    // Immediate local storage save
    localStorage.setItem(LOCAL_STORAGE_DATABASE_KEY, JSON.stringify(newDatabase));
    
    // Immediate cloud sync
    if (userEmail) {
      handleCloudSync(undefined, { database: newDatabase });
    }
    
    alert("Lead berhasil disimpan ke database!");
  };

  const handleRemoveFromDatabase = (id: string) => {
    const newDatabase = database.filter(item => item.id !== id);
    setDatabase(newDatabase);
    
    // Immediate local storage save
    localStorage.setItem(LOCAL_STORAGE_DATABASE_KEY, JSON.stringify(newDatabase));
    
    // Immediate cloud sync
    if (userEmail) {
      handleCloudSync(undefined, { database: newDatabase });
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'sparkles': return <Sparkles className="w-5 h-5 text-amber-400 fill-amber-100" />;
      case 'building': return <Building2 className="w-5 h-5" />;
      case 'factory': return <Factory className="w-5 h-5" />;
      case 'zap': return <Zap className="w-5 h-5" />;
      case 'coffee': return <Coffee className="w-5 h-5" />;
      case 'users': return <Users className="w-5 h-5" />;
      case 'school': return <GraduationCap className="w-5 h-5" />;
      case 'health': return <Stethoscope className="w-5 h-5" />;
      default: return <Briefcase className="w-5 h-5" />;
    }
  };

  // Render Logic
  const renderContent = () => {
    // 1. Viewing a specific history item
    if (selectedHistoryPlan) {
      return (
        <div className="animate-fade-in">
          <button 
            onClick={() => setSelectedHistoryPlan(null)}
            className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400"
          >
            <ArrowLeft className="w-4 h-4" /> Back to History
          </button>
          <PlanDisplay 
            plan={selectedHistoryPlan} 
            onUpdateStop={() => {}} 
            onUpdatePlanStops={() => {}}
            onComplete={() => {}} 
            onDelete={() => {}}
            readOnly={true} 
            userLocation={location || undefined}
            whatsappTemplate={whatsappTemplate}
          />
        </div>
      );
    }

    // 2. Settings View
    if (currentView === 'settings') {
       return <SettingsView 
        onClearHistory={handleClearHistory} 
        onClearSaved={handleClearSaved} 
        maxRadius={maxRadius}
        onMaxRadiusChange={setMaxRadius}
        userEmail={userEmail}
        onUserEmailChange={(email) => {
          setUserEmail(email);
          handleCloudSync(email);
        }}
        lastSynced={lastSynced}
        syncing={syncing}
        whatsappTemplate={whatsappTemplate}
        onWhatsappTemplateChange={setWhatsappTemplate}
        geminiModel={geminiModel}
        onGeminiModelChange={(model) => {
          setGeminiModel(model);
          setGeminiRateLimitWarning(null);
        }}
       />;
    }

    // 3. Main Active/Create View
    if (currentView === 'active') {
      if (generating) return <LoadingState />;
      
      if (activePlan) {
        return (
          <PlanDisplay 
            plan={activePlan} 
            onUpdateStop={handleUpdateStop}
            onUpdatePlanStops={handleUpdatePlanStops}
            onComplete={handleCompleteRun}
            onDelete={handleDeleteActive}
            onSave={handleSaveRoute}
            onBack={handleBackFromActive}
            onAddToDatabase={handleAddToDatabase}
            readOnly={false}
            userLocation={location || undefined}
            whatsappTemplate={whatsappTemplate}
          />
        );
      }

      // Create New Route View (HOME)
      return (
        <div className="animate-slide-up duration-500 pb-20 md:pb-0">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
            
            {/* LEFT PANEL: Controls */}
            <div className="md:col-span-5 lg:col-span-4 space-y-6">
              {/* Hero Section */}
              <div className="pt-4">
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 leading-tight">
                  Ready to <br />
                  <span className="text-brand-600 dark:text-brand-400">Hunt Leads?</span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  AI-powered routing to maximize your sales visits.
                </p>
              </div>

              {/* Location Mode Toggle */}
              <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <button 
                  onClick={() => setUseCurrentLocation(true)}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${useCurrentLocation ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  GPS Aktif
                </button>
                <button 
                  onClick={() => setUseCurrentLocation(false)}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${!useCurrentLocation ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  <Search className="w-3.5 h-3.5" />
                  Cari Area
                </button>
              </div>

              {/* Radius Slider */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Search Radius</span>
                    <span className="text-sm font-bold text-brand-600 dark:text-brand-400">{radius} km</span>
                 </div>
                 <input 
                   type="range" 
                   min="1" 
                   max={maxRadius} 
                   step="0.5" 
                   value={radius} 
                   onChange={(e) => setRadius(parseFloat(e.target.value))}
                   className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
                 />
                 <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                    <span>1 km</span>
                    <span>{maxRadius} km</span>
                 </div>
              </div>

              {/* Target Selection */}
              <div>
                 <div className="flex items-center justify-between mb-3 px-1">
                   <label className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      Target Industry
                   </label>
                   {customSearchTerm && (
                      <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-md animate-pulse">
                        Custom Mode
                      </span>
                   )}
                 </div>
                 
                 {/* Custom Search Input */}
                 <div className="mb-4 relative group">
                    <input 
                      type="text"
                      value={customSearchTerm}
                      onChange={(e) => {
                         setCustomSearchTerm(e.target.value);
                      }}
                      placeholder="e.g. 'Coffee Shop', 'Material Store'"
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-brand-500 dark:focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none text-sm font-medium text-slate-800 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm"
                    />
                    <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5 group-focus-within:text-brand-500 transition-colors" />
                 </div>

                 {/* Grid Options */}
                 <div className="grid grid-cols-4 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {INDUSTRY_OPTIONS.map((opt) => {
                      const isSelected = selectedIndustries.some(i => i.id === opt.id);
                      return (
                      <button
                        key={opt.id}
                        onClick={() => {
                           setCustomSearchTerm(''); 
                           setSelectedIndustries(prev => {
                             const exists = prev.find(p => p.id === opt.id);
                             if (exists) {
                               return prev.filter(p => p.id !== opt.id);
                             } else {
                               return [...prev, opt];
                             }
                           });
                        }}
                        className={`flex flex-col items-center justify-center p-2.5 py-3.5 rounded-2xl border transition-all duration-200 gap-2 text-center relative ${
                          isSelected && !customSearchTerm
                            ? 'bg-brand-600 text-white border-brand-600 shadow-lg shadow-brand-500/30 scale-[1.02]'
                            : customSearchTerm 
                               ? 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-300 dark:text-slate-600'
                               : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-brand-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className={isSelected && !customSearchTerm ? 'text-white' : 'currentColor'}>
                          {getIcon(opt.icon)}
                        </div>
                        <span className="text-[10px] font-bold leading-tight truncate w-full">
                          {opt.label}
                        </span>
                      </button>
                      );
                    })}
                 </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || (useCurrentLocation && (!!locError || !location)) || (!useCurrentLocation && !targetLocation)}
                className="w-full py-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-2xl font-bold text-lg shadow-xl shadow-brand-500/30 transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2 transform active:scale-[0.98]"
              >
                {useCurrentLocation && locError ? 'Enable Location' : 'Generate Mission'}
                {(!useCurrentLocation || !locError) && <Command className="w-5 h-5" />}
              </button>
            </div>

            {/* RIGHT PANEL: Map & Saved Routes */}
            <div className="md:col-span-7 lg:col-span-8 space-y-6">
              {/* Location Card / Search Card */}
              {useCurrentLocation ? (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center gap-4 transition-all duration-300 animate-fade-in min-h-[200px] md:min-h-[300px]">
                  <div className={`p-4 rounded-full ${locError ? 'bg-red-100 text-red-600' : 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'}`}>
                    {locError ? <AlertTriangle className="w-8 h-8" /> : <MapPin className="w-8 h-8" />}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">Current Location</p>
                    {loadingLoc ? (
                      <div className="h-6 w-32 bg-slate-100 dark:bg-slate-700 rounded animate-pulse mx-auto"></div>
                    ) : locError ? (
                      <p className="text-lg text-red-600 font-bold">Check Permissions</p>
                    ) : (
                      <p className="text-2xl font-bold text-slate-800 dark:text-slate-200 font-mono">
                        {location?.lat.toFixed(4)}, {location?.lng.toFixed(4)}
                      </p>
                    )}
                  </div>
                  {!loadingLoc && (
                    <button 
                      onClick={fetchLocation}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 bg-slate-50 dark:bg-slate-700/50 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-xl transition-all"
                    >
                      <RefreshCw className="w-4 h-4" /> Refresh GPS
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 p-1 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all duration-300 animate-fade-in overflow-hidden h-[300px] md:h-[500px] lg:h-[600px]">
                   <LocationPicker 
                      initialLat={location?.lat || -6.200000} 
                      initialLng={location?.lng || 106.816666}
                      radius={radius}
                      onLocationSelect={(lat, lng, address) => {
                         setTargetLocation({ lat, lng });
                         if (address) setTargetArea(address);
                      }}
                   />
                </div>
              )}

              {/* Saved Routes Section */}
              {savedRoutes.length > 0 && (
                <div>
                   <div className="flex items-center gap-2 mb-3 px-1">
                     <FolderOpen className="w-4 h-4 text-slate-400" />
                     <h3 className="font-bold text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider">Drafts</h3>
                   </div>
                   
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {savedRoutes.map(route => (
                         <div key={route.id} onClick={() => resumeSavedRoute(route)} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700 cursor-pointer flex justify-between items-center group relative shadow-sm transition-all">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                  <Target className="w-5 h-5" />
                               </div>
                               <div>
                                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 line-clamp-1">
                                     {route.customQuery || (route.industries ? route.industries.map(i => i.label).join(', ') : route.industry?.label)}
                                  </h4>
                                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{new Date(route.timestamp).toLocaleDateString()} • {route.stops.length} leads</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-2">
                               <button 
                                  onClick={(e) => deleteSavedRoute(e, route.id)} 
                                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all z-10"
                               >
                                  <Trash2 className="w-4 h-4" />
                               </button>
                               <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 dark:group-hover:text-brand-400" />
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // 4. History List View
    if (currentView === 'history') {
      return (
        <HistoryView 
          history={history} 
          onSelectPlan={setSelectedHistoryPlan} 
        />
      );
    }

    // 5. Database View
    if (currentView === 'database') {
      return (
        <DatabaseView 
          items={database} 
          onRemoveItem={handleRemoveFromDatabase} 
          userLocation={location || undefined}
          whatsappTemplate={whatsappTemplate}
        />
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg font-sans text-slate-900 dark:text-dark-text transition-colors duration-300">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-40 transition-all duration-300 ${isSidebarCollapsed ? 'md:left-20' : 'md:left-64'}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
             {/* Mobile Sidebar Toggle */}
             <button 
               onClick={() => setIsMobileSidebarOpen(true)}
               className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
             >
               <Menu className="w-6 h-6" />
             </button>

             <button 
               onClick={resetToHome}
               className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
               title="Reset"
             >
               <div className="bg-brand-600 text-white p-1.5 rounded-xl shadow-lg shadow-brand-500/30">
                 <MapPin className="w-5 h-5" />
               </div>
               <h1 className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                 Canvas<span className="text-brand-600 dark:text-brand-500">Pro</span>
               </h1>
             </button>
          </div>
          
          {activePlan && currentView === 'active' && !generating && (
            <div className="text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full border border-green-200 dark:border-green-900/50 flex items-center gap-1.5 uppercase tracking-wide">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              Live
            </div>
          )}
        </div>
      </header>

      <main className={`max-w-7xl mx-auto px-4 py-6 pt-24 transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        {geminiRateLimitWarning && (
          <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-2xl border border-amber-200 dark:border-amber-900/40 text-sm animate-fade-in shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-bold">
                    Model aktif <span className="font-extrabold">{geminiRateLimitWarning.model}</span> mencapai rate limit/quota.
                  </p>
                  {geminiRateLimitWarning.retryAfterSeconds != null && (
                    <p className="text-xs font-medium">
                      Coba lagi dalam {geminiRateLimitWarning.retryAfterSeconds} detik, atau ganti model.
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setGeminiRateLimitWarning(null)}
                className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:opacity-80 transition-opacity"
              >
                Tutup
              </button>
            </div>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setCurrentView('settings')}
                className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors"
              >
                Buka Settings
              </button>
              <select
                value={geminiModel}
                onChange={(e) => {
                  setGeminiModel(e.target.value);
                  setGeminiRateLimitWarning(null);
                }}
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                {GEMINI_MODEL_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        {error && (
           <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/30 text-center text-sm font-bold animate-fade-in flex items-center justify-center gap-2 shadow-sm">
            <AlertTriangle className="w-5 h-5" />
            {String(error)}
          </div>
        )}
        
        {renderContent()}
      </main>

      <Sidebar 
        currentView={currentView} 
        onNavigate={(view) => {
          setCurrentView(view);
          setSelectedHistoryPlan(null);
        }}
        hasActivePlan={!!activePlan}
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        closeMobile={() => setIsMobileSidebarOpen(false)}
      />
      <SpeedInsights />
    </div>
  );
};

export default App;
