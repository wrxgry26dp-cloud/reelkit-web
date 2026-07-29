<script setup lang="ts">
const supabase = useSupabaseClient()
const route = useRoute()
const email = ref('')
const otp = ref('')
const step = ref<'email' | 'otp'>('email')
const loading = ref(false)
const message = ref('')

async function sendOtp() {
  loading.value = true
  message.value = ''
  const { error } = await supabase.auth.signInWithOtp({ email: email.value.trim() })
  loading.value = false
  if (error) {
    message.value = error.message
    return
  }
  step.value = 'otp'
  message.value = 'Check your email for the code.'
}

async function verifyOtp() {
  loading.value = true
  const { error } = await supabase.auth.verifyOtp({
    email: email.value.trim(),
    token: otp.value.trim(),
    type: 'email',
  })
  loading.value = false
  if (error) {
    message.value = error.message
    return
  }
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  await navigateTo(redirect)
}
</script>

<template>
  <div class="container" style="max-width:420px; padding-top:80px;">
    <div class="stack" style="background:#121212; padding:20px; border-radius:12px;">
      <h1>Sign in</h1>
      <template v-if="step === 'email'">
        <input v-model="email" class="input" type="email" placeholder="Email" @keyup.enter="sendOtp">
        <button class="btn" :disabled="loading || !email" @click="sendOtp">Send code</button>
      </template>
      <template v-else>
        <input v-model="otp" class="input" placeholder="OTP" @keyup.enter="verifyOtp">
        <button class="btn" :disabled="loading || !otp" @click="verifyOtp">Verify</button>
      </template>
      <p class="muted">{{ message }}</p>
      <NuxtLink to="/" class="muted">Back home</NuxtLink>
    </div>
  </div>
</template>
