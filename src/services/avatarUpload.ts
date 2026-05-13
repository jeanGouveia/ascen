import { supabase } from './supabase';

/**
 * Envia a imagem para o bucket público `avatars` no Supabase Storage.
 * Crie o bucket "avatars" como público e políticas de insert para usuários autenticados se ainda não existir.
 */
export async function uploadAvatarFromUri(userId: string, localUri: string): Promise<string> {
  const res = await fetch(localUri);
  const blob = await res.blob();
  const extGuess = localUri.split('.').pop()?.split('?')[0]?.toLowerCase();
  const ext = extGuess && extGuess.length <= 4 && extGuess !== 'file' ? extGuess : 'jpg';
  const path = `${userId}/avatar.${ext}`;
  const contentType = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';

  const { error: upErr } = await supabase.storage.from('avatars').upload(path, blob, {
    upsert: true,
    contentType,
  });
  if (upErr) throw new Error(upErr.message);

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('URL pública indisponível');
  return data.publicUrl;
}
