'use client'

import { useEffect, useState } from 'react'
import { getAuthColaborador, getAuthUser, getAuthToken } from '@/lib/auth'

interface PersonaData {
  id: number
  rut?: string
  nombres?: string
  primer_apellido?: string
  segundo_apellido?: string
  nombre_completo?: string
  emails?: Array<{ email: string; tipo?: string }>
  telefonos?: Array<{ numero: string; tipo?: string }>
  imagen?: any
  [key: string]: any
}

interface ColaboradorData {
  id: number
  email_login: string
  rol?: 'super_admin' | 'encargado_adquisiciones' | 'supervisor' | 'soporte'
  activo: boolean
  persona?: PersonaData
  [key: string]: any
}

interface AuthData {
  colaborador: ColaboradorData | null
  persona: PersonaData | null
  loading: boolean
}

/**
 * Hook para obtener los datos del usuario autenticado
 */
export function useAuth(): AuthData {
  const [authData, setAuthData] = useState<AuthData>({
    colaborador: null,
    persona: null,
    loading: true,
  })

  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const colaborador = getAuthColaborador()
        const token = getAuthToken()

        if (!colaborador || !token) {
          setAuthData({ colaborador: null, persona: null, loading: false })
          return
        }

        // Si el colaborador ya tiene la persona cargada, usarla directamente
        if (colaborador.persona) {
          setAuthData({
            colaborador: colaborador as ColaboradorData,
            persona: colaborador.persona as PersonaData,
            loading: false,
          })
          return
        }

        // Si no, intentar obtener los datos completos desde la API
        try {
          const response = await fetch('/api/colaboradores/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })

          if (response.ok) {
            const data = await response.json()
            if (data.colaborador) {
              setAuthData({
                colaborador: data.colaborador as ColaboradorData,
                persona: data.colaborador.persona as PersonaData | null,
                loading: false,
              })
              return
            }
          }
        } catch (error) {
          console.error('[useAuth] Error al obtener datos completos:', error)
        }

        // Fallback: usar los datos que ya tenemos
        setAuthData({
          colaborador: colaborador as ColaboradorData,
          persona: null,
          loading: false,
        })
      } catch (error) {
        console.error('[useAuth] Error:', error)
        setAuthData({ colaborador: null, persona: null, loading: false })
      }
    }

    loadAuthData()
  }, [])

  return authData
}

/**
 * Obtiene el nombre completo de la persona
 */
export function getPersonaNombre(persona: PersonaData | null): string {
  if (!persona) return 'Usuario'
  
  if (persona.nombre_completo) {
    return persona.nombre_completo
  }
  
  const partes = []
  if (persona.nombres) partes.push(persona.nombres)
  if (persona.primer_apellido) partes.push(persona.primer_apellido)
  if (persona.segundo_apellido) partes.push(persona.segundo_apellido)
  
  return partes.length > 0 ? partes.join(' ') : 'Usuario'
}

/**
 * Obtiene el nombre corto (solo nombres + primer apellido)
 */
export function getPersonaNombreCorto(persona: PersonaData | null): string {
  if (!persona) return 'Usuario'
  
  if (persona.nombres && persona.primer_apellido) {
    return `${persona.nombres} ${persona.primer_apellido}`
  }
  
  return getPersonaNombre(persona)
}

/**
 * Obtiene el email principal de la persona
 */
export function getPersonaEmail(persona: PersonaData | null, colaborador?: ColaboradorData | null): string {
  if (colaborador?.email_login) {
    return colaborador.email_login
  }
  
  if (persona?.emails && Array.isArray(persona.emails) && persona.emails.length > 0) {
    const emailPrincipal = persona.emails.find((e: any) => e.tipo === 'principal') || persona.emails[0]
    return emailPrincipal?.email || ''
  }
  
  return ''
}

/**
 * Obtiene el rol en español
 */
export function getRolLabel(rol?: string): string {
  const labels: Record<string, string> = {
    super_admin: 'Super Administrador',
    encargado_adquisiciones: 'Encargado de Adquisiciones',
    supervisor: 'Supervisor',
    soporte: 'Soporte',
  }
  
  return rol ? labels[rol] || rol : 'Soporte'
}




