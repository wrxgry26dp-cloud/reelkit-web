<script setup lang="ts">
const route = useRoute()
const client = useSupabaseClient()
const user = useSupabaseUser()
const { t } = useI18n()
const { showLogin } = useLoginModal()
const { isFavorited, toggleFavorite } = useFavorites()
const id = computed(() => String(route.params.id))

const { data: drama, pending } = await useAsyncData(`drama-${id.value}`, async () => {
  const { data, error } = await client.from('dramas').select('*').eq('id', id.value).single()
  if (error) throw error
  return data
}, { server: false, default: () => null })

const { data: episodes } = await useAsyncData(`eps-${id.value}`, async () => {
  const { data, error } = await client.from('episodes').select('*').eq('drama_id', id.value).order('episode_number')
  if (error) throw error
  return data || []
}, { server: false, default: () => [] })

const first = computed(() => episodes.value?.[0])
const saved = computed(() => (drama.value?.id ? isFavorited(drama.value.id) : false))

function onToggleFavorite() {
  if (!user.value) {
    showLogin(route.fullPath)
    return
  }
  if (drama.value?.id) toggleFavorite(drama.value.id)
}
</script>

<template>
  <div class="container stack">
    <p v-if="pending" class="muted">Loading...</p>
    <div style="display:flex; gap:20px; flex-wrap:wrap;">
      <div class="poster" style="width:min(200px,45vw);" :style="drama?.cover_url ? { backgroundImage: `url(${drama.cover_url})` } : {}" />
      <div class="stack" style="flex:1; min-width:220px;">
        <h1 style="margin:0;">{{ drama?.title }}</h1>
        <p class="muted">{{ drama?.synopsis }}</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <NuxtLink v-if="first" class="btn" :to="`/play/${drama?.id}/${first.id}`">{{ t('play') }} EP1</NuxtLink>
          <button class="btn secondary" type="button" @click="onToggleFavorite">
            {{ saved ? t('removeFavorite') : t('addFavorite') }}
          </button>
        </div>
      </div>
    </div>
    <h2>{{ t('episodes') }}</h2>
    <div class="episode-list">
      <NuxtLink v-for="ep in episodes" :key="ep.id" class="episode-item" :to="`/play/${drama?.id}/${ep.id}`">
        <span>EP{{ ep.episode_number }} · {{ ep.title }}</span>
        <span class="muted">{{ Number(ep.coin_price) > 0 ? `${ep.coin_price} ${t('coins')}` : t('free') }}</span>
      </NuxtLink>
    </div>
  </div>
</template>
