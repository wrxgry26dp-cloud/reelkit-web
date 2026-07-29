<script setup lang="ts">
import type { Drama, Episode } from '~/types/database.types'

const route = useRoute()
const client = useSupabaseClient()
const id = computed(() => String(route.params.id))

const { data: drama } = await useAsyncData(`drama-${id.value}`, async () => {
  const { data, error } = await client.from('dramas').select('*').eq('id', id.value).single()
  if (error) throw error
  return data as Drama
})

const { data: episodes } = await useAsyncData(`eps-${id.value}`, async () => {
  const { data, error } = await client
    .from('episodes')
    .select('*')
    .eq('drama_id', id.value)
    .order('episode_number')
  if (error) throw error
  return data as Episode[]
})

const firstEpisode = computed(() => episodes.value?.[0])
</script>

<template>
  <div class="shell">
    <header class="topnav">
      <NuxtLink to="/">← Home</NuxtLink>
    </header>
    <div class="container stack">
      <div class="row" style="display:flex; gap:24px; flex-wrap:wrap;">
        <div
          class="poster"
          style="width:200px;"
          :style="drama?.cover_url ? { backgroundImage: `url(${drama.cover_url})` } : {}"
        />
        <div class="stack" style="flex:1; min-width:240px;">
          <h1 style="margin:0;">{{ drama?.title }}</h1>
          <p class="muted">{{ drama?.synopsis }}</p>
          <div class="muted">{{ (drama?.tags || []).join(' · ') }}</div>
          <NuxtLink
            v-if="firstEpisode"
            class="btn"
            :to="`/play/${drama?.id}/${firstEpisode.id}`"
          >
            Play Episode 1
          </NuxtLink>
        </div>
      </div>

      <h2>Episodes</h2>
      <div class="episode-list">
        <NuxtLink
          v-for="ep in episodes"
          :key="ep.id"
          class="episode-item"
          :to="`/play/${drama?.id}/${ep.id}`"
        >
          <span>EP{{ ep.episode_number }} · {{ ep.title }}</span>
          <span class="muted">{{ ep.is_free ? 'Free' : 'Locked' }}</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
