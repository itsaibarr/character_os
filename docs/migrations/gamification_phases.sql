-- Migration: Gamification Phases 1-4
-- Description: Core tables for Character Evolution, Quests, Bosses, Items, Streaks, Guilds

-- =========================================================================
-- PHASE 1: Characters, Quests & Difficulty
-- =========================================================================

-- Characters Table
CREATE TABLE IF NOT EXISTS characters (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    level INTEGER NOT NULL DEFAULT 1,
    current_xp INTEGER NOT NULL DEFAULT 0,
    -- Store XP per stat for evolution tracking
    str_xp INTEGER NOT NULL DEFAULT 0,
    int_xp INTEGER NOT NULL DEFAULT 0,
    dis_xp INTEGER NOT NULL DEFAULT 0,
    cha_xp INTEGER NOT NULL DEFAULT 0,
    cre_xp INTEGER NOT NULL DEFAULT 0,
    spi_xp INTEGER NOT NULL DEFAULT 0,
    evolution_path TEXT DEFAULT 'egg', -- e.g. egg, soldier, mystic, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Quests Table (AI generated missions)
CREATE TABLE IF NOT EXISTS quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    quest_type TEXT NOT NULL, -- urgent, strength, momentum, boss_prep
    reward_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.00,
    status TEXT NOT NULL DEFAULT 'active', -- active, completed, failed
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Difficulty Adjustments
CREATE TABLE IF NOT EXISTS difficulty_adjustments (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    base_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.00,
    str_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.00,
    int_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.00,
    dis_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.00,
    cha_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.00,
    cre_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.00,
    spi_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.00,
    last_adjusted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================================
-- PHASE 2: Bosses & Loot
-- =========================================================================

-- Bosses Table
CREATE TABLE IF NOT EXISTS bosses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    hp_total INTEGER NOT NULL,
    hp_current INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- active, defeated, escaped
    expires_at TIMESTAMPTZ NOT NULL, -- Usually end of week
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Link Tasks to Bosses (Attacks)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS boss_id UUID REFERENCES bosses(id) ON DELETE SET NULL;

-- Items Table (Catalog of all possible loot)
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    rarity TEXT NOT NULL, -- common, uncommon, rare, mythic
    effect_type TEXT NOT NULL, -- xp_boost, streak_shield, evolution_catalyst, skin, temp_buff
    effect_value JSONB -- Store specific buff data (e.g. {"stat": "int", "multiplier": 1.2, "duration_hours": 3})
);

-- User Inventory
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);

-- =========================================================================
-- PHASE 3: Streaks & Analytics
-- =========================================================================

-- User Streaks
CREATE TABLE IF NOT EXISTS user_streaks (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    shields_available INTEGER NOT NULL DEFAULT 0,
    last_completed_date DATE
);

-- Daily Analytics Logs
CREATE TABLE IF NOT EXISTS daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    stats_gained JSONB NOT NULL DEFAULT '{}'::jsonb, -- Store raw XP gained per stat today
    burnout_risk_score NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    UNIQUE(user_id, log_date)
);

-- =========================================================================
-- PHASE 4: Social, Mentors & Guilds
-- =========================================================================

-- AI Companions
CREATE TABLE IF NOT EXISTS companions (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    personality_type TEXT NOT NULL DEFAULT 'mentor',
    mood_score INTEGER NOT NULL DEFAULT 100, -- 0-100 scale
    last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Guilds
CREATE TABLE IF NOT EXISTS guilds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    level INTEGER NOT NULL DEFAULT 1,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Guild Members (Max 8 per guild logic enforced in app layer)
CREATE TABLE IF NOT EXISTS guild_members (
    guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- leader, officer, member
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (guild_id, user_id)
);

-- Challenges (PvE or PvP)
CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    challenge_type TEXT NOT NULL, -- pve, pvp
    status TEXT NOT NULL DEFAULT 'pending', -- pending, active, completed
    guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE, -- Null if global/personal
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Challenge Participants
CREATE TABLE IF NOT EXISTS challenge_participants (
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (challenge_id, user_id)
);

-- =========================================================================
-- RLS (ROW LEVEL SECURITY)
-- =========================================================================

-- Enable RLS on all standard tables
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE difficulty_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bosses ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE companions ENABLE ROW LEVEL SECURITY;
ALTER TABLE guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;

-- Helper / Default RLS Policies for Users (Select/Update their own data)

-- Characters
CREATE POLICY "Users can view own character" ON characters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own character" ON characters FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own character" ON characters FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Quests
CREATE POLICY "Users can view own quests" ON quests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own quests" ON quests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quests" ON quests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Difficulty Adjustments
CREATE POLICY "Users can view own difficulty" ON difficulty_adjustments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own difficulty" ON difficulty_adjustments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own difficulty" ON difficulty_adjustments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Bosses
CREATE POLICY "Users can view own bosses" ON bosses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own bosses" ON bosses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bosses" ON bosses FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Items (Everyone can view catalog)
CREATE POLICY "Everyone can view items" ON items FOR SELECT USING (true);

-- Inventory
CREATE POLICY "Users can view own inventory" ON inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own inventory" ON inventory FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own inventory" ON inventory FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Streaks
CREATE POLICY "Users can view own streaks" ON user_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own streaks" ON user_streaks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own streaks" ON user_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Daily Logs
CREATE POLICY "Users can view own logs" ON daily_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own logs" ON daily_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON daily_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Companions
CREATE POLICY "Users can view own companions" ON companions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own companions" ON companions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own companions" ON companions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Guilds (Everyone can view, members/creators update/delete)
CREATE POLICY "Everyone can view guilds" ON guilds FOR SELECT USING (true);
CREATE POLICY "Guild leaders can update guild" ON guilds FOR UPDATE USING (
    EXISTS (SELECT 1 FROM guild_members WHERE guild_id = guilds.id AND user_id = auth.uid() AND role = 'leader')
);
CREATE POLICY "Users can insert guilds" ON guilds FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Guild Members
CREATE POLICY "Everyone can view guild members" ON guild_members FOR SELECT USING (true);
CREATE POLICY "Users can join guilds" ON guild_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Guild leaders can manage members" ON guild_members FOR UPDATE USING (
    EXISTS (SELECT 1 FROM guild_members gm WHERE gm.guild_id = guild_members.guild_id AND gm.user_id = auth.uid() AND gm.role = 'leader')
);
CREATE POLICY "Users can leave guilds or leaders remove" ON guild_members FOR DELETE USING (
    auth.uid() = user_id OR EXISTS (SELECT 1 FROM guild_members gm WHERE gm.guild_id = guild_members.guild_id AND gm.user_id = auth.uid() AND gm.role = 'leader')
);

-- Challenges
CREATE POLICY "Everyone can view challenges" ON challenges FOR SELECT USING (true);
CREATE POLICY "Guild members can insert group challenges" ON challenges FOR INSERT WITH CHECK (
    guild_id IS NULL OR EXISTS (SELECT 1 FROM guild_members WHERE guild_id = challenges.guild_id AND user_id = auth.uid())
);
CREATE POLICY "Participants can update challenges" ON challenges FOR UPDATE USING (
    EXISTS (SELECT 1 FROM challenge_participants WHERE challenge_id = challenges.id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM guild_members WHERE guild_id = challenges.guild_id AND user_id = auth.uid() AND role IN ('leader', 'officer'))
);

-- Challenge Participants
CREATE POLICY "Everyone can view challenge members" ON challenge_participants FOR SELECT USING (true);
CREATE POLICY "Users can join challenges" ON challenge_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own challenge score" ON challenge_participants FOR UPDATE USING (auth.uid() = user_id);

-- Add updated_at trigger logic for all applicable tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_characters_updated_at BEFORE UPDATE ON characters FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_quests_updated_at BEFORE UPDATE ON quests FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_bosses_updated_at BEFORE UPDATE ON bosses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_guilds_updated_at BEFORE UPDATE ON guilds FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
