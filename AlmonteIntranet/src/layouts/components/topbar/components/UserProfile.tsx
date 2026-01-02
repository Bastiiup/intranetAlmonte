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
  
  // Obtener avatar - manejar estructura del componente contacto.imagen
  let avatarSrc = user3.src
  
  console.log('[Topbar UserProfile] persona:', persona)
  console.log('[Topbar UserProfile] persona?.imagen:', persona?.imagen)
  
  if (persona?.imagen) {
    // Si imagen tiene url directa (estructura normalizada del API)
    if (persona.imagen.url) {
      avatarSrc = persona.imagen.url.startsWith('http') 
        ? persona.imagen.url 
        : `${process.env.NEXT_PUBLIC_STRAPI_URL}${persona.imagen.url}`
      console.log('[Topbar UserProfile] ✅ Usando imagen.url:', avatarSrc)
    }
    // Si imagen viene en estructura de componente contacto.imagen (imagen.imagen es array)
    else if (persona.imagen.imagen && Array.isArray(persona.imagen.imagen) && persona.imagen.imagen.length > 0) {
      const primeraImagen = persona.imagen.imagen[0]
      const url = primeraImagen.url || primeraImagen.attributes?.url || null
      if (url) {
        // La URL ya viene completa desde S3 (https://media.moraleja.cl/...)
        avatarSrc = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
        console.log('[Topbar UserProfile] ✅ Usando imagen.imagen[0].url:', avatarSrc)
      } else {
        console.warn('[Topbar UserProfile] ⚠️ No se encontró URL en imagen.imagen[0]:', primeraImagen)
      }
    } else {
      console.warn('[Topbar UserProfile] ⚠️ Estructura de imagen no reconocida:', persona.imagen)
    }
  } else {
    console.warn('[Topbar UserProfile] ⚠️ No hay imagen en persona')
  }

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
