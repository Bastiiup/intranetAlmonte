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
  plataforma?: 'moraleja' | 'escolar' | 'general' // Nueva plataforma del colaborador
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

        // Si el colaborador ya tiene la persona cargada, intentar obtener imagen actualizada
        // pero primero intentar obtener datos completos desde la API para tener imagen normalizada
        let personaFromCookie = colaborador.persona
        
        // Intentar obtener datos completos desde la API (incluye imagen normalizada)
        try {
          const response = await fetch('/api/colaboradores/me/profile', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })

          // Si la respuesta es 401, la sesión es inválida (token de sesión no coincide)
          if (response.status === 401) {
            console.warn('[useAuth] ❌ Sesión inválida (401) - cerrando sesión automáticamente')
            // Limpiar cookies y localStorage
            const { clearAuth } = await import('@/lib/auth')
            clearAuth()
            // Redirigir al login
            window.location.href = '/auth-1/sign-in?reason=session_invalid'
            return
          }

          if (response.ok) {
            const result = await response.json()
            if (result.success && result.data) {
              const { colaborador: colaboradorData, persona: personaData } = result.data
              
              console.log('[useAuth] Datos recibidos de /api/colaboradores/me/profile:', {
                colaborador: colaboradorData,
                persona: personaData,
                personaImagen: personaData?.imagen,
                personaImagenRaw: JSON.stringify(personaData?.imagen, null, 2),
              })
              
              // Verificar si la imagen está normalizada
              if (personaData && !personaData.imagen) {
                console.warn('[useAuth] ⚠️ Persona recibida pero sin imagen normalizada')
                console.warn('[useAuth] Estructura completa de personaData:', JSON.stringify(personaData, null, 2))
              } else if (personaData?.imagen) {
                console.log('[useAuth] ✅ Imagen encontrada en persona:', personaData.imagen)
              }
              
              setAuthData({
                colaborador: colaboradorData as ColaboradorData,
                persona: personaData as PersonaData | null,
                loading: false,
              })
              return
            }
          }
        } catch (error) {
          console.error('[useAuth] Error al obtener datos completos:', error)
        }
        
        // Si falla la API pero tenemos persona en cookie, usarla
        if (personaFromCookie) {
          console.log('[useAuth] Usando persona de cookie (API falló):', personaFromCookie)
          setAuthData({
            colaborador: colaborador as ColaboradorData,
            persona: personaFromCookie as PersonaData,
            loading: false,
          })
          return
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


