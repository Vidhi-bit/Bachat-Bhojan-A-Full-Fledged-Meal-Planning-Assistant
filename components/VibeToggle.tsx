import React from 'react';
import { Vibe } from '../types';

interface VibeToggleProps {
  vibe: Vibe;
  onChange: (vibe: Vibe) => void;
}

export const VibeToggle: React.FC<VibeToggleProps> = ({ vibe, onChange }) => {
  return (
    <div className="flex items-center justify-center p-1.5 glass rounded-full w-full max-w-xs mx-auto border border-white/5 mb-10 relative">
      <button
        onClick={() => onChange('LOW_ENERGY')}
        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full transition-all duration-500 text-xs font-black uppercase tracking-widest relative z-10 ${
          vibe === 'LOW_ENERGY'
            ? 'bg-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
            : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <span>⚡️</span>
        <span>Low Energy</span>
        {vibe === 'LOW_ENERGY' && (
          <span className="absolute -top-1 -right-1 text-xs animate-bounce opacity-50">✨</span>
        )}
      </button>
      <button
        onClick={() => onChange('FULL_POWER')}
        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full transition-all duration-500 text-xs font-black uppercase tracking-widest relative z-10 ${
          vibe === 'FULL_POWER'
            ? 'accent-gradient text-white shadow-[0_0_20px_rgba(245,158,11,0.4)]'
            : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <span>🔥</span>
        <span>Full Power</span>
        {vibe === 'FULL_POWER' && (
          <span className="absolute -top-1 -right-1 text-xs animate-pulse opacity-50">♨️</span>
        )}
      </button>
    </div>
  );
};