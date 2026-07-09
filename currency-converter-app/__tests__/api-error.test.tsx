import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import CurrencyConverter from '@/components/CurrencyConverter'

vi.stubGlobal('fetch', vi.fn())
vi.stubGlobal('localStorage', {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
})

describe('API error handling', () => {
  it('shows Polish error message on network failure', async () => {
    ;(fetch as unknown as vi.Mock).mockRejectedValueOnce(new Error('Network error'))

    render(<CurrencyConverter />)

    const amountInput = screen.getByLabelText('Kwota do przeliczenia')
    await waitFor(() => expect(amountInput).toBeInTheDocument())

    await waitFor(() => {
      expect(screen.getByText('Błąd pobierania danych')).toBeInTheDocument()
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })
})
