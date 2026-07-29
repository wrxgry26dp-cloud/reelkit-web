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

const { data: episode } = await useAsyncData(
  () => `pe-${episodeId.value}`,
  async () => {
    const { data, error } = await client.from('episodes').select('*').eq('id', episodeId.value).single()
    if (error) throw error
    return data
  },
)

const { data: episodes } = await useAsyncData(`pl-${dramaId.value}`, async () => {
  const { data } = await client.from('episodes').select('*').eq('drama_id', dramaId.value).order('episode_number')
  return data || []
})

const { data: videos } = await useAsyncData(
  () => `pv-${episodeId.value}`,
  async () => {
    const { data } = await client.from('episode_videos').select('*').eq('episode_id', episodeId.value)
    return data || []
  },
)

const unlockedIds = ref<Set<string>>(new Set())
const unlocked = ref(false)
const busy = ref(false)
const tip = ref('')
const playUrl = ref('')
const loadingUrl = ref(false)
const playedOnce = ref(false)

const price = computed(() => Number(episode.value?.coin_price || 0))
const tags = computed(() => ((drama.value as any)?.tags as string[] | undefined) || [])

async function loadUnlocks() {
  if (!user.value) {
    unlockedIds.value = new Set()
    return
  }
  const ids = (episodes.value || []).map((e: any) => e.id)
  if (!ids.length) return
  const { data } = await client
    .from('episode_unlocks')
    .select('episode_id')
    .eq('user_id', user.value.id)
    .in('episode_id', ids)
  unlockedIds.value = new Set((data || []).map((r: any) => r.episode_id))
}

function isLocked(ep: any) {
  const p = Number(ep.coin_price || 0)
  if (p <= 0 || ep.is_free) return false
  return !unlockedIds.value.has(ep.id)
}

async function checkUnlock() {
  tip.value = ''
  if (price.value <= 0) {
    unlocked.value = true
    return
  }
  if (!user.value) {
    unlocked.value = false
    tip.value = t('loginRequired')
    return
  }
  await loadUnlocks()
  unlocked.value = unlockedIds.value.has(episodeId.value)
  if (!unlocked.value) tip.value = `${price.value} ${t('coins')}`
}

async function refreshPlayUrl() {
  playUrl.value = ''
  if (!unlocked.value) return
  loadingUrl.value = true
  playUrl.value = await resolvePlayableUrl(
    client,
    (videos.value || []) as EpisodeVideoAsset[],
    locale.value,
    (episode.value as any)?.video_url,
  )
  loadingUrl.value = false
}

async function unlockAndPlay() {
  if (price.value <= 0) {
    unlocked.value = true
    return
  }
  if (!user.value) {
    showLogin(route.fullPath)
    return
  }
  busy.value = true
  tip.value = ''
  const { error } = await client.rpc('unlock_episode', { p_episode_id: episodeId.value })
  busy.value = false
  if (error) {
    tip.value = error.message.includes('INSUFFICIENT') ? t('insufficientCoins') : error.message
    return
  }
  unlockedIds.value = new Set([...unlockedIds.value, episodeId.value])
  unlocked.value = true
  tip.value = t('unlocked')
}

async function onPlay() {
  if (playedOnce.value) return
  playedOnce.value = true
  await client.from('play_events').insert({
    user_id: user.value?.id || null,
    drama_id: dramaId.value,
    episode_id: episodeId.value,
    locale: locale.value,
    client_source: 'pc',
  })
}

watch([episode, user, episodes], checkUnlock, { immediate: true })
watch([unlocked, videos, locale, episode], refreshPlayUrl, { immediate: true })
watch(episodeId, () => { playedOnce.value = false })
</script>

<template>
  <div class="play-page">
    <div class="play-layout">
      <aside class="play-stage">
        <div class="play-stage-inner">
          <template v-if="unlocked && playUrl">
            <video
              :key="playUrl"
              :src="playUrl"
              controls
              autoplay
              playsinline
              @play="onPlay"
            />
          </template>
          <template v-else-if="unlocked && loadingUrl">
            <div class="play-gate">
              <p class="muted">Loading…</p>
            </div>
          </template>
          <template v-else-if="unlocked && !playUrl">
            <div class="play-gate">
              <p class="muted">{{ t('noVideo') }}</p>
            </div>
          </template>
          <div v-else class="play-gate">
            <div class="lock-icon" aria-hidden="true" />
            <p>{{ tip || t('loginRequired') }}</p>
            <button class="btn" :disabled="busy" @click="unlockAndPlay">
              {{ user ? `${t('unlock')} · ${price} ${t('coins')}` : t('signIn') }}
            </button>
          </div>
        </div>
      </aside>

      <section class="play-side">
        <NuxtLink class="play-back muted" :to="`/drama/${dramaId}`">← {{ drama?.title }}</NuxtLink>
        <h1 class="play-title">{{ drama?.title }}</h1>
        <p class="play-ep">EP{{ episode?.episode_number }} · {{ episode?.title }}</p>
        <div v-if="tags.length" class="tag-row">
          <span v-for="tag in tags" :key="tag" class="chip">{{ tag }}</span>
        </div>
        <p v-if="drama?.synopsis" class="play-synopsis muted">{{ drama.synopsis }}</p>

        <div class="ep-head">
          <h2>{{ t('episodes') }}</h2>
          <span class="muted">{{ episodes?.length || 0 }}</span>
        </div>
        <div class="ep-grid">
          <NuxtLink
            v-for="ep in episodes"
            :key="ep.id"
            class="ep-cell"
            :class="{
              active: ep.id === episodeId,
              locked: isLocked(ep),
            }"
            :to="`/play/${dramaId}/${ep.id}`"
          >
            <span class="ep-num">{{ ep.episode_number }}</span>
            <span v-if="isLocked(ep)" class="ep-lock" aria-hidden="true" />
            <span v-else-if="Number(ep.coin_price) <= 0" class="ep-free">{{ t('free') }}</span>
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>
