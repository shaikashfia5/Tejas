/**
 * Supabase Storage helper for evidence images.
 * Bucket: evidence-images (private, owner-only via RLS)
 * Falls back to data-URL local preview when Supabase not configured.
 */
import { supabase, isSupabaseConfigured } from './supabase';

const BUCKET = 'evidence-images';

export async function uploadEvidenceImage(file: File, userId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/jpeg',
    });
    if (error) {
      console.warn('Storage upload failed:', error.message);
      return null;
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    // For private bucket, signed URL is better; try createSignedUrl, fallback to public URL
    try {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed?.signedUrl) return signed.signedUrl;
    } catch {}
    return data.publicUrl;
  } catch (e) {
    console.warn('uploadEvidenceImage error', e);
    return null;
  }
}

export function isStorageConfigured(): boolean {
  return isSupabaseConfigured();
}
