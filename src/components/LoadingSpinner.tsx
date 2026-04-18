// Laranja Oracle (#f97316) — usado em TODOS os estados de carregamento do sistema
const ORANGE = '#f97316'
const ORANGE_FAINT = 'rgba(249, 115, 22, 0.18)'

const EMERALD = '#10b981'
const EMERALD_FAINT = 'rgba(16, 185, 129, 0.18)'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'orange' | 'emerald'
}

const SIZES = {
  sm: { box: 'h-4 w-4', border: '2px' },
  md: { box: 'h-9 w-9', border: '3px' },
  lg: { box: 'h-14 w-14', border: '4px' },
}

const COLORS = {
  orange: { main: ORANGE, faint: ORANGE_FAINT },
  emerald: { main: EMERALD, faint: EMERALD_FAINT },
}

export function LoadingSpinner({ size = 'md', color = 'orange' }: LoadingSpinnerProps) {
  const { box, border } = SIZES[size]
  const { main, faint } = COLORS[color]
  return (
    <div
      role="status"
      aria-label="Carregando"
      className={`${box} rounded-full animate-spin shrink-0`}
      style={{
        borderWidth: border,
        borderStyle: 'solid',
        borderColor: faint,
        borderTopColor: main,
      }}
    />
  )
}

interface LoadingPageProps {
  message?: string
}

export function LoadingPage({ message }: LoadingPageProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-14">
      <LoadingSpinner size="lg" />
      {message && (
        <p className="text-sm text-[--color-text-secondary]">{message}</p>
      )}
    </div>
  )
}
