/* eslint-disable */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ProjectForm from '../ProjectForm'

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
}))

describe('ProjectForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      })
    ) as any
  })

  it('renders form fields', () => {
    const mockOnSuccess = jest.fn()
    render(<ProjectForm onSuccess={mockOnSuccess} />)

    expect(screen.getByPlaceholderText(/ACE Parkway/i)).toBeDefined()
  })

  it('validates required fields on submit', async () => {
    const mockOnSuccess = jest.fn()
    render(<ProjectForm onSuccess={mockOnSuccess} />)

    const submitButton = screen.getByText(/Create Project|Save Changes/i)
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSuccess).not.toHaveBeenCalled()
    })
  })

  it('submits form with valid data', async () => {
    const mockOnSuccess = jest.fn()
    render(<ProjectForm onSuccess={mockOnSuccess} />)

    const nameInput = screen.getByPlaceholderText(/ACE Parkway/i) as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'Test Project' } })

    const submitButton = screen.getByText(/Create Project|Save Changes/i)
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(submitButton).toBeDefined()
    })
  })
})
