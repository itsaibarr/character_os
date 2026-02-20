import { pgTable, text, timestamp, integer, uuid, boolean, jsonb } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  archetype: text("archetype").default("Initiate"),
  statWeights: jsonb("stat_weights").default({}),
  frictionProfile: text("friction_profile"),
  dailyCapacity: text("daily_capacity"),
  feedbackPreference: text("feedback_pref"),
  mainGoal: text("main_goal"),
  strengthXp: integer("strength_xp").default(0),
  intellectXp: integer("intellect_xp").default(0),
  disciplineXp: integer("discipline_xp").default(0),
  charismaXp: integer("charisma_xp").default(0),
  creativityXp: integer("creativity_xp").default(0),
  spiritualityXp: integer("spirituality_xp").default(0),
  onboardingCompleted: boolean("onboarding_completed").default(false),
});

export const userAnalytics = pgTable("user_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => user.id).notNull(),
  focusAreas: jsonb("focus_areas").default([]),
  frustrations: jsonb("frustrations").default([]),
  focusedHours: text("focused_hours"),
  motivationPreference: text("motivation_preference"),
  trackingTools: jsonb("tracking_tools").default([]),
  acquisitionSource: text("acquisition_source"),
  triggerReason: text("trigger_reason"),
  initialGoal: text("initial_goal"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const logs = pgTable("logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => user.id).notNull(),
  content: text("content").notNull(),
  activityType: text("activity_type"),
  difficulty: text("difficulty"),
  strengthGain: integer("strength_gain").default(0),
  intellectGain: integer("intellect_gain").default(0),
  disciplineGain: integer("discipline_gain").default(0),
  charismaGain: integer("charisma_gain").default(0),
  creativityGain: integer("creativity_gain").default(0),
  spiritualityGain: integer("spirituality_gain").default(0),
  integrityCheckNeeded: boolean("integrity_check_needed").default(false),
  integrityVerified: boolean("integrity_verified").default(false),
  evidenceUrl: text("evidence_url"),
  reflection: text("reflection"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const skills = pgTable("skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => user.id).notNull(),
  name: text("name").notNull(),
  level: integer("level").default(1),
  xp: integer("xp").default(0),
  lastPracticedAt: timestamp("last_practiced_at"),
  decayRate: integer("decay_rate").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => user.id).notNull(),
  content: text("content").notNull(),
  status: text("status").default("todo").notNull(),
  priority: text("priority").default("medium"),
  difficulty: text("difficulty").default("medium"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
