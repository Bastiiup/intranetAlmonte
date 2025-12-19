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
  sidenavSize: 'default', // Cambiar a 'default' para que el sidebar esté siempre visible por defecto
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
    toggleAttribute('data-skin', settings.skin)
    toggleAttribute('data-bs-theme', settings.theme === 'system' ? getSystemTheme() : settings.theme)
    toggleAttribute('data-topbar-color', settings.topBarColor)
    toggleAttribute('data-menu-color', settings.sidenavColor)
    toggleAttribute('data-sidenav-size', settings.sidenavSize)
    toggleAttribute('data-sidenav-user', settings.sidenavUser.toString())
    toggleAttribute('data-layout-position', settings.position)
    toggleAttribute('data-layout-width', settings.width)
    toggleAttribute('data-layout', settings.orientation === 'horizontal' ? 'topnav' : '')
    toggleAttribute('class', settings.monochrome ? 'monochrome' : '')
  }, [settings])

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth

      if (settings.orientation === 'vertical') {
        // En pantallas pequeñas, usar 'condensed' para mantener sidebar visible pero compacto
        // Esto permite navegar sin tener que usar el botón atrás
        if (width <= 767.98) {
          // Solo usar 'offcanvas' si el usuario explícitamente lo configuró
          // De lo contrario, usar 'condensed' para mantener el sidebar visible
          if (settings.sidenavSize !== 'offcanvas' && settings.sidenavSize !== 'default') {
            updateSettings({ sidenavSize: 'condensed' })
          }
          // Si está en 'offcanvas', mantenerlo pero el botón siempre lo mostrará
        } else if (width <= 1140) {
          // En pantallas medianas, usar 'condensed' para optimizar espacio
          if (settings.sidenavSize === 'offcanvas') {
            // Si estaba en offcanvas, cambiar a condensed para mantenerlo visible
            updateSettings({ sidenavSize: 'condensed' })
          } else if (settings.sidenavSize === 'on-hover') {
            updateSettings({ sidenavSize: 'condensed' })
          }
        } else {
          // En pantallas grandes, mantener el tamaño configurado
          // Si estaba en 'offcanvas', cambiar a 'default' para mantenerlo visible
          if (settings.sidenavSize === 'offcanvas') {
            updateSettings({ sidenavSize: 'default' })
          }
        }
      } else if (settings.orientation === 'horizontal') {
        if (width < 992) {
          // Similar para horizontal: mantener visible en modo condensed
          if (settings.sidenavSize !== 'offcanvas') {
            updateSettings({ sidenavSize: 'condensed' })
          }
        } else {
          updateSettings({ sidenavSize: 'default' })
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
