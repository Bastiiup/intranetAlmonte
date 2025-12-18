/**
 * @jest-environment jsdom
 */

/**
 * Pruebas unitarias para el componente RelationSelector
 */

import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RelationSelector } from '../RelationSelector'

// Mock de fetch
global.fetch = jest.fn()

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('RelationSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debe renderizar el label correctamente', () => {
    render(
      <RelationSelector
        label="Categoría"
        value={null}
        onChange={() => {}}
        endpoint="/api/categorias"
      />
    )

    expect(screen.getByText('Categoría')).toBeInTheDocument()
  })

  it('debe mostrar "Cargando opciones..." mientras carga', () => {
    mockFetch.mockImplementation(
      () =>
        new Promise(() => {}) // Promise que nunca se resuelve
    )

    render(
      <RelationSelector
        label="Categoría"
        value={null}
        onChange={() => {}}
        endpoint="/api/categorias"
      />
    )

    expect(screen.getByText('Cargando opciones...')).toBeInTheDocument()
  })

  it('debe cargar y mostrar opciones correctamente', async () => {
    const mockOptions = [
      { id: 1, nombre: 'Categoría 1' },
      { id: 2, nombre: 'Categoría 2' },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockOptions,
      }),
    } as Response)

    await act(async () => {
      render(
        <RelationSelector
          label="Categoría"
          value={null}
          onChange={() => {}}
          endpoint="/api/categorias"
        />
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Categoría 1')).toBeInTheDocument()
      expect(screen.getByText('Categoría 2')).toBeInTheDocument()
    })
  })

  it('debe mostrar error cuando falla la carga', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Error de red'))

    await act(async () => {
      render(
        <RelationSelector
          label="Categoría"
          value={null}
          onChange={() => {}}
          endpoint="/api/categorias"
        />
      )
    })

    await waitFor(() => {
      expect(screen.getByText(/Error de conexión/i)).toBeInTheDocument()
    })
  })

  it('debe llamar onChange cuando se selecciona una opción', async () => {
    const mockOptions = [
      { id: 1, nombre: 'Categoría 1' },
      { id: 2, nombre: 'Categoría 2' },
    ]

    const handleChange = jest.fn()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockOptions,
      }),
    } as Response)

    await act(async () => {
      render(
        <RelationSelector
          label="Categoría"
          value={null}
          onChange={handleChange}
          endpoint="/api/categorias"
        />
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Categoría 1')).toBeInTheDocument()
    })

    const select = screen.getByRole('combobox')
    await act(async () => {
      await userEvent.selectOptions(select, '1')
    })

    expect(handleChange).toHaveBeenCalledWith('1')
  })

  it('debe mostrar asterisco cuando es requerido', () => {
    render(
      <RelationSelector
        label="Categoría"
        value={null}
        onChange={() => {}}
        endpoint="/api/categorias"
        required
      />
    )

    const asterisk = screen.getByText('*')
    expect(asterisk).toBeInTheDocument()
    expect(asterisk).toHaveClass('text-danger')
  })

  it('debe soportar selección múltiple', async () => {
    const mockOptions = [
      { id: 1, nombre: 'Categoría 1' },
      { id: 2, nombre: 'Categoría 2' },
    ]

    const handleChange = jest.fn()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockOptions,
      }),
    } as Response)

    await act(async () => {
      render(
        <RelationSelector
          label="Categorías"
          value={[]}
          onChange={handleChange}
          endpoint="/api/categorias"
          multiple
        />
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Categoría 1')).toBeInTheDocument()
    })

    const select = screen.getByRole('listbox')
    expect(select).toHaveAttribute('multiple')
  })
})
