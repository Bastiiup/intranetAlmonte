'use client'

import { userDropdownItems } from '@/layouts/components/data'
import Link from 'next/link'
import { Fragment } from 'react'
import { Dropdown, DropdownDivider, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap'
import { TbSettings } from 'react-icons/tb'
import { useAuth, getPersonaNombreCorto, getRolLabel } from '@/hooks/useAuth'

import user3 from '@/assets/images/users/user-3.jpg'
import Image from 'next/image'

const UserProfile = () => {
  const { persona, colaborador, loading } = useAuth()
  
  const nombreUsuario = persona ? getPersonaNombreCorto(persona) : (colaborador?.email_login || 'Usuario')
  const rolLabel = colaborador?.rol ? getRolLabel(colaborador.rol) : 'Usuario'
  
  // Obtener avatar - manejar estructura del componente contacto.imagen
  let avatarSrc = user3.src
  if (persona?.imagen) {
    // Si imagen tiene url directa (estructura normalizada del API)
    if (persona.imagen.url) {
      avatarSrc = persona.imagen.url.startsWith('http') 
        ? persona.imagen.url 
        : `${process.env.NEXT_PUBLIC_STRAPI_URL}${persona.imagen.url}`
    }
    // Si imagen viene en estructura de componente contacto.imagen (imagen.imagen es array)
    else if (persona.imagen.imagen && Array.isArray(persona.imagen.imagen) && persona.imagen.imagen.length > 0) {
      const primeraImagen = persona.imagen.imagen[0]
      const url = primeraImagen.url || primeraImagen.attributes?.url || null
      if (url) {
        // La URL ya viene completa desde S3 (https://media.moraleja.cl/...)
        avatarSrc = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
      }
    }
  }

  return (
    <div className="sidenav-user">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <Link href="/" className="link-reset">
            <Image src={avatarSrc} alt="user-image" width="36" height="36" className="rounded-circle mb-2 avatar-md" />
            <span className="sidenav-user-name fw-bold">{loading ? 'Cargando...' : nombreUsuario}</span>
            <span className="fs-12 fw-semibold" data-lang="user-role">
              {loading ? '...' : rolLabel}
            </span>
          </Link>
        </div>
        <Dropdown>
          <DropdownToggle
            as={'a'}
            role="button"
            aria-label="profile dropdown"
            className="dropdown-toggle drop-arrow-none link-reset sidenav-user-set-icon">
            <TbSettings className="fs-24 align-middle ms-1" />
          </DropdownToggle>

          <DropdownMenu>
            {userDropdownItems.map((item, idx) => (
              <Fragment key={idx}>
                {item.isHeader ? (
                  <div className="dropdown-header noti-title">
                    <h6 className="text-overflow m-0">{item.label}</h6>
                  </div>
                ) : item.isDivider ? (
                  <DropdownDivider />
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
    </div>
  )
}

export default UserProfile
