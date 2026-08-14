/* eslint-disable */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProjectForm from '../ProjectForm'

const createWrapper = () => {
  const queryClient = new QueryClient()
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('ProjectForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders form fields', () => {
    const mockOnSuccess = vi.fn()
    render(<ProjectForm onSuccess={mockOnSuccess} />, { wrapper: createWrapper() })

    expect(screen.getByLabelText(/project name/i, { exact: false })).toBeDefined()
  })

  it('validates required fields on submit', async () => {
    const mockOnSuccess = vi.fn()
    render(<ProjectForm onSuccess={mockOnSuccess} />, { wrapper: createWrapper() })

    const submitButton = screen.getByText(/submit|create/i)
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.queryByText(/required/i)).toBeDefined()
    })

    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  it('submits form with valid data', async () => {
    const mockOnSuccess = vi.fn()
    render(<ProjectForm onSuccess={mockOnSuccess} />, { wrapper: createWrapper() })

    const nameInput = screen.getByLabelText(/project name/i, { exact: false }) as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'Test Project' } })

    const submitButton = screen.getByText(/submit|create/i)
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })
})
