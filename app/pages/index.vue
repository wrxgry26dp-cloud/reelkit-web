<script setup lang="ts">
const client = useSupabaseClient()
const { t } = useI18n()

const slide = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const { data: banners, pending: bannersPending } = await useAsyncData('home-banners', async () => {
  const { data, error } = await client
    .from('banners')
    .select('id,title,image_url,drama_id,sort_order, drama:dramas(id,title,synopsis,cover_url,status)')
    .eq('is_active', true)
    .order('sort_order')
  if (error) throw error
  return (data || []).filter((b: any) => !b.drama || b.drama.status === 'published')
}, { server: false, default: () => [] })

const { data: sections, pending: sectionsPending } = await useAsyncData('home-sections', async () => {
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
      .filter((d: any) => d && d.status === 'published')
    if (dramas.length) result.push({ ...section, dramas })
  }

  if (!result.length) {
    const { data: all } = await client
      .from('dramas')
      .select('*')
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(24)
    if (all?.length) result.push({ id: 'all', title: 'New Release', slug: 'new-release', dramas: all })
  }
  return result
}, { server: false, default: () => [] })

const pending = computed(() => bannersPending.value || sectionsPending.value)
const current = computed(() => banners.value?.[slide.value] || null)
const currentDrama = computed(() => (current.value as any)?.drama || null)
const featured = computed(() => {
  const fromBanners = (banners.value || [])
    .map((b: any) => b.drama)
    .filter(Boolean)
  if (fromBanners.length) return fromBanners.slice(0, 6)
  return (sections.value?.[0]?.dramas || []).slice(0, 6)
})

const heroImage = computed(() => {
  return current.value?.image_url
    || currentDrama.value?.cover_url
    || ''
})

function next() {
  const n = banners.value?.length || 0
  if (n <= 1) return
  slide.value = (slide.value + 1) % n
}
function prev() {
  const n = banners.value?.length || 0
  if (n <= 1) return
  slide.value = (slide.value - 1 + n) % n
}
function go(i: number) { slide.value = i }
function startAuto() {
  stopAuto()
  if ((banners.value?.length || 0) > 1) timer = setInterval(next, 5000)
}
function stopAuto() {
  if (timer) { clearInterval(timer); timer = null }
}

watch(banners, (list) => {
  slide.value = 0
  if (list?.length) startAuto()
}, { immediate: true })
onBeforeUnmount(stopAuto)
</script>

<template>
  <div class="home">
    <section class="hero-stage" @mouseenter="stopAuto" @mouseleave="startAuto">
      <div
        class="hero-bg"
        :style="heroImage ? { backgroundImage: `url(${heroImage})` } : undefined"
      />
      <div class="hero-shade" />

      <div class="hero-inner page-width">
        <div class="hero-main">
          <p class="hero-kicker">ReelKit Original</p>
          <h1 class="hero-title">{{ currentDrama?.title || current?.title || 'ReelKit' }}</h1>
          <p class="hero-synopsis">
            {{ currentDrama?.synopsis || t('guestTip') }}
          </p>
          <div class="hero-actions">
            <NuxtLink
              v-if="current?.drama_id"
              class="btn play"
              :to="`/drama/${current.drama_id}`"
            >
              <span class="ico-play" aria-hidden="true" />
              {{ t('play') }}
            </NuxtLink>
            <NuxtLink class="btn ghost" to="/categories">{{ t('categories') }}</NuxtLink>
          </div>
        </div>

        <div v-if="featured.length" class="featured-strip">
          <NuxtLink
            v-for="(d, i) in featured"
            :key="d.id"
            class="featured-item"
            :class="{ active: current?.drama_id === d.id }"
            :to="`/drama/${d.id}`"
            @mouseenter="go(Math.min(i, (banners?.length || 1) - 1))"
          >
            <div
              class="featured-thumb"
              :style="d.cover_url ? { backgroundImage: `url(${d.cover_url})` } : undefined"
            />
            <div class="featured-meta">
              <div class="featured-title">{{ d.title }}</div>
              <div class="featured-ep">EP.1</div>
            </div>
          </NuxtLink>
        </div>
      </div>

      <button v-if="(banners?.length || 0) > 1" class="hero-nav prev" aria-label="Previous" @click="prev">
        <span class="ico-chevron left" aria-hidden="true" />
      </button>
      <button v-if="(banners?.length || 0) > 1" class="hero-nav next" aria-label="Next" @click="next">
        <span class="ico-chevron right" aria-hidden="true" />
      </button>
      <div v-if="(banners?.length || 0) > 1" class="hero-dots">
        <button
          v-for="(b, i) in banners"
          :key="b.id"
          class="dot"
          :class="{ active: i === slide }"
          @click="go(i)"
        />
      </div>
    </section>

    <div v-if="pending" class="page-width muted load-tip">Loading...</div>

    <section v-for="section in sections" :key="section.id" class="rail-section page-width">
      <div class="section-head">
        <h2>{{ section.title }}</h2>
        <NuxtLink class="view-all" to="/categories">{{ t('viewAll') }} <span class="ico-chevron right sm" aria-hidden="true" /></NuxtLink>
      </div>
      <div class="rail">
        <NuxtLink
          v-for="(d, idx) in section.dramas"
          :key="d.id"
          class="rail-card"
          :to="`/drama/${d.id}`"
        >
          <div
            class="poster"
            :style="d.cover_url ? { backgroundImage: `url(${d.cover_url})` } : undefined"
          >
            <span v-if="section.slug === 'top'" class="rank">{{ idx + 1 }}</span>
            <span v-else-if="d.is_trending" class="tag">Trending</span>
          </div>
          <div class="card-title">{{ d.title }}</div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
