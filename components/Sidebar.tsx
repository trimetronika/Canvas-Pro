import React, { useState } from 'react';
import { 
  Map, 
  History, 
  Settings, 
  Compass, 
  Database, 
  Menu, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  currentView: 'active' | 'history' | 'settings' | 'database';
  onNavigate: (view: 'active' | 'history' | 'settings' | 'database') => void;
  hasActivePlan: boolean;
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onNavigate, 
  hasActivePlan, 
  isCollapsed, 
  toggleCollapse
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const menuItems = [
    { id: 'active', label: hasActivePlan ? 'Active Route' : 'Home', icon: hasActivePlan ? Compass : Map },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const sidebarClasses = `
    fixed top-0 left-0 h-screen bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 z-50 transition-all duration-300 ease-in-out
    ${isCollapsed ? 'w-20' : 'w-64'}
    -translate-x-full md:translate-x-0
  `;

  return (
    <div className={sidebarClasses}>
        {/* Header / Toggle */}
        <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-6'} border-b border-slate-100 dark:border-slate-800`}>
          {!isCollapsed && (
            <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
              Canvas<span className="text-brand-600 dark:text-brand-500">Pro</span>
            </span>
          )}
          
          <button 
            onClick={toggleCollapse}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors hidden md:flex"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex flex-col gap-2 p-3 mt-4">
          {menuItems.map((item) => {
            const isActive = currentView === item.id;
            const Icon = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id as any);
                }}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`
                  relative flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group
                  ${isActive 
                    ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                
                {!isCollapsed && (
                  <span className="font-bold text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                    {item.label}
                  </span>
                )}

                {/* Active Indicator Line */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-600 dark:bg-brand-400 rounded-r-full" />
                )}

                {/* Collapsed Tooltip */}
                {isCollapsed && hoveredItem === item.id && (
                  <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg shadow-xl whitespace-nowrap z-50 animate-fade-in">
                    {item.label}
                    {/* Arrow */}
                    <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-slate-900 dark:bg-white rotate-45" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer / User Profile (Optional placeholder) */}
        <div className="absolute bottom-4 left-0 right-0 px-3">
           {/* Can add user profile or logout here later */}
        </div>
    </div>
  );
};
