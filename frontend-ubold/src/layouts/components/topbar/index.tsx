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
  const { sidenavSize, updateSettings, showBackdrop } = useLayoutContext()

  const toggleSideNav = () => {
    const html = document.documentElement
    const currentSize = html.getAttribute('data-sidenav-size')

    if (currentSize === 'offcanvas') {
      // Si está en offcanvas, siempre mostrar el sidebar al hacer clic
      // Esto asegura que el usuario pueda navegar sin usar el botón atrás
      if (!html.classList.contains('sidebar-enable')) {
        html.classList.add('sidebar-enable')
        showBackdrop()
      } else {
        html.classList.remove('sidebar-enable')
        hideBackdrop()
      }
    } else if (sidenavSize=== 'compact') {
      updateSettings({sidenavSize:currentSize === 'compact' ? 'condensed' : 'compact'})
    } else {
      updateSettings({sidenavSize:currentSize === 'condensed' ? 'default' : 'condensed'})
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
