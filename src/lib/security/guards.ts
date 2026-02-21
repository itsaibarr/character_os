import { isSpamTask, isPlausibleCompletion } from './anti-cheat';

export type TaskData = {
  id: string;
  title: string;
  description?: string;
  createdAt: Date | string;
  completedAt: Date | string;
};

/**
 * Middleware for generic Server Actions to validate PvP Integrity before processing XP/Rewards.
 * If a task is flagged as spam or completed too fast, it zeroes out the PvP relevant rewards.
 */
export function withPvPIntegrity<TArgs extends unknown[], TReturn>(
  action: (...args: TArgs) => Promise<TReturn>,
  extractTaskMetadata: (args: TArgs) => TaskData
) {
  return async (...args: TArgs): Promise<TReturn> => {
    const task = extractTaskMetadata(args);

    const isSpam = isSpamTask(task.title, task.description);
    const isTooFast = !isPlausibleCompletion(task.createdAt, task.completedAt);

    if (isSpam || isTooFast) {
      console.warn(`[SECURITY] Task ${task.id} flagged. Spam: ${isSpam}, TooFast: ${isTooFast}`);
      
      // We allow the action to proceed (task still gets marked 'done' for the user's personal list),
      // but we inject a Symbol or a specific flag into the args (if possible) 
      // or we just throw a specific Error that the action handler catches to zero out XP.
      // For a clean functional approach, we pass a `isFlagged` context to the action,
      // but modifying args in a generic wrapper is tricky.
      
      // Let's implement this by attaching a non-enumerable property to the first argument
      // if it's an object, so the inner action can read it.
      if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
        Object.defineProperty(args[0], '__securityFlagged', {
          value: true,
          enumerable: false
        });
      }
    }

    return await action(...args);
  };
}
