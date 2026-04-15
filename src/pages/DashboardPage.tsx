import { useEffect, useMemo, useState } from 'react'
import { LoadingPage } from '../components/LoadingSpinner'
import { normalizeCountryLabel } from '../utils/countryLabel'
import API_BASE from '../config/api'

interface ServidorResumo {
  id?: string | number
  nome: string
  pais: string
  continente: string
  capacidade_atual?: number
  capacidade_total?: number
  status?: string | boolean | null
}

interface CountryCapacityPoint {
  pais: string
  capacidade: number
}

interface ContinentSeries {
  continente: string
  pontos: CountryCapacityPoint[]
}

function isServidorAtivo(status?: string | boolean | null): boolean {
  if (typeof status === 'boolean') return status
  if (typeof status === 'string') {
    const normalized = status.trim().toLowerCase()
    return normalized === 'ativo' || normalized === 'active' || normalized === 'true'
  }
  return true
}

export function DashboardPage() {
  const [servidores, setServidores] = useState<ServidorResumo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      setError(null)
      setLoading(true)
      try {
        const response = await fetch(`${API_BASE}/servidores/`)
        if (!response.ok) {
          if (active) setError('Não foi possível carregar os dados do dashboard.')
          return
        }
        const data = await response.json()
        if (!active || !Array.isArray(data)) {
          if (active) setServidores([])
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
              nome, pais, continente,
              capacidade_atual: typeof record.capacidade_atual === 'number' ? record.capacidade_atual : 0,
              capacidade_total: typeof record.capacidade_total === 'number' ? record.capacidade_total : 4096,
              status: (typeof record.status === 'string' || typeof record.status === 'boolean') ? record.status : null,
            }
          })
          .filter((server): server is ServidorResumo => server !== null)
        setServidores(normalized)
      } catch {
        if (active) setError('Não foi possível conectar ao backend do dashboard.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadDashboard()
    return () => { active = false }
  }, [])

  const totalServidores = servidores.length
  const ativos = useMemo(
    () => servidores.filter(s => isServidorAtivo(s.status)).length,
    [servidores],
  )
  const capacidadeMedia = useMemo(() => {
    if (!servidores.length) return 0
    return servidores.reduce((acc, s) => {
      const total = s.capacidade_total || 4096
      const atual = s.capacidade_atual || 0
      return acc + (total ? (atual / total) * 100 : 0)
    }, 0) / servidores.length
  }, [servidores])

  const cards = [
    { label: 'Total de Servidores', value: totalServidores.toString() },
    { label: 'Capacidade Média',    value: `${capacidadeMedia.toFixed(1)}%` },
    { label: 'Servidores Ativos',   value: ativos.toString() },
  ]

  const seriesPorContinente = useMemo<ContinentSeries[]>(() => {
    const porContinente = new Map<string, Map<string, { total: number; count: number }>>()
    servidores.forEach(s => {
      const total = s.capacidade_total || 4096
      const atual = s.capacidade_atual || 0
      const pct = total ? (atual / total) * 100 : 0
      if (!porContinente.has(s.continente)) porContinente.set(s.continente, new Map())
      const porPais = porContinente.get(s.continente)!
      const acc = porPais.get(s.pais) ?? { total: 0, count: 0 }
      acc.total += pct; acc.count += 1
      porPais.set(s.pais, acc)
    })
    return [...porContinente.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([continente, porPais]) => ({
        continente,
        pontos: [...porPais.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([pais, acc]) => ({ pais, capacidade: acc.count ? acc.total / acc.count : 0 })),
      }))
  }, [servidores])

  if (loading) return <LoadingPage />

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6 lg:p-8 min-w-0">
      {/* ── Cabeçalho ──────────────────────────────────────────────────────── */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-[--color-text-primary] sm:text-3xl">Painel</h1>
        <p className="mt-1 text-sm text-[--color-text-secondary]">
          Monitore a capacidade e o status de todos os servidores.
        </p>
      </div>

      {/* ── Cards de resumo ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(card => (
          <div key={card.label} className="rounded-xl border border-[--color-border] bg-[--color-card-bg] p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-[--color-text-secondary]">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-[--color-text-primary]">{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── Tabela de servidores ─────────────────────────────────────────────── */}
      <div className="mt-6 rounded-xl border border-[--color-border] bg-[--color-card-bg] p-5">
        {error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : servidores.length === 0 ? (
          <p className="text-sm text-[--color-text-secondary]">Nenhum servidor encontrado.</p>
        ) : (
          /*
           * Container único com overflow em ambos os eixos.
           * sticky no th funciona pois o único scroll container dos th é este div.
           * Não há nenhum ancestor intermédio com overflow != visible entre os th e este div.
           */
          <div className="h-[340px] overflow-auto rounded-lg">
            <table className="w-full min-w-[580px] text-left text-sm border-collapse">
              <thead>
                <tr>
                  {['Servidor', 'País', 'Continente', 'Capacidade', 'Status'].map(col => (
                    <th
                      key={col}
                      className="px-3 py-2.5 font-medium text-[--color-text-secondary]"
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                        backgroundColor: 'var(--color-card-bg)',
                        borderBottom: '1px solid var(--color-border)',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {servidores.map(server => {
                  const total = server.capacidade_total || 4096
                  const atual = server.capacidade_atual || 0
                  const percentual = total ? (atual / total) * 100 : 0
                  return (
                    <tr
                      key={String(server.id ?? server.nome)}
                      className="border-b border-[--color-border]/60 hover:bg-[--color-sidebar-hover] transition-colors duration-100"
                    >
                      <td className="px-3 py-2 text-[--color-text-primary]">{server.nome}</td>
                      <td className="px-3 py-2 text-[--color-text-secondary]">{server.pais}</td>
                      <td className="px-3 py-2 text-[--color-text-secondary]">{server.continente}</td>
                      <td className="px-3 py-2 text-[--color-text-secondary]">{percentual.toFixed(1)} %</td>
                      <td className="px-3 py-2">
                        <span
                          className={[
                            'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium',
                            isServidorAtivo(server.status)
                              ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-400'
                              : 'border-red-500/70 bg-red-500/10 text-red-400',
                          ].join(' ')}
                        >
                          {isServidorAtivo(server.status) ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Gráficos por Continente ─────────────────────────────────────────── */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-[--color-text-primary] sm:text-2xl">
          Continente
        </h2>
        <p className="mt-1 text-sm text-[--color-text-secondary]">
          Gráficos de linha por continente com distribuição de capacidade entre países.
        </p>

        {seriesPorContinente.length === 0 ? (
          <div className="mt-4 flex items-center justify-center rounded-xl border border-dashed border-[--color-border] bg-[--color-card-bg] p-10">
            <p className="text-sm text-[--color-text-secondary]">Sem dados para exibir gráficos.</p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {seriesPorContinente.map((serie, index) => {
              const isLastOdd = seriesPorContinente.length % 2 === 1 && index === seriesPorContinente.length - 1
              const chartWidth = 560
              const chartHeight = 230
              const padLeft = 44
              const padRight = 18
              const padTop = 16
              const padBottom = 44
              const innerWidth = chartWidth - padLeft - padRight
              const innerHeight = chartHeight - padTop - padBottom
              const steps = Math.max(serie.pontos.length - 1, 1)

              const points = serie.pontos.map((ponto, i) => ({
                ...ponto,
                x: padLeft + (innerWidth * i) / steps,
                y: padTop + innerHeight - (Math.max(0, Math.min(100, ponto.capacidade)) / 100) * innerHeight,
              }))

              const pathD = points
                .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
                .join(' ')

              return (
                <section
                  key={serie.continente}
                  className={[
                    'rounded-xl border border-[--color-border] bg-[--color-card-bg] p-4 sm:p-5',
                    isLastOdd ? 'lg:col-span-2' : '',
                  ].join(' ')}
                >
                  <h3 className="text-base font-semibold text-[--color-text-primary]">{serie.continente}</h3>
                  <div className="mt-3 overflow-x-auto">
                    <svg
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                      className="h-[220px] min-w-[520px] w-full"
                      role="img"
                      aria-label={`Gráfico de capacidade por país em ${serie.continente}`}
                    >
                      {[0, 25, 50, 75, 100].map(level => {
                        const y = padTop + innerHeight - (level / 100) * innerHeight
                        return (
                          <g key={level}>
                            <line x1={padLeft} y1={y} x2={chartWidth - padRight} y2={y}
                              stroke="var(--color-border)" strokeWidth="1" opacity="0.65" />
                            <text x={padLeft - 8} y={y + 4} textAnchor="end"
                              fill="var(--color-text-secondary)" fontSize="11">
                              {level}%
                            </text>
                          </g>
                        )
                      })}
                      <path d={pathD} fill="none" stroke="#f97316" strokeWidth="2.4" strokeLinecap="round" />
                      {points.map(point => (
                        <g key={`${serie.continente}-${point.pais}`}>
                          <circle cx={point.x} cy={point.y} r="3.8" fill="#f97316" />
                          <text x={point.x} y={chartHeight - 20} textAnchor="middle"
                            fill="var(--color-text-secondary)" fontSize="11">
                            {point.pais}
                          </text>
                          <text x={point.x} y={point.y - 10} textAnchor="middle"
                            fill="var(--color-text-primary)" fontSize="10">
                            {point.capacidade.toFixed(1)}%
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
