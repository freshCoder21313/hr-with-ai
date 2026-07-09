import React from 'react';
import { Loader2 } from 'lucide-react';

export const EndingSessionOverlay: React.FC = () => (
  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm transition-all animate-in fade-in duration-300">
    <div className="bg-card p-6 md:p-8 rounded-2xl shadow-2xl border border-border flex flex-col items-center max-w-md text-center mx-4">
      <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
      <h3 className="text-xl font-bold text-foreground mb-2">Analyzing Interview</h3>
      <p className="text-muted-foreground">Generating detailed feedback...</p>
    </div>
  </div>
);
