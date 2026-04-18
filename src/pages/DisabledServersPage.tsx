import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import serverDisabledImage from '../assets/server-disabled.png'
import { IconInfo, IconRefreshCcw, IconSearch } from '../components/icons'
import { LoadingPage, LoadingSpinner } from '../components/LoadingSpinner'
import { normalizeCountryLabel } from '../utils/countryLabel'
import API_BASE from '../config/api'

interface ServidorResumo {
  id?: string | number
  nome: string
  pais: string
  continente: string
  status?: string | boolean | null
  create_at?: string | null
  disabled_at?: string | null
  reactivated_at?: string | null
}

const COUNTRY_ISO2_BY_NAME: Record<string, string> = {
  brasil: 'BR',
  argentina: 'AR',
  colombia: 'CO',
  peru: 'PE',
  chile: 'CL',
  'estados unidos': 'US',
  canada: 'CA',
  mexico: 'MX',
  'costa rica': 'CR',
  panama: 'PA',
  alemanha: 'DE',
  franca: 'FR',
  'reino unido': 'GB',
  italia: 'IT',
  espanha: 'ES',
  portugal: 'PT',
  china: 'CN',
  india: 'IN',
  japao: 'JP',
  nigeria: 'NG',
  egito: 'EG',
  'africa do sul': 'ZA',
  australia: 'AU',
  'nova zelandia': 'NZ',
}

function normalizeName(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

function getCountryIso2(countryName: string): string {
  return (COUNTRY_ISO2_BY_NAME[normalizeName(countryName)] ?? '').toUpperCase()
}

function getFlagImageUrl(iso2: string): string {
  return `https://flagcdn.com/w40/${iso2.toLowerCase()}.png`
}

function isServidorAtivo(status?: string | boolean | null): boolean {
  if (typeof status === 'boolean') return status
  if (typeof status === 'string') {
    const normalized = status.trim().toLowerCase()
    return normalized === 'ativo' || normalized === 'active' || normalized === 'true'
  }
  return true
}

function toIsoString(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function DisabledServersPage() {
  const [servidores, setServidores] = useState<ServidorResumo[]>([])
  const [loading, setLoading] = useState(true)
  const [reativarTarget, setReativarTarget] = useState<ServidorResumo | null>(null)
  const [infoTarget, setInfoTarget] = useState<ServidorResumo | null>(null)
  const [reativarVisible, setReativarVisible] = useState(false)
  const [infoVisible, setInfoVisible] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!reativarTarget) return
    const raf = requestAnimationFrame(() => setReativarVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [reativarTarget])

  useEffect(() => {
    if (!infoTarget) return
    const raf = requestAnimationFrame(() => setInfoVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [infoTarget])

  function closeReativarModal() {
    setReativarVisible(false)
    window.setTimeout(() => setReativarTarget(null), 360)
  }

  function closeInfoModal() {
    setInfoVisible(false)
    window.setTimeout(() => setInfoTarget(null), 360)
  }

  const loadServidores = useCallback(async () => {
    setLoading(true)
    setFeedbackError(null)
    try {
      const response = await fetch(`${API_BASE}/servidores/`)
      if (!response.ok) {
        setServidores([])
        return
      }

      const data = await response.json()
      if (!Array.isArray(data)) {
        setServidores([])
        return
      }

      const normalized = data
        .map((item): ServidorResumo | null => {
          if (!item || typeof item !== 'object') return null
          const record = item as Record<string, unknown>
          const nome = typeof record.nome === 'string' ? record.nome : ''
          const pais = typeof record.pais === 'string' ? normalizeCountryLabel(record.pais) : ''
          const continente = typeof record.continente === 'string' ? record.continente : ''
          if (!nome || !pais || !continente) return null
          return {
            id: (typeof record.id === 'string' || typeof record.id === 'number') ? record.id : nome,
            nome,
            pais,
            continente,
            status: (typeof record.status === 'string' || typeof record.status === 'boolean') ? record.status : null,
            create_at: toIsoString(record.create_at),
            disabled_at: toIsoString(record.disabled_at),
            reactivated_at: toIsoString(record.reactivated_at),
          }
        })
        .filter((server): server is ServidorResumo => server !== null)

      setServidores(normalized.filter(server => !isServidorAtivo(server.status)))
    } catch {
      setServidores([])
      setFeedbackError('Não foi possível carregar os servidores desativados.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadServidores()
  }, [loadServidores])

  useEffect(() => {
    if (!searchExpanded) return
    const id = window.setTimeout(() => searchInputRef.current?.focus(), 60)
    return () => window.clearTimeout(id)
  }, [searchExpanded])

  async function handleConfirmReativar() {
    if (!reativarTarget || reativarTarget.id == null || statusLoading) return

    setStatusLoading(true)
    setFeedbackError(null)
    try {
      const response = await fetch(`${API_BASE}/servidores/${reativarTarget.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: true }),
      })

      if (!response.ok) {
        setFeedbackError(`Não foi possível reativar ${reativarTarget.nome}.`)
        return
      }

      closeReativarModal()
      await loadServidores()
    } catch {
      setFeedbackError(`Erro de conexão ao reativar ${reativarTarget.nome}.`)
    } finally {
      setStatusLoading(false)
    }
  }

  const hasServers = useMemo(() => servidores.length > 0, [servidores])
  const filteredServers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return servidores
    return servidores.filter((servidor) => {
      const byNome = servidor.nome.toLowerCase().includes(term)
      const byPais = servidor.pais.toLowerCase().includes(term)
      const byContinente = servidor.continente.toLowerCase().includes(term)
      return byNome || byPais || byContinente
    })
  }, [servidores, searchTerm])
  const hasFilteredServers = filteredServers.length > 0

  return (
    <div className="flex flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:p-14">
      <div className="mb-6 flex items-start justify-between gap-4 sm:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[--color-text-primary]">Servidores Desativados</h1>
          <p className="mt-1 text-sm text-[--color-text-secondary]">Servidores inativos fora de operação.</p>
        </div>

        <div className="flex shrink-0 items-center justify-end">
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar servidor"
            className={[
              'rounded-xl border border-[--color-border] bg-[--color-main-bg] px-3 py-2 text-xs text-[--color-text-primary] outline-none transition-all duration-300 ease-out placeholder:text-[--color-text-secondary] focus:border-[--color-accent]',
              searchExpanded ? 'mr-2 w-auto max-w-[120px] opacity-100 sm:max-w-[200px] xl:max-w-[256px]' : 'w-0 px-0 py-0 opacity-0 pointer-events-none border-transparent',
            ].join(' ')}
          />
          <button
            type="button"
            onClick={() => {
              if (searchExpanded && searchTerm.trim().length === 0) {
                setSearchExpanded(false)
                return
              }
              setSearchExpanded(true)
            }}
            className="group flex h-10 w-10 items-center justify-center rounded-xl border border-[--color-border] bg-[--color-main-bg] text-[--color-text-secondary] transition-all duration-200 hover:-translate-y-0.5 hover:border-[--color-accent]/50 hover:text-[--color-accent]"
            aria-label="Pesquisar servidores"
            title="Pesquisar servidores"
          >
            <IconSearch className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingPage />
      ) : !hasServers ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[--color-border] bg-[--color-card-bg]">
          <p className="text-sm text-[--color-text-secondary]">Nenhum servidor desativado encontrado.</p>
        </div>
      ) : !hasFilteredServers ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[--color-border] bg-[--color-card-bg]">
          <p className="text-sm text-[--color-text-secondary]">Nenhum servidor encontrado para a pesquisa.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-8 xl:grid-cols-3">
          {filteredServers.map(servidor => {
            const paisIso2 = getCountryIso2(servidor.pais)
            return (
              <article
                key={String(servidor.id ?? servidor.nome)}
                className="relative mx-auto w-full max-w-[280px] sm:max-w-[320px] rounded-[28px] border-2 border-[--color-border] bg-[--color-card-bg] px-5 pb-5 pt-5 opacity-80 saturate-75 sm:aspect-square sm:px-6 sm:pb-6 sm:pt-6"
              >
                <div className="absolute left-4 top-4 flex flex-col gap-3">
                  <button
                    type="button"
                    className="group flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[--color-border] bg-[--color-main-bg] text-emerald-400 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-105 hover:border-emerald-500/60 hover:bg-emerald-500/10 active:translate-y-0 active:scale-95"
                    aria-label="Reativar servidor"
                    onClick={() => {
                      if (window.matchMedia('(max-width: 1024px)').matches) {
                        window.dispatchEvent(new Event('oracle-pim:sidebar-close'))
                      }
                      setReativarTarget(servidor)
                    }}
                  >
                    <IconRefreshCcw className="h-5 w-5 transition-transform duration-200 ease-out group-hover:rotate-[-25deg]" />
                  </button>

                  <button
                    type="button"
                    className="group flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[--color-border] bg-[--color-main-bg] text-[--color-text-primary] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-105 hover:border-[--color-accent]/50 hover:text-[--color-accent] active:translate-y-0 active:scale-95"
                    aria-label="Informações do servidor"
                    onClick={() => {
                      if (window.matchMedia('(max-width: 1024px)').matches) {
                        window.dispatchEvent(new Event('oracle-pim:sidebar-close'))
                      }
                      setInfoTarget(servidor)
                    }}
                  >
                    <IconInfo className="h-5 w-5 transition-transform duration-200 ease-out group-hover:scale-110" />
                  </button>
                </div>

                <div className="mx-auto w-[116px] pt-2 sm:w-[130px] sm:pt-3">
                  <img src={serverDisabledImage} alt="Servidor desativado" className="h-auto w-full object-contain" />
                </div>

                <div className="mt-3 text-center sm:mt-4">
                  <p className="text-[1.25rem] font-semibold leading-tight text-[--color-text-primary] sm:text-lg">{servidor.nome}</p>
                  <p className="mt-1 flex max-w-full flex-wrap items-center justify-center gap-2 px-3 text-center text-[0.83rem] text-[--color-text-secondary] sm:text-[15px]">
                    {paisIso2 ? (
                      <img
                        src={getFlagImageUrl(paisIso2)}
                        alt={`Bandeira de ${servidor.pais}`}
                        className="h-4 w-6 shrink-0 rounded-[2px] object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="shrink-0">🏳️</span>
                    )}
                    <span className="max-w-full break-words">{servidor.pais}</span>
                  </p>
                  <p className="mt-1 text-[0.83rem] text-[--color-text-secondary] sm:text-[15px]">{servidor.continente}</p>
                </div>

                <div className="mt-4 flex justify-center sm:mt-5">
                  <span className="inline-flex min-w-28 justify-center rounded-full border border-red-500/70 bg-red-500/10 px-4 py-1.5 text-base font-semibold capitalize text-red-400 sm:min-w-32">
                    inativo
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {feedbackError && (
        <div className="mt-5 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {feedbackError}
        </div>
      )}

      {reativarTarget && (
        <div
          className={[
            'fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-350 ease-out',
            reativarVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
          ].join(' ')}
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar reativação"
        >
          <div
            className={[
              'absolute inset-0 bg-black/65 backdrop-blur-sm transition-opacity duration-350 ease-out',
              reativarVisible ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
            onClick={closeReativarModal}
            aria-hidden="true"
          />

          <div
            className={[
              'relative w-full max-w-md rounded-2xl border border-[--color-border] p-6 shadow-2xl transition-all duration-350 ease-out',
              reativarVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-5 scale-95',
            ].join(' ')}
            style={{ backgroundColor: 'var(--color-sidebar-bg)' }}
          >
            <div className="mb-1 flex items-center gap-2">
              <IconRefreshCcw className="h-5 w-5 text-emerald-400" />
              <h3 className="text-base font-semibold text-[--color-text-primary]">Reativar servidor?</h3>
            </div>

            <p className="mb-5 text-sm text-[--color-text-secondary]">
              O servidor <span className="font-medium text-[--color-text-primary]">{reativarTarget.nome}</span> voltará para a lista de ativos.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeReativarModal}
                disabled={statusLoading}
                className="flex-1 rounded-xl border border-[--color-border] bg-[--color-main-bg] py-2 text-sm font-medium text-[--color-text-secondary] transition-colors hover:text-[--color-text-primary] hover:border-[--color-text-secondary]/40 disabled:opacity-60"
              >
                Não
              </button>
              <button
                type="button"
                onClick={handleConfirmReativar}
                disabled={statusLoading}
                className="flex-1 rounded-full border border-emerald-500/70 bg-emerald-500/10 px-8 py-2.5 text-sm font-semibold text-emerald-400 transition-all duration-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {statusLoading ? <span className="inline-flex items-center justify-center gap-2"><LoadingSpinner size="sm" color="emerald" />Reativando...</span> : 'Sim, reativar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {infoTarget && (
        <div
          className={[
            'fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-350 ease-out',
            infoVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
          ].join(' ')}
          role="dialog"
          aria-modal="true"
          aria-label="Informações do servidor"
        >
          <div
            className={[
              'absolute inset-0 bg-black/65 backdrop-blur-sm transition-opacity duration-350 ease-out',
              infoVisible ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
            onClick={closeInfoModal}
            aria-hidden="true"
          />

          <div
            className={[
              'relative w-full max-w-md rounded-2xl border border-[--color-border] p-6 shadow-2xl transition-all duration-350 ease-out',
              infoVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-5 scale-95',
            ].join(' ')}
            style={{ backgroundColor: 'var(--color-sidebar-bg)' }}
          >
            <div className="mb-1 flex items-center gap-2">
              <IconInfo className="h-5 w-5 text-[--color-accent]" />
              <h3 className="text-base font-semibold text-[--color-text-primary]">Detalhes do servidor</h3>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <p className="text-[--color-text-secondary]">Nome: <span className="font-medium text-[--color-text-primary]">{infoTarget.nome}</span></p>
              <p className="text-[--color-text-secondary]">País: <span className="font-medium text-[--color-text-primary]">{infoTarget.pais}</span></p>
              <p className="text-[--color-text-secondary]">Continente: <span className="font-medium text-[--color-text-primary]">{infoTarget.continente}</span></p>
              <p className="text-[--color-text-secondary]">Status: <span className="font-semibold text-red-400">Inativo</span></p>
              <p className="text-[--color-text-secondary]">Criado em: <span className="font-medium text-[--color-text-primary]">{formatDateTime(infoTarget.create_at)}</span></p>
              <p className="text-[--color-text-secondary]">Desativado em: <span className="font-medium text-[--color-text-primary]">{formatDateTime(infoTarget.disabled_at)}</span></p>
              <p className="text-[--color-text-secondary]">Reativado em: <span className="font-medium text-[--color-text-primary]">{formatDateTime(infoTarget.reactivated_at)}</span></p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={closeInfoModal}
                className="rounded-xl border border-[#f97316]/70 bg-[#f97316]/12 px-4 py-2 text-sm font-semibold text-[#f97316] transition-all duration-200 hover:bg-[#f97316]/20 hover:scale-[1.02] active:scale-95"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
