'use client'

import { useState, useCallback } from 'react'
import { Nav, NavItem, NavLink, TabContainer, TabContent, TabPane, Card, CardBody } from 'react-bootstrap'
import { TbList, TbLayoutGrid, TbEye, TbFileText } from 'react-icons/tb'

import MarcasListing from './MarcasListing'
import MarcasGrid from './MarcasGrid'
import MarcaRequestsListing from '../solicitudes/components/MarcaRequestsListing'
import MarcaDetailsWrapper from './MarcaDetailsWrapper'
import { useAuth } from '@/hooks/useAuth'

interface MarcasTabsProps {
  marcas: any[]
  error: string | null
}

const MarcasTabs = ({ marcas, error }: MarcasTabsProps) => {
  const [activeTab, setActiveTab] = useState<string>('listing')
  const [selectedMarcaId, setSelectedMarcaId] = useState<string | null>(null)
  const { colaborador } = useAuth()
  
  // Manejar rol que puede ser string o objeto con nombre
  const userRole = typeof colaborador?.rol === 'string' 
    ? colaborador.rol 
    : (colaborador?.rol as any)?.nombre || null

  // Verificar si el usuario puede ver solicitudes
  const canViewRequests = userRole && typeof userRole === 'string' && ['super_admin', 'encargado_adquisiciones', 'supervisor'].includes(userRole)

  // Manejar selección de marca y cambiar a tab de details
  const handleMarcaSelect = useCallback((marcaId: string) => {
    setSelectedMarcaId(marcaId)
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
              <MarcasListing 
                marcas={marcas} 
                error={error} 
                onMarcaSelect={handleMarcaSelect}
                onSwitchToGrid={handleSwitchToGrid}
              />
            </TabPane>

            <TabPane eventKey="grid">
              <MarcasGrid marcas={marcas} error={error} onMarcaSelect={handleMarcaSelect} />
            </TabPane>

            <TabPane eventKey="details">
              <MarcaDetailsWrapper 
                marcaId={selectedMarcaId} 
                onBackToList={() => {
                  setSelectedMarcaId(null)
                  setActiveTab('listing')
                }}
              />
            </TabPane>

            {canViewRequests && (
              <TabPane eventKey="solicitudes">
                <MarcaRequestsListing marcas={marcas} error={error} onMarcaSelect={handleMarcaSelect} />
              </TabPane>
            )}
          </TabContent>
        </TabContainer>
      </CardBody>
    </Card>
  )
}

export default MarcasTabs

