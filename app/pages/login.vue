<script setup lang="ts">
await navigateTo('/')
const { showLogin } = useLoginModal()
onMounted(() => showLogin('/'))
</script>

<template>
  <div />
</template>
