'use client'

import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react'
import { useLocalStorage } from 'usehooks-ts'

import { debounce } from '@/helpers/debounce'
import { toggleAttribute } from '@/helpers/layout'
import { ChildrenType } from '@/types'
import { LayoutState, LayoutType } from '@/types/layout'

const INIT_STATE: LayoutState = {
  skin: 'default',
  theme: 'light',
  monochrome: false,
  orientation: 'vertical',
  sidenavColor: 'light',
  sidenavSize: 'default', // Siempre 'default' para que el sidebar esté visible en todas las ventanas
  sidenavUser: false,
  topBarColor: 'light',
  position: 'fixed',
  width: 'fluid',
}

const LayoutContext = createContext<LayoutType | undefined>(undefined)

const useLayoutContext = () => {
  const context = use(LayoutContext)
  if (!context) {
    throw new Error('useLayoutContext can only be used within LayoutProvider')
  }
  return context
}

const LayoutProvider = ({ children }: ChildrenType) => {
  // Cambiar la clave para forzar que todos los usuarios usen los nuevos valores por defecto
  const [settings, setSettings] = useLocalStorage<LayoutState>('__UBOLD_CONFIG_V2__', INIT_STATE)

  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false)

  const updateSettings = useCallback(
    (_newSettings: Partial<LayoutState>) => {
      setSettings((prevSettings) => ({
        ...prevSettings,
        ..._newSettings,
      }))
    },
    [setSettings],
  )

  const toggleCustomizer = useCallback(() => {
    setIsCustomizerOpen((prevValue: boolean) => !prevValue)
  }, [])

  const reset = useCallback(() => {
    setSettings(INIT_STATE)
  }, [setSettings])

  const showBackdrop = () => {
    const backdrop = document.createElement('div')
    backdrop.id = 'custom-backdrop'
    backdrop.className = 'offcanvas-backdrop fade show'
    document.body.appendChild(backdrop)
    document.body.style.overflow = 'hidden'
    if (window.innerWidth > 767) {
      document.body.style.paddingRight = '15px'
    }
    backdrop.addEventListener('click', () => {
      const html = document.documentElement
      html.classList.remove('sidebar-enable')
      hideBackdrop()
    })
  }

  const hideBackdrop = () => {
    const backdrop = document.getElementById('custom-backdrop')
    if (backdrop) {
      document.body.removeChild(backdrop)
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }

  const getSystemTheme = (): 'light' | 'dark' => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  useEffect(() => {
    // CRÍTICO: Asegurar que la sidebar siempre esté visible
    // Si el tamaño es 'offcanvas', cambiarlo automáticamente a un modo visible
    let effectiveSidenavSize: 'default' | 'compact' | 'condensed' | 'on-hover' | 'on-hover-active'
    
    if (settings.sidenavSize === 'offcanvas') {
      const width = window.innerWidth
      effectiveSidenavSize = width <= 1140 ? 'condensed' : 'default'
      // Actualizar el estado si era offcanvas
      updateSettings({ sidenavSize: effectiveSidenavSize })
    } else {
      // Si no es 'offcanvas', usar el valor directamente
      // TypeScript sabe que en este punto settings.sidenavSize no puede ser 'offcanvas'
      effectiveSidenavSize = settings.sidenavSize as 'default' | 'compact' | 'condensed' | 'on-hover' | 'on-hover-active'
    }
    
    toggleAttribute('data-skin', settings.skin)
    toggleAttribute('data-bs-theme', settings.theme === 'system' ? getSystemTheme() : settings.theme)
    toggleAttribute('data-topbar-color', settings.topBarColor)
    toggleAttribute('data-menu-color', settings.sidenavColor)
    toggleAttribute('data-sidenav-size', effectiveSidenavSize)
    toggleAttribute('data-sidenav-user', settings.sidenavUser.toString())
    toggleAttribute('data-layout-position', settings.position)
    toggleAttribute('data-layout-width', settings.width)
    toggleAttribute('data-layout', settings.orientation === 'horizontal' ? 'topnav' : '')
    toggleAttribute('class', settings.monochrome ? 'monochrome' : '')
    
    // CRÍTICO: Asegurar que la clase sidebar-enable esté SIEMPRE presente
    // Esto es necesario porque el CSS de 'offcanvas' oculta la sidebar a menos que tenga esta clase
    // Como nunca usamos 'offcanvas', siempre debemos tener esta clase
    const html = document.documentElement
    // Forzar la clase sidebar-enable para que la sidebar esté visible en todas las páginas
    html.classList.add('sidebar-enable')
    
    // Asegurar que el atributo data-sidenav-size nunca sea 'offcanvas' en el DOM
    const currentSize = html.getAttribute('data-sidenav-size')
    if (currentSize === 'offcanvas') {
      html.setAttribute('data-sidenav-size', effectiveSidenavSize)
    }
  }, [settings, updateSettings])

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth

      // CRÍTICO: Asegurar que la sidebar siempre esté visible en todas las ventanas
      // Nunca usar 'offcanvas' automáticamente - solo 'default' o 'condensed'
      if (settings.orientation === 'vertical') {
        if (width <= 767.98) {
          // En pantallas pequeñas, usar 'condensed' para mantener sidebar visible pero compacto
          // NUNCA cambiar a 'offcanvas' automáticamente
          if (settings.sidenavSize === 'offcanvas' || settings.sidenavSize === 'on-hover') {
            updateSettings({ sidenavSize: 'condensed' })
          } else if (settings.sidenavSize !== 'condensed' && settings.sidenavSize !== 'default') {
            updateSettings({ sidenavSize: 'condensed' })
          }
        } else if (width <= 1140) {
          // En pantallas medianas, usar 'condensed' para optimizar espacio pero mantener visible
          if (settings.sidenavSize === 'offcanvas' || settings.sidenavSize === 'on-hover') {
            updateSettings({ sidenavSize: 'condensed' })
          }
        } else {
          // En pantallas grandes, usar 'default' para máxima visibilidad
          // Si estaba en 'offcanvas' o 'on-hover', cambiar a 'default' para mantenerlo visible
          if (settings.sidenavSize === 'offcanvas' || settings.sidenavSize === 'on-hover') {
            updateSettings({ sidenavSize: 'default' })
          }
        }
      } else if (settings.orientation === 'horizontal') {
        // Para layout horizontal, también mantener visible
        if (width < 992) {
          if (settings.sidenavSize === 'offcanvas' || settings.sidenavSize === 'on-hover') {
            updateSettings({ sidenavSize: 'condensed' })
          }
        } else {
          if (settings.sidenavSize === 'offcanvas' || settings.sidenavSize === 'on-hover') {
            updateSettings({ sidenavSize: 'default' })
          }
        }
      }
    }

    handleResize()

    const debouncedResize = debounce(handleResize, 200)

    window.addEventListener('resize', debouncedResize)

    return () => {
      window.removeEventListener('resize', debouncedResize)
    }
  }, [settings.orientation, settings.sidenavSize, updateSettings])

  return (
    <LayoutContext
      value={useMemo(
        () => ({
          ...settings,
          updateSettings,
          isCustomizerOpen,
          toggleCustomizer,
          hideBackdrop,
          showBackdrop,
          reset,
        }),
        [settings, updateSettings, isCustomizerOpen, toggleCustomizer, reset],
      )}>
      {children}
    </LayoutContext>
  )
}
export { LayoutProvider, useLayoutContext }
