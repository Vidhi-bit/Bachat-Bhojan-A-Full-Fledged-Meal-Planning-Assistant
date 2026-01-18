import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "w-12 h-12" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Glowing outer ring */}
    <circle cx="50" cy="50" r="45" stroke="#F59E0B" strokeWidth="1" strokeDasharray="4 4" className="animate-pulse" opacity="0.4" />
    
    {/* Stylized ₹ Symbol */}
    <g className="animate-pulse-amber">
      {/* Top horizontal bars */}
      <path d="M30 32H70" stroke="#F59E0B" strokeWidth="7" strokeLinecap="round" />
      <path d="M30 46H70" stroke="#F59E0B" strokeWidth="7" strokeLinecap="round" />
      
      {/* Main body (Ra shape) */}
      <path d="M40 32C75 32 75 60 40 60H65L40 85" stroke="#F59E0B" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* Glow Effect Layer */}
      <path d="M40 32C75 32 75 60 40 60H65L40 85" stroke="#F59E0B" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" opacity="0.2" filter="blur(4px)" />
    </g>

    <defs>
      <filter id="glow">
        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
  </svg>
);

export const PERSONA_OPTIONS = [
  { id: 'Student', icon: '🎓', label: 'Student', description: 'Budget focus, tiffin needs' },
  { id: 'Working Pro', icon: '💼', label: 'Working Pro', description: 'Speed & meal prep' },
  { id: 'Household', icon: '🏠', label: 'Household', description: 'Balanced & nutritional' }
];

export const DIET_OPTIONS: string[] = ['Vegetarian 🌿', 'Non-Veg 🍗', 'Vegan 🥗', 'Keto 🥩', 'Paleo 🦴', 'High-Protein 💪'];
export const TIME_OPTIONS: string[] = ['Quick Snack (15m) ⚡', '30 min ⏱️', 'Proper Meal (45m) 🥘', '60 min+ ⏱️'];
export const SETUP_OPTIONS: string[] = ['Just Microwave 🍿', 'Full Chef Kitchen 👨‍🍳', 'Single Burner 🔥', 'Air Fryer 🌬️'];
export const CITY_OPTIONS: string[] = ['Metro 🏙️', 'Tier-2 🏘️', 'Tier-3 🏡'];
export const DURATION_OPTIONS: number[] = [1, 2, 3];
