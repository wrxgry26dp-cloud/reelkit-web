<script setup lang="ts">
const client = useSupabaseClient()
const { t } = useI18n()

const { data: banners } = await useAsyncData('banners', async () => {
  const { data, error } = await client.from('banners').select('*').eq('is_active', true).order('sort_order')
  if (error) throw error
  return data || []
}, { server: false, default: () => [] })

const { data: sections, pending } = await useAsyncData('sections', async () => {
  const { data: secs } = await client.from('home_sections').select('*').eq('is_active', true).order('sort_order')
  const result = []
  for (const section of secs || []) {
    const { data: items } = await client
      .from('home_section_items')
      .select('sort_order, drama:dramas(*)')
      .eq('section_id', section.id)
      .order('sort_order')
    const dramas = (items || []).map((i: any) => i.drama).filter((d: any) => d && d.status === 'published')
    result.push({ ...section, dramas })
  }
  return result
}, { server: false, default: () => [] })

const hero = computed(() => banners.value?.[0])
</script>

<template>
  <div>
    <p class="muted" style="padding:8px 20px 0;">{{ t('guestTip') }}</p>
    <section class="hero">
      <div style="text-align:center;">
        <h1 class="hero-title">{{ hero?.title || 'ReelKit' }}</h1>
        <NuxtLink v-if="hero?.drama_id" class="btn light" :to="`/drama/${hero.drama_id}`">{{ t('play') }}</NuxtLink>
        <NuxtLink v-else class="btn light" to="/categories">{{ t('categories') }}</NuxtLink>
      </div>
    </section>

    <p v-if="pending" class="muted" style="padding:0 20px;">Loading...</p>
    <section v-for="section in sections" :key="section.id" class="section">
      <div class="section-head">
        <h2>{{ section.title }}</h2>
        <span class="muted">{{ t('viewAll') }}</span>
      </div>
      <div class="rail">
        <NuxtLink v-for="d in section.dramas" :key="d.id" :to="`/drama/${d.id}`">
          <div class="poster" :style="d.cover_url ? { backgroundImage: `url(${d.cover_url})` } : {}">
            <span v-if="d.is_trending" class="tag">HOT</span>
          </div>
          <div class="card-title">{{ d.title }}</div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

