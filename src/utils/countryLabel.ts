export function normalizeCountryLabel(value: string): string {
  const raw = (value || '').trim()
  if (!raw) return raw

  const lowered = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

  const alias: Record<string, string> = {
    nova: 'Nova Zelândia',
    'nova zelandia': 'Nova Zelândia',
    'nova zelândia': 'Nova Zelândia',
    'nova zealandia': 'Nova Zelândia',
    'new zealand': 'Nova Zelândia',
    'new zeland': 'Nova Zelândia',
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
