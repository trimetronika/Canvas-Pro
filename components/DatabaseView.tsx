import React from 'react';
import { DatabaseItem, GeoLocation } from '../types';
import { Trash2, ExternalLink, MapPin, Briefcase, Calendar, Phone, Globe, Star, MessageCircle } from 'lucide-react';
import { calculateDistance } from '../services/routeOptimization';
import { getWhatsAppLink, renderTemplate } from '../utils';

interface DatabaseViewProps {
  items: DatabaseItem[];
  onRemoveItem: (id: string) => void;
  userLocation?: GeoLocation;
  whatsappTemplate?: string;
}

export const DatabaseView: React.FC<DatabaseViewProps> = ({ items, onRemoveItem, userLocation, whatsappTemplate }) => {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 animate-fade-in">
        <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-4">
          <Briefcase className="w-12 h-12 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Database Kosong</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-xs">
          Belum ada lead yang disimpan. Tambahkan lead dari hasil pencarian untuk menyimpannya di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="pb-24 animate-slide-up">
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Lead Database</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          {items.length} leads tersimpan untuk follow-up.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const waMessage = renderTemplate(whatsappTemplate || '', {
            name: item.title,
            phone: item.phone || '',
            address: item.address || '',
            link: item.uri || '',
          });
          const waLink = item.phone ? getWhatsAppLink(item.phone, waMessage) : null;

          return (
          <div 
            key={item.id} 
            className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group relative flex flex-col justify-between"
          >
            <div className="flex justify-between items-start gap-3 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white leading-tight line-clamp-1" title={item.title}>
                    {item.title}
                  </h3>
                  {item.score === 'hot' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-600 rounded uppercase tracking-wider border border-red-200 shrink-0">Hot</span>
                  )}
                  {item.rating && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-100 shrink-0">
                      <Star className="w-2.5 h-2.5 fill-current" /> {item.rating}
                    </span>
                  )}
                </div>
                
                <div className="flex flex-col gap-1.5 mt-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Briefcase className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{item.category || 'Uncategorized'}</span>
                  </div>
                  
                  {item.address && (
                    <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{item.address}</span>
                    </div>
                  )}

                  {item.phone && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.phone}</span>
                    </div>
                  )}

                  {item.website && (
                    <div className="flex items-center gap-2 text-xs text-brand-600 dark:text-brand-400">
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      <a href={item.website} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[150px]">
                        Website
                      </a>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mt-1">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>Added: {new Date(item.savedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                {waLink && (
                  <a 
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors border border-green-100 dark:border-green-900/30"
                    title="Chat via WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                )}
                <a 
                  href={item.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/30 dark:hover:text-brand-400 transition-colors border border-slate-100 dark:border-slate-600"
                  title="Open in Maps"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button 
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click if any
                    if (window.confirm(`Hapus ${item.title} dari database?`)) {
                      onRemoveItem(item.id);
                    }
                  }}
                  className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-red-100 dark:border-red-900/30"
                  title="Remove from Database"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {item.notes && (
              <div className="mt-auto p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-xs text-slate-600 dark:text-slate-300 italic border border-slate-100 dark:border-slate-700 line-clamp-3 mb-2">
                "{item.notes}"
              </div>
            )}
            
            {item.absenkuAnalysis && (
              <div className="mt-auto p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-[10px] text-slate-600 dark:text-slate-300 border border-blue-100 dark:border-blue-800 line-clamp-3">
                <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">POTENSI ABSENKU:</span>
                {item.absenkuAnalysis}
              </div>
            )}
          </div>
        )})}
      </div>
    </div>
  );
};
