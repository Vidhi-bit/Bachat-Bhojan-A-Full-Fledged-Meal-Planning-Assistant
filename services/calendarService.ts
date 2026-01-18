
import { Recipe, UserPreferences } from "../types";

/**
 * Format: YYYYMMDDTHHMMSSZ
 */
const formatGCalDate = (date: Date): string => {
  return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
};

/**
 * Parses cooking window string like "6 PM - 8 PM" into hours
 */
const parseWindow = (window: string): { start: number; end: number } => {
  const parts = window.split(' - ');
  const parseHour = (h: string) => {
    const [num, period] = h.split(' ');
    let hour = parseInt(num);
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return hour;
  };
  return {
    start: parseHour(parts[0]),
    end: parseHour(parts[1])
  };
};

export const generateGCalLink = (title: string, start: Date, end: Date, details: string) => {
  const baseUrl = "https://www.google.com/calendar/render?action=TEMPLATE";
  const params = new URLSearchParams({
    text: title,
    dates: `${formatGCalDate(start)}/${formatGCalDate(end)}`,
    details: details,
    sf: "true",
    output: "xml"
  });
  return `${baseUrl}&${params.toString()}`;
};

export const generateICS = (recipe: Recipe, prefs: UserPreferences): string => {
  const now = new Date();
  const events: string[] = [];
  const { start, end } = parseWindow(prefs.cookingWindow);

  // Helper to add ICS event
  const addEvent = (title: string, startDate: Date, endDate: Date, details: string) => {
    events.push("BEGIN:VEVENT");
    events.push(`DTSTART:${formatGCalDate(startDate)}`);
    events.push(`DTEND:${formatGCalDate(endDate)}`);
    events.push(`SUMMARY:${title}`);
    events.push(`DESCRIPTION:${details.replace(/\n/g, "\\n")}`);
    events.push("END:VEVENT");
  };

  // 1. Grocery Shopping (Next 1 hour)
  const shopStart = new Date(now.getTime() + 60 * 60 * 1000);
  const shopEnd = new Date(shopStart.getTime() + 60 * 60 * 1000);
  const groceryDetails = `Buy items: ${recipe.groceryList.filter(g => !g.isOwned).map(g => g.item).join(", ")}`;
  addEvent("Bachat Grocery Shopping 🛒", shopStart, shopEnd, groceryDetails);

  // 2. Daily Cooking Events
  recipe.dailyPlans.forEach((plan, index) => {
    const cookDate = new Date(now);
    cookDate.setDate(now.getDate() + index);
    
    const startTime = new Date(cookDate);
    startTime.setHours(start, 0, 0, 0);
    
    const endTime = new Date(cookDate);
    endTime.setHours(end, 0, 0, 0);

    const mealDetails = plan.meals.map(m => `${m.type}: ${m.name}`).join("\n");
    addEvent(`Bachat Cooking: Day ${plan.day} 🍳`, startTime, endTime, mealDetails);
  });

  // 3. Weekend Meal Prep (If suggested)
  if (recipe.mealPrepNote) {
    const weekend = new Date(now);
    // Move to next Saturday
    weekend.setDate(now.getDate() + (6 - now.getDay() + 7) % 7);
    const prepStart = new Date(weekend);
    prepStart.setHours(10, 0, 0, 0);
    const prepEnd = new Date(weekend);
    prepEnd.setHours(12, 0, 0, 0);
    addEvent("Bachat Weekend Meal Prep 🗓️", prepStart, prepEnd, recipe.mealPrepNote);
  }

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bachat-Bhojan//Calendar Service//EN",
    ...events,
    "END:VCALENDAR"
  ].join("\r\n");
};

export const downloadICS = (content: string, filename: string) => {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
