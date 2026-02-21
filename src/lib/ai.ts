import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const TIMEOUT_MS = 60000;

export const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const aiModel = openrouter(process.env.OPENROUTER_MODEL || "upstage/solar-pro-3:free");

const statWeightsSchema = z.object({
  str: z.number().int().min(0).max(5),
  int: z.number().int().min(0).max(5),
  dis: z.number().int().min(0).max(5),
  cha: z.number().int().min(0).max(5),
  cre: z.number().int().min(0).max(5),
  spi: z.number().int().min(0).max(5),
});

const taskAnalysisSchema = z.object({
  statWeights: statWeightsSchema,
  priority: z.enum(["low", "medium", "high"]),
  difficulty: z.enum(["low", "medium", "high"]),
  insights: z.array(z.string()),
});

export type StatWeights = z.infer<typeof statWeightsSchema>;
export type TaskAnalysis = z.infer<typeof taskAnalysisSchema> & { estimatedXP: number };

export interface TaskInput {
  content: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  difficulty?: 'low' | 'medium' | 'high';
}

/**
 * Enhanced keyword-based classification with weighted scoring
 * Used as fallback when AI call fails or times out
 */
function classifyByKeywords(content: string): StatWeights {
  const lower = content.toLowerCase();
  
  // Weighted keyword patterns (higher weight = more definitive)
  const patterns = {
    str: [
      { words: ["gym", "workout", "run", "exercise", "training", "lift", "sports", "fitness", "walk", "hike", "bike", "swim", "yoga", "pilates"], weight: 3 },
      { words: ["physical", "body", "health", "strength", "muscle"], weight: 2 },
    ],
    int: [
      { words: ["learn", "study", "read", "research", "course", "lecture", "tutorial", "exam", "quiz", "test", "certificate", "degree"], weight: 3 },
      { words: ["code", "debug", "program", "algorithm", "technical", "science", "math", "problem", "analysis"], weight: 3 },
      { words: ["book", "article", "paper", "document", "review", "understand"], weight: 2 },
    ],
    dis: [
      { words: ["urgent", "asap", "deadline", "due", "today", "tomorrow"], weight: 3 },
      { words: ["meeting", "call", "schedule", "calendar", "appointment"], weight: 2 },
      { words: ["report", "update", "status", "review", "admin", "email", "inbox", "organize", "clean", "file", "submit"], weight: 2 },
      { words: ["routine", "daily", "habit", "consistent", "repeat", "maintain"], weight: 1 },
    ],
    cha: [
      { words: ["call", "phone", "videocall", "zoom", "meet"], weight: 3 },
      { words: ["email", "write", "message", "communicate"], weight: 2 },
      { words: ["present", "pitch", "demo", "share", "teach", "train", "workshop"], weight: 3 },
      { words: ["network", "linkedin", "social", "outreach", "cold"], weight: 2 },
      { words: ["interview", "hiring", "recruit"], weight: 2 },
    ],
    cre: [
      { words: ["design", "create", "build", "draw", "paint", "sketch"], weight: 3 },
      { words: ["brainstorm", "ideate", "concept", "innovate"], weight: 3 },
      { words: ["music", "song", "compose", "play", "instrument"], weight: 3 },
      { words: ["write", "story", "blog", "content", "article", "copy"], weight: 2 },
      { words: ["video", "photo", "media", "edit"], weight: 2 },
    ],
    spi: [
      { words: ["meditat", "meditate", "breathe", "mindful", "mindfulness"], weight: 3 },
      { words: ["journal", "reflect", "think", "introspect"], weight: 3 },
      { words: ["rest", "sleep", "nap", "relax", "vacation", "break"], weight: 3 },
      { words: ["pray", "worship", "spiritual", "faith", "church", "temple"], weight: 3 },
      { words: ["therapy", "counsel", "coach", "support"], weight: 2 },
    ],
  };

  // Calculate scores for each stat
  const scores: Record<keyof typeof patterns, number> = { str: 0, int: 0, dis: 0, cha: 0, cre: 0, spi: 0 };
  
  for (const [stat, statPatterns] of Object.entries(patterns)) {
    for (const { words, weight } of statPatterns) {
      for (const word of words) {
        if (lower.includes(word)) {
          scores[stat as keyof typeof scores] += weight;
        }
      }
    }
  }

  // Normalize scores to 0-5 range
  const normalize = (score: number): number => {
    if (score === 0) return 0;
    if (score <= 2) return 1;
    if (score <= 4) return 2;
    if (score <= 6) return 3;
    if (score <= 9) return 4;
    return 5;
  };

  return {
    str: normalize(scores.str),
    int: normalize(scores.int),
    dis: normalize(scores.dis),
    cha: normalize(scores.cha),
    cre: normalize(scores.cre),
    spi: normalize(scores.spi),
  };
}

/**
 * Creates a timeout promise that rejects after specified milliseconds
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`AI call timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export async function classifyTaskStats(task: TaskInput): Promise<TaskAnalysis> {
  const content = task.content;
  if (!content || content.trim().length === 0) {
    console.warn("[classifyTaskStats] Empty content provided, returning zero weights");
    const weights = { str: 0, int: 0, dis: 0, cha: 0, cre: 0, spi: 0 };
    return {
      statWeights: weights,
      priority: task.priority ?? "medium",
      difficulty: task.difficulty ?? "medium",
      estimatedXP: 0,
      insights: ["Add more details to get better stat classification"],
    };
  }

  const prompt = `You are an RPG stat classifier for a productivity app.
Given a task's title, description, and optional metadata, analyze it to determine its stat weights, priority, difficulty, and developmental insights.

Task Context:
- Title: "${task.content}"
- Description: "${task.description || "None provided"}"
- User-selected Priority: ${task.priority || "Not specified"}
- User-selected Difficulty: ${task.difficulty || "Not specified"}

RPG Stats Guide:
- STR (Strength): physical effort, health, exercise, sports, manual labor, physical maintenance
- INT (Intellect): learning, research, reading, coding, problem-solving, technical skills, deep work
- DIS (Discipline): admin, deadlines, consistency, routine tasks, organization, chores
- CHA (Charisma): communication, networking, sales, teaching, presenting, interpersonal, social interaction
- CRE (Creativity): design, art, building, brainstorming, music, storytelling, creative writing
- SPI (Spirituality): reflection, mindfulness, journaling, rest, meditation, personal growth, mental health

Requirements:
1. Assign Stat Weights (0-5) to each stat based on what the task develops.
2. Determine Priority (low, medium, high) based on context if not already specified.
3. Determine Difficulty (low, medium, high) based on context if not already specified.
4. Provide 1-2 bullet points as "insights" explaining why these stats were chosen.

IMPORTANT: Return ONLY valid JSON in this exact format:
{
  "statWeights": {"str":0,"int":0,"dis":0,"cha":0,"cre":0,"spi":0},
  "priority": "medium",
  "difficulty": "medium",
  "insights": ["insight 1", "insight 2"]
}`;

  try {
    const { object } = await withTimeout(
      generateObject({
        model: aiModel,
        schema: taskAnalysisSchema,
        prompt,
        maxRetries: 0,
      }),
      TIMEOUT_MS
    );
    
    // Fallback if priority/difficulty were already provided but AI changed them (respect user choice)
    const finalPriority = task.priority ?? object.priority;
    const finalDifficulty = task.difficulty ?? object.difficulty;

    // Calculate estimated XP
    const totalWeights = Object.values(object.statWeights).reduce((a, b) => a + b, 0);
    const difficultyMultiplier = finalDifficulty === "high" ? 2 : finalDifficulty === "medium" ? 1.5 : 1;
    const estimatedXP = Math.floor(totalWeights * difficultyMultiplier);
    
    // Validate the response has at least one non-zero stat
    if (totalWeights === 0) {
      console.warn("[classifyTaskStats] AI returned all zeros, using keyword fallback");
      const kwWeights = classifyByKeywords(content);
      const kwTotal = Object.values(kwWeights).reduce((a, b) => a + b, 0);
      return {
        statWeights: kwWeights,
        priority: finalPriority,
        difficulty: finalDifficulty,
        estimatedXP: Math.floor(kwTotal * difficultyMultiplier),
        insights: ["Classification based on task keywords"],
      };
    }
    
    return {
      ...object,
      priority: finalPriority,
      difficulty: finalDifficulty,
      estimatedXP,
    };
  } catch (error) {
    console.error("[classifyTaskStats] AI classification failed:", error instanceof Error ? error.message : "Unknown error");
    const kwWeights = classifyByKeywords(content);
    const kwTotal = Object.values(kwWeights).reduce((a, b) => a + b, 0);
    const finalDifficulty = task.difficulty ?? "medium";
    const difficultyMultiplier = finalDifficulty === "high" ? 2 : finalDifficulty === "medium" ? 1.5 : 1;

    return {
      statWeights: kwWeights,
      priority: task.priority ?? "medium",
      difficulty: finalDifficulty,
      estimatedXP: Math.floor(kwTotal * difficultyMultiplier),
      insights: ["Classification based on task keywords (AI fallback)"],
    };
  }
}

const extractedTaskSchema = z.object({
  content: z.string().describe("Concise, actionable task title (max 5-7 words, e.g., 'Go to Hackathon', 'Finish Biology Homework')"),
  description: z.string().optional().describe("Detailed mission parameters, context, constraints, or any extra text from the user's prompt"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  difficulty: z.enum(["low", "medium", "high"]).default("medium"),
  due_date: z.string().optional().describe("ISO datetime string for the deadline"),
  subtasks: z.array(z.string()).optional().describe("List of sub-components or subtasks"),
});

const extractTasksSchema = z.object({
  tasks: z.array(extractedTaskSchema)
});

export type ExtractedTask = z.infer<typeof extractedTaskSchema>;

/**
 * Extracts multiple structured tasks from a single natural language prompt
 */
export async function extractTasksFromPrompt(prompt: string, localTime: string): Promise<ExtractedTask[]> {
  if (!prompt || prompt.trim().length === 0) {
    return [];
  }

  const systemPrompt = `You are a strict productivity assistant parsing natural language into structured tasks.
The user prompt may contain multiple distinct tasks. Extract each task separately.

Rules for Extraction:
1. "content" (Title): Must be a short, clear, actionable name (e.g., "Attend Hackathon", "Do Algebra Homework"). Do NOT put the entire user prompt here.
2. "description" (Mission Parameters): Put all the extra details, context, explanations, and constraints here. This should capture the bulk of the user's narrative.
3. "subtasks" (Neural Decomposition): If a task has concrete steps or sub-components mentioned, list them here.
4. "due_date" (Objective Horizon): Use the current local time (${localTime}) to resolve relative times (e.g., "today at 2pm") into absolute ISO 8601 datetimes. Omit if not specified.

IMPORTANT: Return ONLY valid JSON matching the schema.`;

  try {
    const { object } = await withTimeout(
      generateObject({
        model: aiModel,
        schema: extractTasksSchema,
        prompt: systemPrompt + `\n\nUser prompt: "${prompt}"`,
        maxRetries: 0,
      }),
      TIMEOUT_MS
    );
    
    return object.tasks;
  } catch (error) {
    console.error("[extractTasksFromPrompt] AI extraction failed:", error instanceof Error ? error.message : "Unknown error");
    // Fallback: Just return a single task with the original prompt as the title
    return [{
      content: prompt,
      priority: "medium",
      difficulty: "medium"
    }];
  }
}

/**
 * AI-Generated Dynamic Quests (Phase 1 Gamification)
 */
const questAnalysisSchema = z.object({
  quests: z.array(z.object({
    title: z.string().describe("Quest title, e.g. 'Defeat the Procrastination Beast'"),
    description: z.string().describe("Why this quest was chosen based on the user's current situation"),
    quest_type: z.enum(["urgent", "strength", "momentum", "boss_prep"]),
    reward_multiplier: z.number().describe("1.0 to 1.5, based on how hard the AI thinks the quest is")
  }))
});

export type GeneratedQuest = {
  title: string;
  description: string;
  quest_type: "urgent" | "strength" | "momentum" | "boss_prep";
  reward_multiplier: number;
};

export async function generateDailyQuests(
  weakestStat: string,
  yesterdayFails: number,
  yesterdayCompletes: number,
  backlogCount: number
): Promise<GeneratedQuest[]> {
  const systemPrompt = `You are a Gamemaster AI for an RPG productivity app.
  Generate custom quests for the player today.
  
  Player Context:
  - Weakest Stat: ${weakestStat.toUpperCase()} (Needs development)
  - Yesterday's Performance: ${yesterdayCompletes} completed, ${yesterdayFails} failed
  - Current Backlog Size: ${backlogCount} tasks
  
  Quest Types:
  - "urgent": If backlog is high or fails were high, generate a quest to clear 1-3 backlog items.
  - "strength": Generate a quest specifically requiring them to train their weakest stat (${weakestStat}).
  - "momentum": If fails were high, generate an easy "complete 2 small tasks" momentum builder.
  - "boss_prep": A narrative quest to prepare for the end-of-week review.
  
  Strict Constraints:
  1. Do NOT overwhelm the player. If backlogCount > 10 or yesterdayFails > yesterdayCompletes, ONLY generate 1-2 easy "momentum" or "urgent" quests.
  2. Otherwise, generate 2-4 balanced quests.
  
  IMPORTANT: Return ONLY valid JSON matching the schema.`;

  try {
    const { object } = await withTimeout(
      generateObject({
        model: aiModel,
        schema: questAnalysisSchema,
        prompt: systemPrompt,
        maxRetries: 0,
      }),
      TIMEOUT_MS
    );
    
    return object.quests;
  } catch (error) {
    console.error("[generateDailyQuests] AI extraction failed:", error);
    // Fallback quest
    return [{
      title: `Train ${weakestStat.toUpperCase()}`,
      description: "Fallback system quest to train your weakest attribute.",
      quest_type: "strength",
      reward_multiplier: 1.2
    }];
  }
}

/**
 * AI Companion/NPC Mentor Dialogue (Phase 4 Gamification)
 */
const mentorDialogueSchema = z.object({
  dialogue: z.string().describe("1-2 sentences of dialogue exactly as the NPC would speak it.")
});

export async function generateMentorDialogue(
  evolutionPath: string,
  burnoutRisk: number,
  currentStreak: number
): Promise<string> {
  const systemPrompt = `You are an RPG NPC Companion acting as the player's mentor.
  
  Player Context:
  - Evolution Path / Archetype: ${evolutionPath}
  - Burnout Risk Score: ${burnoutRisk} (0 is perfectly rested, 1.0 is extremely burned out)
  - Current Daily Streak: ${currentStreak} days
  
  Instructions:
  - Keep it extremely brief (1-2 sentences maximum).
  - Adopt a tone that matches their archetype: 'beast' is aggressive and primal, 'mystic' speaks cryptically, 'techno' is cold and analytical, 'diplomat' is persuasive and charming, 'monk' is calm and centered, 'polymath' is curious and academic, 'novice' is encouraging.
  - If burnout is > 0.7, firmly advise them to rest and do a Spirituality/recovery task.
  - If streak > 7, praise their consistency.
  - Do not use hashtags or markdown formatting. Speak exactly what the NPC says.`;

  try {
    const { object } = await withTimeout(
      generateObject({
        model: aiModel,
        schema: mentorDialogueSchema,
        prompt: systemPrompt,
        maxRetries: 0,
      }),
      TIMEOUT_MS
    );
    
    return object.dialogue;
  } catch (error) {
    console.error("[generateMentorDialogue] AI failed:", error);
    return "Remember, even heroes need to rest sometimes. Stay vigilant.";
  }
}

