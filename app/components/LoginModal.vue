<script setup lang="ts">
const client = useSupabaseClient()
const { t } = useI18n()
const { open, hideLogin, redirect } = useLoginModal()
const step = ref<'menu' | 'email' | 'otp'>('menu')
const email = ref('')
const otp = ref('')
const loading = ref(false)
const message = ref('')
const clientSource = 'pc'

watch(open, (v) => {
  if (v) {
    step.value = 'menu'
    message.value = ''
  }
})

async function sendOtp() {
  loading.value = true
  message.value = ''
  const { error } = await client.auth.signInWithOtp({
    email: email.value.trim(),
    options: {
      data: { client_source: clientSource, is_customer: true },
    },
  })
  loading.value = false
  if (error) {
    message.value = error.message
    return
  }
  step.value = 'otp'
  message.value = 'OTP sent'
}

async function verifyOtp() {
  loading.value = true
  const { error } = await client.auth.verifyOtp({
    email: email.value.trim(),
    token: otp.value.trim(),
    type: 'email',
  })
  loading.value = false
  if (error) {
    message.value = error.message
    return
  }
  // ensure client_source for existing users
  const user = useSupabaseUser()
  if (user.value) {
    await client.from('profiles').update({
      client_source: clientSource,
      is_customer: true,
    }).eq('id', user.value.id).is('client_source', null)
  }
  hideLogin()
  await navigateTo(redirect.value || '/')
}
</script>

<template>
  <div v-if="open" class="modal-mask" @click.self="hideLogin">
    <div class="modal">
      <div class="modal-art">
        <div style="text-align:center;">
          <div class="mark">R</div>
          <div style="margin-top:12px; font-weight:800; letter-spacing:.08em;">ReelKit</div>
        </div>
      </div>
      <div class="modal-body">
        <div class="row" style="display:flex; justify-content:space-between; align-items:center;">
          <h2 style="margin:0;">{{ t('signIn') }} ReelKit</h2>
          <button class="btn secondary" @click="hideLogin">×</button>
        </div>

        <template v-if="step === 'menu'">
          <button class="social" disabled>Google</button>
          <button class="social" disabled>Facebook</button>
          <button class="social" disabled>Apple</button>
          <button class="social" disabled>TikTok</button>
          <div class="divider"><span>{{ t('or') }}</span></div>
          <button class="btn" @click="step = 'email'">✉ {{ t('emailLogin') }}</button>
          <p class="muted" style="font-size:12px;">{{ t('continueAgree') }}</p>
        </template>

        <template v-else-if="step === 'email'">
          <input v-model="email" class="input" type="email" placeholder="Email" @keyup.enter="sendOtp">
          <button class="btn" :disabled="loading || !email" @click="sendOtp">{{ t('sendCode') }}</button>
          <button class="btn secondary" @click="step = 'menu'">←</button>
        </template>

        <template v-else>
          <input v-model="otp" class="input" placeholder="OTP" @keyup.enter="verifyOtp">
          <button class="btn" :disabled="loading || !otp" @click="verifyOtp">{{ t('verify') }}</button>
          <button class="btn secondary" @click="step = 'email'">←</button>
        </template>
        <p v-if="message" class="muted">{{ message }}</p>
      </div>
    </div>
  </div>
</template>
