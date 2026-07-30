<script setup lang="ts">
const route = useRoute()
const hideChrome = computed(() => route.path.startsWith('/docs'))
</script>

<template>
  <div class="shell" :class="{ docsShell: hideChrome }">
    <AppHeader v-if="!hideChrome" />
    <NuxtPage />
    <LoginModal v-if="!hideChrome" />
  </div>
</template>
