/**
 * Detects if a task is likely spam created solely to farm XP or PvP points.
 * @param title The task title
 * @param description The task description (optional)
 * @returns true if the task is flagged as spam
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function isSpamTask(title: string, _description?: string): boolean {
  if (!title || title.trim().length === 0) return true;

  const trimmedTitle = title.trim();

  // 1. Minimum length constraint
  if (trimmedTitle.length < 5) return true;

  // 2. Character repetition (e.g., "aaaaa", "11111")
  // Checks if a single character is repeated 4 or more times consecutively
  const repetitionRegex = /(.)\1{3,}/;
  if (repetitionRegex.test(trimmedTitle)) return true;

  // 3. Gibberish detection (simple heuristic):
  // Very low vowel count in a reasonably long string might indicate keyboard mashing "asdfghjkl"
  // (Disabled for now as some tasks might genuinely be abbreviations, but good for future expansion)
  
  return false;
}

/**
 * Validates if the time between task creation and completion is physically plausible.
 * @param createdAt When the task was created
 * @param completedAt When the task was completed
 * @param minDurationSeconds Minimum acceptable duration in seconds (default 5 seconds)
 * @returns true if the completion time is plausible
 */
export function isPlausibleCompletion(
  createdAt: string | Date, 
  completedAt: string | Date, 
  minDurationSeconds: number = 5
): boolean {
  const start = new Date(createdAt).getTime();
  const end = new Date(completedAt).getTime();

  if (isNaN(start) || isNaN(end)) {
    return false; // Invalid dates
  }

  const durationSeconds = (end - start) / 1000;

  return durationSeconds >= minDurationSeconds;
}
