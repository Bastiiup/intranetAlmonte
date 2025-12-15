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
  sidenavSize: 'default',
  sidenavUser: false,
  topBarColor: 'dark',
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
  const [settings, setSettings] = useLocalStorage<LayoutState>('__UBOLD_CONFIG__', INIT_STATE)

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
        if (width <= 767.98) {
          updateSettings({ sidenavSize: 'offcanvas' })
        } else if (width <= 1140 && settings.sidenavSize !== 'offcanvas') {
          updateSettings({ sidenavSize: settings.sidenavSize === 'on-hover' ? 'condensed' : 'condensed' })
        } else {
          updateSettings({ sidenavSize: settings.sidenavSize })
        }
      } else if (settings.orientation === 'horizontal') {
        if (width < 992) {
          updateSettings({ sidenavSize: 'offcanvas' })
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
