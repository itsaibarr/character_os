/**
 * Buff system — activation, expiry checks, and XP modifier calculation.
 *
 * Active buffs live in the `active_buffs` table with an `expires_at` timestamp.
 * The XP multiplier is computed by combining all valid (non-expired) buffs,
 * capped at 3.0x to prevent exploit stacking.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { ItemEffect } from './item-catalog';

const MAX_BUFF_MULTIPLIER = 3.0;

export interface ActiveBuffRow {
  id: string;
  item_id: string;
  effect_type: string;
  effect_value: ItemEffect;
  activated_at: string;
  expires_at: string;
}

/**
 * Activates a buff by inserting a row into `active_buffs`.
 * Duration is derived from `effectValue.durationHours`.
 * Non-timed buffs (like streak shields) are inserted with a far-future expiry.
 */
export async function activateBuff(
  supabase: SupabaseClient,
  userId: string,
  itemId: string,
  effectType: string,
  effectValue: ItemEffect,
): Promise<{ success: boolean; error?: string }> {
  const durationHours = effectValue.durationHours ?? 0;

  // Non-timed effects (streak shield, cosmetic) get a 30-day expiry as a cleanup window
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + (durationHours > 0 ? durationHours : 24 * 30));

  const { error } = await supabase.from('active_buffs').insert({
    user_id: userId,
    item_id: itemId,
    effect_type: effectType,
    effect_value: effectValue,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    console.error('[activateBuff] Error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Computes the combined XP multiplier from a list of active buffs.
 * Multipliers are combined multiplicatively and capped at MAX_BUFF_MULTIPLIER (3.0x).
 */
export function calculateCombinedMultiplier(
  buffs: Array<{ effect_type: string; effect_value: any }>,
  statFilter?: string,
): number {
  if (!buffs || buffs.length === 0) return 1.0;

  let combined = 1.0;

  for (const buff of buffs) {
    const effect = buff.effect_value as ItemEffect;
    const multiplier = effect.multiplier ?? 1.0;

    if (buff.effect_type === 'xp_boost_all') {
      combined *= multiplier;
    } else if (buff.effect_type === 'xp_boost_stat' && statFilter && effect.stat === statFilter) {
      combined *= multiplier;
    }
  }

  return Math.min(combined, MAX_BUFF_MULTIPLIER);
}

/**
 * Computes the combined XP multiplier from all active (non-expired) buffs.
 *
 * Only `xp_boost_all` and `xp_boost_stat` effect types contribute.
 * Multipliers are combined multiplicatively, capped at MAX_BUFF_MULTIPLIER (3.0x).
 *
 * @param statFilter — optional stat name to also include stat-specific buffs
 *                     (e.g. 'discipline' to include 'xp_boost_stat' for discipline)
 */
export async function getActiveBuffMultiplier(
  supabase: SupabaseClient,
  userId: string,
  statFilter?: string,
): Promise<number> {
  const now = new Date().toISOString();

  const { data: buffs, error } = await supabase
    .from('active_buffs')
    .select('effect_type, effect_value')
    .eq('user_id', userId)
    .gt('expires_at', now);

  if (error || !buffs) return 1.0;

  return calculateCombinedMultiplier(buffs, statFilter);
}

/**
 * Deletes expired buff rows for the given user.
 * Called opportunistically — not blocking, just cleanup.
 */
export async function cleanExpiredBuffs(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const now = new Date().toISOString();

  await supabase
    .from('active_buffs')
    .delete()
    .eq('user_id', userId)
    .lt('expires_at', now);
}

/**
 * Fetches all active (non-expired) buffs for display in the UI.
 */
export async function fetchActiveBuffs(
  supabase: SupabaseClient,
  userId: string,
): Promise<ActiveBuffRow[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('active_buffs')
    .select('id, item_id, effect_type, effect_value, activated_at, expires_at')
    .eq('user_id', userId)
    .gt('expires_at', now)
    .order('expires_at', { ascending: true });

  if (error) {
    console.error('[fetchActiveBuffs] Error:', error);
    return [];
  }

  return (data ?? []) as ActiveBuffRow[];
}
