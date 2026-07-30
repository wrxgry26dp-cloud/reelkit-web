import type { LocaleCode } from './useI18n'

const SECTION_I18N: Record<string, string> = {
  'new-release': 'newRelease',
  top: 'top',
}

export function sectionTitleKey(slug?: string | null) {
  if (!slug) return null
  return SECTION_I18N[slug] || null
}

/** Load published dramas for the active UI locale. */
export async function fetchPublishedDramasByLocale(
  client: any,
  locale: LocaleCode,
  opts?: { search?: string; limit?: number },
) {
  let query = client
    .from('dramas')
    .select('*')
    .eq('status', 'published')
    .eq('primary_locale', locale)
    .order('updated_at', { ascending: false })

  if (opts?.search?.trim()) query = query.ilike('title', `%${opts.search.trim()}%`)
  if (opts?.limit) query = query.limit(opts.limit)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

/** Paginated dramas for categories page. */
export async function fetchPublishedDramasPage(
  client: any,
  locale: LocaleCode,
  opts?: { search?: string; page?: number; pageSize?: number },
) {
  const page = Math.max(1, opts?.page ?? 1)
  const pageSize = Math.max(1, opts?.pageSize ?? 14)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = client
    .from('dramas')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .eq('primary_locale', locale)
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (opts?.search?.trim()) query = query.ilike('title', `%${opts.search.trim()}%`)

  const { data, error, count } = await query
  if (error) throw error
  return {
    items: data || [],
    total: count ?? 0,
    page,
    pageSize,
  }
}

/** Banners for locale; if none, synthesize from locale dramas. */
export async function fetchHomeBannersByLocale(client: any, locale: LocaleCode) {
  const { data, error } = await client
    .from('banners')
    .select('id,title,image_url,drama_id,sort_order,locale, drama:dramas(id,title,synopsis,cover_url,status,primary_locale)')
    .eq('is_active', true)
    .eq('locale', locale)
    .order('sort_order')
  if (error) throw error

  const filtered = (data || []).filter((b: any) => {
    if (!b.drama) return true
    return b.drama.status === 'published' && b.drama.primary_locale === locale
  })
  if (filtered.length) return filtered

  const dramas = await fetchPublishedDramasByLocale(client, locale, { limit: 6 })
  return dramas.map((d: any, i: number) => ({
    id: `synth-${d.id}`,
    title: d.title,
    image_url: d.cover_url,
    drama_id: d.id,
    sort_order: i,
    locale,
    drama: d,
  }))
}

/** Home rails: keep section shell, only show dramas for current locale. */
export async function fetchHomeSectionsByLocale(client: any, locale: LocaleCode) {
  const { data: secs, error } = await client
    .from('home_sections')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
  if (error) throw error

  const result = []
  for (const section of secs || []) {
    const { data: items } = await client
      .from('home_section_items')
      .select('sort_order, drama:dramas(*)')
      .eq('section_id', section.id)
      .order('sort_order')
    const dramas = (items || [])
      .map((i: any) => i.drama)
      .filter((d: any) => d && d.status === 'published' && d.primary_locale === locale)
    if (dramas.length) result.push({ ...section, dramas })
  }

  if (!result.length) {
    const all = await fetchPublishedDramasByLocale(client, locale, { limit: 24 })
    if (all.length) {
      result.push({
        id: `all-${locale}`,
        title: 'New Release',
        slug: 'new-release',
        dramas: all,
      })
    }
  }
  return result
}
