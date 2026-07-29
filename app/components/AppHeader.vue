<script setup lang="ts">
const { t, locale, setLocale, LOCALES } = useI18n()
const { showLogin } = useLoginModal()
const user = useSupabaseUser()
const client = useSupabaseClient()
const route = useRoute()

async function logout() {
  await client.auth.signOut()
}
</script>

<template>
  <header class="topnav">
    <div class="logo">R</div>
    <NuxtLink to="/" :class="{ active: route.path === '/' }">{{ t('home') }}</NuxtLink>
    <NuxtLink to="/categories" :class="{ active: route.path.startsWith('/categories') }">{{ t('categories') }}</NuxtLink>
    <NuxtLink to="/profile" :class="{ active: route.path.startsWith('/profile') }">{{ t('profile') }}</NuxtLink>
    <div class="spacer" />
    <label class="muted" style="display:flex; gap:6px; align-items:center;">
      {{ t('language') }}
      <select class="select" :value="locale" @change="setLocale(($event.target as HTMLSelectElement).value as any)">
        <option v-for="l in LOCALES" :key="l.code" :value="l.code">{{ l.label }}</option>
      </select>
    </label>
    <template v-if="user">
      <NuxtLink to="/profile">{{ t('personalCenter') }}</NuxtLink>
      <button class="btn secondary" @click="logout">{{ t('signOut') }}</button>
    </template>
    <button v-else class="btn secondary" @click="showLogin('/')">{{ t('signIn') }}</button>
  </header>
</template>
