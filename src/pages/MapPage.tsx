import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useLocation } from 'react-router-dom'
import { LoadingPage } from '../components/LoadingSpinner'
import { normalizeCountryLabel } from '../utils/countryLabel'

// ─── Corrige o caminho dos ícones padrão do Leaflet no Vite ──────────────────
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import serverStorageIcon from '../assets/server-storage.png'
import serverStorageDisabledIcon from '../assets/server-storage-disabled.svg'

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

const API_BASE = 'http://127.0.0.1:8000'

interface Servidor {
  id?: string | number
  nome: string
  pais: string
  continente: string
  cidade?: string
  latitude?: number
  longitude?: number
  capacidade_atual?: number
  capacidade_total?: number
  status?: string | boolean | null
  create_at?: string | null
  disabled_at?: string | null
  reactivated_at?: string | null
}

interface MapFocusState {
  focusServer?: {
    id?: string | number
    nome?: string
    latitude?: number
    longitude?: number
  }
}

function isAtivo(status?: string | boolean | null): boolean {
  if (typeof status === 'boolean') return status
  if (typeof status === 'string') {
    const n = status.trim().toLowerCase()
    return n === 'ativo' || n === 'active' || n === 'true'
  }
  return true
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
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

const activeServerIcon = L.icon({
  iconUrl: serverStorageIcon,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -32],
})

const inactiveServerIcon = L.icon({
  iconUrl: serverStorageDisabledIcon,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -32],
})

export function MapPage() {
  const location = useLocation()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const focusAppliedRef = useRef(false)

  const [servidores, setServidores] = useState<Servidor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Carrega servidores ────────────────────────────────────────────────────
  useEffect(() => {
    let active = true
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/servidores/`)
        if (!res.ok) {
          if (active) setError('Não foi possível carregar os servidores.')
          return
        }
        const data = await res.json()
        if (!active || !Array.isArray(data)) return

        const normalized = data
          .map((item): Servidor | null => {
            if (!item || typeof item !== 'object') return null
            const r = item as Record<string, unknown>
            const nome = typeof r.nome === 'string' ? r.nome : ''
            const pais = typeof r.pais === 'string' ? normalizeCountryLabel(r.pais) : ''
            const continente = typeof r.continente === 'string' ? r.continente : ''
            if (!nome) return null
            return {
              id: (typeof r.id === 'string' || typeof r.id === 'number') ? r.id : nome,
              nome, pais, continente,
              cidade: typeof r.cidade === 'string' ? r.cidade : undefined,
              latitude: toNumber(r.latitude) ?? toNumber(r.lat) ?? undefined,
              longitude: toNumber(r.longitude) ?? toNumber(r.lng) ?? undefined,
              capacidade_atual: typeof r.capacidade_atual === 'number' ? r.capacidade_atual : 0,
              capacidade_total: typeof r.capacidade_total === 'number' ? r.capacidade_total : 4096,
              status: (typeof r.status === 'string' || typeof r.status === 'boolean') ? r.status : null,
              create_at: toIsoString(r.create_at),
              disabled_at: toIsoString(r.disabled_at),
              reactivated_at: toIsoString(r.reactivated_at),
            }
          })
          .filter((s): s is Servidor => s !== null)

        if (active) setServidores(normalized)
      } catch {
        if (active) setError('Erro ao conectar ao backend.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  // ── Inicializa o mapa ─────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
    })

    // Tile layer colorido
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    // Controle de zoom no canto inferior direito
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Escala
    L.control.scale({ position: 'bottomleft', metric: true, imperial: false }).addTo(map)

    markersLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    // Garante o cálculo correto do tamanho quando o container aparece após loading
    requestAnimationFrame(() => map.invalidateSize())

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [loading])

  // ── Adiciona marcadores quando os servidores carregam ─────────────────────
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current || loading) return

    markersLayerRef.current.clearLayers()

    const comCoordenadas = servidores.filter(
      s => s.latitude != null && s.longitude != null,
    )

    const navState = (location.state as MapFocusState | null) ?? null
    const focusServer = navState?.focusServer
    let focusedLatLng: [number, number] | null = null
    let focusedMarker: L.Marker | null = null

    comCoordenadas.forEach(servidor => {
      const lat = servidor.latitude!
      const lng = servidor.longitude!
      const ativo = isAtivo(servidor.status)

      const nome = escapeHtml(servidor.nome)
      const pais = escapeHtml(servidor.pais)
      const continente = escapeHtml(servidor.continente)
      const cidade = servidor.cidade ? escapeHtml(servidor.cidade) : ''

      const total = servidor.capacidade_total || 4096
      const atual = servidor.capacidade_atual || 0
      const pct = total ? ((atual / total) * 100).toFixed(1) : '0.0'

      const statusColor = ativo ? '#10b981' : '#ef4444'
      const statusLabel = ativo ? 'Ativo' : 'Inativo'
      const createdAt = escapeHtml(formatDateTime(servidor.create_at))
      const disabledAt = escapeHtml(formatDateTime(servidor.disabled_at))
      const reactivatedAt = escapeHtml(formatDateTime(servidor.reactivated_at))

      const popupContent = `
        <div class="oracle-popup-card">
          <div class="oracle-popup-title">${nome}</div>

          <div class="oracle-popup-line">
            📍 ${cidade ? cidade + ', ' : ''}${pais}
          </div>
          <div class="oracle-popup-line oracle-popup-line--last">
            🌎 ${continente}
          </div>

          <div class="oracle-popup-progress-wrap">
            <div class="oracle-popup-progress-track">
              <div style="
                height: 100%; width: ${pct}%;
                background: #f97316; border-radius: 3px;
                transition: width 0.3s;
              "></div>
            </div>
            <span class="oracle-popup-progress-text">${pct}%</span>
          </div>

          <div class="oracle-popup-status-wrap">
            <span style="
              display: inline-block;
              padding: 2px 10px; border-radius: 999px;
              font-size: 11px; font-weight: 600;
              background: ${statusColor}1a;
              border: 1px solid ${statusColor}99;
              color: ${statusColor};
            ">${statusLabel}</span>
          </div>

          <div class="oracle-popup-line" style="margin-top: 8px; font-size: 11px;">
            Criado em: ${createdAt}
          </div>
          <div class="oracle-popup-line" style="font-size: 11px;">
            Desativado em: ${disabledAt}
          </div>
          <div class="oracle-popup-line" style="font-size: 11px; margin-bottom: 0;">
            Reativado em: ${reactivatedAt}
          </div>
        </div>
      `

      const marker = L.marker([lat, lng], { icon: ativo ? activeServerIcon : inactiveServerIcon })
        .bindPopup(popupContent, {
          maxWidth: 260,
          className: 'oracle-popup',
        })
        .bindTooltip(nome, {
          direction: 'top',
          offset: [0, -36],
          className: 'oracle-tooltip',
        })
        .addTo(markersLayerRef.current!)

      if (!focusAppliedRef.current && focusServer) {
        const byId =
          focusServer.id != null &&
          servidor.id != null &&
          String(focusServer.id) === String(servidor.id)
        const byName =
          typeof focusServer.nome === 'string' &&
          focusServer.nome.trim() !== '' &&
          servidor.nome.trim().toLowerCase() === focusServer.nome.trim().toLowerCase()

        if (byId || byName) {
          focusedLatLng = [lat, lng]
          focusedMarker = marker
        }
      }
    })

    if (!focusAppliedRef.current && focusServer) {
      if (
        !focusedLatLng &&
        typeof focusServer.latitude === 'number' && Number.isFinite(focusServer.latitude) &&
        typeof focusServer.longitude === 'number' && Number.isFinite(focusServer.longitude)
      ) {
        focusedLatLng = [focusServer.latitude, focusServer.longitude]
      }

      if (focusedLatLng) {
        mapRef.current.flyTo(focusedLatLng, 8, { duration: 1.2 })
        if (focusedMarker) {
          window.setTimeout(() => focusedMarker?.openPopup(), 650)
        }
        focusAppliedRef.current = true
        return
      }
    }

    // Centraliza o mapa se houver marcadores
    if (comCoordenadas.length > 0) {
      const bounds = L.latLngBounds(
        comCoordenadas.map(s => [s.latitude!, s.longitude!] as [number, number]),
      )
      mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 6 })
    }
  }, [servidores, loading, location.state])

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) return <LoadingPage />

  return (
    <div className="flex flex-1 flex-col">
      {/* Cabeçalho */}
      <div className="px-8 pt-8 pb-4 shrink-0">
        <h1 className="text-2xl font-bold text-[--color-text-primary]">Mapa Global</h1>
        <p className="mt-1 text-sm text-[--color-text-secondary]">
          Visualize a distribuição geográfica dos servidores.
          {servidores.length > 0 && (
            <span className="ml-2 text-[--color-text-secondary]">
              {servidores.filter(s => s.latitude != null).length} de {servidores.length} servidor(es) com localização.
            </span>
          )}
        </p>
      </div>

      {error && (
        <div className="mx-8 mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Mapa */}
      <div className="relative flex-1 mx-8 mb-8 rounded-2xl overflow-hidden border border-[--color-border]">
        <div ref={mapContainerRef} className="absolute inset-0" />
      </div>
    </div>
  )
}
