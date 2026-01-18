import React, { useState, KeyboardEvent } from 'react';

interface IngredientInputProps {
  ingredients: string[];
  setIngredients: (ingredients: string[]) => void;
}

export const IngredientInput: React.FC<IngredientInputProps> = ({ ingredients, setIngredients }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = inputValue.trim();
      if (val && !ingredients.includes(val)) {
        setIngredients([...ingredients, val]);
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && !inputValue && ingredients.length > 0) {
      setIngredients(ingredients.slice(0, -1));
    }
  };

  const removeTag = (indexToRemove: number) => {
    setIngredients(ingredients.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 p-4 min-h-[140px] carved-input rounded-[2rem] focus-within:border-amber-500/30 transition-all duration-500">
        {ingredients.map((tag, index) => (
          <span 
            key={index} 
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-200 rounded-full text-xs font-bold border border-amber-500/20 shadow-sm animate-in fade-in zoom-in-90"
          >
            {tag}
            <button 
              onClick={() => removeTag(index)}
              className="hover:text-red-400 transition-colors ml-1"
            >
              &times;
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={ingredients.length < 5 ? `Add ${5 - ingredients.length} more...` : "Keep adding..."}
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-600 min-w-[120px] text-sm font-medium"
        />
      </div>
      <p className="mt-3 text-[10px] text-slate-500 text-center uppercase font-black tracking-widest opacity-60">Press Enter or comma to add staples</p>
    </div>
  );
};