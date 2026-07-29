<script setup lang="ts">
const client = useSupabaseClient()
const { t } = useI18n()
const q = ref('')
const { data: dramas, refresh } = await useAsyncData('cat-dramas', async () => {
  let query = client.from('dramas').select('*').eq('status', 'published').order('updated_at', { ascending: false })
  if (q.value.trim()) query = query.ilike('title', `%${q.value.trim()}%`)
  const { data } = await query
  return data || []
})
</script>

<template>
  <div class="container stack">
    <h1>{{ t('categories') }}</h1>
    <div style="display:flex; gap:8px;">
      <input v-model="q" class="input" :placeholder="t('search')" @keyup.enter="refresh()">
      <button class="btn" @click="refresh()">{{ t('search') }}</button>
    </div>
    <div class="rail" style="grid-auto-columns: minmax(120px,180px);">
      <NuxtLink v-for="d in dramas" :key="d.id" :to="`/drama/${d.id}`">
        <div class="poster" :style="d.cover_url ? { backgroundImage: `url(${d.cover_url})` } : {}" />
        <div class="card-title">{{ d.title }}</div>
      </NuxtLink>
    </div>
  </div>
</template>
