'use client'

import { useLayoutContext } from '@/context/useLayoutContext'
import { scrollToElement } from '@/helpers/layout'
import { menuItems } from '@/layouts/components/data'
import { MenuItemType } from '@/types/layout'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { Collapse } from 'react-bootstrap'
import { TbChevronDown } from 'react-icons/tb'
import clsx from 'clsx'
import { useAuth } from '@/hooks/useAuth'

// Función helper para verificar si el usuario tiene acceso a un item del menú
const hasAccess = (item: MenuItemType, userRole?: string): boolean => {
  // Si no tiene restricción de roles, todos pueden acceder
  if (!item.roles || item.roles.length === 0) {
    return true
  }
  
  // Si el usuario no tiene rol, no puede acceder a items con restricción
  if (!userRole) {
    return false
  }
  
  // Verificar si el rol del usuario está en la lista de roles permitidos
  return item.roles.includes(userRole as any)
}

// Función helper para filtrar children según roles
const filterChildrenByRole = (children: MenuItemType[], userRole?: string): MenuItemType[] => {
  return children
    .filter((child) => hasAccess(child, userRole))
    .map((child) => {
      if (child.children) {
        return {
          ...child,
          children: filterChildrenByRole(child.children, userRole),
        }
      }
      return child
    })
}

const MenuItemWithChildren = ({
  item,
  openMenuKey,
  setOpenMenuKey,
  level = 0,
  userRole,
}: {
  item: MenuItemType
  openMenuKey: string | null
  setOpenMenuKey: (key: string | null) => void
  level?: number
  userRole?: string
}) => {
  const pathname = usePathname()
  const isTopLevel = level === 0

  const [localOpen, setLocalOpen] = useState(false)
  const [didAutoOpen, setDidAutoOpen] = useState(false)

  // Filtrar children según roles
  const filteredChildren = useMemo(() => {
    return filterChildrenByRole(item.children || [], userRole)
  }, [item.children, userRole])

  // Si no hay children después del filtro y el item tiene restricción, no mostrar
  if (filteredChildren.length === 0 && item.roles && item.roles.length > 0) {
    return null
  }

  const isChildActive = (children: MenuItemType[]): boolean =>
    children.some((child) => (child.url && pathname.endsWith(child.url)) || (child.children && isChildActive(child.children)))

  const isActive = isChildActive(filteredChildren)

  const isOpen = isTopLevel ? openMenuKey === item.key : localOpen

  useEffect(() => {
    if (isTopLevel && isActive && !didAutoOpen) {
      setOpenMenuKey(item.key)
      setDidAutoOpen(true)
    }
    if (!isTopLevel && isActive && !didAutoOpen) {
      setLocalOpen(true)
      setDidAutoOpen(true)
    }
  }, [isActive, isTopLevel, item.key, setOpenMenuKey, didAutoOpen])

  const toggleOpen = () => {
    if (isTopLevel) {
      setOpenMenuKey(isOpen ? null : item.key)
    } else {
      setLocalOpen((prev) => !prev)
    }
  }

  return (
    <li className={`side-nav-item ${isOpen ? 'active' : ''}`}>
      <button onClick={toggleOpen} className="side-nav-link" aria-expanded={isOpen}>
        {item.icon && (
          <span className="menu-icon">
            <item.icon />
          </span>
        )}
        {item.label && <span className="menu-text">{item.label}</span>}
        {item.badge ? (
          <span className={`badge bg-${item.badge.variant}`}>{item.badge.text}</span>
        ) : (
            <TbChevronDown className="menu-arrow" />
        )}
      </button>
      <Collapse in={isOpen}>
        <div>
          <ul className="sub-menu">
            {filteredChildren.map((child) =>
              child.children ? (
                <MenuItemWithChildren key={child.key} item={child} openMenuKey={openMenuKey} setOpenMenuKey={setOpenMenuKey} level={level + 1} userRole={userRole} />
              ) : (
                <MenuItem key={child.key} item={child} userRole={userRole} />
              ),
            )}
          </ul>
        </div>
      </Collapse>
    </li>
  )
}

const MenuItem = ({ item, userRole }: { item: MenuItemType; userRole?: string }) => {
  const pathname = usePathname()
  const isActive = item.url && pathname.endsWith(item.url)

  const { sidenavSize, hideBackdrop } = useLayoutContext()

  // Si no tiene acceso, no mostrar
  if (!hasAccess(item, userRole)) {
    return null
  }

  const toggleBackdrop = () => {
    // Ya no necesitamos ocultar backdrop porque la sidebar siempre está visible
    // Solo ocultar si realmente está en modo offcanvas (aunque no debería estar)
    if (sidenavSize === 'offcanvas') {
      hideBackdrop()
    }
  }

  return (
    <li className={`side-nav-item ${isActive ? 'active' : ''}`}>
      <Link
        href={item.url ?? '/'}
        onClick={toggleBackdrop}
        className={`side-nav-link  ${isActive ? 'active' : ''} ${item.isDisabled ? 'disabled' : ''} ${item.isSpecial ? 'special-menu' : ''}`}>
        {item.icon && (
          <span className="menu-icon">
            <item.icon />
          </span>
        )}
        {item.label && <span className="menu-text">{item.label}</span>}
        {item.badge && <span className={`badge text-bg-${item.badge.variant} opacity-50`}>{item.badge.text}</span>}
      </Link>
    </li>
  )
}

const AppMenu = () => {
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null)
  const { colaborador } = useAuth()
  const userRole = colaborador?.rol

  const scrollToActiveLink = () => {
    const activeItem: HTMLAnchorElement | null = document.querySelector('.side-nav-link.active')
    if (activeItem) {
      const simpleBarContent = document.querySelector('#sidenav .simplebar-content-wrapper')
      if (simpleBarContent) {
        const offset = activeItem.offsetTop - window.innerHeight * 0.4
        scrollToElement(simpleBarContent, offset, 500)
      }
    }
  }

  useEffect(() => {
    setTimeout(() => scrollToActiveLink(), 100)
  }, [])

  // Filtrar items del menú según roles
  const filteredMenuItems = useMemo(() => {
    const filtered = menuItems
      .filter((item, index) => {
        // Si es un título, verificar si hay al menos un item después (hasta el próximo título) que pase el filtro
        if (item.isTitle) {
          // Buscar el siguiente item que no sea título y que pase el filtro
          for (let i = index + 1; i < menuItems.length; i++) {
            const nextItem = menuItems[i]
            // Si encontramos otro título, ya no hay más items en esta sección
            if (nextItem.isTitle) {
              return false
            }
            // IMPORTANTE: Primero verificar acceso al item padre
            if (!hasAccess(nextItem, userRole)) {
              continue // Si el padre no tiene acceso, no mostrar el título
            }
            // Si tiene children, verificar si alguno tiene acceso
            if (nextItem.children) {
              const filteredChildren = filterChildrenByRole(nextItem.children, userRole)
              if (filteredChildren.length > 0) {
                return true
              }
            } else {
              return true // El item padre tiene acceso y no tiene children, mostrar título
            }
          }
          return false
        }
        // IMPORTANTE: Primero verificar acceso al item padre
        if (!hasAccess(item, userRole)) {
          return false // Si el padre no tiene acceso, no mostrarlo
        }
        // Si tiene children, verificar si alguno tiene acceso
        if (item.children) {
          const filteredChildren = filterChildrenByRole(item.children, userRole)
          return filteredChildren.length > 0
        }
        // Si es un item simple y pasó hasAccess, mostrarlo
        return true
      })
      .map((item) => {
        // Si tiene children, filtrarlos
        if (item.children) {
          return {
            ...item,
            children: filterChildrenByRole(item.children, userRole),
          }
        }
        return item
      })
    return filtered
  }, [userRole])

  return (
    <ul className="side-nav">
      {filteredMenuItems.map((item,idx) =>
        item.isTitle ? (
          <li className={'side-nav-title mt-2'} key={item.key}>
            {item.label}
          </li>
        ) : item.children ? (
          <MenuItemWithChildren key={item.key} item={item} openMenuKey={openMenuKey} setOpenMenuKey={setOpenMenuKey} userRole={userRole} />
        ) : (
          <MenuItem key={item.key} item={item} userRole={userRole} />
        ),
      )}
    </ul>
  )
}

export default AppMenu
