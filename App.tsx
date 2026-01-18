import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Logo, PERSONA_OPTIONS, DIET_OPTIONS, TIME_OPTIONS, SETUP_OPTIONS, CITY_OPTIONS, DURATION_OPTIONS } from './constants';
import { UserPreferences, Vibe, FormStep, Recipe, OptimizationConstraint, Meal, GroceryItem } from './types';
import { VibeToggle } from './components/VibeToggle';
import { IngredientInput } from './components/IngredientInput';
import { generateRecipe, swapMeal, suggestZeroPrepAlternative } from './services/geminiService';
import { generateGCalLink, generateICS, downloadICS } from './services/calendarService';

const QUICK_ADD_INGREDIENTS = [
  'Potato 🥔', 'Onion 🧅', 'Rice 🍚', 'Paneer 🧀', 'Tomato 🍅', 'Chicken 🍗', 
  'Garlic 🧄', 'Ginger 🫚', 'Bread 🍞', 'Milk 🥛', 'Eggs 🥚', 'Dal 🥣', 
  'Chilli 🌶️', 'Coriander 🌿', 'Lemon 🍋', 'Butter 🧈', 'Atta 🌾'
];

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const InfoIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const CalendarIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const RefreshIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 2v6h-6" />
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M3 22v-6h6" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
  </svg>
);

const EmptyFridgeSVG: React.FC = () => (
  <svg width="120" height="160" viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto opacity-20 my-6">
    <rect x="10" y="10" width="100" height="140" rx="8" stroke="#F59E0B" strokeWidth="2" />
    <line x1="10" y1="80" x2="110" y2="80" stroke="#F59E0B" strokeWidth="2" />
    <line x1="30" y1="40" x2="90" y2="40" stroke="#F59E0B" strokeWidth="1" strokeDasharray="4 4" />
    <line x1="30" y1="110" x2="90" y2="110" stroke="#F59E0B" strokeWidth="1" strokeDasharray="4 4" />
    <rect x="95" y="40" width="4" height="40" rx="2" fill="#F59E0B" />
  </svg>
);

const MealImage: React.FC<{ dishName: string }> = ({ dishName }) => {
  const imageUrl = useMemo(() => {
    const seed = Math.floor(Math.random() * 1000);
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(dishName + ' authentic indian food, high quality photography, 8k, bokeh background')}?width=400&height=300&nologo=true&seed=${seed}`;
  }, [dishName]);

  return (
    <div className="w-full h-36 rounded-2xl overflow-hidden mb-4 relative group shadow-2xl">
      <img 
        src={imageUrl} 
        alt={dishName} 
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
        loading="lazy" 
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};

const initialPrefs: UserPreferences = {
  persona: 'Student',
  isPortabilityRequired: true,
  diet: 'Vegetarian 🌿' as any, 
  time: '30 min ⏱️' as any,
  setup: 'Single Burner 🔥' as any,
  cityType: 'Metro 🏙️' as any,
  budget: 500,
  durationDays: 1,
  ingredients: [],
  excludedIngredients: [],
  vibe: 'LOW_ENERGY',
  cookingWindow: '6 PM - 8 PM',
  reminderTime: 'Morning',
  remindersPerDay: 1,
};

const App: React.FC = () => {
  const [vibe, setVibe] = useState<Vibe>('LOW_ENERGY');
  const [step, setStep] = useState<FormStep>(FormStep.PERSONA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [activeDay, setActiveDay] = useState(1);
  const [activeWisdomIndex, setActiveWisdomIndex] = useState(0);
  const [heroImageSrc, setHeroImageSrc] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isTightBudget, setIsTightBudget] = useState(false);
  const [currentOptimization, setCurrentOptimization] = useState<OptimizationConstraint | null>(null);
  const [showJustification, setShowJustification] = useState(false);
  const [swappingMealIndex, setSwappingMealIndex] = useState<number | null>(null);

  const [prefs, setPrefs] = useState<UserPreferences>(initialPrefs);

  const dailyBudget = useMemo(() => prefs.budget / prefs.durationDays, [prefs.budget, prefs.durationDays]);

  const budgetFeasibility = useMemo(() => {
    if (dailyBudget <= 150) return { label: 'Budget Warning ⚠️', color: 'bg-red-500/10 border-red-500/30 text-red-500', pulse: true };
    if (dailyBudget <= 300) return { label: 'Tight but Doable ✅', color: 'bg-amber-500/10 border-amber-500/30 text-amber-500', pulse: false };
    return { label: 'Budget Healthy 💰', color: 'bg-green-500/10 border-green-500/30 text-green-500', pulse: false };
  }, [dailyBudget]);

  const currentDayPlan = useMemo(() => {
    return recipe?.dailyPlans.find(d => d.day === activeDay);
  }, [recipe, activeDay]);

  const dishOfTheDay = useMemo(() => {
    return currentDayPlan?.meals.find(m => m.type === 'Dinner') || currentDayPlan?.meals[0];
  }, [currentDayPlan]);

  useEffect(() => {
    if (recipe && dishOfTheDay) {
      const seed = Math.floor(Math.random() * 1000);
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(dishOfTheDay.name + ' ' + recipe.searchQuery + ' professional food photography, cinematic lighting, 8k')}?width=1200&height=600&nologo=true&seed=${seed}`;
      setHeroImageSrc(url);
    }
  }, [recipe, dishOfTheDay]);

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => {
    if (step === FormStep.RESULT) {
      setRecipe(null);
      setStep(FormStep.INGREDIENTS);
      setCurrentOptimization(null);
    } else {
      setStep(prev => Math.max(0, prev - 1));
    }
  };

  const handleAbortMission = () => {
    setStep(FormStep.PERSONA);
    setRecipe(null);
    setPrefs(initialPrefs);
    setVibe('LOW_ENERGY');
    setIsTightBudget(false);
    setCurrentOptimization(null);
  };

  const handleSubmit = async (constraint?: OptimizationConstraint) => {
    if (prefs.ingredients.length < 5) {
      setError("Add 5 ingredients to optimize!");
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    const daily = prefs.budget / prefs.durationDays;
    const isMetro = prefs.cityType.split(' ')[0] === 'Metro';
    const tight = isMetro && daily <= 150;
    
    setIsTightBudget(tight);
    setCurrentOptimization(constraint || null);

    setLoading(true);
    try {
      const result = await generateRecipe({ ...prefs, vibe }, constraint);
      setRecipe(result);
      setStep(FormStep.RESULT);
      setActiveDay(1);
      setActiveWisdomIndex(Math.floor(Math.random() * result.chefWisdom.length));
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#F59E0B', '#D97706'] });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSwapMeal = async (meal: Meal, index: number) => {
    if (!recipe) return;
    setSwappingMealIndex(index);
    try {
      const newMeal = await swapMeal(prefs, meal);
      setRecipe(prev => {
        if (!prev) return null;
        const newDailyPlans = prev.dailyPlans.map(dp => {
          if (dp.day === activeDay) {
            const newMeals = [...dp.meals];
            newMeals[index] = newMeal;
            return { ...dp, meals: newMeals };
          }
          return dp;
        });
        return { ...prev, dailyPlans: newDailyPlans };
      });
      confetti({ particleCount: 30, spread: 50, origin: { x: 0.5, y: 0.5 }, colors: ['#F59E0B'] });
    } catch (err) {
      setError("Swap failed. Budget limits might be too tight.");
    } finally {
      setSwappingMealIndex(null);
    }
  };

  const handleZeroPrep = async (index: number) => {
    if (!recipe) return;
    setSwappingMealIndex(index);
    try {
      const pantry = recipe.groceryList.filter(g => g.isOwned).map(g => g.item);
      const newMeal = await suggestZeroPrepAlternative(prefs, pantry);
      setRecipe(prev => {
        if (!prev) return null;
        const newDailyPlans = prev.dailyPlans.map(dp => {
          if (dp.day === activeDay) {
            const newMeals = [...dp.meals];
            newMeals[index] = newMeal;
            return { ...dp, meals: newMeals };
          }
          return dp;
        });
        return { ...prev, dailyPlans: newDailyPlans };
      });
    } catch (err) {
      setError("No zero-prep staples found in your pantry.");
    } finally {
      setSwappingMealIndex(null);
    }
  };

  const handleExport = () => {
    if (!recipe) return;
    const mustBuy = recipe.groceryList.filter(g => !g.isOwned);
    const listContent = mustBuy.map(g => `• ${g.category}: ${g.item}`).join('%0A');
    const header = `🛒 *My Bachat Grocery List:*%0A%0A`;
    const whatsappUrl = `https://wa.me/?text=${header}${listContent}`;
    window.open(whatsappUrl, '_blank');
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleScheduleGCal = (type: 'shopping' | 'prep' | 'cooking') => {
    if (!recipe) return;
    const now = new Date();
    let start: Date, end: Date, title: string, details: string;

    if (type === 'shopping') {
      title = "Bachat Grocery Shopping 🛒";
      start = new Date(now.getTime() + 60 * 60 * 1000);
      end = new Date(start.getTime() + 60 * 60 * 1000);
      details = `To buy: ${recipe.groceryList.filter(g => !g.isOwned).map(g => g.item).join(", ")}`;
    } else if (type === 'prep') {
      title = "Bachat Weekend Meal Prep 🗓️";
      start = new Date(now);
      start.setDate(now.getDate() + (6 - now.getDay() + 7) % 7);
      start.setHours(10, 0, 0, 0);
      end = new Date(start);
      end.setHours(12, 0, 0, 0);
      details = recipe.mealPrepNote || "Pre-chopping and base prep for the week.";
    } else {
      title = `Bachat Cooking: Day ${activeDay} 🍳`;
      const cookDate = new Date(now);
      cookDate.setDate(now.getDate() + (activeDay - 1));
      
      const parts = prefs.cookingWindow.split(' - ');
      const parseHour = (h: string) => {
        const [num, period] = h.split(' ');
        let hr = parseInt(num);
        if (period === 'PM' && hr !== 12) hr += 12;
        if (period === 'AM' && hr === 12) hr = 0;
        return hr;
      };
      
      start = new Date(cookDate);
      start.setHours(parseHour(parts[0]), 0, 0, 0);
      end = new Date(cookDate);
      end.setHours(parseHour(parts[1]), 0, 0, 0);
      details = currentDayPlan?.meals.map(m => `${m.type}: ${m.name}`).join("\n") || "";
    }

    window.open(generateGCalLink(title, start, end, details), '_blank');
  };

  const handleDownloadICS = () => {
    if (!recipe) return;
    const icsContent = generateICS(recipe, prefs);
    downloadICS(icsContent, "bachat_schedule.ics");
  };

  const toBuyItems = useMemo(() => recipe?.groceryList.filter(g => !g.isOwned) || [], [recipe]);
  const ownedItems = useMemo(() => recipe?.groceryList.filter(g => g.isOwned) || [], [recipe]);

  const isCurrentStepValid = useMemo(() => {
    switch (step) {
      case FormStep.PERSONA: return !!prefs.persona;
      case FormStep.DIET: return !!prefs.diet;
      case FormStep.TIME: return !!prefs.time;
      case FormStep.SETUP: return !!prefs.setup;
      case FormStep.CITY: return !!prefs.cityType;
      case FormStep.ECONOMICS: return prefs.budget > 0 && prefs.durationDays > 0;
      case FormStep.SCHEDULING: return !!prefs.cookingWindow;
      case FormStep.INGREDIENTS: return prefs.ingredients.length >= 5;
      default: return true;
    }
  }, [step, prefs]);

  const toggleIngredientChip = (ing: string) => {
    setPrefs(p => {
      if (p.ingredients.includes(ing)) {
        return { ...p, ingredients: p.ingredients.filter(i => i !== ing) };
      } else {
        return { ...p, ingredients: [...p.ingredients, ing] };
      }
    });
  };

  const renderStep = () => {
    const actionButtonClass = `w-full py-5 rounded-3xl font-black uppercase tracking-widest transition-all duration-300 shadow-xl btn-frosted disabled:opacity-20 disabled:cursor-not-allowed`;

    switch (step) {
      case FormStep.PERSONA:
        return (
          <div className="flex flex-col gap-6 pb-20 animate-in fade-in slide-in-from-bottom-5">
            <h2 className="text-xl font-semibold text-center text-accent">Who's Cooking?</h2>
            <div className="flex flex-col gap-4">
              {PERSONA_OPTIONS.map(opt => (
                <button 
                  key={opt.id} 
                  onClick={() => {
                    setPrefs(p => ({ 
                      ...p, 
                      persona: opt.id as any, 
                      isPortabilityRequired: opt.id === 'Student' 
                    }));
                  }}
                  className={`p-6 rounded-3xl glass transition-all duration-300 border flex items-center gap-4 relative group ${
                    prefs.persona === opt.id 
                      ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.2)]' 
                      : 'border-white/5 hover:bg-white/5'
                  }`}
                >
                  <span className="text-3xl grayscale group-hover:grayscale-0 transition-all">{opt.icon}</span>
                  <div className="text-left">
                    <p className={`font-black uppercase tracking-widest text-sm ${prefs.persona === opt.id ? 'text-amber-400' : 'text-slate-300'}`}>
                      {opt.label}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">{opt.description}</p>
                  </div>
                  {prefs.persona === opt.id && (
                    <div className="absolute top-4 right-4 text-amber-500 animate-pop">
                      <CheckCircleIcon className="w-5 h-5" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <button 
              disabled={!isCurrentStepValid} 
              onClick={handleNext} 
              className={actionButtonClass}
            >
              Start Protocol ⚡
            </button>
          </div>
        );

      case FormStep.DIET:
        return (
          <div className="flex flex-col gap-6 pb-20 animate-in fade-in">
            <h2 className="text-xl font-semibold text-center text-accent">Diet Style?</h2>
            <div className="grid grid-cols-2 gap-4">
              {DIET_OPTIONS.map(opt => (
                <button 
                  key={opt} 
                  onClick={() => setPrefs(p => ({ ...p, diet: opt as any }))}
                  className={`p-4 rounded-3xl glass border flex flex-col items-center justify-center gap-2 relative transition-all duration-300 ${
                    prefs.diet === opt ? 'border-amber-500 bg-amber-500/10' : 'border-white/5 hover:bg-white/5'
                  }`}
                >
                  <span className="text-sm font-medium text-center leading-tight">{opt}</span>
                  {prefs.diet === opt && <CheckCircleIcon className="absolute top-2 right-2 w-4 h-4 text-amber-500" />}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <button disabled={!isCurrentStepValid} onClick={handleNext} className={actionButtonClass}>Next Phase ✨</button>
              <button onClick={handleBack} className="w-full py-4 text-slate-500 text-xs font-bold uppercase border border-white/5 rounded-2xl glass hover:bg-white/5 transition-all">Go Back</button>
            </div>
          </div>
        );

      case FormStep.TIME:
        return (
          <div className="flex flex-col gap-6 pb-20">
            <h2 className="text-xl font-semibold text-center text-accent">Speed Limit?</h2>
            <div className="grid grid-cols-1 gap-4">
              {TIME_OPTIONS.map(opt => (
                <button 
                  key={opt} 
                  onClick={() => setPrefs(p => ({ ...p, time: opt as any }))}
                  className={`p-5 rounded-3xl glass border flex items-center justify-between transition-all duration-300 ${
                    prefs.time === opt ? 'border-amber-500 bg-amber-500/10' : 'border-white/5 hover:bg-white/5'
                  }`}
                >
                  <span className="text-sm font-medium">{opt}</span>
                  {prefs.time === opt && <CheckCircleIcon className="text-amber-500" />}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <button disabled={!isCurrentStepValid} onClick={handleNext} className={actionButtonClass}>Next Phase ✨</button>
              <button onClick={handleBack} className="w-full py-4 text-slate-500 text-xs font-bold uppercase border border-white/5 rounded-2xl glass hover:bg-white/5 transition-all">Go Back</button>
            </div>
          </div>
        );

      case FormStep.SETUP:
        return (
          <div className="flex flex-col gap-6 pb-20">
            <h2 className="text-xl font-semibold text-center text-accent">Equipment?</h2>
            <div className="grid grid-cols-1 gap-4">
              {SETUP_OPTIONS.map(opt => (
                <button 
                  key={opt} 
                  onClick={() => setPrefs(p => ({ ...p, setup: opt as any }))}
                  className={`p-5 rounded-3xl glass border flex items-center justify-between transition-all duration-300 ${
                    prefs.setup === opt ? 'border-amber-500 bg-amber-500/10' : 'border-white/5 hover:bg-white/5'
                  }`}
                >
                  <span className="text-sm font-medium">{opt}</span>
                  {prefs.setup === opt && <CheckCircleIcon className="text-amber-500" />}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <button disabled={!isCurrentStepValid} onClick={handleNext} className={actionButtonClass}>Next Phase ✨</button>
              <button onClick={handleBack} className="w-full py-4 text-slate-500 text-xs font-bold uppercase border border-white/5 rounded-2xl glass hover:bg-white/5 transition-all">Go Back</button>
            </div>
          </div>
        );

      case FormStep.CITY:
        return (
          <div className="flex flex-col gap-6 pb-20">
            <h2 className="text-xl font-semibold text-center text-accent">City Tier?</h2>
            <div className="grid grid-cols-1 gap-4">
              {CITY_OPTIONS.map(opt => (
                <button 
                  key={opt} 
                  onClick={() => setPrefs(p => ({ ...p, cityType: opt as any }))}
                  className={`p-5 rounded-3xl glass border flex items-center justify-between transition-all duration-300 ${
                    prefs.cityType === opt ? 'border-amber-500 bg-amber-500/10' : 'border-white/5 hover:bg-white/5'
                  }`}
                >
                  <span className="text-sm font-medium">{opt}</span>
                  {prefs.cityType === opt && <CheckCircleIcon className="text-amber-500" />}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <button disabled={!isCurrentStepValid} onClick={handleNext} className={actionButtonClass}>Next Phase ✨</button>
              <button onClick={handleBack} className="w-full py-4 text-slate-500 text-xs font-bold uppercase border border-white/5 rounded-2xl glass hover:bg-white/5 transition-all">Go Back</button>
            </div>
          </div>
        );

      case FormStep.ECONOMICS:
        return (
          <div className="flex flex-col gap-8 pb-20">
            <h2 className="text-xl font-semibold text-center text-accent">Economics</h2>
            <div className="space-y-6">
              <div className="glass p-6 rounded-[2rem] space-y-4 shadow-inner">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Budget (₹)</label>
                  <span className="text-lg font-bold text-amber-500">₹{prefs.budget}</span>
                </div>
                <input 
                  type="range" 
                  min="50" 
                  max="5000" 
                  step="50" 
                  value={prefs.budget} 
                  onChange={(e) => setPrefs(p => ({ ...p, budget: parseInt(e.target.value) }))} 
                  className="w-full accent-amber-500" 
                />
              </div>
              <div className="glass p-6 rounded-[2rem] space-y-4 shadow-inner">
                <label className="text-[10px] font-black text-slate-500 uppercase block">Duration</label>
                <div className="flex gap-4">
                  {DURATION_OPTIONS.map(d => (
                    <button 
                      key={d} 
                      onClick={() => setPrefs(p => ({ ...p, durationDays: d }))} 
                      className={`flex-1 py-4 rounded-2xl border font-black transition-all duration-300 ${
                        prefs.durationDays === d 
                          ? 'border-amber-500 bg-amber-500/10 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                          : 'border-white/5 bg-white/5 text-slate-500 hover:bg-white/5'
                      }`}
                    >
                      {d} Day{d > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button disabled={!isCurrentStepValid} onClick={handleNext} className={actionButtonClass}>Next Phase ✨</button>
                <button onClick={handleBack} className="w-full py-4 text-slate-500 text-xs font-bold uppercase border border-white/5 rounded-2xl glass hover:bg-white/5 transition-all">Go Back</button>
              </div>
            </div>
          </div>
        );

      case FormStep.SCHEDULING:
        return (
          <div className="flex flex-col gap-6 pb-20 animate-in fade-in">
            <h2 className="text-xl font-semibold text-center text-accent">Scheduling</h2>
            <div className="space-y-6">
              <div className="glass p-6 rounded-[2rem] space-y-4 shadow-inner">
                <label className="text-[10px] font-black text-slate-500 uppercase block">Cooking Window</label>
                <select 
                  value={prefs.cookingWindow} 
                  onChange={(e) => setPrefs(p => ({ ...p, cookingWindow: e.target.value }))}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-amber-500 shadow-inner"
                >
                  <option value="6 AM - 8 AM">6 AM - 8 AM (Early Bird)</option>
                  <option value="12 PM - 2 PM">12 PM - 2 PM (Lunch Break)</option>
                  <option value="6 PM - 8 PM">6 PM - 8 PM (Evening)</option>
                  <option value="9 PM - 11 PM">9 PM - 11 PM (Late Night)</option>
                </select>
              </div>

              <div className="glass p-6 rounded-[2rem] space-y-4 shadow-inner">
                <label className="text-[10px] font-black text-slate-500 uppercase block">Reminders</label>
                <div className="flex gap-4">
                  {(['Morning', 'Evening'] as const).map(time => (
                    <button 
                      key={time}
                      onClick={() => setPrefs(p => ({ ...p, reminderTime: time }))}
                      className={`flex-1 py-4 rounded-2xl border font-black transition-all duration-300 ${
                        prefs.reminderTime === time 
                          ? 'border-amber-500 bg-amber-500/10 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                          : 'border-white/5 bg-white/5 text-slate-500 hover:bg-white/5'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
                <div className="flex gap-4 mt-2">
                  {([1, 2] as const).map(count => (
                    <button 
                      key={count}
                      onClick={() => setPrefs(p => ({ ...p, remindersPerDay: count }))}
                      className={`flex-1 py-4 rounded-2xl border font-black transition-all duration-300 ${
                        prefs.remindersPerDay === count 
                          ? 'border-amber-500 bg-amber-500/10 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                          : 'border-white/5 bg-white/5 text-slate-500 hover:bg-white/5'
                      }`}
                    >
                      {count} per Day
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button disabled={!isCurrentStepValid} onClick={handleNext} className={actionButtonClass}>Next Phase ✨</button>
              <button onClick={handleBack} className="w-full py-4 text-slate-500 text-xs font-bold uppercase border border-white/5 rounded-2xl glass hover:bg-white/5 transition-all">Go Back</button>
            </div>
          </div>
        );

      case FormStep.INGREDIENTS:
        return (
          <div className="flex flex-col gap-6 pb-20">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-center text-accent">Raid Fridge</h2>
              <p className="text-[10px] text-slate-500 text-center uppercase font-black">Identify at least 5 staples</p>
            </div>
            
            {prefs.ingredients.length === 0 && <EmptyFridgeSVG />}
            
            <IngredientInput ingredients={prefs.ingredients} setIngredients={(tags) => setPrefs(p => ({ ...p, ingredients: tags }))} />
            
            <div className="space-y-4 mt-4">
              <p className="text-[10px] font-black text-red-500/60 uppercase tracking-widest text-center">Exclude (Hated/Allergic)</p>
              <IngredientInput 
                ingredients={prefs.excludedIngredients} 
                setIngredients={(tags) => setPrefs(p => ({ ...p, excludedIngredients: tags }))} 
              />
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              <p className="w-full text-[10px] text-slate-600 font-black uppercase mb-1">Quick Add Staples</p>
              {QUICK_ADD_INGREDIENTS.map(ing => (
                <button 
                  key={ing} 
                  onClick={() => toggleIngredientChip(ing)}
                  className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all duration-300 ${
                    prefs.ingredients.includes(ing) 
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400 shadow-inner' 
                      : 'border-white/10 text-slate-500 hover:bg-white/5'
                  }`}
                >
                  {ing}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 mt-6">
              <button onClick={() => handleSubmit()} disabled={!isCurrentStepValid} className={`${actionButtonClass} py-6 text-lg`}>
                Generate Bachat Protocol 🍳
              </button>
              <button onClick={handleBack} className="w-full py-4 text-slate-500 text-xs font-bold uppercase border border-white/5 rounded-2xl glass hover:bg-white/5 transition-all">Go Back</button>
            </div>
          </div>
        );

      case FormStep.RESULT:
        if (!recipe) return null;
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 pb-24">
            <div className="mx-1">
              <div className={`px-6 py-3 glass border text-[11px] rounded-full text-center font-black uppercase tracking-[0.2em] shadow-xl ${budgetFeasibility.color} ${budgetFeasibility.pulse ? 'animate-pulse' : ''}`}>
                {budgetFeasibility.label}
              </div>
            </div>

            <div className="mx-1 relative rounded-[2.5rem] overflow-hidden border border-amber-500/20 shadow-2xl h-[240px]">
              <img src={heroImageSrc} alt={recipe.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest shadow-xl">Protocol Active</span>
                  <span className="bg-white/10 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase border border-white/5">{activeDay} / {prefs.durationDays} Days</span>
                </div>
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-tight mb-1 drop-shadow-2xl">{recipe.title}</h2>
              </div>
            </div>

            {/* Smart Scheduling Integration */}
            <div className="mx-1 glass p-6 rounded-[2.5rem] shadow-xl space-y-5 relative overflow-visible">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Logistics Engine</span>
                  <button 
                    onClick={() => setShowJustification(!showJustification)}
                    className="text-amber-500 hover:text-amber-400 transition-colors"
                  >
                    <InfoIcon />
                  </button>
                </div>
                <button 
                  onClick={handleDownloadICS}
                  className="text-[9px] font-black text-amber-500 bg-amber-500/5 px-4 py-1.5 rounded-full border border-amber-500/20 hover:bg-amber-500/20 transition-all flex items-center gap-1.5"
                >
                  <CalendarIcon className="w-3 h-3" /> .ICS Export
                </button>
              </div>
              
              {showJustification && (
                <div className="absolute top-12 left-0 right-0 z-[100] p-4 bg-slate-950/90 backdrop-blur-3xl border border-amber-500/30 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95">
                  <p className="text-[10px] font-bold text-slate-300 leading-relaxed">
                    {recipe.reminderJustification}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleScheduleGCal('shopping')}
                  className="p-4 bg-slate-900/40 rounded-2xl border border-white/5 text-[10px] font-black text-slate-400 hover:border-amber-500/30 hover:text-slate-200 transition-all flex items-center justify-center gap-2"
                >
                  🛒 G-Cal Shopping
                </button>
                <button 
                  onClick={() => handleScheduleGCal('cooking')}
                  className="p-4 bg-slate-900/40 rounded-2xl border border-white/5 text-[10px] font-black text-slate-400 hover:border-amber-500/30 hover:text-slate-200 transition-all flex items-center justify-center gap-2"
                >
                  🍳 G-Cal Cooking
                </button>
              </div>

              {recipe.mealPrepNote && (
                <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-[1.5rem] flex flex-col gap-3">
                  <div className="flex gap-3 items-start">
                    <span className="text-sm">🗓️</span>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Weekend Meal Prep</span>
                      <p className="text-[10px] font-medium text-amber-200/70 leading-tight mt-1">{recipe.mealPrepNote}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleScheduleGCal('prep')}
                    className="w-full py-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-[9px] font-black text-amber-400 hover:bg-amber-500/20 transition-all"
                  >
                    Sync Prep to Calendar
                  </button>
                </div>
              )}
            </div>

            {/* Daily Navigation Tabs */}
            {prefs.durationDays > 1 && (
              <div className="flex gap-2 glass p-2 rounded-[2.5rem] sticky top-4 z-50 mx-1 shadow-2xl">
                {recipe.dailyPlans.map(d => (
                  <button key={d.day} onClick={() => setActiveDay(d.day)}
                    className={`flex-1 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${activeDay === d.day ? 'bg-amber-500 text-slate-950 shadow-[0_4px_20px_rgba(245,158,11,0.4)] scale-[1.02]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                    Day {d.day}
                  </button>
                ))}
              </div>
            )}

            {/* Meal Protocol Cards */}
            <div className="space-y-6 mx-1">
              <div className="flex items-center justify-between mb-2 px-2">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_#F59E0B]" />
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Meal Slots</h3>
                </div>
              </div>
              
              <div className="flex flex-col gap-8">
                {currentDayPlan?.meals.map((meal, idx) => (
                  <div 
                    key={`${activeDay}-${meal.name}-${idx}`} 
                    className={`glass p-6 rounded-[3rem] shadow-2xl transition-all duration-500 relative ${swappingMealIndex === idx ? 'opacity-50 grayscale scale-[0.98]' : ''}`}
                  >
                    {swappingMealIndex === idx && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center">
                        <div className="animate-spin text-amber-500"><RefreshIcon className="w-10 h-10" /></div>
                      </div>
                    )}
                    
                    <MealImage dishName={meal.name} />
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[9px] font-black text-amber-500 bg-amber-500/5 px-3 py-1.5 rounded-full border border-amber-500/10 uppercase tracking-widest">
                          {meal.type}
                        </span>
                        {meal.isPortableOrOnePot && (
                          <span className="text-[9px] font-black text-blue-400 bg-blue-500/5 px-3 py-1.5 rounded-full border border-blue-500/10 uppercase tracking-widest">
                            Portable
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                         <button 
                          onClick={() => handleZeroPrep(idx)}
                          className="text-[9px] font-black text-slate-500 bg-slate-900/40 px-3 py-1.5 rounded-full border border-white/5 hover:text-white hover:border-amber-500/20 transition-all flex items-center gap-1.5"
                        >
                          ⚡ Zero Prep
                        </button>
                        <button 
                          onClick={() => handleSwapMeal(meal, idx)}
                          className="text-[9px] font-black text-amber-500 bg-amber-500/5 px-3 py-1.5 rounded-full border border-amber-500/20 hover:bg-amber-500/20 transition-all flex items-center gap-1.5"
                        >
                          <RefreshIcon className="w-2.5 h-2.5" /> Swap
                        </button>
                      </div>
                    </div>

                    <h4 className="font-black text-white text-xl mb-3 uppercase italic tracking-tight leading-none">
                      {meal.name}
                    </h4>
                    
                    {meal.tiffinNote && (
                      <div className="mb-5 p-4 bg-blue-500/5 border border-blue-500/10 rounded-[1.5rem] flex gap-3 items-start">
                         <span className="text-sm">🍱</span>
                         <p className="text-[10px] font-bold text-blue-200/70 italic leading-relaxed">{meal.tiffinNote}</p>
                      </div>
                    )}

                    <div className="space-y-4 pl-4 border-l-2 border-amber-500/10 py-1 mb-8">
                      {meal.steps.map((s, i) => (
                        <div key={i} className="flex gap-4 text-slate-300 text-xs">
                          <span className="text-amber-500 font-black opacity-30">0{i+1}</span>
                          <span className="font-medium leading-relaxed">{s}</span>
                        </div>
                      ))}
                    </div>

                    <div className="p-5 bg-black/40 rounded-[2rem] border border-white/5 space-y-4 shadow-inner">
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Bachat Substitutions</p>
                      <div className="grid grid-cols-1 gap-4">
                        {meal.substitutions.map((sub, i) => (
                          <div key={i} className="flex flex-col gap-1.5 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600 text-[10px] line-through opacity-50">{sub.original}</span>
                              <span className="text-amber-500 text-[10px] font-black uppercase">→ {sub.replacement}</span>
                            </div>
                            <p className="text-[9px] text-slate-400 italic font-medium leading-tight">{sub.benefit}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Grocery Logistics */}
            <div className="space-y-4 mx-1">
              <div className="flex items-center justify-between px-3">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Logistics</h3>
                <button 
                  onClick={handleExport} 
                  className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-2 px-5 py-2.5 rounded-full glass border border-amber-500/20 text-amber-500 hover:bg-amber-500/10 transition-all duration-500 shadow-xl`}
                >
                  {copySuccess ? 'Prepared ✅' : 'Share WhatsApp 📋'}
                </button>
              </div>

              {/* Must Buy */}
              <div className="p-6 glass rounded-[3rem] shadow-inner">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] border-b border-amber-500/10 pb-3 mb-5">🛒 Must Acquire</p>
                <div className="flex flex-wrap gap-3">
                  {toBuyItems.length > 0 ? toBuyItems.map(it => (
                    <span key={it.item} className="text-[10px] bg-slate-900/60 px-5 py-2.5 rounded-2xl border border-white/5 text-slate-300 font-bold tracking-tight shadow-sm">
                      {it.item}
                    </span>
                  )) : (
                    <p className="text-[10px] text-slate-600 font-bold italic">Stockpile optimized. No purchases needed! ✅</p>
                  )}
                </div>
              </div>

              {/* Already Owned */}
              <div className="p-6 glass rounded-[3rem] opacity-60 shadow-inner">
                <p className="text-[10px] font-black text-green-500/80 uppercase tracking-[0.3em] border-b border-green-500/10 pb-3 mb-5">🧊 In Storage</p>
                <div className="flex flex-wrap gap-3">
                  {ownedItems.map(it => (
                    <span key={it.item} className="text-[10px] bg-slate-950/40 px-4 py-2 rounded-2xl border border-white/5 text-slate-500 font-medium">
                      {it.item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Optimization Selector */}
            <div className="mx-1 space-y-6 pb-8">
              <div className="flex items-center justify-between px-3">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Recalibrate</h3>
                <span className="text-[8px] font-black text-amber-500/40 uppercase tracking-widest border border-amber-500/10 px-3 py-1 rounded-full bg-amber-500/5">
                  {prefs.persona} Mode
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'CHEAPEST', label: 'Cheapest 💰' },
                  { id: 'FASTEST', label: 'Fastest ⚡' },
                  { id: 'HIGH_PROTEIN', label: 'Protein 💪' },
                  { id: 'EXTRA_SPICY', label: 'Spicy 🌶️' }
                ].map(opt => {
                  const isSelected = currentOptimization === opt.id;
                  return (
                    <button 
                      key={opt.id} 
                      onClick={() => handleSubmit(opt.id as any)} 
                      className={`py-6 glass border rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-[0.97] shadow-lg ${
                        isSelected 
                          ? 'border-amber-500 text-white bg-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-[1.02]' 
                          : 'border-white/5 text-slate-400 hover:text-slate-200 hover:border-amber-500/40 hover:bg-amber-500/5'
                      }`}
                    >
                      {opt.label} {isSelected && '✓'}
                    </button>
                  );
                })}
              </div>
            </div>

            <button 
              onClick={handleAbortMission} 
              className="w-full py-8 glass border border-white/10 rounded-[3rem] text-[11px] font-black uppercase tracking-[0.8em] text-slate-700 hover:text-white hover:border-red-500/20 transition-all duration-700 shadow-2xl active:scale-[0.98] mt-12 mb-20"
            >
              System Reset
            </button>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] h-[400px] bg-amber-500/5 blur-[120px] rounded-full -z-10" />

      <div className="w-full max-w-[500px] flex flex-col h-full relative">
        <header className="flex flex-col items-center mb-12 text-center group cursor-pointer" onClick={() => step === FormStep.RESULT ? handleBack() : setStep(FormStep.PERSONA)}>
          <Logo className="w-24 h-24 mb-6 drop-shadow-[0_0_30px_rgba(245,158,11,0.6)] transition-all duration-700 group-hover:scale-110 active:rotate-12" />
          <h1 className="saas-title text-4xl font-bold mb-2 text-white flex gap-1">
            Bachat<span className="text-accent">Bhojan</span>
          </h1>
          <div className="h-[1px] w-24 accent-gradient mb-3 opacity-50" />
          <p className="text-[9px] text-slate-500 uppercase tracking-[0.6em] font-black opacity-60">Solo Optimization Engine</p>
        </header>

        {step !== FormStep.RESULT && step !== FormStep.PERSONA && <VibeToggle vibe={vibe} onChange={setVibe} />}

        <main className="flex-1">
          {error && (
            <div className="mb-8 p-8 glass border border-red-500/30 text-red-400 text-[11px] rounded-[3rem] text-center font-black uppercase tracking-[0.2em] animate-pulse shadow-2xl">
              Protocol Error! 🚨 {error}
            </div>
          )}
          {renderStep()}
        </main>

        {step !== FormStep.RESULT && step !== FormStep.INGREDIENTS && (
          <footer className="mt-12 flex justify-center gap-3 pb-16">
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-700 ${
                  step === i ? 'w-14 bg-amber-500 shadow-[0_0_20px_#F59E0B]' : 'w-2 bg-slate-900 border border-white/5'
                }`} 
              />
            ))}
          </footer>
        )}
      </div>

      {loading && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-[100px] z-[100] flex flex-col items-center justify-center p-12 text-center transition-all duration-700">
          <div className="relative w-56 h-56 mb-16 group">
            <div className="absolute inset-0 border-[6px] border-amber-500/5 rounded-full rotate-45 transition-transform duration-1000 group-hover:rotate-90" />
            <div className="absolute inset-0 border-[6px] border-t-amber-500 rounded-full animate-spin shadow-[0_0_50px_rgba(245,158,11,0.5)]" />
            <div className="absolute inset-0 flex items-center justify-center text-7xl drop-shadow-[0_0_40px_#F59E0B] animate-pulse">🥗</div>
          </div>
          <h2 className="saas-title text-4xl font-bold mb-4 text-white tracking-tighter drop-shadow-2xl">Refining</h2>
          <p className="text-amber-500/80 text-[11px] font-black uppercase tracking-[0.6em] animate-pulse bg-amber-500/5 px-8 py-3 rounded-full border border-amber-500/20">
            Applying {prefs.persona} Constraints...
          </p>
        </div>
      )}
    </div>
  );
};

export default App;