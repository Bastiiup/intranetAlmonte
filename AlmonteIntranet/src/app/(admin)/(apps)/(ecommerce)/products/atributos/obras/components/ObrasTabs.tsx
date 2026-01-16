'use client'

import { useState, useCallback } from 'react'
import { Nav, NavItem, NavLink, TabContainer, TabContent, TabPane, Card, CardBody } from 'react-bootstrap'
import { TbList, TbLayoutGrid, TbEye, TbFileText } from 'react-icons/tb'

import ObrasListing from './ObrasListing'
import ObrasGrid from './ObrasGrid'
import ObraRequestsListing from '../solicitudes/components/ObraRequestsListing'
import ObraDetailsWrapper from './ObraDetailsWrapper'
import { useAuth } from '@/hooks/useAuth'

interface ObrasTabsProps {
  obras: any[]
  error: string | null
}

const ObrasTabs = ({ obras, error }: ObrasTabsProps) => {
  const [activeTab, setActiveTab] = useState<string>('listing')
  const [selectedObraId, setSelectedObraId] = useState<string | null>(null)
  const { colaborador } = useAuth()
  
  // Manejar rol que puede ser string o objeto con nombre
  const userRole = typeof colaborador?.rol === 'string' 
    ? colaborador.rol 
    : (colaborador?.rol as any)?.nombre || null

  // Verificar si el usuario puede ver solicitudes
  const canViewRequests = userRole && typeof userRole === 'string' && ['super_admin', 'encargado_adquisiciones', 'supervisor'].includes(userRole)

  // Manejar selección de obra y cambiar a tab de details
  const handleObraSelect = useCallback((obraId: string) => {
    setSelectedObraId(obraId)
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
              <ObrasListing 
                obras={obras} 
                error={error} 
                onObraSelect={handleObraSelect}
                onSwitchToGrid={handleSwitchToGrid}
              />
            </TabPane>

            <TabPane eventKey="grid">
              <ObrasGrid obras={obras} error={error} onObraSelect={handleObraSelect} />
            </TabPane>

            <TabPane eventKey="details">
              <ObraDetailsWrapper 
                obraId={selectedObraId} 
                onBackToList={() => {
                  setSelectedObraId(null)
                  setActiveTab('listing')
                }}
              />
            </TabPane>

            {canViewRequests && (
              <TabPane eventKey="solicitudes">
                <ObraRequestsListing obras={obras} error={error} onObraSelect={handleObraSelect} />
              </TabPane>
            )}
          </TabContent>
        </TabContainer>
      </CardBody>
    </Card>
  )
}

export default ObrasTabs

