import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="relative">
        <div className="absolute inset-0 bg-brand-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
        <div className="relative bg-white p-4 rounded-full shadow-lg mb-6">
          <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
        </div>
      </div>
      <h3 className="text-xl font-semibold text-slate-800 mb-2">Analyzing Map Data...</h3>
      <p className="text-slate-500 max-w-md">
        Our AI is scanning the area for high-potential businesses and calculating the optimal route for your canvassing session.
      </p>
    </div>
  );
};
