'use client'
import Logo from '@/components/Logo'
import { useLayoutContext } from '@/context/useLayoutContext'
import UserProfile from '@/layouts/components/topbar/components/UserProfile'
import { Container } from 'react-bootstrap'
import { TbMenu4 } from 'react-icons/tb'

import ApplicationMenu from '@/layouts/components/topbar/components/ApplicationMenu'
import FullscreenToggle from '@/layouts/components/topbar/components/FullscreenToggle'
import MonochromeThemeModeToggler from '@/layouts/components/topbar/components/MonochromeThemeModeToggler'

const Topbar = () => {
  const { sidenavSize, updateSettings, showBackdrop, hideBackdrop } = useLayoutContext()

  const toggleSideNav = () => {
    const html = document.documentElement
    const currentSize = html.getAttribute('data-sidenav-size')

    // CRÍTICO: Asegurar que la sidebar siempre esté visible
    // Si está en 'offcanvas', cambiarla a 'condensed' o 'default' para mantenerla visible
    if (currentSize === 'offcanvas') {
      // Cambiar de offcanvas a condensed para mantenerla visible
      const width = window.innerWidth
      const newSize = width <= 1140 ? 'condensed' : 'default'
      updateSettings({ sidenavSize: newSize })
      // Asegurar que la clase sidebar-enable esté presente
      if (!html.classList.contains('sidebar-enable')) {
        html.classList.add('sidebar-enable')
      }
      hideBackdrop() // Remover backdrop ya que ahora está siempre visible
    } else if (sidenavSize === 'compact') {
      updateSettings({ sidenavSize: currentSize === 'compact' ? 'condensed' : 'compact' })
    } else {
      // Toggle entre 'default' y 'condensed' - ambos mantienen la sidebar visible
      updateSettings({ sidenavSize: currentSize === 'condensed' ? 'default' : 'condensed' })
    }
  }

  return (
    <header className="app-topbar">
      <Container fluid className="topbar-menu">
        <div className="d-flex align-items-center gap-2">
          <div className="logo-topbar">
            <div className="logo-light">
              <span className="logo-lg">
                <Logo size="lg" />
              </span>
              <span className="logo-sm">
                <Logo size="sm" />
              </span>
            </div>

            <div className="logo-dark">
              <span className="logo-lg">
                <Logo size="lg" />
              </span>
              <span className="logo-sm">
                <Logo size="sm" />
              </span>
            </div>
          </div>

          <button onClick={toggleSideNav} className="sidenav-toggle-button btn btn-default btn-icon">
            <TbMenu4 className="fs-22" />
          </button>
        </div>

        <div className="d-flex align-items-center gap-2">
          <ApplicationMenu />

          <FullscreenToggle />

          <MonochromeThemeModeToggler />

          <UserProfile />
        </div>
      </Container>
    </header>
  )
}

export default Topbar
