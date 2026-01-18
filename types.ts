
export type PersonaType = 'Student' | 'Working Pro' | 'Household';
export type DietType = 'Any' | 'Vegetarian' | 'Non-Veg' | 'Vegan' | 'Keto' | 'Paleo' | 'High-Protein';
export type CookingTime = '15 min' | '30 min' | '45 min' | '60 min+';
export type KitchenSetup = 'Single Burner' | 'Microwave Only' | 'Air Fryer' | 'Full Kitchen';
export type CityType = 'Metro 🏙️' | 'Tier-2 🏘️' | 'Tier-3 🏡';
export type Vibe = 'LOW_ENERGY' | 'FULL_POWER';
export type OptimizationConstraint = 'CHEAPEST' | 'FASTEST' | 'HIGH_PROTEIN' | 'EXTRA_SPICY';
export type ReminderTime = 'Morning' | 'Evening';

export interface UserPreferences {
  persona: PersonaType;
  isPortabilityRequired: boolean;
  diet: DietType;
  time: CookingTime;
  setup: KitchenSetup;
  cityType: CityType;
  budget: number;
  durationDays: number;
  ingredients: string[];
  excludedIngredients: string[];
  vibe: Vibe;
  // New Scheduling fields
  cookingWindow: string;
  reminderTime: ReminderTime;
  remindersPerDay: 1 | 2;
}

export interface Substitution {
  original: string;
  replacement: string;
  benefit: string;
}

export interface Meal {
  type: 'Breakfast' | 'Lunch' | 'Dinner';
  name: string;
  description: string;
  isPortableOrOnePot: boolean;
  tiffinNote?: string;
  steps: string[];
  substitutions: Substitution[];
}

export interface DayPlan {
  day: number;
  meals: Meal[];
}

export interface GroceryItem {
  item: string;
  category: 'Vegetables' | 'Pantry' | 'Dairy' | 'Protein' | 'Other';
  isOwned?: boolean;
}

export interface Recipe {
  title: string;
  description: string;
  dailyPlans: DayPlan[];
  groceryList: GroceryItem[];
  fallbackPlans?: string[];
  chefWisdom: string[];
  budgetAnalysis: string;
  searchQuery: string;
  personalizationReasoning: string;
  cityCostInfluence: string;
  efficiencyScore: number; 
  // New AI generated fields
  reminderJustification: string;
  mealPrepNote?: string;
}

export enum FormStep {
  PERSONA = 0,
  DIET = 1,
  TIME = 2,
  SETUP = 3,
  CITY = 4,
  ECONOMICS = 5,
  SCHEDULING = 6,
  INGREDIENTS = 7,
  RESULT = 8
}
