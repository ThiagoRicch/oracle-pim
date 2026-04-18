import { useEffect, useMemo, useState } from 'react'
import API_BASE from '../config/api'
import { LoadingPage } from '../components/LoadingSpinner'
import { normalizeCountryLabel } from '../utils/countryLabel'
import sunPng from '../assets/sun.png'
import cloudyPng from '../assets/cloudy.png'
import rainPng from '../assets/rain.png'
import nightPng from '../assets/night.png'

interface GeographyCity {
  nome: string
  lat: number
  lng: number
  indice: number
}

interface GeographyCountry {
  nome: string
  iso2?: string
  flag?: string
  cidades: GeographyCity[]
}

interface GeographyContinent {
  nome: string
  paises: GeographyCountry[]
}

interface CountryClimate {
  continente: string
  pais: string
  iso2: string
  temperatura: number | null
  weatherCode: number | null
  localTimeIso: string | null
  timezone: string | null
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

const RAINY_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99])
const CLOUDY_CODES = new Set([2, 3, 45, 48])

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

function normalizePotentialMojibakeFlag(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  try {
    // Corrige casos de emoji quebrado por encoding no payload.
    return decodeURIComponent(escape(trimmed))
  } catch {
    return trimmed
  }
}

function getCountryIso2(countryName: string, rawIso2: string): string {
  const iso = rawIso2.trim().toUpperCase()
  if (/^[A-Z]{2}$/.test(iso)) return iso
  return COUNTRY_ISO2_BY_NAME[normalizeName(countryName)] ?? ''
}

function getCountryFlag(countryName: string, rawFlag: string, rawIso2: string): string {
  const normalizedFlag = normalizePotentialMojibakeFlag(rawFlag)
  if (normalizedFlag) {
    if (/^[A-Za-z]{2}$/.test(normalizedFlag)) {
      return toFlagFromIso2(normalizedFlag)
    }
    return normalizedFlag
  }

  const iso2 = getCountryIso2(countryName, rawIso2)
  return iso2 ? toFlagFromIso2(iso2) : ''
}

function getFlagImageUrl(iso2: string): string {
  return `https://flagcdn.com/w40/${iso2.toLowerCase()}.png`
}

interface ServerRecord {
  pais?: string
  continente?: string
  latitude?: number | string
  longitude?: number | string
}

function buildGeographyFromServers(payload: unknown): GeographyContinent[] {
  if (!Array.isArray(payload)) return []

  const byContinent = new Map<string, Map<string, GeographyCountry>>()

  for (const item of payload) {
    if (!item || typeof item !== 'object') continue
    const rec = item as ServerRecord

    const rawCountry = typeof rec.pais === 'string' ? rec.pais : ''
    const normalizedCountry = normalizeCountryLabel(rawCountry)
    const continent = typeof rec.continente === 'string' ? rec.continente : ''
    const lat = toNumber(rec.latitude)
    const lng = toNumber(rec.longitude)

    if (!normalizedCountry || !continent || lat === null || lng === null) continue

    if (!byContinent.has(continent)) {
      byContinent.set(continent, new Map())
    }

    const continentCountries = byContinent.get(continent)!
    if (!continentCountries.has(normalizedCountry)) {
      const iso2 = getCountryIso2(normalizedCountry, '')
      continentCountries.set(normalizedCountry, {
        nome: normalizedCountry,
        iso2,
        flag: getCountryFlag(normalizedCountry, '', iso2),
        cidades: [{ nome: normalizedCountry, lat, lng, indice: 0 }],
      })
    }
  }

  return [...byContinent.entries()].map(([nome, countries]) => ({
    nome,
    paises: [...countries.values()],
  }))
}

function normalizeGeography(payload: unknown): GeographyContinent[] {
  if (!Array.isArray(payload)) return []

  return payload
    .map((continent): GeographyContinent | null => {
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
        .map((country): GeographyCountry | null => {
          if (!country || typeof country !== 'object') return null
          const countryRecord = country as Record<string, unknown>
          const countryName =
            (countryRecord.nome as string | undefined) ??
            (countryRecord.pais as string | undefined) ??
            (countryRecord.name as string | undefined) ??
            ''

          if (!countryName) return null

          const normalizedCountryName = normalizeCountryLabel(countryName)
          const iso2 =
            (countryRecord.iso2 as string | undefined) ??
            (countryRecord.iso as string | undefined) ??
            ''
          const rawFlag =
            (countryRecord.flag as string | undefined) ??
            (countryRecord.bandeira as string | undefined) ??
            ''

          const rawCities =
            (countryRecord.cidades as unknown[] | undefined) ??
            (countryRecord.localizacoes as unknown[] | undefined) ??
            []

          const cidades = rawCities
            .map((city, cityIndex): GeographyCity | null => {
              if (!city || typeof city !== 'object') return null
              const cityRecord = city as Record<string, unknown>
              const cityName =
                (cityRecord.nome as string | undefined) ??
                (cityRecord.cidade as string | undefined) ??
                (cityRecord.name as string | undefined) ??
                ''
              const lat = toNumber(cityRecord.lat) ?? toNumber(cityRecord.latitude)
              const lng = toNumber(cityRecord.lng) ?? toNumber(cityRecord.longitude)
              const indice = toNumber(cityRecord.indice) ?? cityIndex

              if (!cityName || lat === null || lng === null) return null

              return {
                nome: cityName,
                lat,
                lng,
                indice,
              }
            })
            .filter((city): city is GeographyCity => city !== null)

          return {
            nome: normalizedCountryName,
            iso2: getCountryIso2(normalizedCountryName, iso2),
            flag: getCountryFlag(normalizedCountryName, rawFlag, iso2),
            cidades,
          }
        })
        .filter((country): country is GeographyCountry => country !== null)

      if (!continentName) return null

      return {
        nome: continentName,
        paises,
      }
    })
    .filter((continent): continent is GeographyContinent => continent !== null)
}

function isNightByIso(localTimeIso: string | null): boolean {
  if (!localTimeIso) return false
  const localDate = new Date(localTimeIso)
  if (Number.isNaN(localDate.getTime())) return false
  const hour = localDate.getHours()
  return hour < 6 || hour >= 18
}

function getHourInTimezone(timezone: string | null): number | null {
  if (!timezone) return null
  try {
    const hourText = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hourCycle: 'h23',
      timeZone: timezone,
    }).format(new Date())
    const hour = Number(hourText)
    return Number.isFinite(hour) ? hour : null
  } catch {
    return null
  }
}

function getWeatherIcon(weatherCode: number | null, localTimeIso: string | null, timezone: string | null) {
  const timezoneHour = getHourInTimezone(timezone)
  const isNight = timezoneHour != null ? timezoneHour < 6 || timezoneHour >= 18 : isNightByIso(localTimeIso)

  if (isNight) return nightPng
  if (weatherCode != null && RAINY_CODES.has(weatherCode)) return rainPng
  if (weatherCode != null && CLOUDY_CODES.has(weatherCode)) return cloudyPng
  return sunPng
}

function formatLocalTime(localTimeIso: string | null, timezone: string | null): string {
  if (timezone) {
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone,
      }).format(new Date())
    } catch {
      // fallback para o timestamp retornado pela API
    }
  }

  if (!localTimeIso) return '—'
  const date = new Date(localTimeIso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTemperature(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value.toFixed(1)}°C`
}

async function fetchCountryWeather(country: GeographyCountry, continente: string, signal: AbortSignal): Promise<CountryClimate> {
  const firstCity = country.cidades?.[0]
  if (!firstCity) {
    return {
      continente,
      pais: country.nome,
      iso2: getCountryIso2(country.nome, country.iso2 ?? ''),
      temperatura: null,
      weatherCode: null,
      localTimeIso: null,
      timezone: null,
    }
  }

  try {
    const endpoint = new URL('https://api.open-meteo.com/v1/forecast')
    endpoint.searchParams.set('latitude', String(firstCity.lat))
    endpoint.searchParams.set('longitude', String(firstCity.lng))
    endpoint.searchParams.set('current', 'temperature_2m,weather_code')
    endpoint.searchParams.set('timezone', 'auto')

    const response = await fetch(endpoint.toString(), { signal })
    if (!response.ok) {
      throw new Error(`Open-Meteo HTTP ${response.status}`)
    }

    const payload = (await response.json()) as {
      timezone?: string
      current?: {
        temperature_2m?: number
        weather_code?: number
        time?: string
      }
    }

    return {
      continente,
      pais: country.nome,
      iso2: getCountryIso2(country.nome, country.iso2 ?? ''),
      temperatura: typeof payload.current?.temperature_2m === 'number' ? payload.current.temperature_2m : null,
      weatherCode: typeof payload.current?.weather_code === 'number' ? payload.current.weather_code : null,
      localTimeIso: typeof payload.current?.time === 'string' ? payload.current.time : null,
      timezone: typeof payload.timezone === 'string' ? payload.timezone : null,
    }
  } catch {
    return {
      continente,
      pais: country.nome,
      iso2: getCountryIso2(country.nome, country.iso2 ?? ''),
      temperatura: null,
      weatherCode: null,
      localTimeIso: null,
      timezone: null,
    }
  }
}

export function ClimatePage() {
  const [climates, setClimates] = useState<CountryClimate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const loadStartedAt = Date.now()
    const MIN_LOADING_MS = 550
    let requestAborted = false

    async function loadClimates() {
      setLoading(true)
      setError(null)

      try {
        let geography: GeographyContinent[] | null = null

        for (const endpoint of GEOGRAPHY_ENDPOINTS) {
          const geoResponse = await fetch(`${API_BASE}${endpoint}`, { signal: controller.signal })
          if (!geoResponse.ok) {
            continue
          }
          geography = normalizeGeography(await geoResponse.json())
          break
        }

        if (!geography || geography.every(cont => (cont.paises ?? []).length === 0)) {
          const serversResponse = await fetch(`${API_BASE}/servidores/`, { signal: controller.signal })
          if (serversResponse.ok) {
            geography = buildGeographyFromServers(await serversResponse.json())
          }
        }

        if (!geography || geography.every(cont => (cont.paises ?? []).length === 0)) {
          throw new Error('Falha ao carregar geografia')
        }

        const countriesToFetch = geography.flatMap(continente =>
          (continente.paises ?? []).map(country => ({ country, continente: continente.nome })),
        )

        const allClimates = await Promise.all(
          countriesToFetch.map(({ country, continente }) =>
            fetchCountryWeather(country, continente, controller.signal),
          ),
        )

        allClimates.sort((a, b) => {
          const byContinent = a.continente.localeCompare(b.continente, 'pt-BR')
          if (byContinent !== 0) return byContinent
          return a.pais.localeCompare(b.pais, 'pt-BR')
        })

        setClimates(allClimates)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          requestAborted = true
          return
        }
        setError('Não foi possível carregar os dados de clima.')
      } finally {
        // Em dev (React StrictMode), um ciclo inicial pode ser abortado.
        // Ignoramos esse ciclo para não piscar "Nenhum país encontrado".
        if (requestAborted || controller.signal.aborted) {
          return
        }

        const elapsed = Date.now() - loadStartedAt
        if (elapsed < MIN_LOADING_MS) {
          await new Promise(resolve => setTimeout(resolve, MIN_LOADING_MS - elapsed))
        }
        setLoading(false)
      }
    }

    loadClimates()
    return () => controller.abort()
  }, [])

  const content = useMemo(() => {
    if (loading) {
      return <LoadingPage message="Carregando dados climáticos..." />
    }

    if (error) {
      return (
        <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-5">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )
    }

    if (!climates.length) {
      return (
        <div className="rounded-xl border border-[--color-border] bg-[--color-card-bg] p-5">
          <p className="text-sm text-[--color-text-secondary]">Nenhum país encontrado para exibir.</p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {climates.map(climate => {
          const iconSrc = getWeatherIcon(climate.weatherCode, climate.localTimeIso, climate.timezone)
          return (
            <article
              key={`${climate.continente}-${climate.pais}`}
              className="rounded-xl border border-[--color-border] bg-[--color-card-bg] px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xl font-semibold text-[--color-text-primary] leading-tight">
                    {climate.iso2 ? (
                      <img
                        src={getFlagImageUrl(climate.iso2)}
                        alt={`Bandeira de ${climate.pais}`}
                        className="mr-2 inline-block h-4 w-6 rounded-[2px] object-cover align-middle"
                        loading="lazy"
                      />
                    ) : null}
                    {climate.pais}
                  </p>
                  <p className="mt-1 text-sm text-[--color-text-secondary]">{climate.continente}</p>
                </div>

                <div className="flex flex-col items-end text-right">
                  <div className="flex items-center gap-2">
                    <img
                      src={iconSrc}
                      alt="Condição climática"
                      className="h-8 w-8 object-contain"
                      loading="lazy"
                    />
                    <span className="text-lg font-semibold text-[--color-text-primary]">
                      {formatTemperature(climate.temperatura)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[--color-text-secondary]">
                    Hora Atual {formatLocalTime(climate.localTimeIso, climate.timezone)}
                  </p>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    )
  }, [climates, error, loading])

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6 lg:p-8 min-w-0">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-[--color-text-primary] sm:text-3xl">Clima</h1>
        <p className="mt-1 text-sm text-[--color-text-secondary]">
          Condição climática atual para todos os países disponíveis na aplicação.
        </p>
      </div>

      {content}
    </div>
  )
}
