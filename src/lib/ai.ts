import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

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

export type StatWeights = z.infer<typeof statWeightsSchema>;

export async function classifyTaskStats(content: string): Promise<StatWeights> {
  try {
    const { object } = await generateObject({
      model: aiModel,
      schema: statWeightsSchema,
      prompt: `You are an RPG stat classifier for a productivity app.
Given a task description, assign XP weights (0-5) to each stat:
- str (Strength): physical effort, health, exercise, sports
- int (Intellect): learning, research, reading, coding, problem-solving
- dis (Discipline): admin, deadlines, consistency, repetitive-but-necessary work
- cha (Charisma): communication, writing, networking, sales, teaching, presenting
- cre (Creativity): design, art, building, brainstorming, music, storytelling
- spi (Spirituality): reflection, mindfulness, journaling, rest, meditation

Task: "${content}"`,
      maxRetries: 0,
    });
    return object;
  } catch {
    // Fallback: keyword-based classification
    const lower = content.toLowerCase();
    return {
      str: /gym|workout|run|exercise|train|lift|sport/.test(lower) ? 3 : 0,
      int: /learn|study|read|research|code|debug|design|solve|course/.test(lower) ? 3 : 0,
      dis: /urgent|asap|deadline|meeting|review|report|admin|email/.test(lower) ? 3 : 1,
      cha: /call|email|write|present|meet|pitch|network|post/.test(lower) ? 2 : 0,
      cre: /design|build|create|draw|music|art|idea|brainstorm/.test(lower) ? 3 : 0,
      spi: /meditat|journal|reflect|rest|breathe|mindful/.test(lower) ? 3 : 0,
    };
  }
}
