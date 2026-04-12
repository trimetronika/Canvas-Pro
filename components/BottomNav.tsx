import React from 'react';
import { Map, History, Settings, Compass, Database, ChevronLeft, ChevronRight } from 'lucide-react';

interface BottomNavProps {
  currentView: 'active' | 'history' | 'settings' | 'database';
  onNavigate: (view: 'active' | 'history' | 'settings' | 'database') => void;
  hasActivePlan: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate, hasActivePlan, isExpanded = true, onToggle }) => {
  return (
    <div className={`fixed bottom-0 left-0 right-0 md:top-0 md:bottom-auto md:h-screen z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t md:border-t-0 md:border-r border-slate-200 dark:border-slate-800 pb-safe md:pb-0 transition-all duration-300 ${isExpanded ? 'md:w-64' : 'md:w-20'}`}>
      <div className="max-w-2xl mx-auto md:mx-0 px-6 md:px-0 h-16 md:h-full flex flex-row md:flex-col items-center md:items-stretch justify-around md:justify-start md:pt-24 md:gap-2 relative">
        
        <button
          onClick={() => onNavigate('active')}
          className={`relative group flex flex-col md:flex-row items-center md:items-center gap-1 md:gap-3 transition-all duration-300 md:px-4 md:py-3 md:mx-2 md:rounded-xl ${
            currentView === 'active' 
              ? 'text-brand-600 dark:text-brand-400 -translate-y-1 md:translate-y-0 md:bg-brand-50 md:dark:bg-brand-900/30' 
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 md:hover:bg-slate-50 md:dark:hover:bg-slate-800'
          }`}
        >
          <div className={`p-1.5 md:p-0 rounded-xl transition-all duration-300 ${
            currentView === 'active' 
              ? 'bg-brand-50 dark:bg-brand-900/30 md:bg-transparent' 
              : 'group-hover:bg-slate-50 dark:group-hover:bg-slate-800 md:group-hover:bg-transparent'
          }`}>
            {hasActivePlan ? <Compass className="w-5 h-5 md:w-6 md:h-6" /> : <Map className="w-5 h-5 md:w-6 md:h-6" />}
          </div>
          <span className={`text-[10px] md:text-sm font-bold transition-opacity duration-300 hidden md:block ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
            {hasActivePlan ? 'Active Route' : 'Home'}
          </span>
          {/* Active Dot (Mobile only) */}
          {currentView === 'active' && (
            <span className="absolute -bottom-2 md:hidden w-1 h-1 rounded-full bg-brand-600 dark:bg-brand-400"></span>
          )}
        </button>

        <button
          onClick={() => onNavigate('database')}
          className={`relative group flex flex-col md:flex-row items-center md:items-center gap-1 md:gap-3 transition-all duration-300 md:px-4 md:py-3 md:mx-2 md:rounded-xl ${
            currentView === 'database' 
              ? 'text-brand-600 dark:text-brand-400 -translate-y-1 md:translate-y-0 md:bg-brand-50 md:dark:bg-brand-900/30' 
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 md:hover:bg-slate-50 md:dark:hover:bg-slate-800'
          }`}
        >
          <div className={`p-1.5 md:p-0 rounded-xl transition-all duration-300 ${
            currentView === 'database' 
              ? 'bg-brand-50 dark:bg-brand-900/30 md:bg-transparent' 
              : 'group-hover:bg-slate-50 dark:group-hover:bg-slate-800 md:group-hover:bg-transparent'
          }`}>
            <Database className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <span className={`text-[10px] md:text-sm font-bold transition-opacity duration-300 hidden md:block ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
            Database
          </span>
          {currentView === 'database' && (
            <span className="absolute -bottom-2 md:hidden w-1 h-1 rounded-full bg-brand-600 dark:bg-brand-400"></span>
          )}
        </button>

        <button
          onClick={() => onNavigate('history')}
          className={`relative group flex flex-col md:flex-row items-center md:items-center gap-1 md:gap-3 transition-all duration-300 md:px-4 md:py-3 md:mx-2 md:rounded-xl ${
            currentView === 'history' 
              ? 'text-brand-600 dark:text-brand-400 -translate-y-1 md:translate-y-0 md:bg-brand-50 md:dark:bg-brand-900/30' 
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 md:hover:bg-slate-50 md:dark:hover:bg-slate-800'
          }`}
        >
          <div className={`p-1.5 md:p-0 rounded-xl transition-all duration-300 ${
            currentView === 'history' 
              ? 'bg-brand-50 dark:bg-brand-900/30 md:bg-transparent' 
              : 'group-hover:bg-slate-50 dark:group-hover:bg-slate-800 md:group-hover:bg-transparent'
          }`}>
            <History className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <span className={`text-[10px] md:text-sm font-bold transition-opacity duration-300 hidden md:block ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
            History
          </span>
          {currentView === 'history' && (
            <span className="absolute -bottom-2 md:hidden w-1 h-1 rounded-full bg-brand-600 dark:bg-brand-400"></span>
          )}
        </button>

        <button
          onClick={() => onNavigate('settings')}
          className={`relative group flex flex-col md:flex-row items-center md:items-center gap-1 md:gap-3 transition-all duration-300 md:px-4 md:py-3 md:mx-2 md:rounded-xl ${
            currentView === 'settings' 
              ? 'text-brand-600 dark:text-brand-400 -translate-y-1 md:translate-y-0 md:bg-brand-50 md:dark:bg-brand-900/30' 
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 md:hover:bg-slate-50 md:dark:hover:bg-slate-800'
          }`}
        >
          <div className={`p-1.5 md:p-0 rounded-xl transition-all duration-300 ${
            currentView === 'settings' 
              ? 'bg-brand-50 dark:bg-brand-900/30 md:bg-transparent' 
              : 'group-hover:bg-slate-50 dark:group-hover:bg-slate-800 md:group-hover:bg-transparent'
          }`}>
            <Settings className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <span className={`text-[10px] md:text-sm font-bold transition-opacity duration-300 hidden md:block ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
            Settings
          </span>
          {currentView === 'settings' && (
            <span className="absolute -bottom-2 md:hidden w-1 h-1 rounded-full bg-brand-600 dark:bg-brand-400"></span>
          )}
        </button>

        {/* Toggle Button (Desktop Only) */}
        {onToggle && (
           <button 
             onClick={onToggle}
             className="hidden md:flex absolute bottom-8 right-0 translate-x-1/2 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full items-center justify-center shadow-md text-slate-400 hover:text-brand-600 transition-colors z-50"
           >
             {isExpanded ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
           </button>
        )}

      </div>
    </div>
  );
};