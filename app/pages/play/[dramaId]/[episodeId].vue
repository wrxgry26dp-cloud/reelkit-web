<script setup lang="ts">
const route = useRoute()
const client = useSupabaseClient()
const user = useSupabaseUser()
const { t, locale } = useI18n()
const { showLogin } = useLoginModal()

const dramaId = computed(() => String(route.params.dramaId))
const episodeId = computed(() => String(route.params.episodeId))

const { data: drama } = await useAsyncData(`pd-${dramaId.value}`, async () => {
  const { data, error } = await client.from('dramas').select('*').eq('id', dramaId.value).single()
  if (error) throw error
  return data
})

const { data: episode } = await useAsyncData(`pe-${episodeId.value}`, async () => {
  const { data, error } = await client.from('episodes').select('*').eq('id', episodeId.value).single()
  if (error) throw error
  return data
})

const { data: episodes } = await useAsyncData(`pl-${dramaId.value}`, async () => {
  const { data } = await client.from('episodes').select('*').eq('drama_id', dramaId.value).order('episode_number')
  return data || []
})

const { data: videos } = await useAsyncData(`pv-${episodeId.value}`, async () => {
  const { data } = await client.from('episode_videos').select('*').eq('episode_id', episodeId.value)
  return data || []
})

const videoUrl = computed(() => {
  const list = videos.value || []
  const hit = list.find((v: any) => v.locale === locale.value)
  return hit?.video_url || list.find((v: any) => v.locale === 'en')?.video_url || episode.value?.video_url || ''
})

const unlocked = ref(false)
const busy = ref(false)
const tip = ref('')

async function checkUnlock() {
  const price = Number(episode.value?.coin_price || 0)
  if (price <= 0) {
    unlocked.value = true
    return
  }
  if (!user.value) {
    unlocked.value = false
    tip.value = t('loginRequired')
    return
  }
  const { data } = await client.from('episode_unlocks').select('id').eq('user_id', user.value.id).eq('episode_id', episodeId.value).maybeSingle()
  unlocked.value = !!data
  if (!unlocked.value) tip.value = `${price} ${t('coins')}`
}

watch([episode, user], checkUnlock, { immediate: true })

async function unlockAndPlay() {
  const price = Number(episode.value?.coin_price || 0)
  if (price <= 0) {
    unlocked.value = true
    return
  }
  if (!user.value) {
    showLogin(route.fullPath)
    return
  }
  busy.value = true
  tip.value = ''
  const { data, error } = await client.rpc('unlock_episode', { p_episode_id: episodeId.value })
  busy.value = false
  if (error) {
    tip.value = error.message.includes('INSUFFICIENT') ? t('insufficientCoins') : error.message
    return
  }
  unlocked.value = true
  tip.value = t('unlocked')
}

async function onPlay() {
  await client.from('play_events').insert({
    user_id: user.value?.id || null,
    drama_id: dramaId.value,
    episode_id: episodeId.value,
    locale: locale.value,
    client_source: 'pc',
  })
}

watch(unlocked, async (v) => {
  if (v) await onPlay()
})
</script>

<template>
  <div class="container stack">
    <NuxtLink :to="`/drama/${dramaId}`">← {{ drama?.title }}</NuxtLink>
    <div class="player-wrap">
      <template v-if="unlocked && videoUrl">
        <video :src="videoUrl" controls autoplay playsinline @play="onPlay" />
      </template>
      <template v-else-if="unlocked && !videoUrl">
        <p class="muted">{{ t('noVideo') }}</p>
      </template>
      <div v-else class="stack" style="padding:24px; text-align:center;">
        <p>{{ tip || t('loginRequired') }}</p>
        <button class="btn" :disabled="busy" @click="unlockAndPlay">
          {{ user ? t('unlock') : t('signIn') }}
        </button>
      </div>
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
        <span class="muted">{{ Number(ep.coin_price) > 0 ? `${ep.coin_price} ${t('coins')}` : t('free') }}</span>
      </NuxtLink>
    </div>
  </div>
</template>
