<script setup lang="ts">
import type { Banner, Drama, HomeSection } from '~/types/database.types'

type SectionWithDramas = HomeSection & { dramas: Drama[] }

const client = useSupabaseClient()

const { data: banners } = await useAsyncData('banners', async () => {
  const { data, error } = await client
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
  if (error) throw error
  return data as Banner[]
})

const { data: sections } = await useAsyncData('home-sections', async () => {
  const { data: secs, error } = await client
    .from('home_sections')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
  if (error) throw error

  const result: SectionWithDramas[] = []
  for (const section of (secs || []) as HomeSection[]) {
    const { data: items } = await client
      .from('home_section_items')
      .select('sort_order, drama:dramas(*)')
      .eq('section_id', section.id)
      .order('sort_order')

    const dramas = (items || [])
      .map((item: any) => item.drama as Drama)
      .filter((d: Drama | null) => d && d.status === 'published')

    result.push({ ...section, dramas })
  }
  return result
})

const hero = computed(() => banners.value?.[0] || null)
</script>

<template>
  <div class="shell">
    <header class="topnav">
      <div class="logo">R</div>
      <NuxtLink to="/" class="active">Home</NuxtLink>
      <NuxtLink to="/categories">Categories</NuxtLink>
      <div style="flex:1" />
      <NuxtLink to="/login">Sign in</NuxtLink>
    </header>

    <section class="hero">
      <div style="text-align:center;">
        <h1 class="hero-title">{{ hero?.title || 'Every Second Is Drama' }}</h1>
        <NuxtLink
          v-if="hero?.drama_id"
          class="play-btn"
          :to="`/drama/${hero.drama_id}`"
        >
          ▶ Play
        </NuxtLink>
        <NuxtLink v-else class="play-btn" to="/categories">Browse</NuxtLink>
      </div>
    </section>

    <section v-for="section in sections" :key="section.id" class="section">
      <div class="section-head">
        <h2>{{ section.title }}</h2>
        <span class="muted">View all</span>
      </div>
      <div class="rail">
        <NuxtLink v-for="d in section.dramas" :key="d.id" :to="`/drama/${d.id}`">
          <div
            class="poster"
            :style="d.cover_url ? { backgroundImage: `url(${d.cover_url})` } : {}"
          >
            <span v-if="d.is_trending" class="trending">Trending</span>
          </div>
          <div class="card-title">{{ d.title }}</div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
