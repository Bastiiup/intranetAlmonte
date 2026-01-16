'use client'

import { useState, useCallback } from 'react'
import { Nav, NavItem, NavLink, TabContainer, TabContent, TabPane, Card, CardBody } from 'react-bootstrap'
import { TbList, TbLayoutGrid, TbEye, TbFileText } from 'react-icons/tb'

import SellosListing from './SellosListing'
import SellosGrid from './SellosGrid'
import SelloRequestsListing from '../solicitudes/components/SelloRequestsListing'
import SelloDetailsWrapper from './SelloDetailsWrapper'
import { useAuth } from '@/hooks/useAuth'

interface SellosTabsProps {
  sellos: any[]
  error: string | null
}

const SellosTabs = ({ sellos, error }: SellosTabsProps) => {
  const [activeTab, setActiveTab] = useState<string>('listing')
  const [selectedSelloId, setSelectedSelloId] = useState<string | null>(null)
  const { colaborador } = useAuth()
  
  // Manejar rol que puede ser string o objeto con nombre
  const userRole = typeof colaborador?.rol === 'string' 
    ? colaborador.rol 
    : (colaborador?.rol as any)?.nombre || null

  // Verificar si el usuario puede ver solicitudes
  const canViewRequests = userRole && typeof userRole === 'string' && ['super_admin', 'encargado_adquisiciones', 'supervisor'].includes(userRole)

  // Manejar selección de sello y cambiar a tab de details
  const handleSelloSelect = useCallback((selloId: string) => {
    setSelectedSelloId(selloId)
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
              <SellosListing 
                sellos={sellos} 
                error={error} 
                onSelloSelect={handleSelloSelect}
                onSwitchToGrid={handleSwitchToGrid}
              />
            </TabPane>

            <TabPane eventKey="grid">
              <SellosGrid sellos={sellos} error={error} onSelloSelect={handleSelloSelect} />
            </TabPane>

            <TabPane eventKey="details">
              <SelloDetailsWrapper 
                selloId={selectedSelloId} 
                onBackToList={() => {
                  setSelectedSelloId(null)
                  setActiveTab('listing')
                }}
              />
            </TabPane>

            {canViewRequests && (
              <TabPane eventKey="solicitudes">
                <SelloRequestsListing sellos={sellos} error={error} onSelloSelect={handleSelloSelect} />
              </TabPane>
            )}
          </TabContent>
        </TabContainer>
      </CardBody>
    </Card>
  )
}

export default SellosTabs

