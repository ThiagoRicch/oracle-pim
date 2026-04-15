const AUTH_KEY = 'oracle-pim:auth'
const AUTH_EXPIRES_AT_KEY = 'oracle-pim:auth-expires-at'

// 1 hora
const AUTH_TTL_MS = 60 * 60 * 1000

export function setAuthenticated(): void {
  localStorage.setItem(AUTH_KEY, 'true')
  localStorage.setItem(AUTH_EXPIRES_AT_KEY, String(Date.now() + AUTH_TTL_MS))
}

export function clearAuthentication(): void {
  localStorage.removeItem(AUTH_KEY)
  localStorage.removeItem(AUTH_EXPIRES_AT_KEY)
}

export function getAuthExpiryMs(): number | null {
  const raw = localStorage.getItem(AUTH_EXPIRES_AT_KEY)
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

export function isAuthenticated(): boolean {
  const isAuth = localStorage.getItem(AUTH_KEY) === 'true'
  if (!isAuth) return false

  // Migra sessões antigas sem expiração para a nova regra de TTL.
  const expiry = getAuthExpiryMs()
  if (expiry === null) {
    localStorage.setItem(AUTH_EXPIRES_AT_KEY, String(Date.now() + AUTH_TTL_MS))
    return true
  }

  if (Date.now() >= expiry) {
    clearAuthentication()
    return false
  }

  return true
}
