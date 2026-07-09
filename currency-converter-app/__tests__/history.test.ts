import { describe, it, expect, vi } from 'vitest'
import { addHistoryEntry, clearHistory, loadHistory, saveHistory, type ConversionHistoryEntry } from '@/lib/history'

const entry = {
  id: '1',
  amount: '100',
  from: 'PLN',
  to: 'EUR',
  result: 22.5,
  rate: 0.225,
  date: '2026-07-09T12:00:00.000Z',
} satisfies ConversionHistoryEntry

describe('history logic', () => {
  it('keeps newest entries first and caps at 10', () => {
    const base: ConversionHistoryEntry[] = []
    const result = Array.from({ length: 12 }, (_, i) => addHistoryEntry(base, {
      ...entry,
      id: String(i + 1),
      amount: String(i + 1),
    })).pop() as ConversionHistoryEntry[]
    // last push should be trimmed to 10 entries
    const latest = Array.from({ length: 12 }, (_, i) => i + 1)
      .reduce<ConversionHistoryEntry[]>((acc, value) => addHistoryEntry(acc, { ...entry, id: String(value), amount: String(value) }), [])

    expect(latest).toHaveLength(10)
    expect(latest[0].amount).toBe('12')
    expect(latest[9].amount).toBe('3')
  })

  it('clears history', () => {
    const cleared = clearHistory()
    expect(cleared).toEqual([])
  })

  it('persists history to localStorage', () => {
    const storage: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => storage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete storage[key]
      }),
      clear: vi.fn(() => {
        Object.keys(storage).forEach((key) => delete storage[key])
      }),
    })

    saveHistory([entry])
    expect(localStorage.setItem).toHaveBeenCalledWith('conversionHistory', JSON.stringify([entry]))
    expect(loadHistory()).toEqual([entry])
  })
})
