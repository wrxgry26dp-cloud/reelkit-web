<script setup lang="ts">
import type { Category, Drama } from '~/types/database.types'

const client = useSupabaseClient()
const q = ref('')

const { data: categories } = await useAsyncData('cats', async () => {
  const { data, error } = await client.from('categories').select('*').order('sort_order')
  if (error) throw error
  return data as Category[]
})

const { data: dramas, refresh } = await useAsyncData('search-dramas', async () => {
  let query = client.from('dramas').select('*').eq('status', 'published').order('updated_at', { ascending: false })
  if (q.value.trim()) {
    query = query.ilike('title', `%${q.value.trim()}%`)
  }
  const { data, error } = await query
  if (error) throw error
  return data as Drama[]
})

async function search() {
  await refresh()
}
</script>

<template>
  <div class="shell">
    <header class="topnav">
      <NuxtLink to="/">← Home</NuxtLink>
      <strong>Categories</strong>
    </header>
    <div class="container stack">
      <div class="row" style="display:flex; gap:8px;">
        <input v-model="q" class="input" placeholder="Search dramas" @keyup.enter="search">
        <button class="btn" @click="search">Search</button>
      </div>
      <div class="muted">{{ (categories || []).map(c => c.name).join(' · ') }}</div>
      <div class="rail" style="grid-auto-columns: 180px;">
        <NuxtLink v-for="d in dramas" :key="d.id" :to="`/drama/${d.id}`">
          <div class="poster" :style="d.cover_url ? { backgroundImage: `url(${d.cover_url})` } : {}" />
          <div class="card-title">{{ d.title }}</div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
