<script setup lang="ts">
import type { Drama, Episode } from '~/types/database.types'

const route = useRoute()
const client = useSupabaseClient()
const user = useSupabaseUser()
const dramaId = computed(() => String(route.params.dramaId))
const episodeId = computed(() => String(route.params.episodeId))

const { data: drama } = await useAsyncData(`play-drama-${dramaId.value}`, async () => {
  const { data, error } = await client.from('dramas').select('*').eq('id', dramaId.value).single()
  if (error) throw error
  return data as Drama
})

const { data: episode } = await useAsyncData(`play-ep-${episodeId.value}`, async () => {
  const { data, error } = await client.from('episodes').select('*').eq('id', episodeId.value).single()
  if (error) throw error
  return data as Episode
})

const { data: episodes } = await useAsyncData(`play-list-${dramaId.value}`, async () => {
  const { data, error } = await client
    .from('episodes')
    .select('*')
    .eq('drama_id', dramaId.value)
    .order('episode_number')
  if (error) throw error
  return data as Episode[]
})

async function saveProgress(seconds: number) {
  if (!user.value) return
  await client.from('watch_progress').upsert({
    user_id: user.value.id,
    drama_id: dramaId.value,
    episode_id: episodeId.value,
    progress_seconds: Math.floor(seconds),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,drama_id' })
}

function onTimeUpdate(e: Event) {
  const video = e.target as HTMLVideoElement
  if (Math.floor(video.currentTime) % 5 === 0) {
    saveProgress(video.currentTime)
  }
}
</script>

<template>
  <div class="shell">
    <header class="topnav">
      <NuxtLink :to="`/drama/${dramaId}`">← {{ drama?.title }}</NuxtLink>
    </header>
    <div class="container stack">
      <div class="player-wrap">
        <video
          v-if="episode?.video_url"
          :src="episode.video_url"
          controls
          autoplay
          playsinline
          @timeupdate="onTimeUpdate"
        />
        <p v-else class="muted">No video URL for this episode.</p>
      </div>
      <h2 style="margin:0;">EP{{ episode?.episode_number }} · {{ episode?.title }}</h2>
      <div class="episode-list">
        <NuxtLink
          v-for="ep in episodes"
          :key="ep.id"
          class="episode-item"
          :to="`/play/${dramaId}/${ep.id}`"
          :style="ep.id === episodeId ? { borderColor: '#ee2737' } : {}"
        >
          <span>EP{{ ep.episode_number }}</span>
          <span class="muted">{{ ep.title }}</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
