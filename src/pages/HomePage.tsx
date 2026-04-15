import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconServer, IconMap, IconDashboard, IconPencil, IconPin, IconPlus, IconEye, IconSearch } from '../components/icons'
import { EditServerModal, type ServidorParaEditar } from '../components/EditServerModal'
import { AddFileModal } from '../components/AddFileModal'
import { ServerDataModal } from '../components/ServerDataModal'
import { LoadingPage } from '../components/LoadingSpinner'
import oracleLogo from '../assets/oracle.png'
import serverActiveImage from '../assets/server-active.png'
import { normalizeCountryLabel } from '../utils/countryLabel'
import API_BASE from '../config/api'

const QUICK_LINKS = [
  {
    label: 'Criar Servidor',
    description: 'Adicione um novo servidor em qualquer país disponível.',
    icon: <IconServer className="h-8 w-8" />,
    path: '/criar-servidor',
  },
  {
    label: 'Mapa Global',
    description: 'Visualize todos os servidores distribuídos no mundo.',
    icon: <IconMap className="h-8 w-8" />,
    path: '/mapa',
  },
  {
    label: 'Dashboard',
    description: 'Monitore capacidade e status de todos os servidores.',
    icon: <IconDashboard className="h-8 w-8" />,
    path: '/dashboard',
  },
]

interface ServidorResumo {
  id?: string | number
  nome: string
  pais: string
  continente: string
  cidade?: string
  latitude?: number
  longitude?: number
  status?: string | boolean | null
  capacidade_atual?: number
  capacidade_total?: number
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
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function getCountryIso2(countryName: string): string {
  return (COUNTRY_ISO2_BY_NAME[normalizeName(countryName)] ?? '').toUpperCase()
}

function getFlagImageUrl(iso2: string): string {
  return `https://flagcdn.com/w40/${iso2.toLowerCase()}.png`
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

function isServidorAtivo(status?: string | boolean | null): boolean {
  if (typeof status === 'boolean') return status
  if (typeof status === 'string') {
    const normalized = status.trim().toLowerCase()
    return normalized === 'ativo' || normalized === 'active' || normalized === 'true'
  }
  return true
}

export function HomePage() {
  const navigate = useNavigate()
  const [servidores, setServidores] = useState<ServidorResumo[]>([])
  const [loading, setLoading] = useState(true)
  const [editingServidor, setEditingServidor] = useState<ServidorParaEditar | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [infoServidor, setInfoServidor] = useState<ServidorResumo | null>(null)
  const [addFileServidor, setAddFileServidor] = useState<ServidorResumo | null>(null)
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [updatedServerId, setUpdatedServerId] = useState<string | number | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const loadServidores = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/servidores/`)
      if (!response.ok) { setServidores([]); return }
      const data = await response.json()
      if (!Array.isArray(data)) { setServidores([]); return }
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
            nome, pais, continente,
            cidade: typeof record.cidade === 'string' ? record.cidade : undefined,
            latitude: toNumber(record.latitude) ?? toNumber(record.lat),
            longitude: toNumber(record.longitude) ?? toNumber(record.lng),
            status: (typeof record.status === 'string' || typeof record.status === 'boolean') ? record.status : null,
            capacidade_atual: typeof record.capacidade_atual === 'number' ? record.capacidade_atual : 0,
            capacidade_total: typeof record.capacidade_total === 'number' ? record.capacidade_total : 4096,
          }
        })
        .filter((s): s is ServidorResumo => s !== null)
      setServidores(normalized.filter(s => isServidorAtivo(s.status)))
    } catch {
      setServidores([])
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

  const hasServidores = useMemo(() => servidores.length > 0, [servidores])

  const servidoresDisponiveis = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const filtered = !term
      ? servidores
      : servidores.filter((servidor) => {
          const byNome = servidor.nome.toLowerCase().includes(term)
          const byPais = servidor.pais.toLowerCase().includes(term)
          const byContinente = servidor.continente.toLowerCase().includes(term)
          return byNome || byPais || byContinente
        })

    if (updatedServerId == null) return filtered

    return [...filtered].sort((a, b) => {
      const aIsUpdated = String(a.id ?? '') === String(updatedServerId)
      const bIsUpdated = String(b.id ?? '') === String(updatedServerId)
      if (aIsUpdated && !bIsUpdated) return -1
      if (!aIsUpdated && bIsUpdated) return 1
      return 0
    })
  }, [servidores, searchTerm, updatedServerId])

  if (loading) {
    return <LoadingPage />
  }

  if (hasServidores) {
    return (
      <div className="flex flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:p-14">
        <div className="mb-6 flex items-start justify-between gap-4 sm:mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[--color-text-primary]">Servidores Disponiveis</h1>
            <p className="mt-1 text-sm text-[--color-text-secondary]">Servidores ativos prontos para operacao.</p>
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

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-8 xl:grid-cols-3">
          {servidoresDisponiveis.map(servidor => {
            const ativo = isServidorAtivo(servidor.status)
            const paisIso2 = getCountryIso2(servidor.pais)
            return (
              <article
                key={String(servidor.id ?? servidor.nome)}
                className="relative mx-auto w-full max-w-[280px] sm:max-w-[320px] rounded-[28px] border-2 border-[--color-border] bg-[--color-card-bg] px-5 pb-5 pt-5 sm:aspect-square sm:px-6 sm:pb-6 sm:pt-6"
              >
                <div className="absolute left-4 top-4 flex flex-col gap-3">
                  <button
                    type="button"
                    className="group flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[--color-border] bg-[--color-main-bg] text-[--color-text-primary] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-105 hover:border-[--color-accent]/50 hover:text-[--color-accent] active:translate-y-0 active:scale-95"
                    aria-label="Editar servidor"
                    onClick={() => {
                      if (servidor.id == null) return
                      if (window.matchMedia('(max-width: 1024px)').matches) {
                        window.dispatchEvent(new Event('oracle-pim:sidebar-close'))
                      }
                      setEditingServidor({
                        id: servidor.id,
                        nome: servidor.nome,
                        pais: servidor.pais,
                        cidade: servidor.cidade,
                        continente: servidor.continente,
                        status: servidor.status,
                      })
                      setEditModalOpen(true)
                    }}
                  >
                    <IconPencil className="h-5 w-5 transition-transform duration-200 ease-out group-hover:rotate-[-8deg]" />
                  </button>
                  <button
                    type="button"
                    className="group flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[--color-border] bg-[--color-main-bg] text-[--color-text-primary] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-105 hover:border-[--color-accent]/50 hover:text-[--color-accent] active:translate-y-0 active:scale-95"
                    aria-label="Fixar servidor no mapa"
                    onClick={() => {
                      navigate('/mapa', {
                        state: {
                          focusServer: {
                            id: servidor.id,
                            nome: servidor.nome,
                            latitude: servidor.latitude,
                            longitude: servidor.longitude,
                          },
                        },
                      })
                    }}
                  >
                    <IconPin className="h-5 w-5 transition-transform duration-200 ease-out group-hover:-translate-y-0.5" />
                  </button>
                  <button
                    type="button"
                    className="group flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[--color-border] bg-[--color-main-bg] text-[--color-text-primary] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-105 hover:border-[--color-accent]/50 hover:text-[--color-accent] active:translate-y-0 active:scale-95"
                    aria-label="Adicionar"
                    onClick={() => {
                      if (window.matchMedia('(max-width: 1024px)').matches) {
                        window.dispatchEvent(new Event('oracle-pim:sidebar-close'))
                      }
                      setAddFileServidor(servidor)
                    }}
                  >
                    <IconPlus className="h-5 w-5 transition-transform duration-200 ease-out group-hover:rotate-90" />
                  </button>
                  <button
                    type="button"
                    className="group flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[--color-border] bg-[--color-main-bg] text-[--color-text-primary] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-105 hover:border-[--color-accent]/50 hover:text-[--color-accent] active:translate-y-0 active:scale-95"
                    aria-label="Detalhes do servidor"
                    onClick={() => {
                      if (window.matchMedia('(max-width: 1024px)').matches) {
                        window.dispatchEvent(new Event('oracle-pim:sidebar-close'))
                      }
                      setInfoServidor(servidor)
                    }}
                  >
                    <IconEye className="h-5 w-5 transition-transform duration-200 ease-out group-hover:scale-110" />
                  </button>
                </div>

                <div className="mx-auto w-[116px] pt-2 sm:w-[130px] sm:pt-3">
                  <img src={serverActiveImage} alt="Servidor ativo" className="h-auto w-full object-contain" />
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
                  <span
                    className={[
                      'inline-flex min-w-28 justify-center rounded-full border px-4 py-1.5 text-base font-semibold capitalize sm:min-w-32',
                      ativo
                        ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-400'
                        : 'border-red-500/70 bg-red-500/10 text-red-400',
                    ].join(' ')}
                  >
                    {ativo ? 'ativo' : 'inativo'}
                  </span>
                </div>
              </article>
            )
          })}
        </div>

        <EditServerModal
          servidor={editingServidor}
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSuccess={() => {
            if (editingServidor?.id != null) {
              setUpdatedServerId(editingServidor.id)
            }
            loadServidores()
          }}
        />

        <AddFileModal
          servidor={
            addFileServidor?.id != null
              ? { id: addFileServidor.id, nome: addFileServidor.nome }
              : null
          }
          isOpen={addFileServidor !== null}
          onClose={() => setAddFileServidor(null)}
          onSuccess={() => {
            if (addFileServidor?.id != null) {
              setUpdatedServerId(addFileServidor.id)
            }
            loadServidores()
          }}
        />

        <ServerDataModal
          servidor={
            infoServidor?.id != null
              ? {
                  id: infoServidor.id,
                  nome: infoServidor.nome,
                  pais: infoServidor.pais,
                  status: infoServidor.status,
                  capacidade_atual: infoServidor.capacidade_atual,
                  capacidade_total: infoServidor.capacidade_total,
                }
              : null
          }
          isOpen={infoServidor !== null}
          onClose={() => setInfoServidor(null)}
          onChanged={() => {
            if (infoServidor?.id != null) {
              setUpdatedServerId(infoServidor.id)
            }
            loadServidores()
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:p-14">
      {/* Hero */}
      <div className="mb-10 sm:mb-14">
        <img src={oracleLogo} alt="Oracle" className="mb-6 h-24 object-contain sm:h-28" />
        <p className="text-xl text-[--color-text-secondary]">
          Sistema de gerenciamento de servidores distribuídos globalmente.
        </p>
      </div>

      {/* Quick access */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_LINKS.map(link => (
          <Link
            key={link.path}
            to={link.path}
            className={[
              'group flex flex-col gap-5 rounded-2xl border border-[--color-border]',
              'bg-[--color-card-bg] p-9 transition-colors duration-150',
              'hover:border-[--color-accent]/50 hover:bg-[--color-sidebar-hover]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]',
            ].join(' ')}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[--color-accent]/10 text-[--color-accent]">
              {link.icon}
            </span>
            <div>
              <p className="text-lg font-semibold text-[--color-text-primary] group-hover:text-[--color-accent] transition-colors">
                {link.label}
              </p>
              <p className="mt-2 text-base text-[--color-text-secondary]">
                {link.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
