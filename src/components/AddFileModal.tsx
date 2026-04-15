import { useEffect, useRef, useState, type FormEvent } from 'react'
import { LoadingSpinner } from './LoadingSpinner'

const API_BASE = 'http://127.0.0.1:8000'

interface AddFileModalProps {
  servidor: {
    id: string | number
    nome: string
  } | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
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

interface DropdownOption {
  value: string
  label: string
}

interface DropdownSelectProps {
  id: string
  value: string
  placeholder: string
  options: DropdownOption[]
  onChange: (v: string) => void
}

function DropdownSelect({ id, value, placeholder, options, onChange }: DropdownSelectProps) {
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

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={[
          'relative w-full rounded-xl border bg-[--color-main-bg] px-4 py-3 pr-11 text-left',
          'text-sm text-[--color-text-primary] outline-none',
          'transition-colors focus:border-[--color-accent] focus:ring-1 focus:ring-[--color-accent]',
          'border-[--color-border]',
        ].join(' ')}
      >
        {selected ? (
          <span>{selected.label}</span>
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
          open
            ? 'mt-2 grid-rows-[1fr] opacity-100'
            : 'mt-0 grid-rows-[0fr] opacity-0 pointer-events-none',
        ].join(' ')}
      >
        <ul className="min-h-0 max-h-56 overflow-auto rounded-xl border border-[--color-border] bg-[--color-main-bg] p-0 shadow-xl ring-1 ring-black/20">
          {options.map(option => (
            <li key={option.value} className="bg-[--color-main-bg]">
              <button
                type="button"
                className={[
                  'flex w-full items-center px-3 py-2 text-left text-sm text-[--color-text-primary]',
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
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function AddFileModal({ servidor, isOpen, onClose, onSuccess }: AddFileModalProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipoArquivo, setTipoArquivo] = useState('')
  const [tamanhoGb, setTamanhoGb] = useState<number | ''>('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const fileTypeOptions: DropdownOption[] = FILE_TYPES.map(tipo => ({
    value: tipo,
    label: tipo,
  }))

  const sizeOptions: DropdownOption[] = SIZE_OPTIONS_GB.map(size => ({
    value: String(size),
    label: `${size} GB`,
  }))

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
    setTitulo('')
    setDescricao('')
    setTipoArquivo('')
    setTamanhoGb('')
    setError(null)
    setSuccess(false)
  }, [isOpen, servidor])

  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!servidor) return

    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/servidores/${servidor.id}/arquivos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          tipo_arquivo: tipoArquivo,
          tamanho_gb: tamanhoGb,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const message =
          (data && typeof data === 'object' && 'detail' in data && typeof data.detail === 'string' && data.detail) ||
          'Não foi possível adicionar o arquivo.'
        setError(message)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 700)
    } catch {
      setError('Erro de conexão com o backend.')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted || !servidor) return null

  const canSubmit =
    !loading &&
    titulo.trim().length > 0 &&
    tipoArquivo.length > 0 &&
    typeof tamanhoGb === 'number' &&
    tamanhoGb >= 1 &&
    tamanhoGb <= 10

  return (
    <div
      className={[
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'transition-opacity duration-420 ease-[cubic-bezier(0.22,1,0.36,1)]',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
      ].join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label="Adicionar dados"
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
          'relative w-full max-w-md rounded-3xl border border-[--color-border] p-6 shadow-2xl',
          'transition-all duration-420 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform will-change-opacity',
          visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95',
        ].join(' ')}
        style={{ backgroundColor: 'var(--color-sidebar-bg)' }}
      >
        <div className="mb-4 flex items-start justify-between border-b border-[--color-border] pb-3">
          <div>
            <h3 className="text-2xl font-bold text-[--color-text-primary]">Adicionar Dados</h3>
            <p className="mt-1 text-xs text-[--color-text-secondary]">Servidor: {servidor.nome}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[--color-text-secondary] transition-colors hover:bg-[--color-sidebar-hover] hover:text-[--color-text-primary]"
            aria-label="Fechar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="arquivo-titulo" className="mb-1.5 block text-sm font-medium text-[--color-text-secondary]">
              Título *
            </label>
            <input
              id="arquivo-titulo"
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: Relatório de Operação"
              className="w-full rounded-full border border-[--color-border] bg-[--color-main-bg] px-4 py-3 text-sm text-[--color-text-primary] outline-none transition-colors focus:border-[--color-accent] focus:ring-1 focus:ring-[--color-accent]"
              required
            />
          </div>

          <div>
            <label htmlFor="arquivo-descricao" className="mb-1.5 block text-sm font-medium text-[--color-text-secondary]">
              Descrição
            </label>
            <input
              id="arquivo-descricao"
              type="text"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Opcional"
              className="w-full rounded-full border border-[--color-border] bg-[--color-main-bg] px-4 py-3 text-sm text-[--color-text-primary] outline-none transition-colors focus:border-[--color-accent] focus:ring-1 focus:ring-[--color-accent]"
            />
          </div>

          <div>
            <label htmlFor="arquivo-tipo" className="mb-1.5 block text-sm font-medium text-[--color-text-secondary]">
              Tipo do Arquivo *
            </label>
            <DropdownSelect
              id="arquivo-tipo"
              value={tipoArquivo}
              placeholder="Selecione"
              options={fileTypeOptions}
              onChange={setTipoArquivo}
            />
          </div>

          <div>
            <label htmlFor="arquivo-tamanho" className="mb-1.5 block text-sm font-medium text-[--color-text-secondary]">
              Tamanho (até 10GB) *
            </label>
            <DropdownSelect
              id="arquivo-tamanho"
              value={tamanhoGb === '' ? '' : String(tamanhoGb)}
              placeholder="Selecione"
              options={sizeOptions}
              onChange={value => setTamanhoGb(value ? Number(value) : '')}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-400">
              Arquivo adicionado com sucesso!
            </div>
          )}

          <div className="mt-1 flex justify-end">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-full border border-[#f97316]/70 bg-[#f97316]/12 px-8 py-2.5 text-sm font-semibold text-[#f97316] transition-all duration-200 hover:bg-[#f97316]/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading
                ? <span className="inline-flex items-center gap-2"><LoadingSpinner size="sm" />Confirmando...</span>
                : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
