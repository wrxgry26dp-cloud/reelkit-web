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
    <NuxtLink to="/" class="brand">
      <span class="logo">R</span>
      <strong>ReelKit</strong>
    </NuxtLink>
    <nav class="nav-links">
      <NuxtLink to="/" :class="{ active: route.path === '/' }">{{ t('home') }}</NuxtLink>
      <NuxtLink to="/categories" :class="{ active: route.path.startsWith('/categories') }">{{ t('categories') }}</NuxtLink>
      <NuxtLink to="/docs" :class="{ active: route.path.startsWith('/docs') }">API</NuxtLink>
      <NuxtLink to="/profile" :class="{ active: route.path.startsWith('/profile') }">{{ t('profile') }}</NuxtLink>
    </nav>
    <div class="spacer" />
    <label class="lang muted">
      {{ t('language') }}
      <select class="select" :value="locale" @change="setLocale(($event.target as HTMLSelectElement).value as any)">
        <option v-for="l in LOCALES" :key="l.code" :value="l.code">{{ l.label }}</option>
      </select>
    </label>
    <template v-if="user">
      <NuxtLink class="avatar" to="/profile">{{ (user.email || 'U').slice(0, 1).toUpperCase() }}</NuxtLink>
      <button class="btn secondary" @click="logout">{{ t('signOut') }}</button>
    </template>
    <button v-else class="btn light signin" @click="showLogin('/')">{{ t('signIn') }}</button>
  </header>
</template>
