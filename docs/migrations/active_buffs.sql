-- Migration: Active Buffs Table
-- Tracks temporary buffs activated by consuming inventory items.
-- Used by the buff system to apply XP multipliers during task completion.

CREATE TABLE IF NOT EXISTS active_buffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    effect_type TEXT NOT NULL,
    effect_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- RLS
ALTER TABLE active_buffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own buffs"
    ON active_buffs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own buffs"
    ON active_buffs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own buffs"
    ON active_buffs FOR DELETE
    USING (auth.uid() = user_id);

-- Index for fast expiry queries (buff multiplier lookups happen on every task completion)
CREATE INDEX IF NOT EXISTS idx_active_buffs_user_expiry
    ON active_buffs (user_id, expires_at);
