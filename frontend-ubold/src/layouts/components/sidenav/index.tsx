'use client'
import SimplebarClient from '@/components/client-wrapper/SimplebarClient'
import Logo from '@/components/Logo'
import { useLayoutContext } from '@/context/useLayoutContext'
import AppMenu from '@/layouts/components/sidenav/components/AppMenu'
import UserProfile from '@/layouts/components/sidenav/components/UserProfile'
import { TbMenu4, TbX } from 'react-icons/tb'

const Sidenav = () => {
  const { hideBackdrop, updateSettings, sidenavSize ,sidenavUser} = useLayoutContext()

  const toggleSidebar = () => {
    updateSettings({ sidenavSize: sidenavSize === 'on-hover-active' ? 'on-hover' : 'on-hover-active' })
  }

  const closeSidebar = () => {
    // NO permitir cerrar la sidebar completamente - solo cambiar tamaño
    // En lugar de ocultar, cambiar a modo condensed si está en default
    const html = document.documentElement
    const currentSize = html.getAttribute('data-sidenav-size')
    
    // Si está en default, cambiar a condensed (más compacto pero visible)
    // Si está en condensed, mantenerlo (ya es compacto)
    if (currentSize === 'default') {
      updateSettings({ sidenavSize: 'condensed' })
    }
    // No ocultar completamente - siempre mantener visible
    hideBackdrop()
  }

  return (
    <div className="sidenav-menu">
      <div className="logo">
        <span className="logo logo-light">
          <span className="logo-lg">
            <Logo size="lg" />
          </span>
          <span className="logo-sm">
            <Logo size="sm" />
          </span>
        </span>

        <span className="logo logo-dark">
          <span className="logo-lg">
            <Logo size="lg" />
          </span>
          <span className="logo-sm">
            <Logo size="sm" />
          </span>
        </span>
      </div>

      <button className="button-on-hover">
        <TbMenu4 onClick={toggleSidebar} className="fs-22 align-middle" />
      </button>

      <button className="button-close-offcanvas">
        <TbX onClick={closeSidebar} className="align-middle" />
      </button>

      <SimplebarClient id="sidenav" className="scrollbar">
        {sidenavUser && <UserProfile />}
        <AppMenu />
      </SimplebarClient>
    </div>
  )
}

export default Sidenav
