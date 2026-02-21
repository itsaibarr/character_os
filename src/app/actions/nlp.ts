"use server";

import { createClient } from "@/utils/supabase/server";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { extractTasksFromPrompt, type ExtractedTask } from "@/lib/ai";
import type { ActionResponse } from "@/app/actions/gamification";

export type { ExtractedTask };

/**
 * Parses unstructured text into a list of ExtractedTask objects.
 * Does NOT insert to the database — caller handles confirmation then uses createTask().
 * Rate-limited to 20 NLP parse calls per user per day.
 */
export async function parseTasksFromText(
  text: string,
): Promise<ActionResponse<ExtractedTask[]>> {
  try {
    if (!text || text.trim().length === 0) {
      return { success: false, error: "Input text is empty." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    await enforceRateLimit(user.id, "nlp_parse", 20);

    const localTime = new Date().toLocaleString("en-US", {
      timeZoneName: "short",
    });

    const tasks = await extractTasksFromPrompt(text, localTime);

    if (tasks.length === 0) {
      return { success: false, error: "No tasks detected in the text. Try being more specific." };
    }

    return { success: true, data: tasks };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith("Rate limit exceeded")) {
      return { success: false, error: "You've used all 20 parses for today. Try again tomorrow." };
    }
    console.error("[parseTasksFromText] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to parse tasks.";
    return { success: false, error: message };
  }
}
