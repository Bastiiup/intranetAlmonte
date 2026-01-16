'use client'

import { useState, useCallback } from 'react'
import { Nav, NavItem, NavLink, TabContainer, TabContent, TabPane, Card, CardBody } from 'react-bootstrap'
import { TbList, TbLayoutGrid, TbEye, TbFileText } from 'react-icons/tb'

import ColeccionesListing from './ColeccionesListing'
import ColeccionesGrid from './ColeccionesGrid'
import ColeccionRequestsListing from '../solicitudes/components/ColeccionRequestsListing'
import ColeccionDetailsWrapper from './ColeccionDetailsWrapper'
import { useAuth } from '@/hooks/useAuth'

interface ColeccionesTabsProps {
  colecciones: any[]
  error: string | null
}

const ColeccionesTabs = ({ colecciones, error }: ColeccionesTabsProps) => {
  const [activeTab, setActiveTab] = useState<string>('listing')
  const [selectedColeccionId, setSelectedColeccionId] = useState<string | null>(null)
  const { colaborador } = useAuth()
  
  // Manejar rol que puede ser string o objeto con nombre
  const userRole = typeof colaborador?.rol === 'string' 
    ? colaborador.rol 
    : (colaborador?.rol as any)?.nombre || null

  // Verificar si el usuario puede ver solicitudes
  const canViewRequests = userRole && typeof userRole === 'string' && ['super_admin', 'encargado_adquisiciones', 'supervisor'].includes(userRole)

  // Manejar selección de colección y cambiar a tab de details
  const handleColeccionSelect = useCallback((coleccionId: string) => {
    setSelectedColeccionId(coleccionId)
    setActiveTab('details')
  }, [])

  // Manejar cambio de tab
  const handleTabSelect = useCallback((key: string | null) => {
    setActiveTab(key || 'listing')
  }, [])

  // Manejar cambio a vista grid desde el botón en Listing
  const handleSwitchToGrid = useCallback(() => {
    setActiveTab('grid')
  }, [])

  return (
    <Card>
      <CardBody>
        <TabContainer activeKey={activeTab} onSelect={handleTabSelect}>
          <Nav variant="tabs" className="nav-bordered mb-3">
            <NavItem>
              <NavLink eventKey="listing">
                <TbList className="me-1" />
                Listado
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink eventKey="details">
                <TbEye className="me-1" />
                Detalles
              </NavLink>
            </NavItem>
            {canViewRequests && (
              <NavItem>
                <NavLink eventKey="solicitudes">
                  <TbFileText className="me-1" />
                  Solicitudes
                </NavLink>
              </NavItem>
            )}
          </Nav>

          <TabContent>
            <TabPane eventKey="listing">
              <ColeccionesListing 
                colecciones={colecciones} 
                error={error} 
                onColeccionSelect={handleColeccionSelect}
                onSwitchToGrid={handleSwitchToGrid}
              />
            </TabPane>

            <TabPane eventKey="grid">
              <ColeccionesGrid colecciones={colecciones} error={error} onColeccionSelect={handleColeccionSelect} />
            </TabPane>

            <TabPane eventKey="details">
              <ColeccionDetailsWrapper 
                coleccionId={selectedColeccionId} 
                onBackToList={() => {
                  setSelectedColeccionId(null)
                  setActiveTab('listing')
                }}
              />
            </TabPane>

            {canViewRequests && (
              <TabPane eventKey="solicitudes">
                <ColeccionRequestsListing colecciones={colecciones} error={error} onColeccionSelect={handleColeccionSelect} />
              </TabPane>
            )}
          </TabContent>
        </TabContainer>
      </CardBody>
    </Card>
  )
}

export default ColeccionesTabs

