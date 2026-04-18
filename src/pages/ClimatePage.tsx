import { useEffect, useMemo, useState } from 'react'
import API_BASE from '../config/api'
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
  flag: string
  temperatura: number | null
  weatherCode: number | null
  localTimeIso: string | null
}

const RAINY_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99])
const CLOUDY_CODES = new Set([2, 3, 45, 48])

function isNightByIso(localTimeIso: string | null): boolean {
  if (!localTimeIso) return false
  const localDate = new Date(localTimeIso)
  if (Number.isNaN(localDate.getTime())) return false
  const hour = localDate.getHours()
  return hour < 6 || hour >= 18
}

function getWeatherIcon(weatherCode: number | null, localTimeIso: string | null) {
  if (isNightByIso(localTimeIso)) return nightPng
  if (weatherCode != null && RAINY_CODES.has(weatherCode)) return rainPng
  if (weatherCode != null && CLOUDY_CODES.has(weatherCode)) return cloudyPng
  return sunPng
}

function formatLocalTime(localTimeIso: string | null): string {
  if (!localTimeIso) return '—'
  const date = new Date(localTimeIso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
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
      flag: country.flag ?? '',
      temperatura: null,
      weatherCode: null,
      localTimeIso: null,
    }
  }

  try {
    const endpoint = new URL('https://api.open-meteo.com/v1/forecast')
    endpoint.searchParams.set('latitude', String(firstCity.lat))
    endpoint.searchParams.set('longitude', String(firstCity.lng))
    endpoint.searchParams.set('current', 'temperature_2m,weather_code,time')
    endpoint.searchParams.set('timezone', 'auto')

    const response = await fetch(endpoint.toString(), { signal })
    if (!response.ok) {
      throw new Error(`Open-Meteo HTTP ${response.status}`)
    }

    const payload = (await response.json()) as {
      current?: {
        temperature_2m?: number
        weather_code?: number
        time?: string
      }
    }

    return {
      continente,
      pais: country.nome,
      flag: country.flag ?? '',
      temperatura: typeof payload.current?.temperature_2m === 'number' ? payload.current.temperature_2m : null,
      weatherCode: typeof payload.current?.weather_code === 'number' ? payload.current.weather_code : null,
      localTimeIso: typeof payload.current?.time === 'string' ? payload.current.time : null,
    }
  } catch {
    return {
      continente,
      pais: country.nome,
      flag: country.flag ?? '',
      temperatura: null,
      weatherCode: null,
      localTimeIso: null,
    }
  }
}

export function ClimatePage() {
  const [climates, setClimates] = useState<CountryClimate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadClimates() {
      setLoading(true)
      setError(null)

      try {
        const geoResponse = await fetch(`${API_BASE}/geografia/`, { signal: controller.signal })
        if (!geoResponse.ok) {
          throw new Error('Falha ao carregar geografia')
        }

        const geography = (await geoResponse.json()) as GeographyContinent[]
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
      } catch {
        setError('Não foi possível carregar os dados de clima.')
      } finally {
        setLoading(false)
      }
    }

    loadClimates()
    return () => controller.abort()
  }, [])

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="rounded-xl border border-[--color-border] bg-[--color-card-bg] p-5">
          <p className="text-sm text-[--color-text-secondary]">Carregando dados climáticos...</p>
        </div>
      )
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
          const iconSrc = getWeatherIcon(climate.weatherCode, climate.localTimeIso)
          return (
            <article
              key={`${climate.continente}-${climate.pais}`}
              className="rounded-xl border border-[--color-border] bg-[--color-card-bg] px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xl font-semibold text-[--color-text-primary] leading-tight">
                    {climate.flag ? `${climate.flag} ` : ''}
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
                    Hora Atual {formatLocalTime(climate.localTimeIso)}
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
