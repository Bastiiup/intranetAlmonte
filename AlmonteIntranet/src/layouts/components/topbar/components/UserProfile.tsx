'use client'

import { userDropdownItems } from '@/layouts/components/data'
import Image from 'next/image'
import Link from 'next/link'
import { Fragment } from 'react'
import { Dropdown, DropdownDivider, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap'
import { TbChevronDown } from 'react-icons/tb'
import { useAuth, getPersonaNombreCorto } from '@/hooks/useAuth'
import { clearAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'

import user3 from '@/assets/images/users/user-3.jpg'

const UserProfile = () => {
  const { persona, colaborador, loading } = useAuth()
  const router = useRouter()
  
  const nombreUsuario = persona ? getPersonaNombreCorto(persona) : (colaborador?.email_login || 'Usuario')
  const avatarSrc = persona?.imagen?.url 
    ? `${process.env.NEXT_PUBLIC_STRAPI_URL}${persona.imagen.url}`
    : user3.src

  const handleLogout = () => {
    clearAuth()
    router.push('/auth-1/sign-in')
    router.refresh()
  }

  return (
    <div className="topbar-item nav-user">
      <Dropdown align="end">
        <DropdownToggle as={'a'} className="topbar-link dropdown-toggle drop-arrow-none px-2">
          <Image src={avatarSrc} width="32" height="32" className="rounded-circle me-lg-2 d-flex" alt="user-image" />
          <div className="d-lg-flex align-items-center gap-1 d-none">
            <h5 className="my-0">{loading ? 'Cargando...' : nombreUsuario}</h5>
            <TbChevronDown className="align-middle" />
          </div>
        </DropdownToggle>
        <DropdownMenu className="dropdown-menu-end">
          {userDropdownItems.map((item, idx) => (
            <Fragment key={idx}>
              {item.isHeader ? (
                <div className="dropdown-header noti-title">
                  <h6 className="text-overflow m-0">{item.label}</h6>
                </div>
              ) : item.isDivider ? (
                <DropdownDivider />
              ) : item.isLogout ? (
                <DropdownItem onClick={handleLogout} className={item.class} style={{ cursor: 'pointer' }}>
                  {item.icon && <item.icon className="me-2 fs-17 align-middle" />}
                  <span className="align-middle">{item.label}</span>
                </DropdownItem>
              ) : (
                <DropdownItem as={Link} href={item.url} className={item.class}>
                  {item.icon && <item.icon className="me-2 fs-17 align-middle" />}
                  <span className="align-middle">{item.label}</span>
                </DropdownItem>
              )}
            </Fragment>
          ))}
        </DropdownMenu>
      </Dropdown>
    </div>
  )
}

export default UserProfile
