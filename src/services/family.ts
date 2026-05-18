import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';
import { metaGet, metaSet } from '../db/localDataDb';
import { CATEGORIES } from '../constants/finance';
import type { FamilyRole } from '../types/database';

const META_FAMILY_ID = 'family_id';
const META_FAMILY_ROLE = 'family_role';
const META_JOIN_CODE = 'family_join_code';

function randomJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function getLocalFamilyId(): Promise<string | null> {
  try {
    const id = await metaGet(META_FAMILY_ID);
    return id && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

export async function getLocalFamilyRole(): Promise<FamilyRole | null> {
  try {
    const r = await metaGet(META_FAMILY_ROLE);
    return r === 'owner' || r === 'member' ? r : null;
  } catch {
    return null;
  }
}

export async function getLocalJoinCode(): Promise<string | null> {
  try {
    const c = await metaGet(META_JOIN_CODE);
    return c && c.length > 0 ? c : null;
  } catch {
    return null;
  }
}

async function cacheFamilyLocal(familyId: string, role: FamilyRole, joinCode?: string): Promise<void> {
  await metaSet(META_FAMILY_ID, familyId);
  await metaSet(META_FAMILY_ROLE, role);
  if (joinCode) await metaSet(META_JOIN_CODE, joinCode);
}

/** Categorias padrão na família (Supabase). */
async function seedDefaultCategories(familyId: string): Promise<void> {
  const rows = CATEGORIES.map(c => ({
    family_id: familyId,
    name: c.name,
    icon: c.icon,
    color: c.color,
    type: c.type,
  }));
  const { error } = await supabase.from('categories').insert(rows);
  if (error && !error.message.includes('duplicate')) {
    throw new Error(error.message);
  }
}

/** Busca família do usuário no Supabase (fonte de verdade). */
export async function fetchRemoteFamilyMembership(userId: string): Promise<{
  familyId: string;
  role: FamilyRole;
  joinCode: string;
} | null> {
  const { data: member, error } = await supabase
    .from('family_members')
    .select('family_id, role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!member?.family_id) return null;

  const { data: family, error: famErr } = await supabase
    .from('families')
    .select('join_code')
    .eq('id', member.family_id)
    .maybeSingle();
  if (famErr) throw new Error(famErr.message);
  if (!family?.join_code) throw new Error('Família sem código de convite.');

  return {
    familyId: member.family_id,
    role: member.role as FamilyRole,
    joinCode: family.join_code,
  };
}

/** Cria família nova (dono) + categorias padrão. */
export async function createFamily(userId: string, name?: string): Promise<{
  familyId: string;
  joinCode: string;
}> {
  const familyId = Crypto.randomUUID();
  const joinCode = randomJoinCode();

  const { error } = await supabase.from('families').insert({
    id: familyId,
    owner_id: userId,
    join_code: joinCode,
    name: name ?? null,
  });
  if (error) throw new Error(error.message);

  const { error: memberErr } = await supabase.from('family_members').insert({
    family_id: familyId,
    user_id: userId,
    role: 'owner',
  });
  if (memberErr) throw new Error(memberErr.message);

  await seedDefaultCategories(familyId);
  await cacheFamilyLocal(familyId, 'owner', joinCode);
  return { familyId, joinCode };
}

/** Entra em família existente pelo código (obrigatório: usuário só pode ter uma). */
export async function joinFamily(_userId: string, joinCode: string): Promise<string> {
  const code = joinCode.trim().toUpperCase();

  const { data: familyId, error } = await supabase.rpc('join_family_by_code', {
    p_code: code,
  });
  if (error) {
    if (
      error.message.includes('join_family_by_code') ||
      error.message.includes('lookup_family_by_join_code')
    ) {
      throw new Error(
        'Funções de família não configuradas no Supabase. Execute supabase/fix_join_family_by_code.sql no painel SQL.'
      );
    }
    throw new Error(error.message);
  }
  if (!familyId || typeof familyId !== 'string') {
    throw new Error('Código da família não encontrado.');
  }

  const joinCodeResolved = await fetchFamilyJoinCode(familyId);
  await cacheFamilyLocal(familyId, 'member', joinCodeResolved);
  return familyId;
}

/**
 * Garante que o usuário pertence a uma família.
 * Se não tiver, cria família solo automaticamente.
 */
export async function ensureUserFamily(userId: string): Promise<{
  familyId: string;
  role: FamilyRole;
  joinCode: string;
  created: boolean;
}> {
  const remote = await fetchRemoteFamilyMembership(userId);
  if (remote) {
    await cacheFamilyLocal(remote.familyId, remote.role, remote.joinCode);
    return { ...remote, created: false };
  }

  const created = await createFamily(userId);
  return { familyId: created.familyId, role: 'owner', joinCode: created.joinCode, created: true };
}

export async function fetchFamilyJoinCode(familyId: string): Promise<string> {
  const { data, error } = await supabase
    .from('families')
    .select('join_code')
    .eq('id', familyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.join_code) throw new Error('Código não encontrado.');
  await metaSet(META_JOIN_CODE, data.join_code);
  return data.join_code;
}
