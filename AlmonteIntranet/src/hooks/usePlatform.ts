'use client'

import { useAuth } from './useAuth'

export type Platform = 'moraleja' | 'escolar' | 'general'

/**
 * Hook para obtener la plataforma del colaborador actual
 * @returns La plataforma del colaborador ('moraleja', 'escolar', o 'general')
 */
export function usePlatform(): Platform {
  const { colaborador } = useAuth()
  return (colaborador?.plataforma as Platform) || 'general'
}

/**
 * Verifica si el colaborador puede acceder a una plataforma específica
 * @param platform Plataforma a verificar
 * @returns true si el colaborador puede acceder a esa plataforma
 */
export function canAccessPlatform(platform: 'moraleja' | 'escolar'): boolean {
  const { colaborador } = useAuth()
  const userPlatform = (colaborador?.plataforma as Platform) || 'general'
  
  // Si es 'general', puede acceder a ambas plataformas
  if (userPlatform === 'general') return true
  
  // Si es específico, solo puede acceder a su plataforma
  return userPlatform === platform
}

/**
 * Obtiene las plataformas a las que el colaborador puede acceder
 * @returns Array de plataformas accesibles
 */
export function getAccessiblePlatforms(): ('moraleja' | 'escolar')[] {
  const { colaborador } = useAuth()
  const userPlatform = (colaborador?.plataforma as Platform) || 'general'
  
  if (userPlatform === 'general') {
    return ['moraleja', 'escolar']
  }
  
  return [userPlatform]
}

