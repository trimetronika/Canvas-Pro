import React, { useState } from 'react';
import { CanvasPlan } from '../types';
import { Calendar, CheckCircle2, ChevronRight, MapPin, TrendingUp, Pencil, Check, X, Trash2 } from 'lucide-react';

interface HistoryViewProps {
  history: CanvasPlan[];
  onSelectPlan: (plan: CanvasPlan) => void;
  onRenamePlan?: (planId: string, name: string) => void;
  onDeletePlan?: (planId: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history, onSelectPlan, onRenamePlan, onDeletePlan }) => {
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');

  const confirmRename = (planId: string) => {
    if (editNameValue.trim() && onRenamePlan) {
      onRenamePlan(planId, editNameValue.trim());
    }
    setEditingPlanId(null);
  };
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in">
        <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-6">
          <HistoryIcon className="w-10 h-10 text-slate-300 dark:text-slate-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">No History Yet</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
          Start your first canvassing mission to track your progress here.
        </p>
      </div>
    );
  }

  // Calculate stats
  const totalVisits = history.reduce((acc, curr) => acc + curr.stops.filter(s => s.status === 'visited').length, 0);
  const totalMissions = history.length;

  return (
    <div className="space-y-6 pb-28 animate-slide-up">
      <div className="px-1">
         <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-4">Your Journey</h2>
         
         {/* Stats Row */}
         <div className="grid grid-cols-2 gap-3 mb-2">
            <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl p-4 text-white shadow-lg shadow-brand-500/20">
               <p className="text-xs font-medium text-brand-100 mb-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Total Visits
               </p>
               <p className="text-3xl font-extrabold">{totalVisits}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
               <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Missions</p>
               <p className="text-3xl font-extrabold text-slate-800 dark:text-white">{totalMissions}</p>
            </div>
         </div>
      </div>
      
      <div className="space-y-3">
        <p className="px-1 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Recent Activity</p>
        
        {history.map((plan) => {
          const visited = plan.stops.filter(s => s.status === 'visited').length;
          const total = plan.stops.length;
          const percent = Math.round((visited / total) * 100) || 0;

          return (
            <button
              key={plan.id}
              onClick={() => { if (editingPlanId !== plan.id) onSelectPlan(plan); }}
              className="w-full bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700 transition-all text-left group active:scale-[0.98]"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0 mr-2">
                  {editingPlanId === plan.id ? (
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <input
                        autoFocus
                        value={editNameValue}
                        onChange={e => setEditNameValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') confirmRename(plan.id);
                          if (e.key === 'Escape') setEditingPlanId(null);
                        }}
                        className="flex-1 text-sm font-bold bg-slate-50 dark:bg-slate-700 border border-brand-300 dark:border-brand-600 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-100 outline-none min-w-0"
                        placeholder="Nama rute…"
                      />
                      <button onClick={() => confirmRename(plan.id)} className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 shrink-0">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingPlanId(null)} className="p-1 text-slate-400 hover:text-red-500 shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 group/title">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-1">
                        {plan.customName || plan.customQuery || (plan.industries ? plan.industries.map(i => i.label).join(', ') : plan.industry?.label)}
                      </h3>
                      {onRenamePlan && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditNameValue(plan.customName || plan.customQuery || (plan.industries ? plan.industries.map(i => i.label).join(', ') : plan.industry?.label) || ''); setEditingPlanId(plan.id); }}
                          className="p-1 text-slate-300 hover:text-brand-500 dark:hover:text-brand-400 rounded-md opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0"
                          title="Rename"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(plan.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {onDeletePlan && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Hapus history mission ini permanen?')) {
                          onDeletePlan(plan.id);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                      title="Delete history mission"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-full group-hover:bg-brand-50 dark:group-hover:bg-brand-900/30 transition-colors">
                    <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-brand-500" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-xs font-bold mb-2">
                      <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> {visited} Done
                      </span>
                      <span className="text-slate-400 dark:text-slate-500">{percent}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full" 
                        style={{ width: `${percent}%` }} 
                      />
                  </div>
                </div>
                
                <div className="text-xs bg-slate-50 dark:bg-slate-700/50 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {total}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Helper icon since lucide-react export might vary
const HistoryIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" />
    <path d="M3 3v9h9" />
    <path d="M12 7v5l4 2" />
  </svg>
);
