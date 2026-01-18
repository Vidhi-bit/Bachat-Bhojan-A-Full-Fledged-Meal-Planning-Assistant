
import { GoogleGenAI, Type } from "@google/genai";
import { UserPreferences, Recipe, OptimizationConstraint, Meal } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateRecipe = async (prefs: UserPreferences, constraint?: OptimizationConstraint): Promise<Recipe> => {
  const dailyBudget = prefs.budget / prefs.durationDays;
  const isMetro = prefs.cityType.includes('Metro');
  const isTightBudget = dailyBudget <= 150;
  const budgetStatus = isTightBudget ? 'TIGHT' : 'FEASIBLE';

  let dietaryGuardrail = "";
  const baseDiet = prefs.diet.split(' ')[0]; 
  
  switch (baseDiet) {
    case 'Vegetarian':
      dietaryGuardrail = "CRITICAL DIETARY GUARDRAIL: Strictly Vegetarian. No eggs, meat, or fish.";
      break;
    case 'Vegan':
      dietaryGuardrail = "CRITICAL DIETARY GUARDRAIL: Strictly Vegan. No dairy, meat, or animal products.";
      break;
    case 'Non-Veg':
      dietaryGuardrail = "CONTEXT: Non-Vegetarian allowed.";
      break;
    default:
      dietaryGuardrail = `CONTEXT: Follow ${baseDiet} diet.`;
  }

  const prompt = `Act as "Bachat-Bhojan", the smart solo culinary planner.
  DATA:
  - Persona: ${prefs.persona}
  - Daily Budget: ₹${dailyBudget}
  - Duration: ${prefs.durationDays} days
  - City Tier: ${prefs.cityType}
  - Kitchen: ${prefs.setup}
  - Ingredients Available: ${prefs.ingredients.join(', ')}
  - Current Vibe: ${prefs.vibe}
  - Target Cooking Window: ${prefs.cookingWindow}
  
  ${dietaryGuardrail}
  BUDGET STATUS: ${budgetStatus}. Ensure the total plan fits the ₹${dailyBudget} daily limit.
  ${constraint ? `OPTIMIZATION: ${constraint}` : ""}

  STRICT SUBSTITUTION RULES:
  For EVERY single meal (Breakfast, Lunch, and Dinner), you MUST suggest at least TWO distinct, economical substitutes.
  Each substitute MUST include:
  1. 'original': The standard/expensive ingredient.
  2. 'replacement': The cheaper or more efficient alternative.
  3. 'benefit': A brief justification (e.g., 'Cheaper than store-bought', 'Higher shelf life', 'Better bulk value', 'Zero-waste usage').
  
  DIETARY COMPLIANCE: All substitutes MUST strictly adhere to the ${baseDiet} diet. (e.g., if Vegetarian, NEVER suggest eggs/meat as replacements).

  Response Schema: JSON object following the Recipe interface.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          personalizationReasoning: { type: Type.STRING },
          cityCostInfluence: { type: Type.STRING },
          efficiencyScore: { type: Type.NUMBER },
          reminderJustification: { type: Type.STRING },
          mealPrepNote: { type: Type.STRING },
          dailyPlans: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.NUMBER },
                meals: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING },
                      name: { type: Type.STRING },
                      description: { type: Type.STRING },
                      isPortableOrOnePot: { type: Type.BOOLEAN },
                      tiffinNote: { type: Type.STRING },
                      steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                      substitutions: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            original: { type: Type.STRING },
                            replacement: { type: Type.STRING },
                            benefit: { type: Type.STRING }
                          },
                          required: ["original", "replacement", "benefit"]
                        }
                      }
                    },
                    required: ["type", "name", "description", "isPortableOrOnePot", "steps", "substitutions"]
                  }
                }
              },
              required: ["day", "meals"]
            }
          },
          groceryList: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                item: { type: Type.STRING },
                category: { type: Type.STRING },
                isOwned: { type: Type.BOOLEAN }
              },
              required: ["item", "category", "isOwned"]
            }
          },
          fallbackPlans: { type: Type.ARRAY, items: { type: Type.STRING } },
          chefWisdom: { type: Type.ARRAY, items: { type: Type.STRING } },
          budgetAnalysis: { type: Type.STRING },
          searchQuery: { type: Type.STRING }
        },
        required: ["title", "description", "personalizationReasoning", "cityCostInfluence", "efficiencyScore", "reminderJustification", "dailyPlans", "groceryList", "chefWisdom", "budgetAnalysis", "searchQuery"]
      }
    }
  });

  if (!response.text) throw new Error("Planner error.");
  return JSON.parse(response.text) as Recipe;
};

export const swapMeal = async (prefs: UserPreferences, oldMeal: Meal): Promise<Meal> => {
  const dailyBudget = prefs.budget / prefs.durationDays;
  const prompt = `Act as "Bachat-Bhojan". Swap this meal: "${oldMeal.name}" (${oldMeal.type}) for an alternative.
  Constraints:
  - Budget: ₹${dailyBudget / 3} for this slot.
  - Diet: Strictly ${prefs.diet}.
  - Available: ${prefs.ingredients.join(', ')}.
  - Must include at least 2 economical substitutions with justifications.
  Provide ONE meal object in JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          isPortableOrOnePot: { type: Type.BOOLEAN },
          tiffinNote: { type: Type.STRING },
          steps: { type: Type.ARRAY, items: { type: Type.STRING } },
          substitutions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                replacement: { type: Type.STRING },
                benefit: { type: Type.STRING }
              },
              required: ["original", "replacement", "benefit"]
            }
          }
        },
        required: ["type", "name", "description", "isPortableOrOnePot", "steps", "substitutions"]
      }
    }
  });

  return JSON.parse(response.text || '{}') as Meal;
};

export const suggestZeroPrepAlternative = async (prefs: UserPreferences, ownedIngredients: string[]): Promise<Meal> => {
  const prompt = `Act as "Bachat-Bhojan". The user needs a "0-prep" alternative because their schedule changed.
  STRICT RULES:
  - Use ONLY these ingredients already in their pantry: ${ownedIngredients.join(', ')}.
  - Must be strictly ${prefs.diet}.
  - Must be ₹0 additional cost.
  - Must be ready in < 5 mins.
  - Must include at least 2 economical substitutions with justifications.
  Provide ONE meal object in JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          isPortableOrOnePot: { type: Type.BOOLEAN },
          steps: { type: Type.ARRAY, items: { type: Type.STRING } },
          substitutions: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT, 
              properties: { 
                original: {type:Type.STRING}, 
                replacement: {type:Type.STRING}, 
                benefit: {type:Type.STRING} 
              },
              required: ["original", "replacement", "benefit"]
            } 
          }
        },
        required: ["type", "name", "description", "isPortableOrOnePot", "steps", "substitutions"]
      }
    }
  });

  return JSON.parse(response.text || '{}') as Meal;
};
