import { renderHook, waitFor } from '@testing-library/react'
import { useAuth, getPersonaNombre, getPersonaNombreCorto, getPersonaEmail, getRolLabel } from '../useAuth'
import { getAuthColaborador, getAuthToken } from '@/lib/auth'

// Mock de lib/auth
jest.mock('@/lib/auth', () => ({
  getAuthColaborador: jest.fn(),
  getAuthToken: jest.fn(),
  getAuthUser: jest.fn(),
}))

// Mock de fetch global
global.fetch = jest.fn()

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  it('debe inicializar con loading true', () => {
    ;(getAuthColaborador as jest.Mock).mockReturnValue(null)
    ;(getAuthToken as jest.Mock).mockReturnValue(null)

    const { result } = renderHook(() => useAuth())

    expect(result.current.loading).toBe(true)
  })

  it('debe retornar null cuando no hay colaborador ni token', async () => {
    ;(getAuthColaborador as jest.Mock).mockReturnValue(null)
    ;(getAuthToken as jest.Mock).mockReturnValue(null)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.colaborador).toBeNull()
    expect(result.current.persona).toBeNull()
  })

  it('debe cargar datos desde la API cuando hay colaborador y token', async () => {
    const mockColaborador = {
      id: 1,
      email_login: 'test@example.com',
      rol: 'supervisor' as const,
      activo: true,
      persona: {
        id: 1,
        nombre_completo: 'Juan Pérez',
      },
    }

    const mockPersona = {
      id: 1,
      nombre_completo: 'Juan Pérez',
      nombres: 'Juan',
      primer_apellido: 'Pérez',
      emails: [{ email: 'test@example.com', tipo: 'principal' }],
    }

    ;(getAuthColaborador as jest.Mock).mockReturnValue(mockColaborador)
    ;(getAuthToken as jest.Mock).mockReturnValue('mock-token')

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          colaborador: mockColaborador,
          persona: mockPersona,
        },
      }),
    })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.colaborador).toEqual(mockColaborador)
    expect(result.current.persona).toEqual(mockPersona)
    expect(global.fetch).toHaveBeenCalledWith('/api/colaboradores/me/profile', {
      headers: {
        'Authorization': 'Bearer mock-token',
      },
    })
  })

  it('debe usar persona de cookie cuando la API falla', async () => {
    const mockColaborador = {
      id: 1,
      email_login: 'test@example.com',
      persona: {
        id: 1,
        nombre_completo: 'Juan Pérez',
      },
    }

    ;(getAuthColaborador as jest.Mock).mockReturnValue(mockColaborador)
    ;(getAuthToken as jest.Mock).mockReturnValue('mock-token')

    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.colaborador).toEqual(mockColaborador)
    expect(result.current.persona).toEqual(mockColaborador.persona)
  })

  it('debe manejar respuesta de API no exitosa', async () => {
    const mockColaborador = {
      id: 1,
      email_login: 'test@example.com',
    }

    ;(getAuthColaborador as jest.Mock).mockReturnValue(mockColaborador)
    ;(getAuthToken as jest.Mock).mockReturnValue('mock-token')

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Debe usar fallback
    expect(result.current.colaborador).toEqual(mockColaborador)
  })

  it('debe manejar errores en la carga de datos', async () => {
    ;(getAuthColaborador as jest.Mock).mockImplementation(() => {
      throw new Error('Error getting colaborador')
    })
    ;(getAuthToken as jest.Mock).mockReturnValue('mock-token')

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.colaborador).toBeNull()
    expect(result.current.persona).toBeNull()
  })
})

describe('getPersonaNombre', () => {
  it('debe retornar nombre_completo si existe', () => {
    const persona = {
      id: 1,
      nombre_completo: 'Juan Pérez García',
    }
    expect(getPersonaNombre(persona)).toBe('Juan Pérez García')
  })

  it('debe construir el nombre desde partes si no hay nombre_completo', () => {
    const persona = {
      id: 1,
      nombres: 'Juan',
      primer_apellido: 'Pérez',
      segundo_apellido: 'García',
    }
    expect(getPersonaNombre(persona)).toBe('Juan Pérez García')
  })

  it('debe retornar "Usuario" si no hay datos', () => {
    expect(getPersonaNombre(null)).toBe('Usuario')
    expect(getPersonaNombre({ id: 1 })).toBe('Usuario')
  })
})

describe('getPersonaNombreCorto', () => {
  it('debe retornar nombres + primer apellido', () => {
    const persona = {
      id: 1,
      nombres: 'Juan',
      primer_apellido: 'Pérez',
    }
    expect(getPersonaNombreCorto(persona)).toBe('Juan Pérez')
  })

  it('debe usar getPersonaNombre como fallback', () => {
    const persona = {
      id: 1,
      nombre_completo: 'Juan Pérez García',
    }
    expect(getPersonaNombreCorto(persona)).toBe('Juan Pérez García')
  })

  it('debe retornar "Usuario" si no hay datos', () => {
    expect(getPersonaNombreCorto(null)).toBe('Usuario')
  })
})

describe('getPersonaEmail', () => {
  it('debe retornar email_login del colaborador si existe', () => {
    const colaborador = {
      id: 1,
      email_login: 'colaborador@example.com',
    }
    const persona = {
      id: 1,
      emails: [{ email: 'persona@example.com' }],
    }
    expect(getPersonaEmail(persona, colaborador)).toBe('colaborador@example.com')
  })

  it('debe retornar email principal de la persona', () => {
    const persona = {
      id: 1,
      emails: [
        { email: 'secundario@example.com', tipo: 'secundario' },
        { email: 'principal@example.com', tipo: 'principal' },
      ],
    }
    expect(getPersonaEmail(persona)).toBe('principal@example.com')
  })

  it('debe retornar el primer email si no hay principal', () => {
    const persona = {
      id: 1,
      emails: [{ email: 'first@example.com' }],
    }
    expect(getPersonaEmail(persona)).toBe('first@example.com')
  })

  it('debe retornar string vacío si no hay emails', () => {
    expect(getPersonaEmail(null)).toBe('')
    expect(getPersonaEmail({ id: 1 })).toBe('')
  })
})

describe('getRolLabel', () => {
  it('debe retornar etiqueta en español para cada rol', () => {
    expect(getRolLabel('super_admin')).toBe('Super Administrador')
    expect(getRolLabel('encargado_adquisiciones')).toBe('Encargado de Adquisiciones')
    expect(getRolLabel('supervisor')).toBe('Supervisor')
    expect(getRolLabel('soporte')).toBe('Soporte')
  })

  it('debe retornar el rol original si no está mapeado', () => {
    expect(getRolLabel('rol_desconocido')).toBe('rol_desconocido')
  })

  it('debe retornar "Soporte" por defecto', () => {
    expect(getRolLabel(undefined)).toBe('Soporte')
    expect(getRolLabel('')).toBe('Soporte')
  })
})

