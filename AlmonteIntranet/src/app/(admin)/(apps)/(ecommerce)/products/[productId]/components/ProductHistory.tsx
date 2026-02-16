'use client'

import { useState } from 'react'
import { Nav, NavItem, NavLink, Row, Col } from 'react-bootstrap'
import { LuDollarSign, LuPackage, LuHistory } from 'react-icons/lu'
import HistorialPrecios from '@/app/(admin)/(apps)/inventario/movimientos/components/HistorialPrecios'
import MovimientosListing from '@/app/(admin)/(apps)/inventario/movimientos/components/MovimientosListing'

interface ProductHistoryProps {
  productoId: string
}

type TabType = 'precios' | 'movimientos'

export function ProductHistory({ productoId }: ProductHistoryProps) {
  const [activeTab, setActiveTab] = useState<TabType>('precios')

  return (
    <div className="mt-4">
      <h5 className="mb-3 d-flex align-items-center">
        <LuHistory className="me-2" />
        Historial del Producto
      </h5>

      <Nav variant="tabs" className="mb-3">
        <NavItem>
          <NavLink
            active={activeTab === 'precios'}
            onClick={() => setActiveTab('precios')}
            className="d-flex align-items-center cursor-pointer"
            style={{ cursor: 'pointer' }}
          >
            <LuDollarSign className="me-2" />
            Historial de Precios
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            active={activeTab === 'movimientos'}
            onClick={() => setActiveTab('movimientos')}
            className="d-flex align-items-center cursor-pointer"
            style={{ cursor: 'pointer' }}
          >
            <LuPackage className="me-2" />
            Movimientos de Stock
          </NavLink>
        </NavItem>
      </Nav>

      {activeTab === 'precios' && (
        <HistorialPrecios libroId={productoId} />
      )}

      {activeTab === 'movimientos' && (
        <MovimientosListing libroId={productoId} showProductColumn={false} />
      )}
    </div>
  )
}

