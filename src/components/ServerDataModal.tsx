import { useEffect, useState } from 'react'
import serverActiveImage from '../assets/server-active.png'
import { IconPencil, IconRefreshCcw } from './icons'
import { LoadingSpinner } from './LoadingSpinner'
import API_BASE from '../config/api'

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

function getCountryIso2(countryName?: string | null): string {
  if (!countryName) return ''
  return (COUNTRY_ISO2_BY_NAME[normalizeName(countryName)] ?? '').toUpperCase()
}

function getFlagImageUrl(iso2: string): string {
  return `https://flagcdn.com/w40/${iso2.toLowerCase()}.png`
}

interface ServerDataModalProps {
  servidor: {
    id: string | number
    nome: string
    pais?: string | null
    status?: string | boolean | null
    capacidade_atual?: number | null
    capacidade_total?: number | null
  } | null
  isOpen: boolean
  onClose: () => void
  onChanged: () => void
}

interface ServerFile {
  id: string
  servidor_id: string
  titulo: string
  descricao?: string | null
  tipo_arquivo: string
  tamanho_gb: number
  created_at: string
}

const FILE_TYPES = [
  'Documento PDF',
  'Planilha',
  'Imagem',
  'Vídeo',
  'Backup',
  'Log',
  'Dados CSV',
  'Arquivo ZIP',
]

const SIZE_OPTIONS_GB = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

function isAtivo(status?: string | boolean | null): boolean {
  if (typeof status === 'boolean') return status
  if (typeof status === 'string') {
    const n = status.trim().toLowerCase()
    return n === 'ativo' || n === 'active' || n === 'true'
  }
  return true
}

export function ServerDataModal({ servidor, isOpen, onClose, onChanged }: ServerDataModalProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  const [files, setFiles] = useState<ServerFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<ServerFile | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [editTarget, setEditTarget] = useState<ServerFile | null>(null)
  const [editTitulo, setEditTitulo] = useState('')
  const [editDescricao, setEditDescricao] = useState('')
  const [editTipo, setEditTipo] = useState('')
  const [editTamanho, setEditTamanho] = useState<number>(1)
  const [savingEdit, setSavingEdit] = useState(false)

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
    if (!isOpen || !servidor) return
    const serverId = servidor.id

    let active = true
    async function loadFiles() {
      setLoadingFiles(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE}/servidores/${serverId}/arquivos`)
        const data = await res.json().catch(() => [])
        if (!active) return

        if (!res.ok) {
          setError('Não foi possível carregar os arquivos deste servidor.')
          setFiles([])
          return
        }

        setFiles(Array.isArray(data) ? data : [])
      } catch {
        if (!active) return
        setError('Erro de conexão ao carregar os arquivos.')
        setFiles([])
      } finally {
        if (active) setLoadingFiles(false)
      }
    }

    loadFiles()
    return () => {
      active = false
    }
  }, [isOpen, servidor])

  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (deleteTarget) {
          setDeleteTarget(null)
          return
        }
        if (editTarget) {
          setEditTarget(null)
          return
        }
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose, deleteTarget, editTarget])

  if (!mounted || !servidor) return null

  const ativo = isAtivo(servidor.status)
  const paisIso2 = getCountryIso2(servidor.pais)
  const capacidadeAtual = servidor.capacidade_atual ?? 0
  const capacidadeTotal = servidor.capacidade_total ?? 4096
  const pct = capacidadeTotal > 0 ? (capacidadeAtual / capacidadeTotal) * 100 : 0
  const pctStr = pct.toFixed(1)
  const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f97316' : '#10b981'

  async function reloadFiles() {
    if (!servidor) return
    setLoadingFiles(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/servidores/${servidor.id}/arquivos`)
      const data = await res.json().catch(() => [])
      if (!res.ok) {
        setError('Não foi possível atualizar os arquivos.')
        return
      }
      setFiles(Array.isArray(data) ? data : [])
    } catch {
      setError('Erro de conexão ao atualizar os arquivos.')
    } finally {
      setLoadingFiles(false)
    }
  }

  async function confirmDelete() {
    if (!servidor || !deleteTarget || deleting) return
    setDeleting(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/servidores/${servidor.id}/arquivos/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        const message =
          (data && typeof data === 'object' && 'detail' in data && typeof data.detail === 'string' && data.detail) ||
          'Não foi possível excluir o arquivo.'
        setError(message)
        return
      }

      setDeleteTarget(null)
      await reloadFiles()
      onChanged()
    } catch {
      setError('Erro de conexão ao excluir o arquivo.')
    } finally {
      setDeleting(false)
    }
  }

  function openEdit(file: ServerFile) {
    setEditTarget(file)
    setEditTitulo(file.titulo)
    setEditDescricao(file.descricao ?? '')
    setEditTipo(file.tipo_arquivo)
    setEditTamanho(file.tamanho_gb)
  }

  async function saveEdit() {
    if (!servidor || !editTarget || savingEdit) return

    setSavingEdit(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/servidores/${servidor.id}/arquivos/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: editTitulo.trim(),
          descricao: editDescricao.trim() || null,
          tipo_arquivo: editTipo,
          tamanho_gb: editTamanho,
        }),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        const message =
          (data && typeof data === 'object' && 'detail' in data && typeof data.detail === 'string' && data.detail) ||
          'Não foi possível atualizar o arquivo.'
        setError(message)
        return
      }

      setEditTarget(null)
      await reloadFiles()
      onChanged()
    } catch {
      setError('Erro de conexão ao atualizar o arquivo.')
    } finally {
      setSavingEdit(false)
    }
  }

  const canSaveEdit =
    !savingEdit &&
    editTarget &&
    editTitulo.trim().length > 0 &&
    editTipo.length > 0 &&
    editTamanho >= 1 &&
    editTamanho <= 10

  return (
    <div
      className={[
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'transition-opacity duration-420 ease-[cubic-bezier(0.22,1,0.36,1)]',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
      ].join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label="Gerenciamento de dados"
    >
      <div
        className={[
          'absolute inset-0 bg-black/65 backdrop-blur-sm',
          'transition-opacity duration-420 ease-[cubic-bezier(0.22,1,0.36,1)]',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={[
          'relative w-full max-w-5xl rounded-3xl border border-[--color-border] p-4 shadow-2xl sm:p-6',
          'transition-all duration-420 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform will-change-opacity',
          visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95',
        ].join(' ')}
        style={{ backgroundColor: 'var(--color-sidebar-bg)' }}
      >
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-[--color-border] pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <img src={serverActiveImage} alt="Servidor" className="h-9 w-9 shrink-0 object-contain sm:h-12 sm:w-12" />
            <div className="min-w-0">
              <h3 className="text-xl font-bold leading-tight text-[--color-text-primary] sm:text-3xl">Gerenciamento de Dados</h3>
              <div className="mt-1 flex items-center gap-1.5">
                {paisIso2 && (
                  <img
                    src={getFlagImageUrl(paisIso2)}
                    alt={servidor.pais ?? ''}
                    className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover sm:h-4 sm:w-6"
                    loading="lazy"
                  />
                )}
                <p className="truncate text-xs font-medium text-[--color-text-secondary] sm:text-sm">{servidor.nome}</p>
              </div>
              {/* Barra de capacidade */}
              <div className="mt-2 flex items-center gap-2">
                <div className="relative h-3 w-full min-w-[80px] max-w-xs overflow-hidden rounded-full bg-white/10 sm:h-3.5">
                  <div
                    style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }}
                    className="absolute left-0 top-0 h-full rounded-full shadow-[0_0_6px_currentColor] transition-all duration-500"
                  />
                </div>
                <span
                  style={{ color: barColor }}
                  className="shrink-0 text-xs font-semibold tabular-nums sm:text-sm"
                >
                  {pctStr}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <span className={[
              'inline-flex min-w-16 items-center justify-center rounded-full border px-2.5 py-1 text-xs font-semibold sm:min-w-24 sm:px-4 sm:py-1.5 sm:text-base',
              ativo
                ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-400'
                : 'border-red-500/70 bg-red-500/10 text-red-400',
            ].join(' ')}>
              {ativo ? 'ativo' : 'inativo'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-[--color-text-secondary] transition-colors hover:bg-[--color-sidebar-hover] hover:text-[--color-text-primary]"
              aria-label="Fechar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={reloadFiles}
            disabled={loadingFiles}
            className="group flex h-10 w-10 items-center justify-center rounded-xl border border-[--color-border] bg-[--color-main-bg] text-[--color-text-secondary] transition-all duration-200 hover:-translate-y-0.5 hover:border-[--color-accent]/50 hover:text-[--color-accent] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Recarregar arquivos"
            title="Recarregar arquivos"
          >
            <IconRefreshCcw className={["h-5 w-5", loadingFiles ? 'animate-spin' : 'group-hover:rotate-[-35deg]'].join(' ')} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-[--color-border] bg-[--color-card-bg]">
          <div className="max-h-[46vh] overflow-y-auto">
            {loadingFiles ? (
              <div className="flex items-center justify-center py-10">
                <LoadingSpinner size="md" />
              </div>
            ) : files.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[--color-text-secondary]">
                Nenhum arquivo cadastrado para este servidor.
              </p>
            ) : (
              files.map(file => (
                <div key={file.id} className="border-b border-[--color-border]/60 px-4 py-3 last:border-b-0">
                  {/* Mobile: stack; Desktop: grid */}
                  <div className="flex items-start justify-between gap-2 sm:grid sm:grid-cols-12 sm:items-center">
                    <div className="min-w-0 flex-1 sm:col-span-5 sm:pr-3">
                      <p className="truncate text-sm font-semibold text-[--color-text-primary]">{file.titulo}</p>
                      <p className="mt-0.5 truncate text-xs text-[--color-text-secondary]">{file.descricao || 'Sem descrição'}</p>
                      {/* Tipo + tamanho só no mobile */}
                      <p className="mt-1 text-xs text-[--color-text-secondary] sm:hidden">
                        {file.tipo_arquivo} &middot; {file.tamanho_gb} GB
                      </p>
                    </div>
                    {/* Tipo + tamanho no desktop */}
                    <div className="hidden sm:col-span-2 sm:block sm:text-sm sm:text-[--color-text-secondary]">{file.tipo_arquivo}</div>
                    <div className="hidden sm:col-span-2 sm:block sm:text-sm sm:text-[--color-text-secondary]">{file.tamanho_gb} GB</div>
                    <div className="flex shrink-0 items-center gap-2 sm:col-span-3 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => openEdit(file)}
                        className="group flex h-8 w-8 items-center justify-center rounded-lg border border-[--color-border] bg-[--color-main-bg] text-[--color-text-primary] transition-all duration-200 hover:border-[--color-accent]/50 hover:text-[--color-accent]"
                        aria-label="Editar arquivo"
                      >
                        <IconPencil className="h-4 w-4 transition-transform duration-200 group-hover:rotate-[-10deg]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(file)}
                        className="group flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 transition-all duration-200 hover:bg-red-500/20"
                        aria-label="Excluir arquivo"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                          <path fillRule="evenodd" d="M8.75 2a.75.75 0 00-.75.75V3H5.5a.75.75 0 000 1.5h.382l.548 9.315A2.25 2.25 0 008.676 16h2.648a2.25 2.25 0 002.246-2.185l.548-9.315h.382a.75.75 0 000-1.5H12V2.75A.75.75 0 0011.25 2h-2.5zM9.5 3V2.75a.25.25 0 01.25-.25h.5a.25.25 0 01.25.25V3h-1zM8 6.25a.75.75 0 011.5 0v6a.75.75 0 01-1.5 0v-6zm4 .75a.75.75 0 00-1.5 0v6a.75.75 0 001.5 0v-6z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {deleteTarget && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-black/70 backdrop-blur-[2px] p-4">
            <div className="w-full max-w-md rounded-2xl border border-[--color-border] p-5" style={{ backgroundColor: 'var(--color-sidebar-bg)' }}>
              <h4 className="text-base font-semibold text-[--color-text-primary]">Excluir arquivo?</h4>
              <p className="mt-2 text-sm text-[--color-text-secondary]">
                Você tem certeza que deseja excluir <span className="font-medium text-[--color-text-primary]">{deleteTarget.titulo}</span>?
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="flex-1 rounded-xl border border-[--color-border] bg-[--color-main-bg] py-2 text-sm font-medium text-[--color-text-secondary] transition-colors hover:text-[--color-text-primary] disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex-1 rounded-xl border border-red-500/70 bg-red-500/10 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-60"
                >
                  {deleting ? 'Excluindo...' : 'Sim, excluir'}
                </button>
              </div>
            </div>
          </div>
        )}

        {editTarget && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-black/70 backdrop-blur-[2px] p-4">
            <div className="w-full max-w-lg rounded-2xl border border-[--color-border] p-5" style={{ backgroundColor: 'var(--color-sidebar-bg)' }}>
              <h4 className="text-base font-semibold text-[--color-text-primary]">Editar arquivo</h4>

              <div className="mt-4 grid gap-3">
                <input
                  type="text"
                  value={editTitulo}
                  onChange={e => setEditTitulo(e.target.value)}
                  placeholder="Título"
                  className="w-full rounded-xl border border-[--color-border] bg-[--color-main-bg] px-4 py-2.5 text-sm text-[--color-text-primary] outline-none focus:border-[--color-accent]"
                />
                <input
                  type="text"
                  value={editDescricao}
                  onChange={e => setEditDescricao(e.target.value)}
                  placeholder="Descrição"
                  className="w-full rounded-xl border border-[--color-border] bg-[--color-main-bg] px-4 py-2.5 text-sm text-[--color-text-primary] outline-none focus:border-[--color-accent]"
                />
                <select
                  value={editTipo}
                  onChange={e => setEditTipo(e.target.value)}
                  className="w-full rounded-xl border border-[--color-border] bg-[--color-main-bg] px-4 py-2.5 text-sm text-[--color-text-primary] outline-none focus:border-[--color-accent]"
                >
                  {FILE_TYPES.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
                <select
                  value={editTamanho}
                  onChange={e => setEditTamanho(Number(e.target.value))}
                  className="w-full rounded-xl border border-[--color-border] bg-[--color-main-bg] px-4 py-2.5 text-sm text-[--color-text-primary] outline-none focus:border-[--color-accent]"
                >
                  {SIZE_OPTIONS_GB.map(size => (
                    <option key={size} value={size}>{size} GB</option>
                  ))}
                </select>
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  disabled={savingEdit}
                  className="flex-1 rounded-xl border border-[--color-border] bg-[--color-main-bg] py-2 text-sm font-medium text-[--color-text-secondary] transition-colors hover:text-[--color-text-primary] disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={!canSaveEdit}
                  className="flex-1 rounded-xl border border-[#f97316]/70 bg-[#f97316]/12 py-2 text-sm font-semibold text-[#f97316] transition-colors hover:bg-[#f97316]/20 disabled:opacity-40"
                >
                  {savingEdit ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
