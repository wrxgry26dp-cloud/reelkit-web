export function useLoginModal() {
  const open = useState('loginModalOpen', () => false)
  const redirect = useState<string>('loginModalRedirect', () => '/')
  function showLogin(to = '/') {
    redirect.value = to
    open.value = true
  }
  function hideLogin() {
    open.value = false
  }
  return { open, redirect, showLogin, hideLogin }
}
