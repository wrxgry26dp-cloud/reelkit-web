<script setup lang="ts">
const client = useSupabaseClient()
const { t } = useI18n()
const route = useRoute()

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

  // Fallback rail if sections empty: all published dramas
  if (!result.length) {
    const { data: all } = await client
      .from('dramas')
      .select('*')
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
    if (all?.length) {
      result.push({ id: 'all', title: 'Recommended', slug: 'recommended', dramas: all })
    }
  }
  return result
}, { server: false, default: () => [] })

const pending = computed(() => bannersPending.value || sectionsPending.value)
const current = computed(() => banners.value?.[slide.value] || null)
const currentDrama = computed(() => (current.value as any)?.drama || null)

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

function go(i: number) {
  slide.value = i
}

function startAuto() {
  stopAuto()
  timer = setInterval(next, 5000)
}

function stopAuto() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

watch(banners, (list) => {
  slide.value = 0
  if (list?.length) startAuto()
}, { immediate: true })

onBeforeUnmount(stopAuto)

watch(() => route.fullPath, () => {
  // keep header active feel when returning home
})
</script>

<template>
  <div class="home">
    <p class="guest-tip muted">{{ t('guestTip') }}</p>

    <section
      class="carousel"
      @mouseenter="stopAuto"
      @mouseleave="startAuto"
    >
      <div v-if="pending && !banners?.length" class="carousel-empty muted">Loading...</div>
      <template v-else-if="current">
        <div
          class="carousel-bg"
          :style="{
            backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.82) 0%, rgba(0,0,0,.35) 48%, rgba(0,0,0,.55) 100%), url(${current.image_url || currentDrama?.cover_url || ''})`,
          }"
        />
        <div class="carousel-content">
          <div class="carousel-copy">
            <p class="carousel-kicker">Featured</p>
            <h1 class="carousel-title">{{ currentDrama?.title || current.title }}</h1>
            <p v-if="currentDrama?.synopsis" class="carousel-synopsis muted">
              {{ currentDrama.synopsis }}
            </p>
            <div class="carousel-actions">
              <NuxtLink
                v-if="current.drama_id"
                class="btn light"
                :to="`/drama/${current.drama_id}`"
              >
                {{ t('play') }}
              </NuxtLink>
              <NuxtLink class="btn secondary" to="/categories">{{ t('categories') }}</NuxtLink>
            </div>
          </div>
          <div
            v-if="currentDrama?.cover_url || current.image_url"
            class="carousel-poster"
            :style="{ backgroundImage: `url(${currentDrama?.cover_url || current.image_url})` }"
          />
        </div>
        <button v-if="(banners?.length || 0) > 1" class="carousel-nav prev" aria-label="Previous" @click="prev">?</button>
        <button v-if="(banners?.length || 0) > 1" class="carousel-nav next" aria-label="Next" @click="next">?</button>
        <div v-if="(banners?.length || 0) > 1" class="carousel-dots">
          <button
            v-for="(b, i) in banners"
            :key="b.id"
            class="dot"
            :class="{ active: i === slide }"
            :aria-label="`Slide ${i + 1}`"
            @click="go(i)"
          />
        </div>
      </template>
      <div v-else class="carousel-empty">
        <h1 class="carousel-title">ReelKit</h1>
        <NuxtLink class="btn light" to="/categories">{{ t('categories') }}</NuxtLink>
      </div>
    </section>

    <p v-if="pending" class="muted" style="padding: 0 20px;">Loading...</p>

    <section v-for="section in sections" :key="section.id" class="section">
      <div class="section-head">
        <h2>{{ section.title }}</h2>
        <NuxtLink class="muted" to="/categories">{{ t('viewAll') }}</NuxtLink>
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
            :style="d.cover_url ? { backgroundImage: `url(${d.cover_url})` } : {}"
          >
            <span v-if="section.slug === 'top'" class="rank">{{ idx + 1 }}</span>
            <span v-else-if="d.is_trending" class="tag">HOT</span>
          </div>
          <div class="card-title">{{ d.title }}</div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
