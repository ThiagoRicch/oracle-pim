export function normalizeCountryLabel(value: string): string {
  const raw = (value || '').trim()
  if (!raw) return raw

  const lowered = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  const alias: Record<string, string> = {
    nova: 'Nova Zelândia',
    'nova zelandia': 'Nova Zelândia',
    franca: 'França',
    italia: 'Itália',
    japao: 'Japão',
    canada: 'Canadá',
    mexico: 'México',
    panama: 'Panamá',
    colombia: 'Colômbia',
    'africa do sul': 'África do Sul',
    australia: 'Austrália',
  }

  return alias[lowered] ?? raw
}
