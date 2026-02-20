CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"expiresAt" timestamp,
	"password" text
);
--> statement-breakpoint
CREATE TABLE "logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"activity_type" text,
	"difficulty" text,
	"strength_gain" integer DEFAULT 0,
	"intellect_gain" integer DEFAULT 0,
	"discipline_gain" integer DEFAULT 0,
	"charisma_gain" integer DEFAULT 0,
	"creativity_gain" integer DEFAULT 0,
	"spirituality_gain" integer DEFAULT 0,
	"integrity_check_needed" boolean DEFAULT false,
	"integrity_verified" boolean DEFAULT false,
	"evidence_url" text,
	"reflection" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"level" integer DEFAULT 1,
	"xp" integer DEFAULT 0,
	"last_practiced_at" timestamp,
	"decay_rate" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean NOT NULL,
	"image" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"archetype" text DEFAULT 'Initiate',
	"stat_weights" jsonb DEFAULT '{}'::jsonb,
	"friction_profile" text,
	"daily_capacity" text,
	"feedback_pref" text,
	"main_goal" text,
	"strength_xp" integer DEFAULT 0,
	"intellect_xp" integer DEFAULT 0,
	"discipline_xp" integer DEFAULT 0,
	"charisma_xp" integer DEFAULT 0,
	"creativity_xp" integer DEFAULT 0,
	"spirituality_xp" integer DEFAULT 0,
	"onboarding_completed" boolean DEFAULT false,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"focus_areas" jsonb DEFAULT '[]'::jsonb,
	"frustrations" jsonb DEFAULT '[]'::jsonb,
	"focused_hours" text,
	"motivation_preference" text,
	"tracking_tools" jsonb DEFAULT '[]'::jsonb,
	"acquisition_source" text,
	"trigger_reason" text,
	"initial_goal" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp,
	"updatedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_analytics" ADD CONSTRAINT "user_analytics_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;