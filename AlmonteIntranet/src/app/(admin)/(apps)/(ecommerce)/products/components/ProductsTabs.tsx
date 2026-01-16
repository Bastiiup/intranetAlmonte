'use client'

import { useState, useCallback } from 'react'
import { Nav, NavItem, NavLink, TabContainer, TabContent, TabPane, Card, CardBody } from 'react-bootstrap'
import { TbList, TbLayoutGrid, TbEye, TbFileText } from 'react-icons/tb'

import ProductsListing from './ProductsListing'
import ProductsPage from '@/app/(admin)/(apps)/(ecommerce)/products-grid/components/ProductsPage'
import ProductRequestsListing from '@/app/(admin)/(apps)/(ecommerce)/products/solicitudes/components/ProductRequestsListing'
import ProductDetailsWrapper from './ProductDetailsWrapper'
import { useAuth } from '@/hooks/useAuth'

interface ProductsTabsProps {
  productos: any[]
  error: string | null
}

const ProductsTabs = ({ productos, error }: ProductsTabsProps) => {
  const [activeTab, setActiveTab] = useState<string>('listing')
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const { colaborador } = useAuth()
  
  // Manejar rol que puede ser string o objeto con nombre
  const userRole = typeof colaborador?.rol === 'string' 
    ? colaborador.rol 
    : (colaborador?.rol as any)?.nombre || null

  // Verificar si el usuario puede ver solicitudes
  const canViewRequests = userRole && typeof userRole === 'string' && ['super_admin', 'encargado_adquisiciones', 'supervisor'].includes(userRole)

  // Manejar selección de producto y cambiar a tab de details
  const handleProductSelect = useCallback((productId: string) => {
    setSelectedProductId(productId)
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
                Listing
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink eventKey="grid">
                <TbLayoutGrid className="me-1" />
                Grid
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink eventKey="details">
                <TbEye className="me-1" />
                Details
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
              <ProductsListing productos={productos} error={error} onProductSelect={handleProductSelect} />
            </TabPane>

            <TabPane eventKey="grid">
              <ProductsPage productos={productos} error={error} onProductSelect={handleProductSelect} />
            </TabPane>

            <TabPane eventKey="details">
              <ProductDetailsWrapper 
                productId={selectedProductId} 
                onBackToList={() => {
                  setSelectedProductId(null)
                  setActiveTab('listing')
                }}
              />
            </TabPane>

            {canViewRequests && (
              <TabPane eventKey="solicitudes">
                <ProductRequestsListing productos={productos} error={error} onProductSelect={handleProductSelect} />
              </TabPane>
            )}
          </TabContent>
        </TabContainer>
      </CardBody>
    </Card>
  )
}

export default ProductsTabs

