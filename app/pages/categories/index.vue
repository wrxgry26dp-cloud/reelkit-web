<script setup lang="ts">
const PAGE_SIZE = 14

const client = useSupabaseClient()
const { t, locale } = useI18n()
const q = ref('')
const page = ref(1)

const { data: result, refresh, pending } = await useAsyncData(
  () => `cat-dramas-${locale.value}-${q.value}-${page.value}`,
  () => fetchPublishedDramasPage(client, locale.value, {
    search: q.value,
    page: page.value,
    pageSize: PAGE_SIZE,
  }),
  {
    server: false,
    default: () => ({ items: [], total: 0, page: 1, pageSize: PAGE_SIZE }),
    watch: [locale, page],
  },
)

const dramas = computed(() => result.value?.items || [])
const total = computed(() => result.value?.total || 0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const canPrev = computed(() => page.value > 1)
const canNext = computed(() => page.value < totalPages.value)

watch(locale, () => {
  page.value = 1
})

function search() {
  page.value = 1
  refresh()
}

function goPrev() {
  if (!canPrev.value) return
  page.value -= 1
}

function goNext() {
  if (!canNext.value) return
  page.value += 1
}
</script>

<template>
  <div class="container stack">
    <h1>{{ t('categories') }}</h1>
    <div class="search-row">
      <input v-model="q" class="input" :placeholder="t('search')" @keyup.enter="search()">
      <button class="btn" type="button" @click="search()">{{ t('search') }}</button>
    </div>

    <p v-if="pending" class="muted">Loading...</p>
    <p v-else-if="!dramas.length" class="muted">{{ t('noContentForLocale') }}</p>
    <template v-else>
      <div class="cat-grid">
        <NuxtLink v-for="d in dramas" :key="d.id" class="cat-card" :to="`/drama/${d.id}`">
          <div class="poster" :style="d.cover_url ? { backgroundImage: `url(${d.cover_url})` } : {}" />
          <div class="card-title">{{ d.title }}</div>
        </NuxtLink>
      </div>

      <div class="pager">
        <button class="btn secondary" type="button" :disabled="!canPrev || pending" @click="goPrev">
          {{ t('prevPage') }}
        </button>
        <span class="page-info">{{ t('pageOf', { page, total: totalPages }) }}</span>
        <button class="btn secondary" type="button" :disabled="!canNext || pending" @click="goNext">
          {{ t('nextPage') }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.search-row {
  display: flex;
  gap: 8px;
}

.cat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 16px 14px;
}

.cat-card {
  min-width: 0;
  transition: transform 0.16s ease;
}

.cat-card:hover {
  transform: translateY(-4px);
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 8px 0 20px;
}

.page-info {
  color: var(--muted);
  font-size: 14px;
  min-width: 7em;
  text-align: center;
}

@media (max-width: 720px) {
  .cat-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px 10px;
  }
}
</style>
