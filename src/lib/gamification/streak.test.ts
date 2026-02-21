import { describe, it, expect } from "vitest";
import {
  isStreakBroken,
  hasCompletedToday,
  calculateStreakMilestone,
  shieldShouldActivate,
  getNextMilestone,
  todayUtc,
} from "./streak";

describe("todayUtc", () => {
  it("returns today in YYYY-MM-DD format", () => {
    const result = todayUtc();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("isStreakBroken", () => {
  it("returns true when lastCompletedDate is null", () => {
    expect(isStreakBroken(null)).toBe(true);
  });

  it("returns false when completed today", () => {
    const today = todayUtc();
    expect(isStreakBroken(today)).toBe(false);
  });

  it("returns false when completed yesterday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    expect(isStreakBroken(yesterdayStr)).toBe(false);
  });

  it("returns true when completed 2 days ago", () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const str = twoDaysAgo.toISOString().split("T")[0];
    expect(isStreakBroken(str)).toBe(true);
  });

  it("returns true when completed a week ago", () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const str = weekAgo.toISOString().split("T")[0];
    expect(isStreakBroken(str)).toBe(true);
  });
});

describe("hasCompletedToday", () => {
  it("returns false when null", () => {
    expect(hasCompletedToday(null)).toBe(false);
  });

  it("returns true when last completed date is today", () => {
    const today = todayUtc();
    expect(hasCompletedToday(today)).toBe(true);
  });

  it("returns false when last completed date is yesterday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const str = yesterday.toISOString().split("T")[0];
    expect(hasCompletedToday(str)).toBe(false);
  });
});

describe("calculateStreakMilestone", () => {
  it("returns null for streaks below 7", () => {
    expect(calculateStreakMilestone(1)).toBeNull();
    expect(calculateStreakMilestone(6)).toBeNull();
  });

  it("returns streak-shield reward at 7 days", () => {
    const reward = calculateStreakMilestone(7);
    expect(reward).not.toBeNull();
    expect(reward?.itemId).toBe("streak-shield");
    expect(reward?.bonusXp).toBe(0);
  });

  it("returns iron-resolve reward at 14 days with 50 bonus XP", () => {
    const reward = calculateStreakMilestone(14);
    expect(reward).not.toBeNull();
    expect(reward?.itemId).toBe("iron-resolve");
    expect(reward?.bonusXp).toBe(50);
  });

  it("returns unbreakable-vow reward at 30 days with 200 bonus XP", () => {
    const reward = calculateStreakMilestone(30);
    expect(reward).not.toBeNull();
    expect(reward?.itemId).toBe("unbreakable-vow");
    expect(reward?.bonusXp).toBe(200);
  });

  it("returns null for streaks not at a milestone (e.g. 8, 15, 31)", () => {
    expect(calculateStreakMilestone(8)).toBeNull();
    expect(calculateStreakMilestone(15)).toBeNull();
    expect(calculateStreakMilestone(31)).toBeNull();
  });
});

describe("shieldShouldActivate", () => {
  it("returns false when streak is not broken", () => {
    expect(shieldShouldActivate(3, false)).toBe(false);
  });

  it("returns false when streak is broken but no shields", () => {
    expect(shieldShouldActivate(0, true)).toBe(false);
  });

  it("returns true when streak is broken and shields are available", () => {
    expect(shieldShouldActivate(1, true)).toBe(true);
    expect(shieldShouldActivate(5, true)).toBe(true);
  });
});

describe("getNextMilestone", () => {
  it("returns 7 and 7 days until at streak 0", () => {
    const { milestone, daysUntil } = getNextMilestone(0);
    expect(milestone).toBe(7);
    expect(daysUntil).toBe(7);
  });

  it("returns 14 and correct days when between 7 and 14", () => {
    const { milestone, daysUntil } = getNextMilestone(10);
    expect(milestone).toBe(14);
    expect(daysUntil).toBe(4);
  });

  it("returns 30 at streak 20", () => {
    const { milestone, daysUntil } = getNextMilestone(20);
    expect(milestone).toBe(30);
    expect(daysUntil).toBe(10);
  });

  it("returns null past 30 days", () => {
    const { milestone, daysUntil } = getNextMilestone(31);
    expect(milestone).toBeNull();
    expect(daysUntil).toBeNull();
  });

  it("returns 1 day until milestone when one away", () => {
    const { milestone, daysUntil } = getNextMilestone(6);
    expect(milestone).toBe(7);
    expect(daysUntil).toBe(1);
  });
});
