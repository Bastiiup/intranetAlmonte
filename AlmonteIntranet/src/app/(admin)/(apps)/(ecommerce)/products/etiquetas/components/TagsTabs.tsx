'use client'

import { useState, useCallback } from 'react'
import { Nav, NavItem, NavLink, TabContainer, TabContent, TabPane, Card, CardBody } from 'react-bootstrap'
import { TbList, TbLayoutGrid, TbEye, TbFileText } from 'react-icons/tb'

import TagsListing from './TagsListing'
import TagsGrid from './TagsGrid'
import EtiquetaRequestsListing from '../solicitudes/components/EtiquetaRequestsListing'
import TagDetailsWrapper from './TagDetailsWrapper'
import { useAuth } from '@/hooks/useAuth'

interface TagsTabsProps {
  etiquetas: any[]
  error: string | null
}

const TagsTabs = ({ etiquetas, error }: TagsTabsProps) => {
  const [activeTab, setActiveTab] = useState<string>('listing')
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const { colaborador } = useAuth()
  
  // Manejar rol que puede ser string o objeto con nombre
  const userRole = typeof colaborador?.rol === 'string' 
    ? colaborador.rol 
    : (colaborador?.rol as any)?.nombre || null

  // Verificar si el usuario puede ver solicitudes
  const canViewRequests = userRole && typeof userRole === 'string' && ['super_admin', 'encargado_adquisiciones', 'supervisor'].includes(userRole)

  // Manejar selección de etiqueta y cambiar a tab de details
  const handleTagSelect = useCallback((tagId: string) => {
    setSelectedTagId(tagId)
    setActiveTab('details')
  }, [])

  // Manejar cambio de tab
  const handleTabSelect = useCallback((key: string | null) => {
    setActiveTab(key || 'listing')
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
              <TagsListing 
                etiquetas={etiquetas} 
                error={error} 
                onTagSelect={handleTagSelect}
                onSwitchToGrid={() => setActiveTab('grid')}
              />
            </TabPane>

            <TabPane eventKey="grid">
              <TagsGrid etiquetas={etiquetas} error={error} onTagSelect={handleTagSelect} />
            </TabPane>

            <TabPane eventKey="details">
              <TagDetailsWrapper 
                tagId={selectedTagId} 
                onBackToList={() => {
                  setSelectedTagId(null)
                  setActiveTab('listing')
                }}
              />
            </TabPane>

            {canViewRequests && (
              <TabPane eventKey="solicitudes">
                <EtiquetaRequestsListing etiquetas={etiquetas} error={error} onTagSelect={handleTagSelect} />
              </TabPane>
            )}
          </TabContent>
        </TabContainer>
      </CardBody>
    </Card>
  )
}

export default TagsTabs

