import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { normalizeCountryLabel } from '../utils/countryLabel'
import API_BASE from '../config/api'

interface FormData {
  nome: string
  continente: string
  pais: string
  cidade: string
  lat: number | null
  lng: number | null
  cidadeIndex: number | null
}

const INITIAL_FORM: FormData = {
  nome: '',
  continente: '',
  pais: '',
  cidade: '',
  lat: null,
  lng: null,
  cidadeIndex: null,
}

interface CityOption {
  nome: string
  lat: number
  lng: number
  indice: number
}

interface CountryOption {
  nome: string
  iso2: string
  flag: string
  cidades: CityOption[]
}

interface ContinentOption {
  nome: string
  paises: CountryOption[]
}

const GEOGRAPHY_ENDPOINTS = ['/geografia/', '/geografia']

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

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function toFlagFromIso2(iso2: string): string {
  const upper = iso2.trim().toUpperCase()
  if (upper.length !== 2) return ''
  const codePoints = [...upper].map(char => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

function getCountryFlag(countryName: string, rawFlag: string, iso2: string): string {
  const trimmedFlag = rawFlag.trim()
  if (trimmedFlag) {
    // Backend may send iso2 in `flag` (e.g. BR) instead of emoji.
    if (/^[a-z]{2}$/i.test(trimmedFlag)) {
      return toFlagFromIso2(trimmedFlag)
    }
    return trimmedFlag
  }

  const rawIso2 = iso2.trim().toUpperCase()
  if (rawIso2) return toFlagFromIso2(rawIso2)

  const mappedIso2 = COUNTRY_ISO2_BY_NAME[normalizeName(countryName)] ?? ''
  return mappedIso2 ? toFlagFromIso2(mappedIso2) : ''
}

function getCountryIso2(countryName: string, rawIso2: string): string {
  const iso = rawIso2.trim().toUpperCase()
  if (/^[A-Z]{2}$/.test(iso)) return iso

  const mappedIso2 = COUNTRY_ISO2_BY_NAME[normalizeName(countryName)] ?? ''
  return mappedIso2.toUpperCase()
}

function getFlagImageUrl(iso2: string): string {
  return `https://flagcdn.com/w40/${iso2.toLowerCase()}.png`
}

function normalizeGeography(payload: unknown): ContinentOption[] {
  if (!Array.isArray(payload)) return []

  return payload
    .map((continent): ContinentOption | null => {
      if (!continent || typeof continent !== 'object') return null
      const continentRecord = continent as Record<string, unknown>
      const continentName =
        (continentRecord.nome as string | undefined) ??
        (continentRecord.continente as string | undefined) ??
        (continentRecord.name as string | undefined) ??
        ''

      const rawCountries =
        (continentRecord.paises as unknown[] | undefined) ??
        (continentRecord.countries as unknown[] | undefined) ??
        []

      const paises = rawCountries
        .map((country): CountryOption | null => {
          if (!country || typeof country !== 'object') return null
          const countryRecord = country as Record<string, unknown>

          const countryName =
            (countryRecord.nome as string | undefined) ??
            (countryRecord.pais as string | undefined) ??
            (countryRecord.name as string | undefined) ??
            ''
          const normalizedCountryName = normalizeCountryLabel(countryName)

          const iso2 =
            (countryRecord.iso2 as string | undefined) ??
            (countryRecord.iso as string | undefined) ??
            (countryRecord.codigo_iso as string | undefined) ??
            (countryRecord.country_code as string | undefined) ??
            ''

          const rawFlag =
            (countryRecord.flag as string | undefined) ??
            (countryRecord.bandeira as string | undefined) ??
            (countryRecord.emoji as string | undefined) ??
            ''

          const rawCities =
            (countryRecord.cidades as unknown[] | undefined) ??
            (countryRecord.localizacoes as unknown[] | undefined) ??
            (countryRecord.cities as unknown[] | undefined) ??
            []

          const cidades = rawCities
            .map((city, cityIndex): CityOption | null => {
              if (!city || typeof city !== 'object') return null
              const cityRecord = city as Record<string, unknown>

              const cityName =
                (cityRecord.nome as string | undefined) ??
                (cityRecord.cidade as string | undefined) ??
                (cityRecord.name as string | undefined) ??
                ''

              const lat =
                toNumber(cityRecord.lat) ??
                toNumber(cityRecord.latitude)

              const lng =
                toNumber(cityRecord.lng) ??
                toNumber(cityRecord.longitude)

              const indice = toNumber(cityRecord.indice) ?? cityIndex

              if (!cityName || lat === null || lng === null) return null

              return {
                nome: cityName,
                lat,
                lng,
                indice,
              }
            })
            .filter((city): city is CityOption => city !== null)

          if (!countryName) return null

          return {
            nome: normalizedCountryName,
            iso2: getCountryIso2(normalizedCountryName, iso2),
            flag: getCountryFlag(normalizedCountryName, rawFlag, iso2),
            cidades,
          }
        })
        .filter((country): country is CountryOption => country !== null)

      if (!continentName) return null

      return {
        nome: continentName,
        paises,
      }
    })
    .filter((continent): continent is ContinentOption => continent !== null)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-[--color-text-secondary] sm:mb-2">
      {children}
    </label>
  )
}

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
  const selected = options.find(option => option.value === value)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current) return
      if (rootRef.current.contains(event.target as Node)) return
      setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  useEffect(() => {
    setOpen(false)
  }, [options])

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(prev => !prev)}
        className={[
          'relative w-full rounded-xl border bg-[--color-main-bg] px-4 py-3 pr-11 text-left sm:py-3.5',
          'text-sm text-[--color-text-primary] outline-none sm:text-base',
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
          <span className="text-[--color-text-primary]">{placeholder}</span>
        )}

        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[--color-text-secondary]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-5 w-5 transition-transform duration-300 ease-out ${open ? 'rotate-180' : 'rotate-0'}`}
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
          'grid transition-all duration-300 ease-out',
          open && !disabled
            ? 'mt-2 grid-rows-[1fr] opacity-100'
            : 'mt-0 grid-rows-[0fr] opacity-0 pointer-events-none',
        ].join(' ')}
      >
        <ul className="min-h-0 max-h-64 overflow-auto rounded-xl border border-[--color-border] bg-[--color-main-bg] p-0 shadow-xl ring-1 ring-black/20">
          {options.map(option => (
            <li key={option.value} className="bg-[--color-main-bg]">
              <button
                type="button"
                className={[
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[--color-text-primary]',
                  'bg-[--color-main-bg] border-b border-[--color-border]/60 last:border-b-0 transition-colors duration-200',
                  option.value === value
                    ? 'bg-[--color-card-bg] ring-1 ring-inset ring-[--color-accent]/50 font-medium'
                    : 'hover:bg-[--color-card-bg]',
                ].join(' ')}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
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

// ─── Main component ───────────────────────────────────────────────────────────

export function CreateServerPage() {
  const [form, setForm] = useState<FormData>(INITIAL_FORM)
  const [continentes, setContinentes] = useState<ContinentOption[]>([])
  const [geoLoading, setGeoLoading] = useState(true)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const selectedContinent = useMemo(
    () => continentes.find(c => c.nome === form.continente),
    [continentes, form.continente],
  )
  const selectedCountry = selectedContinent?.paises.find(p => p.nome === form.pais)
  const continentOptions = useMemo<DropdownOption[]>(
    () => continentes.map(continent => ({ value: continent.nome, label: continent.nome })),
    [continentes],
  )
  const countryOptions = useMemo<DropdownOption[]>(
    () =>
      (selectedContinent?.paises ?? []).map(country => ({
        value: country.nome,
        label: country.nome,
        startAdornment: country.iso2 ? (
          <img
            src={getFlagImageUrl(country.iso2)}
            alt={`Bandeira de ${country.nome}`}
            className="h-4 w-6 rounded-[2px] object-cover"
            loading="lazy"
          />
        ) : (
          <span>{country.flag || '🏳️'}</span>
        ),
      })),
    [selectedContinent],
  )
  const cityOptions = useMemo<DropdownOption[]>(
    () => (selectedCountry?.cidades ?? []).map(city => ({ value: city.nome, label: city.nome })),
    [selectedCountry],
  )

  useEffect(() => {
    let active = true

    async function loadGeography() {
      setGeoLoading(true)
      setGeoError(null)

      for (const endpoint of GEOGRAPHY_ENDPOINTS) {
        try {
          const response = await fetch(`${API_BASE}${endpoint}`)
          if (!response.ok) continue

          const payload = await response.json()
          const normalized = normalizeGeography(payload)

          if (!active) return

          if (normalized.length > 0) {
            setContinentes(normalized)
            setGeoLoading(false)
            return
          }
        } catch {
          // Try next candidate endpoint.
        }
      }

      if (!active) return

      setContinentes([])
      setGeoError('Nao foi possivel carregar os continentes, paises e cidades do backend.')
      setGeoLoading(false)
    }

    loadGeography()

    return () => {
      active = false
    }
  }, [])

  function handleContinentChange(value: string) {
    setForm(prev => ({ ...prev, continente: value, pais: '', cidade: '', lat: null, lng: null, cidadeIndex: null }))
    setError(null)
    setSuccess(false)
  }

  function handleCountryChange(value: string) {
    setForm(prev => ({ ...prev, pais: value, cidade: '', lat: null, lng: null, cidadeIndex: null }))
  }

  function handleCityChange(value: string) {
    if (!selectedCountry) return
    const city = selectedCountry.cidades.find(c => c.nome === value)
    if (!city) return

    setForm(prev => ({
      ...prev,
      cidade: value,
      lat: city.lat,
      lng: city.lng,
      cidadeIndex: city.indice,
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/servidores/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          pais: form.pais,
          indice: form.cidadeIndex,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        const message =
          (data && typeof data === 'object' && 'detail' in data && typeof data.detail === 'string' && data.detail) ||
          (typeof data === 'string' && data) ||
          'Erro ao criar servidor.'
        setError(message)
        return
      }

      setSuccess(true)
      setForm(INITIAL_FORM)
    } catch {
      setError('Não foi possível conectar à API. Verifique se o servidor está rodando.')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = !loading && !geoLoading && form.nome.trim() && form.pais && form.cidade && form.cidadeIndex !== null

  return (
    <div className="flex flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:p-10">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-[--color-text-primary]">Criar Servidor</h1>
        <p className="mt-1 text-sm text-[--color-text-secondary]">
          Provisione um novo servidor em um país disponível.
        </p>
      </div>

      <div className="mx-auto w-full max-w-xl">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 rounded-2xl border border-[--color-border] bg-[--color-card-bg] p-5 sm:gap-6 sm:p-8"
        >
          {/* Nome */}
          <div>
            <Label htmlFor="nome">Nome do servidor</Label>
            <input
              id="nome"
              type="text"
              value={form.nome}
              onChange={e => setForm(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Ex: Servidor-BR-01"
              required
              className={[
                'w-full rounded-xl border bg-[--color-main-bg] px-4 py-3 sm:py-3.5',
                'text-sm text-[--color-text-primary] outline-none sm:text-base',
                'placeholder:text-[--color-text-secondary]/40',
                'transition-colors focus:border-[--color-accent] focus:ring-1 focus:ring-[--color-accent]',
                'border-[--color-border]',
              ].join(' ')}
            />
          </div>

          {/* Continente */}
          <div>
            <Label htmlFor="continente">Continente</Label>
            <DropdownSelect
              id="continente"
              value={form.continente}
              disabled={geoLoading || !!geoError}
              placeholder="Selecione um continente"
              options={continentOptions}
              onChange={handleContinentChange}
            />
          </div>

          {/* País */}
          <div>
            <Label htmlFor="pais">País</Label>
            <DropdownSelect
              id="pais"
              value={form.pais}
              disabled={!selectedContinent}
              placeholder="Selecione um país"
              options={countryOptions}
              onChange={handleCountryChange}
            />

          </div>

          {/* Cidade */}
          <div>
            <Label htmlFor="cidade">Cidade</Label>
            <DropdownSelect
              id="cidade"
              value={form.cidade}
              disabled={!selectedCountry}
              placeholder="Selecione uma cidade"
              options={cityOptions}
              onChange={handleCityChange}
            />

          </div>

          {geoError && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-300">
              {geoError}
            </div>
          )}

          {/* Feedback */}
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400">
              ✓ Servidor criado com sucesso!
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={[
              'rounded-xl bg-[--color-accent] px-6 py-3 text-sm font-semibold text-white sm:py-3.5 sm:text-base',
              'transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]',
              !canSubmit ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90',
            ].join(' ')}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <LoadingSpinner size="sm" />
                Criando...
              </span>
            ) : 'Criar Servidor'}
          </button>
        </form>
      </div>
    </div>
  )
}
