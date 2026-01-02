'use client'
import AppLogo from '@/components/AppLogo'
import { useLayoutContext } from '@/context/useLayoutContext'
import Link from 'next/link'
import { useState } from 'react'
import { Button, Container, Navbar, NavbarBrand, NavbarCollapse, NavbarToggle, NavLink } from 'react-bootstrap'
import { TbContrast } from 'react-icons/tb'
import Image from 'next/image'
import logo from '@/assets/images/logo.png'

const navItems = ['Home', 'Services', 'Features', 'Plans', 'Reviews', 'Contact']

export default function Header() {
  const { theme, updateSettings } = useLayoutContext()

  const toggleTheme = () => {
    if (theme === 'dark') {
      updateSettings({theme:'light'})
      return
    }
    updateSettings({theme:'dark'})
    return
  }
  const [isCollapsed, setIsCollapsed] = useState(true)

  return (
    <header>
      <Navbar expand="lg" className={`py-2 sticky-top top-fixed`} id="landing-navbar">
        <Container>
          <NavbarBrand className="auth-brand mb-0">
            <Link href="/" className="logo-dark">
              <Image src={logo} alt="dark logo" height="24" />
            </Link>
            <Link href="/" className="logo-light">
              <Image src={logo} alt="logo" height="24" />
            </Link>
          </NavbarBrand>

          <NavbarToggle aria-controls="navbarSupportedContent" onClick={() => setIsCollapsed(!isCollapsed)} />
          <NavbarCollapse in={!isCollapsed} id="navbarSupportedContent">
            <ul className="navbar-nav text-uppercase fw-bold gap-2 fs-sm mx-auto mt-2 mt-lg-0" id="navbar-example">
              {navItems.map((item, idx) => (
                <li className="nav-item" key={idx}>
                  <NavLink className="nav-link fs-xs" href={`#${item.toLowerCase()}`}>
                    {item}
                  </NavLink>
                </li>
              ))}
            </ul>
            <div>
              <Button variant="link" className="btn-link btn-icon fw-semibold nav-link me-2" type="button" onClick={toggleTheme} id="theme-toggle">
                <TbContrast className="fs-22" />
              </Button>
              <Link href="/auth-1/sign-up" className="btn btn-sm btn-light">
                Try for Free
              </Link>
            </div>
          </NavbarCollapse>
        </Container>
      </Navbar>
    </header>
  )
}
