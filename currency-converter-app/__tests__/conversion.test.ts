import { describe, it, expect } from 'vitest'
import { calculateConversion, normalizeAmount, formatAmount } from '@/lib/conversion'

describe('conversion helpers', () => {
  it('calculates correct conversion', () => {
    expect(calculateConversion(100, 0.85)).toBeCloseTo(85)
  })

  it('handles zero and negative values', () => {
    expect(calculateConversion(0, 1.2)).toBe(0)
    expect(calculateConversion(-50, 0.9)).toBeCloseTo(-45)
  })

  it('handles very large numbers', () => {
    expect(calculateConversion(1e12, 1e3)).toBe(1e15)
  })

  it('normalizes comma decimal input', () => {
    expect(normalizeAmount('123,45')).toBe(123.45)
    expect(normalizeAmount('abc')).toBe(0)
  })

  it('formats amounts with correct precision', () => {
    expect(formatAmount(1234.5, 'EUR')).toContain('1234,50')
    expect(formatAmount(1234, 'JPY')).toBe('1234')
  })
})
