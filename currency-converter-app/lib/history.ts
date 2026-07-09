export interface ConversionHistoryEntry {
  id: string
  amount: string
  from: string
  to: string
  result: number
  rate: number
  date: string
}

const STORAGE_KEY = 'conversionHistory'

export function addHistoryEntry(
  history: ConversionHistoryEntry[],
  entry: ConversionHistoryEntry
): ConversionHistoryEntry[] {
  return [entry, ...history].slice(0, 10)
}

export function clearHistory(): ConversionHistoryEntry[] {
  return []
}

export function loadHistory(): ConversionHistoryEntry[] {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (!stored) return []

  try {
    const parsed = JSON.parse(stored) as ConversionHistoryEntry[]
    return parsed.slice(0, 10)
  } catch {
    return []
  }
}

export function saveHistory(history: ConversionHistoryEntry[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
}
