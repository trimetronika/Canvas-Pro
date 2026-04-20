import React, { useState } from 'react';
import { Trash2, Info, AlertTriangle, Moon, Sun, Monitor, Smartphone, Sliders, Cloud, RefreshCw, CheckCircle2, Mail, MessageCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { DEFAULT_WHATSAPP_TEMPLATE } from '../utils';
import { GEMINI_MODEL_OPTIONS } from '../geminiModels';

interface SettingsViewProps {
  onClearHistory: () => void;
  onClearSaved: () => void;
  maxRadius: number;
  onMaxRadiusChange: (value: number) => void;
  userEmail: string;
  onUserEmailChange: (email: string) => void;
  lastSynced: number | null;
  syncing: boolean;
  whatsappTemplate: string;
  onWhatsappTemplateChange: (template: string) => void;
  geminiModel: string;
  onGeminiModelChange: (model: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  onClearHistory, 
  onClearSaved, 
  maxRadius, 
  onMaxRadiusChange,
  userEmail,
  onUserEmailChange,
  lastSynced,
  syncing,
  whatsappTemplate,
  onWhatsappTemplateChange,
  geminiModel,
  onGeminiModelChange,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [emailInput, setEmailInput] = useState(userEmail);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      onUserEmailChange(emailInput.trim().toLowerCase());
    }
  };

  return (
    <div className="animate-slide-up pb-32">
      <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-6 px-1">Settings</h2>

      {/* Cloud Sync Section */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-6 transition-colors duration-300">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-brand-50/30 dark:bg-brand-900/10">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-brand-500" />
            Cloud Sync
          </h3>
        </div>
        
        <div className="p-5">
           <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed font-medium">
             Sync your drafts, history, and database across all your devices (Laptop & Mobile) using your email.
           </p>

           <form onSubmit={handleEmailSubmit} className="space-y-3">
              <div className="relative group">
                <input 
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter your email to sync"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-brand-500 dark:focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none text-sm font-medium text-slate-800 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-3 group-focus-within:text-brand-500 transition-colors" />
              </div>
              
              <button 
                type="submit"
                disabled={syncing || !emailInput || emailInput === userEmail}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-2xl font-bold text-sm shadow-lg shadow-brand-500/20 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                {userEmail ? 'Update Sync Account' : 'Start Syncing'}
              </button>
           </form>

           {userEmail && (
             <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                   <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Connected: {userEmail}</span>
                </div>
                {lastSynced && (
                   <span className="text-[10px] text-slate-400 font-medium italic">
                     Last synced: {new Date(lastSynced).toLocaleTimeString()}
                   </span>
                )}
             </div>
           )}
        </div>
      </div>

      {/* Configuration Section */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-6 transition-colors duration-300">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-brand-500" />
            Configuration
          </h3>
        </div>
        
        <div className="p-5">
           <div>
              <div className="flex justify-between items-center mb-2">
                 <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Max Search Radius</p>
                 <span className="text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-2 py-1 rounded-lg">{maxRadius} km</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Set the maximum range for the radius slider.</p>
              <input 
                type="range" 
                min="5" 
                max="50" 
                step="5" 
                value={maxRadius} 
                onChange={(e) => onMaxRadiusChange(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                 <span>5 km</span>
                 <span>50 km</span>
              </div>
           </div>

           <div className="mt-6">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Model Gemini</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Pilih model AI untuk generate content. Default: Gemini 2.5 Flash.</p>
              <select
                value={geminiModel}
                onChange={(e) => onGeminiModelChange(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-brand-500 dark:focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none text-sm font-medium text-slate-800 dark:text-white transition-all"
              >
                <optgroup label="Primary">
                  {GEMINI_MODEL_OPTIONS.filter(option => !option.experimental).map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Experimental">
                  {GEMINI_MODEL_OPTIONS.filter(option => option.experimental).map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              </select>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
                Model experimental mungkin tidak tersedia di semua akun/project API key.
              </p>
           </div>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-6 transition-colors duration-300">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-brand-500" />
            Appearance
          </h3>
        </div>
        
        <div className="p-5">
           <div className="flex items-center justify-between">
              <div>
                 <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Dark Mode</p>
                 <p className="text-xs text-slate-500 dark:text-slate-400">Switch between light and dark themes</p>
              </div>
              
              <button 
                onClick={toggleTheme}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${theme === 'dark' ? 'bg-brand-600' : 'bg-slate-200'}`}
              >
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition duration-300 shadow-md flex items-center justify-center ${theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}`}>
                   {theme === 'dark' ? <Moon className="w-3 h-3 text-brand-600" /> : <Sun className="w-3 h-3 text-orange-400" />}
                </span>
              </button>
           </div>
        </div>
      </div>

      {/* WhatsApp Master Message Section */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-6 transition-colors duration-300">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-500" />
            Master Pesan WhatsApp
          </h3>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            Atur template pesan yang dikirim saat klik ikon WhatsApp pada setiap lead. Gunakan placeholder berikut:
          </p>
          <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1 pl-3">
            <li><span className="font-bold text-slate-700 dark:text-slate-300">{`{name}`}</span> — Nama lead</li>
            <li><span className="font-bold text-slate-700 dark:text-slate-300">{`{phone}`}</span> — Nomor telepon lead</li>
            <li><span className="font-bold text-slate-700 dark:text-slate-300">{`{address}`}</span> — Alamat lead</li>
            <li><span className="font-bold text-slate-700 dark:text-slate-300">{`{link}`}</span> — Link Google Maps lead</li>
          </ul>
          <textarea
            value={whatsappTemplate}
            onChange={(e) => onWhatsappTemplateChange(e.target.value)}
            placeholder={DEFAULT_WHATSAPP_TEMPLATE}
            rows={4}
            className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-green-500 dark:focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none text-sm font-medium text-slate-800 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
          />
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            Contoh: <span className="italic">{DEFAULT_WHATSAPP_TEMPLATE}</span>
          </p>
          {whatsappTemplate.trim() && (
            <button
              onClick={() => onWhatsappTemplateChange('')}
              className="text-xs text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors font-medium"
            >
              Reset ke default
            </button>
          )}
        </div>
      </div>

      {/* Data Section */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors duration-300">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Info className="w-5 h-5 text-brand-500" />
            Application Data
          </h3>
        </div>
        
        <div className="p-5 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Clear History</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Remove all completed runs.</p>
            </div>
            <button 
              onClick={onClearHistory}
              className="px-4 py-2 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Clear
            </button>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Clear Saved Routes</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Remove all drafts.</p>
            </div>
            <button 
              onClick={onClearSaved}
              className="px-4 py-2 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Clear
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-200 leading-relaxed font-medium">
          Note: CanvasPro stores data locally on your device. Clearing browser cache will wipe your data.
        </p>
      </div>
      
      <div className="mt-10 text-center space-y-1">
        <p className="text-sm font-bold text-slate-400 dark:text-slate-600 flex items-center justify-center gap-2">
           <Smartphone className="w-4 h-4" /> CanvasPro v2.0
        </p>
        <p className="text-[10px] text-slate-300 dark:text-slate-700 font-medium">
          R&D Edition for Absenku.com
        </p>
      </div>
    </div>
  );
};
