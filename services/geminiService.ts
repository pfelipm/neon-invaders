import { GoogleGenAI } from "@google/genai";

let genAI: GoogleGenAI | null = null;
let apiBlockedUntil = 0; // Timestamp for backoff

// Initialize safely
try {
  if (process.env.API_KEY) {
    genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
} catch (error) {
  console.error("Failed to initialize Gemini Client", error);
}

const FALLBACK_TAUNTS = {
  START: [
    "Prepare for oblivion, earthling.",
    "Your neon shields are paper thin.",
    "I have arrived. Surrender.",
    "Another fly to swat.",
    "Systems online. Target locked.",
    "Resistance is futile."
  ],
  LEVEL_UP: [
    "You only delay the inevitable.",
    "My fleets are infinite.",
    "Impressive... for a primitive.",
    "Harder difficulties initializing.",
    "Deploying elite squadrons.",
    "Adaptability detected. Countermeasures active."
  ],
  GAME_OVER: [
    "Game Over. As predicted.",
    "Humanity falls.",
    "Delete your existence.",
    "Pathetic performance.",
    "Simulation terminated.",
    "Your world is mine."
  ],
  PLAYER_HIT: [
    "Target practice.",
    "Your shields are failing.",
    "Direct hit.",
    "Too slow.",
    "Dance, pilot, dance.",
    "Precision strike confirmed.",
    "Evasive maneuvers failed."
  ],
  BOSS_IMMINENT: [
    "The Colossus approaches.",
    "You will not survive this guardian.",
    "My champion wakes.",
    "Prepare to be crushed.",
    "Tremble before true power.",
    "Your end is here."
  ],
  BOSS_DEFEATED: [
    "Impossible... rerouting power.",
    "You simply delayed your doom.",
    "My unit... destroyed?",
    "Lucky shot, human.",
    "Analysis complete. New strategy uploading.",
    "You will pay for that."
  ]
};

export type TauntSituation = 'START' | 'LEVEL_UP' | 'GAME_OVER' | 'PLAYER_HIT' | 'BOSS_IMMINENT' | 'BOSS_DEFEATED';

export const getAlienTaunt = async (situation: TauntSituation, level: number): Promise<string> => {
  const getFallback = () => {
    const fallbacks = FALLBACK_TAUNTS[situation];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  };

  // Circuit Breaker / Backoff Check
  if (Date.now() < apiBlockedUntil) {
    // Silently return fallback during cooldown to reduce API intensity
    return getFallback();
  }

  if (!genAI) return getFallback();

  const prompt = `
    You are an arrogant, futuristic Alien Overlord commanding an invasion fleet against Earth. 
    The player is a pilot of a solitary neon starfighter.
    
    Situation: ${situation}
    Current Level: ${level}

    Generate a very short, menacing, or sarcastic taunt (max 15 words). 
    Do not use hashtags. Keep it atmospheric and sci-fi.
  `;

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 40,
      }
    });
    return response.text.trim() || getFallback();
  } catch (error) {
    console.warn("Gemini API Request Failed (activating cooldown):", error);
    // Activate backoff for 20 seconds to prevent spamming the API when rate limited
    apiBlockedUntil = Date.now() + 20000;
    return getFallback();
  }
};