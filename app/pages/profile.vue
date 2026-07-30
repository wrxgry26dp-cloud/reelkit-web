<script setup lang="ts">
import type { Profile } from '~/types/database.types'

type FavDrama = {
  id: string
  title: string
  cover_url: string | null
}

type UnlockRow = {
  id: string
  coins_spent: number
  created_at: string
  episode: {
    episode_number: number
    title: string
    drama_id: string
  } | null
}

const client = useSupabaseClient()
const user = useSupabaseUser()
const { t } = useI18n()
const { showLogin } = useLoginModal()
const { favoritedIds } = useFavorites()

const loggingOut = ref(false)
const tip = ref('')
const profile = ref<Pick<Profile, 'id' | 'email' | 'display_name' | 'username' | 'coin_balance' | 'client_source'> | null>(null)
const unlocks = ref<UnlockRow[]>([])
const favoriteDramas = ref<FavDrama[]>([])
const balanceLoading = ref(false)

async function resolveUserId() {
  const { data: { session } } = await client.auth.getSession()
  return session?.user?.id || user.value?.id || null
}

async function loadProfile() {
  const uid = await resolveUserId()
  if (!uid) {
    profile.value = null
    return
  }
  balanceLoading.value = true
  try {
    const { data, error } = await client
      .from('profiles')
      .select('id,email,display_name,username,coin_balance,client_source')
      .eq('id', uid)
      .maybeSingle()
    if (error) {
      console.error('[profile] load failed', error.message)
      return
    }
    profile.value = data
  } finally {
    balanceLoading.value = false
  }
}

async function loadUnlocks() {
  const uid = await resolveUserId()
  if (!uid) {
    unlocks.value = []
    return
  }
  const { data } = await client
    .from('episode_unlocks')
    .select('id,coins_spent,created_at, episode:episodes(episode_number,title,drama_id)')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
  unlocks.value = (data || []) as UnlockRow[]
}

async function loadFavorites() {
  const ids = favoritedIds.value
  if (!ids.length) {
    favoriteDramas.value = []
    return
  }
  const { data } = await client
    .from('dramas')
    .select('id,title,cover_url')
    .in('id', ids)
    .eq('status', 'published')
  const rows = (data || []) as FavDrama[]
  const order = new Map(ids.map((id, i) => [id, i]))
  favoriteDramas.value = rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
}

async function loadAll() {
  await Promise.all([loadProfile(), loadUnlocks(), loadFavorites()])
}

onMounted(() => {
  loadAll()
  const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
    if (session?.user?.id) loadAll()
    else {
      profile.value = null
      unlocks.value = []
    }
  })
  onBeforeUnmount(() => {
    sub.subscription.unsubscribe()
  })
})

watch(
  () => user.value?.id,
  (id, prev) => {
    if (id && id !== prev) loadAll()
    if (!id) {
      profile.value = null
      unlocks.value = []
    }
  },
)

watch(favoritedIds, () => {
  loadFavorites()
})

const displayName = computed(() => {
  const p = profile.value
  const name = p?.display_name || p?.username || ''
  if (name) return name
  const email = user.value?.email || p?.email || ''
  if (email.includes('@')) return email.split('@')[0] || t('displayNameFallback')
  return t('displayNameFallback')
})

const emailText = computed(() => user.value?.email || profile.value?.email || '')

const avatarLetter = computed(() => {
  const raw = displayName.value.trim()
  return (raw[0] || 'R').toUpperCase()
})

const coinBalance = computed(() => {
  if (profile.value == null) return balanceLoading.value ? '…' : 0
  return Number(profile.value.coin_balance ?? 0)
})

async function logout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await client.auth.signOut()
    profile.value = null
    await navigateTo('/')
  } finally {
    loggingOut.value = false
  }
}

function onRecharge() {
  tip.value = t('rechargeSoon')
  window.setTimeout(() => {
    if (tip.value === t('rechargeSoon')) tip.value = ''
  }, 2200)
}
</script>

<template>
  <div class="page-width profile-page">
    <h1>{{ t('personalCenter') }}</h1>

    <template v-if="!user">
      <section class="profile-hero guest">
        <div class="avatar-lg" aria-hidden="true">?</div>
        <div>
          <strong>{{ t('displayNameFallback') }}</strong>
          <p class="muted">{{ t('guestTip') }}</p>
          <button class="btn" type="button" @click="showLogin('/profile')">{{ t('signIn') }}</button>
        </div>
      </section>
    </template>

    <template v-else>
      <section class="profile-hero">
        <div class="avatar-lg" aria-hidden="true">{{ avatarLetter }}</div>
        <div class="meta">
          <strong>{{ displayName }}</strong>
          <p class="muted">{{ emailText }}</p>
        </div>
        <button class="btn secondary logout" type="button" :disabled="loggingOut" @click="logout">
          {{ loggingOut ? '…' : t('signOut') }}
        </button>
      </section>

      <section class="coin-card">
        <div>
          <p class="coin-label">{{ t('balance') }}</p>
          <p class="coin-value">
            <strong>{{ coinBalance }}</strong>
            <span>{{ t('coins') }}</span>
          </p>
        </div>
        <button class="coin-btn" type="button" @click="onRecharge">+</button>
      </section>
      <p v-if="tip" class="tip">{{ tip }}</p>

      <section class="panel">
        <div class="panel-head">
          <h2>{{ t('myFavorites') }}</h2>
          <span class="count">{{ favoriteDramas.length }}</span>
        </div>
        <div v-if="favoriteDramas.length" class="fav-grid">
          <NuxtLink
            v-for="drama in favoriteDramas"
            :key="drama.id"
            class="fav-card"
            :to="`/drama/${drama.id}`"
          >
            <div
              class="poster"
              :style="drama.cover_url ? { backgroundImage: `url(${drama.cover_url})` } : {}"
            />
            <span>{{ drama.title }}</span>
          </NuxtLink>
        </div>
        <p v-else class="muted empty">{{ t('noFavorites') }}</p>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>{{ t('watchHistory') }}</h2>
          <span class="count">{{ unlocks.length }}</span>
        </div>
        <div v-if="unlocks.length" class="episode-list">
          <div v-for="u in unlocks" :key="u.id" class="episode-item">
            <span>EP{{ u.episode?.episode_number }} · {{ u.episode?.title }}</span>
            <span class="muted">-{{ u.coins_spent }} {{ t('coins') }}</span>
          </div>
        </div>
        <p v-else class="muted empty">{{ t('noUnlocks') }}</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.profile-page {
  padding: 28px 0 64px;
  display: grid;
  gap: 22px;
}

.profile-page h1 {
  margin: 0;
  font-size: clamp(28px, 3vw, 36px);
  font-weight: 900;
}

.profile-hero {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 20px 22px;
  border-radius: 16px;
  background: #121212;
  border: 1px solid #222;
}

.avatar-lg {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: linear-gradient(135deg, #ff4d8d, #ee2737);
  color: #fff;
  font-size: 28px;
  font-weight: 900;
}

.meta {
  min-width: 0;
  flex: 1;
}

.meta strong {
  display: block;
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 4px;
}

.meta p,
.guest p {
  margin: 0 0 12px;
}

.logout {
  margin-left: auto;
}

.coin-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(238, 39, 55, 0.18), rgba(255, 77, 141, 0.1));
  border: 1px solid rgba(238, 39, 55, 0.28);
}

.coin-label {
  margin: 0 0 6px;
  color: var(--muted);
  font-size: 13px;
}

.coin-value {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.coin-value strong {
  color: #ffb020;
  font-size: 36px;
  font-weight: 900;
  line-height: 1;
}

.coin-btn {
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff4d8d, #ee2737);
  color: #fff;
  font-size: 26px;
  font-weight: 700;
  cursor: pointer;
}

.tip {
  margin: -10px 0 0;
  color: #ffb020;
  font-size: 13px;
}

.panel {
  display: grid;
  gap: 14px;
}

.panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.panel-head h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
}

.count {
  color: var(--muted);
  font-size: 14px;
}

.fav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 14px;
}

.fav-card {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.fav-card .poster {
  width: 100%;
}

.fav-card span {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.empty {
  margin: 0;
  font-size: 14px;
}

@media (max-width: 720px) {
  .profile-hero {
    flex-wrap: wrap;
  }

  .logout {
    margin-left: 0;
    width: 100%;
  }
}
</style>
