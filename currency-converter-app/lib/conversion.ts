export function formatAmount(value: number, currency: string): string {
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 4,
  }).format(value)
}

export function calculateConversion(amount: number, rate: number): number {
  if (!Number.isFinite(amount) || !Number.isFinite(rate)) {
    throw new Error('Nieprawidłowa wartość')
  }

  return amount * rate
}

export function normalizeAmount(input: string): number {
  const value = parseFloat(input.replace(',', '.'))
  return Number.isNaN(value) ? 0 : value
}
