export type EpisodeVideoAsset = {
  locale: string
  video_url?: string | null
  storage_path?: string | null
}

/** Resolve a playable URL for private Storage videos (signed) or legacy public URLs. */
export async function resolvePlayableUrl(
  client: ReturnType<typeof useSupabaseClient>,
  assets: EpisodeVideoAsset[],
  locale: string,
  fallbackUrl?: string | null,
) {
  const preferred =
    assets.find(v => v.locale === locale)
    || assets.find(v => v.locale === 'en')
    || assets[0]

  if (preferred?.storage_path) {
    const { data, error } = await client.storage
      .from('videos')
      .createSignedUrl(preferred.storage_path, 60 * 60)
    if (!error && data?.signedUrl) return data.signedUrl
  }

  return preferred?.video_url || fallbackUrl || ''
}
