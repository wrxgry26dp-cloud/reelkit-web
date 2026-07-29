<script setup lang="ts">
const client = useSupabaseClient()
const { t, locale } = useI18n()
const q = ref('')

const { data: dramas, refresh, pending } = await useAsyncData(
  () => `cat-dramas-${locale.value}-${q.value}`,
  () => fetchPublishedDramasByLocale(client, locale.value, { search: q.value }),
  { server: false, default: () => [], watch: [locale] },
)

watch(locale, () => { refresh() })
</script>

<template>
  <div class="container stack">
    <h1>{{ t('categories') }}</h1>
    <div style="display:flex; gap:8px;">
      <input v-model="q" class="input" :placeholder="t('search')" @keyup.enter="refresh()">
      <button class="btn" @click="refresh()">{{ t('search') }}</button>
    </div>
    <p v-if="pending" class="muted">Loading...</p>
    <p v-else-if="!dramas?.length" class="muted">{{ t('noContentForLocale') }}</p>
    <div class="rail" style="grid-auto-columns: minmax(120px,180px);">
      <NuxtLink v-for="d in dramas" :key="d.id" :to="`/drama/${d.id}`">
        <div class="poster" :style="d.cover_url ? { backgroundImage: `url(${d.cover_url})` } : {}" />
        <div class="card-title">{{ d.title }}</div>
      </NuxtLink>
    </div>
  </div>
</template>
