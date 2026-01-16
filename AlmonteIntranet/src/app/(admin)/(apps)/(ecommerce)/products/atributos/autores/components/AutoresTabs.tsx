'use client'

import { useState, useCallback } from 'react'
import { Nav, NavItem, NavLink, TabContainer, TabContent, TabPane, Card, CardBody } from 'react-bootstrap'
import { TbList, TbLayoutGrid, TbEye, TbFileText } from 'react-icons/tb'

import AutoresListing from './AutoresListing'
import AutoresGrid from './AutoresGrid'
import AutorRequestsListing from '../solicitudes/components/AutorRequestsListing'
import AutorDetailsWrapper from './AutorDetailsWrapper'
import { useAuth } from '@/hooks/useAuth'

interface AutoresTabsProps {
  autores: any[]
  error: string | null
}

const AutoresTabs = ({ autores, error }: AutoresTabsProps) => {
  const [activeTab, setActiveTab] = useState<string>('listing')
  const [selectedAutorId, setSelectedAutorId] = useState<string | null>(null)
  const { colaborador } = useAuth()
  
  // Manejar rol que puede ser string o objeto con nombre
  const userRole = typeof colaborador?.rol === 'string' 
    ? colaborador.rol 
    : (colaborador?.rol as any)?.nombre || null

  // Verificar si el usuario puede ver solicitudes
  const canViewRequests = userRole && typeof userRole === 'string' && ['super_admin', 'encargado_adquisiciones', 'supervisor'].includes(userRole)

  // Manejar selección de autor y cambiar a tab de details
  const handleAutorSelect = useCallback((autorId: string) => {
    setSelectedAutorId(autorId)
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
              <AutoresListing 
                autores={autores} 
                error={error} 
                onAutorSelect={handleAutorSelect}
                onSwitchToGrid={handleSwitchToGrid}
              />
            </TabPane>

            <TabPane eventKey="grid">
              <AutoresGrid autores={autores} error={error} onAutorSelect={handleAutorSelect} />
            </TabPane>

            <TabPane eventKey="details">
              <AutorDetailsWrapper 
                autorId={selectedAutorId} 
                onBackToList={() => {
                  setSelectedAutorId(null)
                  setActiveTab('listing')
                }}
              />
            </TabPane>

            {canViewRequests && (
              <TabPane eventKey="solicitudes">
                <AutorRequestsListing autores={autores} error={error} onAutorSelect={handleAutorSelect} />
              </TabPane>
            )}
          </TabContent>
        </TabContainer>
      </CardBody>
    </Card>
  )
}

export default AutoresTabs

