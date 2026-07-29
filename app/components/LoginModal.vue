<script setup lang="ts">
const client = useSupabaseClient()
const { t } = useI18n()
const { open, hideLogin, redirect } = useLoginModal()
const step = ref<'menu' | 'email' | 'otp'>('menu')
const email = ref('')
const loading = ref(false)
const message = ref('')
const clientSource = 'pc'

// Same as shopping-web: Auth email {{ .Token }} is 8 digits on this project
const OTP_LENGTH = 8
const digits = ref(Array.from({ length: OTP_LENGTH }, () => ''))
const inputRefs = ref<Array<HTMLInputElement | null>>([])
const cooldown = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const codeComplete = computed(() => digits.value.every(d => d.length === 1))
const token = computed(() => digits.value.join(''))

watch(open, (v) => {
  if (v) {
    step.value = 'menu'
    message.value = ''
    email.value = ''
    resetDigits()
    stopCooldown()
  }
})

onBeforeUnmount(stopCooldown)

function setInputRef(el: Element | ComponentPublicInstance | null, index: number) {
  inputRefs.value[index] = el as HTMLInputElement | null
}

function resetDigits() {
  digits.value = Array.from({ length: OTP_LENGTH }, () => '')
}

function startCooldown() {
  cooldown.value = 30
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0) stopCooldown()
  }, 1000)
}

function stopCooldown() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  cooldown.value = 0
}

async function sendOtp(isResend = false) {
  if (loading.value) return
  if (isResend && cooldown.value > 0) return
  loading.value = true
  message.value = ''
  const { error } = await client.auth.signInWithOtp({
    email: email.value.trim(),
    options: {
      shouldCreateUser: true,
      data: { client_source: clientSource, is_customer: true },
    },
  })
  loading.value = false
  if (error) {
    message.value = error.message
    return
  }
  step.value = 'otp'
  resetDigits()
  startCooldown()
  message.value = t('otpSent')
  await nextTick()
  inputRefs.value[0]?.focus()
}

function onInput(index: number) {
  const value = digits.value[index].replace(/\D/g, '').slice(-1)
  digits.value[index] = value
  message.value = ''
  if (value && index < digits.value.length - 1) {
    inputRefs.value[index + 1]?.focus()
  }
  if (codeComplete.value) verifyOtp()
}

function onKeydown(event: KeyboardEvent, index: number) {
  if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
    inputRefs.value[index - 1]?.focus()
  }
}

function onPaste(event: ClipboardEvent) {
  const text = event.clipboardData?.getData('text')?.replace(/\D/g, '').slice(0, OTP_LENGTH) || ''
  if (!text) return
  digits.value = Array.from({ length: OTP_LENGTH }, (_, i) => text[i] || '')
  if (codeComplete.value) verifyOtp()
}

async function verifyOtp() {
  if (!codeComplete.value || loading.value) return
  loading.value = true
  message.value = ''
  const { error } = await client.auth.verifyOtp({
    email: email.value.trim(),
    token: token.value,
    type: 'email',
  })
  if (error) {
    loading.value = false
    message.value = t('incorrectCode')
    return
  }
  await client.auth.getSession()
  const user = useSupabaseUser()
  if (user.value) {
    await client.from('profiles').update({
      client_source: clientSource,
      is_customer: true,
    }).eq('id', user.value.id).is('client_source', null)
  }
  loading.value = false
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
          <button class="btn" @click="step = 'email'">{{ t('emailLogin') }}</button>
          <p class="muted" style="font-size:12px;">{{ t('continueAgree') }}</p>
        </template>

        <template v-else-if="step === 'email'">
          <input v-model="email" class="input" type="email" placeholder="Email" @keyup.enter="sendOtp(false)">
          <button class="btn" :disabled="loading || !email" @click="sendOtp(false)">
            {{ loading ? '...' : t('sendCode') }}
          </button>
          <button class="btn secondary" @click="step = 'menu'">{{ t('back') }}</button>
        </template>

        <template v-else>
          <p class="muted" style="margin:0; font-size:13px; line-height:1.45;">
            {{ t('otpHint') }} <strong>{{ email }}</strong>
          </p>
          <p class="muted" style="margin:0; font-size:12px;">{{ t('securityCode') }}</p>
          <div class="otp-row" @paste.prevent="onPaste">
            <input
              v-for="(_, index) in digits"
              :key="index"
              :ref="(el) => setInputRef(el, index)"
              v-model="digits[index]"
              class="otp-box"
              inputmode="numeric"
              maxlength="1"
              autocomplete="one-time-code"
              :disabled="loading"
              @input="onInput(index)"
              @keydown="onKeydown($event, index)"
            >
          </div>
          <button class="btn" :disabled="loading || !codeComplete" @click="verifyOtp">
            {{ loading ? '...' : t('verify') }}
          </button>
          <p class="muted" style="margin:0; font-size:13px; text-align:center;">
            {{ t('noCode') }}
            <button
              class="link-btn"
              type="button"
              :disabled="cooldown > 0 || loading"
              @click="sendOtp(true)"
            >
              {{ cooldown > 0 ? t('retryIn', { n: cooldown }) : t('resend') }}
            </button>
          </p>
          <button class="btn secondary" @click="step = 'email'">{{ t('back') }}</button>
        </template>
        <p v-if="message" class="muted">{{ message }}</p>
      </div>
    </div>
  </div>
</template>
