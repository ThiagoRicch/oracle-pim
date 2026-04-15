import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { LoadingSpinner } from './LoadingSpinner'
import { normalizeCountryLabel } from '../utils/countryLabel'
import API_BASE from '../config/api'
const CAPACIDADE_TOTAL = 4096
const CAPACIDADE_80 = Math.floor(CAPACIDADE_TOTAL * 0.8) // 3276

// ─── Geography types ──────────────────────────────────────────────────────────

interface CityOption {
  nome: string
  lat: number
  lng: number
  indice: number
}

interface CountryOption {
  nome: string
  iso2: string
  cidades: CityOption[]
}

interface ContinentOption {
  nome: string
  paises: CountryOption[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function getCountryIso2(countryName: string, rawIso2: string): string {
  const iso = rawIso2.trim().toUpperCase()
  if (/^[A-Z]{2}$/.test(iso)) return iso
  return (COUNTRY_ISO2_BY_NAME[normalizeName(countryName)] ?? '').toUpperCase()
}

function getFlagImageUrl(iso2: string): string {
  return `https://flagcdn.com/w40/${iso2.toLowerCase()}.png`
}

function isAtivo(status?: string | boolean | null): boolean {
  if (typeof status === 'boolean') return status
  if (typeof status === 'string') {
    const n = status.trim().toLowerCase()
    return n === 'ativo' || n === 'active' || n === 'true'
  }
  return true
}

function normalizeGeography(payload: unknown): ContinentOption[] {
  if (!Array.isArray(payload)) return []
  return payload
    .map((continent): ContinentOption | null => {
      if (!continent || typeof continent !== 'object') return null
      const cr = continent as Record<string, unknown>
      const continentName =
        (cr.nome as string | undefined) ?? (cr.continente as string | undefined) ?? (cr.name as string | undefined) ?? ''
      const rawCountries = (cr.paises as unknown[] | undefined) ?? (cr.countries as unknown[] | undefined) ?? []
      const paises = rawCountries
        .map((country): CountryOption | null => {
          if (!country || typeof country !== 'object') return null
          const co = country as Record<string, unknown>
          const countryName =
            (co.nome as string | undefined) ?? (co.pais as string | undefined) ?? (co.name as string | undefined) ?? ''
          const normalizedCountryName = normalizeCountryLabel(countryName)
          const iso2 = getCountryIso2(
            normalizedCountryName,
            ((co.iso2 ?? co.iso ?? co.codigo_iso ?? co.country_code ?? '') as string),
          )
          const rawCities =
            (co.cidades as unknown[] | undefined) ??
            (co.localizacoes as unknown[] | undefined) ??
            (co.cities as unknown[] | undefined) ??
            []
          const cidades = rawCities
            .map((city, idx): CityOption | null => {
              if (!city || typeof city !== 'object') return null
              const ci = city as Record<string, unknown>
              const nome =
                (ci.nome as string | undefined) ?? (ci.cidade as string | undefined) ?? (ci.name as string | undefined) ?? ''
              const lat = toNumber(ci.lat) ?? toNumber(ci.latitude)
              const lng = toNumber(ci.lng) ?? toNumber(ci.longitude)
              const indice = toNumber(ci.indice) ?? idx
              if (!nome || lat === null || lng === null) return null
              return { nome, lat, lng, indice }
            })
            .filter((c): c is CityOption => c !== null)
          if (!countryName) return null
          return { nome: normalizedCountryName, iso2, cidades }
        })
        .filter((c): c is CountryOption => c !== null)
      if (!continentName) return null
      return { nome: continentName, paises }
    })
    .filter((c): c is ContinentOption => c !== null)
}

// ─── DropdownSelect ───────────────────────────────────────────────────────────

interface DropdownOption {
  value: string
  label: string
  startAdornment?: ReactNode
}

interface DropdownSelectProps {
  id: string
  value: string
  disabled?: boolean
  placeholder: string
  options: DropdownOption[]
  onChange: (v: string) => void
}

function DropdownSelect({ id, value, disabled, placeholder, options, onChange }: DropdownSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!rootRef.current) return
      if (rootRef.current.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => { if (disabled) setOpen(false) }, [disabled])
  useEffect(() => { setOpen(false) }, [options])

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(prev => !prev)}
        className={[
          'relative w-full rounded-xl border bg-[--color-main-bg] px-4 py-3 pr-11 text-left',
          'text-sm text-[--color-text-primary] outline-none',
          'transition-colors focus:border-[--color-accent] focus:ring-1 focus:ring-[--color-accent]',
          'disabled:opacity-40 disabled:cursor-not-allowed border-[--color-border]',
        ].join(' ')}
      >
        {selected ? (
          <span className="inline-flex items-center gap-2">
            {selected.startAdornment}
            <span>{selected.label}</span>
          </span>
        ) : (
          <span className="text-[--color-text-secondary]/60">{placeholder}</span>
        )}

        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[--color-text-secondary]">
          {/* Seta para baixo por padrão (fechado), para cima quando aberto */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-4 w-4 transition-transform duration-300 ease-out ${open ? 'rotate-180' : 'rotate-0'}`}
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>

      <div
        className={[
          'grid transition-all duration-300 ease-out z-10 relative',
          open && !disabled
            ? 'mt-1.5 grid-rows-[1fr] opacity-100'
            : 'mt-0 grid-rows-[0fr] opacity-0 pointer-events-none',
        ].join(' ')}
      >
        <ul className="min-h-0 max-h-48 overflow-auto rounded-xl border border-[--color-border] bg-[--color-main-bg] p-0 shadow-xl ring-1 ring-black/20">
          {options.map(option => (
            <li key={option.value} className="bg-[--color-main-bg]">
              <button
                type="button"
                className={[
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[--color-text-primary]',
                  'bg-[--color-main-bg] border-b border-[--color-border]/60 last:border-b-0 transition-colors duration-150',
                  option.value === value
                    ? 'bg-[--color-card-bg] ring-1 ring-inset ring-[--color-accent]/50 font-medium'
                    : 'hover:bg-[--color-card-bg]',
                ].join(' ')}
                onClick={() => { onChange(option.value); setOpen(false) }}
              >
                {option.startAdornment}
                <span>{option.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ─── Modal types ──────────────────────────────────────────────────────────────

export interface ServidorParaEditar {
  id: string | number
  nome: string
  pais: string
  continente: string
  cidade?: string
  status?: string | boolean | null
}

interface EditServerModalProps {
  servidor: ServidorParaEditar | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

// ─── EditServerModal ──────────────────────────────────────────────────────────

export function EditServerModal({ servidor, isOpen, onClose, onSuccess }: EditServerModalProps) {
  // ── Animation state ──────────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      setVisible(false)
      const t = setTimeout(() => setVisible(true), 24)
      return () => clearTimeout(t)
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 420)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // ── Status local ─────────────────────────────────────────────────────────
  const [localAtivo, setLocalAtivo] = useState(true)
  const [statusLoading, setStatusLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // ── Form state ───────────────────────────────────────────────────────────
  const [nome, setNome] = useState('')
  const [continente, setContinente] = useState('')
  const [pais, setPais] = useState('')
  const [cidade, setCidade] = useState('')

  // ── Geography ────────────────────────────────────────────────────────────
  const [continentes, setContinentes] = useState<ContinentOption[]>([])
  const [geoLoading, setGeoLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      for (const ep of ['/geografia/', '/geografia']) {
        try {
          const res = await fetch(`${API_BASE}${ep}`)
          if (!res.ok) continue
          const payload = await res.json()
          const normalized = normalizeGeography(payload)
          if (!active) return
          if (normalized.length > 0) {
            setContinentes(normalized)
            setGeoLoading(false)
            return
          }
        } catch { /* try next */ }
      }
      if (active) setGeoLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  // ── Pre-fill when modal opens ────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !servidor) return
    setNome(servidor.nome)
    setContinente(servidor.continente)
    setPais(normalizeCountryLabel(servidor.pais))
    setCidade(servidor.cidade ?? '')
    setLocalAtivo(isAtivo(servidor.status))
    setError(null)
    setCapacidadeError(null)
    setSuccess(false)
  }, [isOpen, servidor])

  // ── Derived select options ───────────────────────────────────────────────
  const selectedContinent = useMemo(
    () => continentes.find(c => normalizeName(c.nome) === normalizeName(continente)),
    [continentes, continente],
  )
  const selectedCountry = selectedContinent?.paises.find(p => normalizeName(p.nome) === normalizeName(pais))

  const continentOptions = useMemo<DropdownOption[]>(
    () => continentes.map(c => ({ value: c.nome, label: c.nome })),
    [continentes],
  )
  const countryOptions = useMemo<DropdownOption[]>(
    () =>
      (selectedContinent?.paises ?? []).map(p => ({
        value: p.nome,
        label: p.nome,
        startAdornment: p.iso2 ? (
          <img src={getFlagImageUrl(p.iso2)} alt={`Bandeira de ${p.nome}`} className="h-4 w-6 rounded-[2px] object-cover" loading="lazy" />
        ) : undefined,
      })),
    [selectedContinent],
  )
  const cityOptions = useMemo<DropdownOption[]>(
    () => (selectedCountry?.cidades ?? []).map(c => ({ value: c.nome, label: c.nome })),
    [selectedCountry],
  )

  // ── Capacity validation ──────────────────────────────────────────────────
  const [capacidadeError, setCapacidadeError] = useState<string | null>(null)
  const [checkingCapacity, setCheckingCapacity] = useState(false)

  useEffect(() => {
    if (!pais || !servidor) { setCapacidadeError(null); return }
    if (normalizeName(pais) === normalizeName(servidor.pais)) { setCapacidadeError(null); return }

    let active = true
    setCheckingCapacity(true)
    setCapacidadeError(null)

    async function checkCapacity() {
      try {
        const res = await fetch(`${API_BASE}/servidores/paises/${encodeURIComponent(pais)}`)
        if (!active) return
        if (!res.ok) { setCheckingCapacity(false); return }
        const data = await res.json()
        if (!active) return
        const servers = Array.isArray(data) ? data : []
        if (servers.length >= 2) {
          setCapacidadeError(`Limite de servidores atingido para ${pais}.`)
        } else if (servers.length === 1) {
          const srv = servers[0] as Record<string, unknown>
          const capacidadeAtual = typeof srv.capacidade_atual === 'number' ? srv.capacidade_atual : 0
          if (capacidadeAtual < CAPACIDADE_80) {
            setCapacidadeError(`O servidor em ${pais} ainda não atingiu 80% de uso (${capacidadeAtual}/${CAPACIDADE_TOTAL}).`)
          }
        }
      } catch { /* allow submit */ } finally {
        if (active) setCheckingCapacity(false)
      }
    }

    checkCapacity()
    return () => { active = false }
  }, [pais, servidor])

  // ── Status toggle ────────────────────────────────────────────────────────
  function handleStatusToggle() {
    if (!servidor || statusLoading) return
    if (localAtivo) {
      // Desativar → pede confirmação primeiro
      setShowConfirm(true)
    } else {
      // Reativar → direto
      confirmStatusChange(true)
    }
  }

  async function confirmStatusChange(novoStatus: boolean) {
    if (!servidor) return
    setShowConfirm(false)
    setStatusLoading(true)
    try {
      const res = await fetch(`${API_BASE}/servidores/${servidor.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      })
      if (res.ok) {
        setLocalAtivo(novoStatus)
        onSuccess()
        onClose()
      }
    } catch { /* silent */ } finally {
      setStatusLoading(false)
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!servidor) return
    setError(null)
    setLoading(true)
    try {
      const body: Record<string, string | number> = {}
      if (nome.trim()) body.nome = nome.trim()
      if (pais) body.pais = pais

      if (cidade && selectedCountry) {
        const selectedCidade = selectedCountry.cidades.find(c => normalizeName(c.nome) === normalizeName(cidade))
        if (selectedCidade) {
          body.cidade = selectedCidade.nome
          body.indice = selectedCidade.indice
        }
      }

      const res = await fetch(`${API_BASE}/servidores/${servidor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const message =
          (data && typeof data === 'object' && 'detail' in data && typeof data.detail === 'string' && data.detail) ||
          (typeof data === 'string' && data) ||
          'Erro ao atualizar servidor.'
        setError(message)
        return
      }
      setSuccess(true)
      setTimeout(() => { onSuccess(); onClose() }, 900)
    } catch {
      setError('Não foi possível conectar à API. Verifique se o servidor está rodando.')
    } finally {
      setLoading(false)
    }
  }

  const formDisabled = !localAtivo
  const canSubmit =
    !loading &&
    !geoLoading &&
    !checkingCapacity &&
    !capacidadeError &&
    !formDisabled &&
    nome.trim().length > 0 &&
    pais.length > 0

  // ── Render ───────────────────────────────────────────────────────────────
  if (!mounted || !servidor) return null

  const displayPais = pais || servidor.pais
  const displayIso2 = getCountryIso2(displayPais, selectedCountry?.iso2 ?? '')

  return (
    <div
      className={[
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'transition-opacity duration-420 ease-[cubic-bezier(0.22,1,0.36,1)]',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
      ].join(' ')}
      aria-modal="true"
      role="dialog"
      aria-label="Editar servidor"
    >
      {/* Backdrop */}
      <div
        className={[
          'absolute inset-0 bg-black/65 backdrop-blur-sm',
          'transition-opacity duration-420 ease-[cubic-bezier(0.22,1,0.36,1)]',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — fundo sólido garantido via style inline */}
      <div
        className={[
          'relative w-full max-w-md rounded-2xl border border-[--color-border] shadow-2xl',
          'transition-all duration-420 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform will-change-opacity',
          visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95',
        ].join(' ')}
        style={{ backgroundColor: 'var(--color-sidebar-bg)' }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-[--color-border]">
          <div className="flex items-start gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-semibold text-[--color-text-primary]">{servidor.nome}</span>
                <span className="text-[--color-text-secondary]">|</span>
                {displayIso2 ? (
                  <img
                    src={getFlagImageUrl(displayIso2)}
                    alt={displayPais}
                    className="h-4 w-6 rounded-[2px] object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span>🏳️</span>
                )}
                <span className="text-sm text-[--color-text-secondary]">{displayPais}</span>
              </div>
              <p className="mt-0.5 text-sm text-[--color-text-secondary]">{continente || servidor.continente}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-2 shrink-0">
            {/* Badge de status — clicável */}
            <button
              type="button"
              disabled={statusLoading}
              onClick={handleStatusToggle}
              className={[
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
                'transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
                localAtivo
                  ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                  : 'border-red-500/70 bg-red-500/10 text-red-400 hover:bg-red-500/20',
              ].join(' ')}
              title={localAtivo ? 'Clique para desativar' : 'Clique para ativar'}
            >
              {statusLoading
                ? <LoadingSpinner size="sm" />
                : localAtivo ? 'Ativo' : 'Desativado'}
            </button>

            {/* Fechar */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[--color-text-secondary] transition-colors hover:bg-[--color-sidebar-hover] hover:text-[--color-text-primary]"
              aria-label="Fechar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Aviso desativado ────────────────────────────────────────────── */}
        {!localAtivo && (
          <div className="mx-6 mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
            Servidor desativado. Edição bloqueada.
          </div>
        )}

        {/* ── Form ───────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
          {/* Nome */}
          <div>
            <label htmlFor="edit-nome" className="block text-sm font-medium text-[--color-text-secondary] mb-1.5">
              Nome
            </label>
            <input
              id="edit-nome"
              type="text"
              value={nome}
              disabled={formDisabled}
              onChange={e => setNome(e.target.value)}
              placeholder="Nome do servidor"
              className={[
                'w-full rounded-xl border bg-[--color-main-bg] px-4 py-3',
                'text-sm text-[--color-text-primary] outline-none',
                'placeholder:text-[--color-text-secondary]/40',
                'transition-colors focus:border-[--color-accent] focus:ring-1 focus:ring-[--color-accent]',
                'border-[--color-border]',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              ].join(' ')}
            />
          </div>

          {/* Continente */}
          <div>
            <label htmlFor="edit-continente" className="block text-sm font-medium text-[--color-text-secondary] mb-1.5">
              Continente
            </label>
            <DropdownSelect
              id="edit-continente"
              value={continente}
              disabled={geoLoading || formDisabled}
              placeholder={geoLoading ? 'Carregando...' : 'Selecione um continente'}
              options={continentOptions}
              onChange={val => {
                setContinente(val)
                setPais('')
                setCidade('')
                setCapacidadeError(null)
              }}
            />
          </div>

          {/* País */}
          <div>
            <label htmlFor="edit-pais" className="block text-sm font-medium text-[--color-text-secondary] mb-1.5">
              País
            </label>
            <DropdownSelect
              id="edit-pais"
              value={pais}
              disabled={!selectedContinent || formDisabled}
              placeholder="Selecione um país"
              options={countryOptions}
              onChange={val => { setPais(val); setCidade('') }}
            />
            {checkingCapacity && (
              <p className="mt-1.5 text-xs text-[--color-text-secondary]">Verificando disponibilidade...</p>
            )}
            {capacidadeError && !checkingCapacity && (
              <p className="mt-1.5 text-xs text-amber-400">{capacidadeError}</p>
            )}
          </div>

          {/* Cidade */}
          <div>
            <label htmlFor="edit-cidade" className="block text-sm font-medium text-[--color-text-secondary] mb-1.5">
              Cidade
            </label>
            <DropdownSelect
              id="edit-cidade"
              value={cidade}
              disabled={!selectedCountry || formDisabled}
              placeholder="Selecione uma cidade"
              options={cityOptions}
              onChange={val => setCidade(val)}
            />
          </div>

          {/* Feedback */}
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-xs text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-xs text-emerald-400">
              Servidor atualizado com sucesso!
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-center mt-1">
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-[180px] whitespace-nowrap rounded-full px-12 py-2.5 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: canSubmit ? '#f97316' : '#f97316',
                opacity: canSubmit ? 1 : 0.4,
              }}
            >
              {loading
                ? <span className="inline-flex items-center gap-2"><LoadingSpinner size="sm" />ALTERANDO...</span>
                : 'ALTERAR'}
            </button>
          </div>
        </form>

        {/* ── Overlay de confirmação de desativação ───────────────────────── */}
        {showConfirm && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/70 backdrop-blur-[2px]">
            <div
              className="mx-5 w-full rounded-2xl border border-[--color-border] p-6 shadow-2xl"
              style={{ backgroundColor: 'var(--color-sidebar-bg)' }}
            >
              <div className="mb-1 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-red-400 shrink-0" aria-hidden="true">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <h3 className="text-base font-semibold text-[--color-text-primary]">Desativar servidor?</h3>
              </div>
              <p className="mb-5 text-sm text-[--color-text-secondary]">
                O servidor <span className="font-medium text-[--color-text-primary]">{servidor?.nome}</span> será movido para a lista de inativos. Esta ação pode ser revertida.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 rounded-xl border border-[--color-border] bg-[--color-main-bg] py-2 text-sm font-medium text-[--color-text-secondary] transition-colors hover:text-[--color-text-primary] hover:border-[--color-text-secondary]/40"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => confirmStatusChange(false)}
                  className="flex-1 rounded-xl border border-red-500/70 bg-red-500/10 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20"
                >
                  Desativar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
