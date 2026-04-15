import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import oracleLogo from '../assets/oracle.png'
import { setAuthenticated } from '../utils/auth'
import API_BASE from '../config/api'

function EyeOnIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export function LoginPage() {
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { theme } = useTheme()

  const inputStyle = theme === 'dark'
    ? {
        backgroundColor: 'var(--color-main-bg)',
        color: '#ffffff',
        WebkitTextFillColor: '#ffffff',
        boxShadow: 'inset 0 0 0 1000px var(--color-main-bg)',
        WebkitBoxShadow: 'inset 0 0 0 1000px var(--color-main-bg)',
      }
    : {
        backgroundColor: '#ffffff',
        color: '#111827',
        WebkitTextFillColor: '#111827',
        boxShadow: 'inset 0 0 0 1000px #ffffff',
        WebkitBoxShadow: 'inset 0 0 0 1000px #ffffff',
      }

  const buttonStyle = {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
    color: '#ffffff',
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmedPassword = senha.trim()

    if (!trimmedPassword) {
      setError('Digite a senha para entrar.')
      return
    }

    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha: trimmedPassword }),
      })
      const data: { autenticado: boolean } = await res.json()

      if (data.autenticado) {
        setAuthenticated()
        navigate('/')
      } else {
        setError('Senha incorreta. Tente novamente.')
      }
    } catch {
      setError('Não foi possível conectar ao servidor. Verifique se a API está rodando.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-svh w-screen items-center justify-center bg-[--color-main-bg] px-4 py-6 sm:px-6">
      <div className="w-full max-w-md rounded-2xl border border-[--color-border] bg-[--color-card-bg] p-6 shadow-xl sm:p-10 md:p-12">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-4 sm:mb-10 sm:gap-5">
          <img src={oracleLogo} alt="Oracle" className="h-24 object-contain sm:h-28" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="senha"
              className="text-sm font-medium text-[--color-text-secondary]"
            >
              Senha
            </label>
            <div className="relative">
              <input
                id="senha"
                type={showPassword ? 'text' : 'password'}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                onInput={e => setSenha((e.target as HTMLInputElement).value)}
                placeholder="Digite a senha de acesso"
                required
                autoComplete="current-password"
                style={inputStyle}
                className={[
                  'w-full rounded-xl border pr-12 px-4 py-3.5 text-base outline-none',
                  'placeholder:text-[--color-text-secondary]/50',
                  'transition-colors focus:border-[--color-accent] focus:ring-1 focus:ring-[--color-accent]',
                  error ? 'border-red-500' : 'border-[--color-border]',
                ].join(' ')}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(p => !p)}
                className="absolute inset-y-0 right-4 flex items-center text-[#f97316] transition-opacity hover:opacity-75"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeOnIcon />}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={buttonStyle}
            className={[
              'mt-2 self-center rounded-xl border px-8 py-3 text-base font-semibold text-white sm:min-w-56',
              'transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent] focus-visible:ring-offset-2',
              loading ? 'cursor-not-allowed opacity-50' : 'hover:opacity-90',
            ].join(' ')}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
