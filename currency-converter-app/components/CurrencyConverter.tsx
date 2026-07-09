"use client"

import { useState, useEffect, useCallback, useRef, type PointerEvent } from "react"
import { addHistoryEntry as addHistoryEntryHelper, loadHistory, saveHistory, type ConversionHistoryEntry } from '@/lib/history'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FrankfurterResponse {
  amount: number
  base: string
  date: string
  rates: Record<string, number>
}

type Status = "idle" | "loading" | "success" | "error"
// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCIES: { code: string; flag: string; name: string }[] = [
  { code: "PLN", flag: "🇵🇱", name: "Złoty polski" },
  { code: "EUR", flag: "🇪🇺", name: "Euro" },
  { code: "USD", flag: "🇺🇸", name: "Dolar amerykański" },
  { code: "GBP", flag: "🇬🇧", name: "Funt szterling" },
  { code: "CHF", flag: "🇨🇭", name: "Frank szwajcarski" },
  { code: "JPY", flag: "🇯🇵", name: "Jen japoński" },
]

const FAVORITE_PAIR_STORAGE_KEY = "favoriteCurrencyPair"

const CURRENCY_SYMBOLS: Record<string, string> = {
  PLN: "zł",
  EUR: "€",
  USD: "$",
  GBP: "£",
  CHF: "Fr",
  JPY: "¥",
}

interface FavoritePair {
  from: string
  to: string
}

function formatAmount(value: number, currency: string): string {
  return new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: currency === "JPY" ? 0 : 2,
    maximumFractionDigits: currency === "JPY" ? 0 : 4,
  }).format(value)
}
function getIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function formatChartDate(value: string): string {
  return new Date(value).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "short",
  })
}

interface ExchangeRatePoint {
  date: string
  rate: number
}

function ExchangeRateChart({
  data,
  from,
  to,
}: {
  data: ExchangeRatePoint[]
  from: string
  to: string
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  if (data.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-secondary p-6 text-center text-sm text-muted-foreground">
        Brak danych do wyświetlenia.
      </div>
    )
  }

  const width = 320
  const height = 160
  const padding = 18
  const values = data.map((item) => item.rate)
  const minRate = Math.min(...values)
  const maxRate = Math.max(...values)
  const range = maxRate - minRate || 1

  const points = data.map((item, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2)
    const y = height - padding - ((item.rate - minRate) / range) * (height - padding * 2)
    return { x, y, rate: item.rate, date: item.date }
  })

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ")

  const fillPath =
    linePath +
    ` L ${points[points.length - 1].x.toFixed(2)} ${height - padding}` +
    ` L ${points[0].x.toFixed(2)} ${height - padding} Z`

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const step = (width - padding * 2) / Math.max(1, data.length - 1)
    const index = Math.round((x - padding) / step)
    const clamped = Math.min(Math.max(index, 0), data.length - 1)
    setHoverIndex(clamped)
  }

  const handlePointerLeave = () => setHoverIndex(null)

  const highlighted = hoverIndex !== null ? points[hoverIndex] : null
  const labelX = highlighted
    ? Math.min(Math.max(highlighted.x, padding + 32), width - padding - 32)
    : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>min {formatAmount(minRate, to)}</span>
        <span>max {formatAmount(maxRate, to)}</span>
      </div>
      <div className="rounded-3xl border border-border bg-card/80 p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-40"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <path d={fillPath} fill="var(--chart-1)" fillOpacity="0.12" />
          <path
            d={linePath}
            fill="none"
            stroke="var(--chart-1)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {highlighted && (
            <g>
              <line
                x1={highlighted.x}
                y1={padding}
                x2={highlighted.x}
                y2={height - padding}
                stroke="var(--chart-1)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <circle
                cx={highlighted.x}
                cy={highlighted.y}
                r="4"
                fill="var(--background)"
                stroke="var(--chart-1)"
                strokeWidth="2"
              />
              <rect
                x={labelX - 68}
                y={Math.max(highlighted.y - 40, padding)}
                width="136"
                height="32"
                rx="8"
                fill="rgba(0,0,0,0.82)"
                opacity="0.88"
              />
              <text
                x={labelX}
                y={Math.max(highlighted.y - 28, padding + 16)}
                textAnchor="middle"
                fontSize="10"
                fill="white"
                fontWeight="600"
              >
                {formatChartDate(highlighted.date)}
              </text>
              <text
                x={labelX}
                y={Math.max(highlighted.y - 12, padding + 28)}
                textAnchor="middle"
                fontSize="10"
                fill="white"
              >
                Kurs: 1 {from} = {formatAmount(highlighted.rate, to)} {to}
              </text>
            </g>
          )}
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="2.5"
              fill="var(--background)"
              stroke="var(--chart-1)"
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{formatChartDate(data[0].date)}</span>
        <span>{formatChartDate(data[data.length - 1].date)}</span>
      </div>
    </div>
  )
}
// ─── Icons ────────────────────────────────────────────────────────────────────

function SwapIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 16V4m0 0L3 8m4-4 4 4" />
      <path d="M17 8v12m0 0 4-4m-4 4-4-4" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-spin"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2" />
      <path d="M12 21v2" />
      <path d="M4.22 4.22l1.42 1.42" />
      <path d="M18.36 18.36l1.42 1.42" />
      <path d="M1 12h2" />
      <path d="M21 12h2" />
      <path d="M4.22 19.78l1.42-1.42" />
      <path d="M18.36 5.64l1.42-1.42" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />
    </svg>
  )
}

function StarIcon({ filled }: { filled?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  )
}

// ─── Currency Select ──────────────────────────────────────────────────────────

function CurrencySelect({
  value,
  onChange,
  label,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  label: string
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="
            w-full appearance-none rounded-xl border border-border bg-secondary
            px-4 py-3 pr-10 text-sm font-semibold text-foreground
            focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
            transition-all duration-150 cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag}  {c.code} — {c.name}
            </option>
          ))}
        </select>
        {/* Custom chevron */}
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CurrencyConverter() {
  const [amount, setAmount] = useState<string>("100")
  const [from, setFrom] = useState<string>("PLN")
  const [to, setTo] = useState<string>("EUR")
  const [result, setResult] = useState<number | null>(null)
  const [rate, setRate] = useState<number | null>(null)
  const [rateDate, setRateDate] = useState<string | null>(null)
  const [chartData, setChartData] = useState<ExchangeRatePoint[]>([])
  const [chartStatus, setChartStatus] = useState<Status>("idle")
  const [chartError, setChartError] = useState<string>("")
  const [status, setStatus] = useState<Status>("idle")
  const [errorMsg, setErrorMsg] = useState<string>("")
  const [history, setHistory] = useState<ConversionHistoryEntry[]>([])
  const [favoritePair, setFavoritePair] = useState<FavoritePair | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [theme, setTheme] = useState<"dark" | "light">("light")

  const abortRef = useRef<AbortController | null>(null)
  const chartAbortRef = useRef<AbortController | null>(null)
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const applyTheme = (nextTheme: "dark" | "light") => {
    const root = window.document.documentElement
    if (nextTheme === "dark") {
      root.classList.add("dark")
      root.classList.remove("light")
    } else {
      root.classList.remove("dark")
      root.classList.add("light")
    }
  }

  useEffect(() => {
    const saved = window.localStorage.getItem("theme")
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const initialTheme = saved === "dark" || saved === "light" ? saved : systemDark ? "dark" : "light"
    setTheme(initialTheme)
    applyTheme(initialTheme)

    const raw = window.localStorage.getItem(FAVORITE_PAIR_STORAGE_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as FavoritePair
        if (parsed?.from && parsed?.to) {
          setFavoritePair(parsed)
          setFrom(parsed.from)
          setTo(parsed.to)
        }
      } catch {
        // ignore invalid storage content
      }
    }
  }, [])

  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  useEffect(() => {
    setIsFavorite(favoritePair?.from === from && favoritePair?.to === to)
  }, [from, to, favoritePair])

  useEffect(() => {
    saveHistory(history)
  }, [history])

  const addHistoryEntry = (entry: ConversionHistoryEntry) => {
    if (historyTimerRef.current) {
      clearTimeout(historyTimerRef.current)
    }

    historyTimerRef.current = setTimeout(() => {
      setHistory((current) => addHistoryEntryHelper(current, entry))
      historyTimerRef.current = null
    }, 1000)
  }

  const restoreHistoryEntry = (entry: ConversionHistoryEntry) => {
    setAmount(entry.amount)
    setFrom(entry.from)
    setTo(entry.to)
    setResult(entry.result)
    setRate(entry.rate)
    setRateDate(entry.date)
    setStatus("success")
  }

  const clearHistory = () => {
    setHistory([])
  }

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark"
    setTheme(nextTheme)
    window.localStorage.setItem("theme", nextTheme)
    applyTheme(nextTheme)
  }

  const toggleFavoritePair = () => {
    if (isFavorite) {
      window.localStorage.removeItem(FAVORITE_PAIR_STORAGE_KEY)
      setFavoritePair(null)
      setIsFavorite(false)
      return
    }

    const pair = { from, to }
    window.localStorage.setItem(FAVORITE_PAIR_STORAGE_KEY, JSON.stringify(pair))
    setFavoritePair(pair)
    setIsFavorite(true)
  }

  const fetchRate = useCallback(
    async (fromCurrency: string, toCurrency: string, amountValue: number) => {
      if (fromCurrency === toCurrency) {
        setRate(1)
        setResult(amountValue)
        setRateDate(null)
        setStatus("success")
        return
      }

      // Cancel previous request
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setStatus("loading")
      setErrorMsg("")

      try {
        const url = `https://api.frankfurter.dev/v1/latest?from=${fromCurrency}&to=${toCurrency}`
        const res = await fetch(url, { signal: controller.signal })

        if (!res.ok) {
          throw new Error(`Błąd serwera: ${res.status}`)
        }

        const data: FrankfurterResponse = await res.json()
        const fetchedRate = data.rates[toCurrency]

        if (fetchedRate == null) {
          throw new Error("Brak kursu dla wybranej waluty.")
        }

        setRate(fetchedRate)
        setResult(amountValue * fetchedRate)
        setRateDate(data.date)
        setStatus("success")

        addHistoryEntry({
          id: `${Date.now()}`,
          amount: String(amountValue),
          from: fromCurrency,
          to: toCurrency,
          result: amountValue * fetchedRate,
          rate: fetchedRate,
          date: new Date().toISOString(),
        })
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        setStatus("error")
        setErrorMsg(
          (err as Error).message ||
            "Nie udało się pobrać kursu. Sprawdź połączenie z internetem."
        )
        setResult(null)
        setRate(null)
      }
    },
    []
  )

  const fetchChartData = useCallback(async (fromCurrency: string, toCurrency: string) => {
    chartAbortRef.current?.abort()
    const controller = new AbortController()
    chartAbortRef.current = controller

    setChartStatus("loading")
    setChartError("")

    const endDate = new Date()
    const startDate = new Date(endDate)
    startDate.setDate(endDate.getDate() - 30)

    if (fromCurrency === toCurrency) {
      const values = Array.from({ length: 31 }, (_, index) => {
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + index)
        return { date: getIsoDate(date), rate: 1 }
      })
      setChartData(values)
      setChartStatus("success")
      return
    }

    const fromDate = getIsoDate(startDate)
    const toDate = getIsoDate(endDate)

    try {
      const url = `https://api.frankfurter.dev/v1/${fromDate}..${toDate}?from=${fromCurrency}&to=${toCurrency}`
      const res = await fetch(url, { signal: controller.signal })

      if (!res.ok) {
        throw new Error(`Błąd serwera: ${res.status}`)
      }

      const data: {
        base: string
        start_date: string
        end_date: string
        rates: Record<string, Record<string, number>>
      } = await res.json()

      const values = Object.entries(data.rates)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, rates]) => ({
          date,
          rate: rates[toCurrency],
        }))
        .filter((item): item is { date: string; rate: number } => item.rate != null)

      if (values.length === 0) {
        throw new Error("Brak danych historycznych dla wybranej pary.")
      }

      setChartData(values)
      setChartStatus("success")
    } catch (err) {
      if ((err as Error).name === "AbortError") return
      setChartError(
        (err as Error).message ||
          "Nie udało się pobrać danych historycznych."
      )
      setChartData([])
      setChartStatus("error")
    }
  }, [])

  useEffect(() => {
    fetchChartData(from, to)
    return () => chartAbortRef.current?.abort()
  }, [from, to, fetchChartData])

  // Debounce: trigger fetch when inputs change
  useEffect(() => {
    const parsed = parseFloat(amount.replace(",", "."))
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setResult(null)
      setRate(null)
      setStatus("idle")
      return
    }

    const timer = setTimeout(() => {
      fetchRate(from, to, parsed)
    }, 300)

    return () => clearTimeout(timer)
  }, [amount, from, to, fetchRate])

  function handleSwap() {
    setFrom(to)
    setTo(from)
    setResult(null)
    setRate(null)
  }

  function handleRetry() {
    const parsed = parseFloat(amount.replace(",", "."))
    if (!isNaN(parsed) && parsed > 0) {
      fetchRate(from, to, parsed)
    }
  }

  const parsedAmount = parseFloat(amount.replace(",", "."))
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0

  const formatHistoryDate = (iso: string) =>
    new Date(iso).toLocaleString("pl-PL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Card */}
      <div
        className="
          relative rounded-3xl bg-card border border-border
          shadow-[0_8px_40px_-8px_oklch(0.48_0.19_265_/_18%),0_2px_8px_-2px_oklch(0_0_0_/_6%)]
          p-8 flex flex-col gap-7 transition-colors duration-300
        "
      >
        <button
          type="button"
          onClick={toggleTheme}
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary text-foreground shadow-sm transition-colors duration-300 hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label="Przełącz motyw"
          title="Przełącz motyw"
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground shadow-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v2m0 8v2M6 12h2m8 0h2" />
              <path d="M9.5 9.5a3 3 0 1 1 5 4.5H9" />
            </svg>
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground leading-tight">Przelicznik Walut</h1>
            <p className="text-xs text-muted-foreground">
              Kursy na żywo · Frankfurter API
              {isFavorite ? " · ulubiona para" : " · wybierz parę i oznacz gwiazdką"}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleFavoritePair}
            aria-pressed={isFavorite}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary text-foreground shadow-sm transition-colors duration-300 hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/40"
            title={isFavorite ? "Usuń ulubioną parę" : "Ustaw tę parę jako ulubioną"}
          >
            <StarIcon filled={isFavorite} />
          </button>
        </div>

        {/* Amount input */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="amount" className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            Kwota
          </label>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="
              w-full rounded-xl border border-border bg-secondary
              px-4 py-3 text-xl font-bold text-foreground tabular-nums
              placeholder:text-muted-foreground/50
              focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
              transition-all duration-150
            "
            aria-label="Kwota do przeliczenia"
          />
        </div>

        {/* Currency row */}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <CurrencySelect value={from} onChange={setFrom} label="Z waluty" />
          </div>

          {/* Swap button */}
          <button
            type="button"
            onClick={handleSwap}
            className="
              flex items-center justify-center w-11 h-11 rounded-xl
              border border-border bg-secondary text-muted-foreground
              hover:bg-primary hover:text-primary-foreground hover:border-primary
              active:scale-95
              transition-all duration-150
              mb-0.5 flex-shrink-0
            "
            aria-label="Zamień waluty"
            title="Zamień waluty"
          >
            <SwapIcon />
          </button>

          <div className="flex-1">
            <CurrencySelect value={to} onChange={setTo} label="Na walutę" />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Result area */}
        <div
          className="
            rounded-2xl min-h-[88px] flex flex-col items-center justify-center gap-1
            transition-colors duration-300
          "
          style={{
            background:
              status === "error"
                ? "var(--error-bg)"
                : status === "success" && result !== null
                ? "var(--result-bg)"
                : "var(--secondary)",
            border:
              status === "error"
                ? "1px solid var(--error-border)"
                : "1px solid var(--border)",
          }}
          aria-live="polite"
          aria-atomic="true"
        >
          {/* Loading */}
          {status === "loading" && (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <SpinnerIcon />
              Pobieranie kursu…
            </span>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="flex flex-col items-center gap-2 px-4 text-center">
              <span className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                <AlertIcon />
                Błąd pobierania danych
              </span>
              <p className="text-xs text-destructive/80 max-w-[260px] leading-relaxed">{errorMsg}</p>
              <button
                onClick={handleRetry}
                className="
                  flex items-center gap-1.5 mt-1 text-xs font-semibold
                  text-destructive/80 hover:text-destructive
                  border border-destructive/30 hover:border-destructive/60
                  rounded-lg px-3 py-1.5 transition-colors
                "
              >
                <RefreshIcon />
                Spróbuj ponownie
              </button>
            </div>
          )}

          {/* Idle / no valid amount */}
          {(status === "idle" || (status !== "loading" && !isValidAmount)) && status !== "error" && (
            <span className="text-sm text-muted-foreground">
              Wpisz kwotę, aby zobaczyć wynik
            </span>
          )}

          {/* Success */}
          {status === "success" && result !== null && isValidAmount && (
            <div className="flex flex-col items-center gap-1 py-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tabular-nums" style={{ color: "oklch(0.35 0.12 160)" }}>
                  {formatAmount(result, to)}
                </span>
                <span className="text-base font-bold" style={{ color: "oklch(0.5 0.1 160)" }}>
                  {to}
                </span>
              </div>
              {rate !== null && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  1 {from} ={" "}
                  <span className="font-semibold text-foreground/70">
                    {formatAmount(rate, to)} {to}
                  </span>
                  {rateDate && (
                    <> · kurs z {new Date(rateDate).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" })}</>
                  )}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Wykres kursu */}
        <div className="rounded-3xl border border-border bg-secondary p-5 shadow-sm transition-colors duration-300">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Wykres kursu</p>
              <p className="text-xs text-muted-foreground">
                Ostatnie 30 dni · {from} → {to}
              </p>
            </div>
            {chartStatus === "loading" && (
              <span className="text-xs text-muted-foreground">Ładowanie danych…</span>
            )}
          </div>

          {chartStatus === "loading" ? (
            <p className="text-sm text-muted-foreground">Proszę czekać, pobieram dane historyczne.</p>
          ) : chartStatus === "error" && chartError ? (
            <p className="text-sm text-destructive">{chartError}</p>
          ) : (
            <ExchangeRateChart data={chartData} from={from} to={to} />
          )}
        </div>

        {/* Traveler mode quick amounts */}
        {status !== "error" && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Tryb podróżnika</p>
            <div className="flex flex-wrap gap-2">
              {[10, 50, 100, 500].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(String(v))}
                  className={`
                    rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-150
                    ${
                      parsedAmount === v
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    }
                  `}
                >
                  {v.toLocaleString("pl-PL")} {CURRENCY_SYMBOLS[from] ?? from}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-[11px] text-muted-foreground/60">
          Kursy walut dostarczane przez{" "}
          <a
            href="https://www.frankfurter.app"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
          >
            Frankfurter API
          </a>
          {" "}· aktualizowane w dni robocze
        </p>
      </div>

      {history.length > 0 && (
        <div className="mt-6 rounded-3xl bg-card border border-border p-5 shadow-sm transition-colors duration-300">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Historia konwersji</p>
              <p className="text-xs text-muted-foreground">Ostatnie 10 wykonanych operacji</p>
            </div>
            <button
              type="button"
              onClick={clearHistory}
              className="rounded-full border border-border bg-secondary px-3 py-2 text-xs font-semibold text-foreground transition-colors duration-200 hover:border-destructive/70 hover:text-destructive"
            >
              Wyczyść historię
            </button>
          </div>

          <div className="space-y-3">
            {history.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => restoreHistoryEntry(entry)}
                className="w-full text-left rounded-2xl border border-border bg-secondary p-4 transition-colors duration-200 hover:border-primary/70 hover:bg-primary/5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {formatAmount(Number(entry.amount), entry.from)} {entry.from} → {entry.to}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatAmount(entry.result, entry.to)} {entry.to} · kurs {formatAmount(entry.rate, entry.to)}
                    </p>
                  </div>
                  <p className="text-[11px] text-muted-foreground/80">
                    {formatHistoryDate(entry.date)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
