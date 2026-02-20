import { pgTable, text, timestamp, integer, uuid, boolean, jsonb } from "drizzle-orm/pg-core";

// Better Auth Tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  
  // Custom Fields
  archetype: text("archetype").default("Initiate"),
  statWeights: jsonb("stat_weights").default({}), 
  frictionProfile: text("friction_profile"), // Q3
  dailyCapacity: text("daily_capacity"), // Q4
  feedbackPreference: text("feedback_pref"), // Q5
  mainGoal: text("main_goal"), // Q9
  
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
  focusAreas: jsonb("focus_areas").default([]), // Q1
  frustrations: jsonb("frustrations").default([]), // Q3
  focusedHours: text("focused_hours"), // Q4 (redundant with user but kept for history)
  motivationPreference: text("motivation_preference"), // Q5
  trackingTools: jsonb("tracking_tools").default([]), // Q6
  acquisitionSource: text("acquisition_source"), // Q7
  triggerReason: text("trigger_reason"), // Q8
  initialGoal: text("initial_goal"), // Q9
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  expiresAt: timestamp("expiresAt"),
  password: text("password"),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

export const logs = pgTable("logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => user.id).notNull(),
  content: text("content").notNull(),
  activityType: text("activity_type"),
  difficulty: text("difficulty"), // Low, Medium, High, Extreme
  
  // XP Gains
  strengthGain: integer("strength_gain").default(0),
  intellectGain: integer("intellect_gain").default(0),
  disciplineGain: integer("discipline_gain").default(0),
  charismaGain: integer("charisma_gain").default(0),
  creativityGain: integer("creativity_gain").default(0),
  spiritualityGain: integer("spirituality_gain").default(0),
  
  // Integrity
  integrityCheckNeeded: boolean("integrity_check_needed").default(false),
  integrityVerified: boolean("integrity_verified").default(false),
  evidenceUrl: text("evidence_url"),
  reflection: text("reflection"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const skills = pgTable("skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => user.id).notNull(),
  name: text("name").notNull(), // e.g., "Coding", "Running"
  level: integer("level").default(1),
  xp: integer("xp").default(0),
  lastPracticedAt: timestamp("last_practiced_at"),
  decayRate: integer("decay_rate").default(1), // XP lost per day of inactivity
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => user.id).notNull(),
  content: text("content").notNull(),
  status: text("status").default("todo").notNull(), // todo, in-progress, completed, failed
  priority: text("priority").default("medium"), // low, medium, high
  difficulty: text("difficulty").default("medium"), // low, medium, high
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
