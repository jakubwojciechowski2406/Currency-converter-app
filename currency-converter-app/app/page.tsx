import CurrencyConverter from "@/components/CurrencyConverter"

export default function Page() {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.94 0.025 265) 0%, oklch(0.965 0.008 240) 45%, oklch(0.96 0.018 200) 100%)",
      }}
    >
      <CurrencyConverter />
    </main>
  )
}
