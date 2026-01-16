'use client'

import { useState, useCallback } from 'react'
import { Nav, NavItem, NavLink, TabContainer, TabContent, TabPane, Card, CardBody } from 'react-bootstrap'
import { TbList, TbLayoutGrid, TbEye, TbFileText } from 'react-icons/tb'

import CategoriesListing from './CategoriesListing'
import CategoriesGrid from './CategoriesGrid'
import CategoriaRequestsListing from '../solicitudes/components/CategoriaRequestsListing'
import CategoryDetailsWrapper from './CategoryDetailsWrapper'
import { useAuth } from '@/hooks/useAuth'

interface CategoriesTabsProps {
  categorias: any[]
  error: string | null
}

const CategoriesTabs = ({ categorias, error }: CategoriesTabsProps) => {
  const [activeTab, setActiveTab] = useState<string>('listing')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const { colaborador } = useAuth()
  
  // Manejar rol que puede ser string o objeto con nombre
  const userRole = typeof colaborador?.rol === 'string' 
    ? colaborador.rol 
    : (colaborador?.rol as any)?.nombre || null

  // Verificar si el usuario puede ver solicitudes
  const canViewRequests = userRole && typeof userRole === 'string' && ['super_admin', 'encargado_adquisiciones', 'supervisor'].includes(userRole)

  // Manejar selección de categoría y cambiar a tab de details
  const handleCategorySelect = useCallback((categoryId: string) => {
    setSelectedCategoryId(categoryId)
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
              <CategoriesListing 
                categorias={categorias} 
                error={error} 
                onCategorySelect={handleCategorySelect}
                onSwitchToGrid={handleSwitchToGrid}
              />
            </TabPane>

            <TabPane eventKey="grid">
              <CategoriesGrid categorias={categorias} error={error} onCategorySelect={handleCategorySelect} />
            </TabPane>

            <TabPane eventKey="details">
              <CategoryDetailsWrapper 
                categoryId={selectedCategoryId} 
                onBackToList={() => {
                  setSelectedCategoryId(null)
                  setActiveTab('listing')
                }}
              />
            </TabPane>

            {canViewRequests && (
              <TabPane eventKey="solicitudes">
                <CategoriaRequestsListing categorias={categorias} error={error} onCategorySelect={handleCategorySelect} />
              </TabPane>
            )}
          </TabContent>
        </TabContainer>
      </CardBody>
    </Card>
  )
}

export default CategoriesTabs

