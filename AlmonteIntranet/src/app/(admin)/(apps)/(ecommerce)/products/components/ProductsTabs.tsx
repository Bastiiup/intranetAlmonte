'use client'

import { useState, useCallback } from 'react'
import { Nav, NavItem, NavLink, TabContainer, TabContent, TabPane, Card, CardBody, Button, Alert, Spinner } from 'react-bootstrap'
import { TbList, TbLayoutGrid, TbEye, TbFileText, TbRefresh } from 'react-icons/tb'

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
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; details?: any } | null>(null)
  const { colaborador } = useAuth()
  
  // Manejar rol que puede ser string o objeto con nombre
  const userRole = typeof colaborador?.rol === 'string' 
    ? colaborador.rol 
    : (colaborador?.rol as any)?.nombre || null

  // Verificar si el usuario puede ver solicitudes
  const canViewRequests = userRole && typeof userRole === 'string' && ['super_admin', 'encargado_adquisiciones', 'supervisor'].includes(userRole)
  
  // Función para sincronizar productos desde WooCommerce a Strapi
  const handleSyncProducts = useCallback(async () => {
    setSyncing(true)
    setSyncResult(null)
    
    try {
      const response = await fetch('/api/tienda/productos/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platforms: ['woo_moraleja', 'woo_escolar'],
          direction: 'from_woocommerce'
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSyncResult({
          success: true,
          message: data.message || 'Sincronización completada',
          details: data.summary
        })
        // Recargar la página después de 2 segundos para ver los nuevos productos
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setSyncResult({
          success: false,
          message: data.error || 'Error al sincronizar productos'
        })
      }
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err.message || 'Error al conectar con el servidor'
      })
    } finally {
      setSyncing(false)
    }
  }, [])

  // Función para sincronizar productos desde Strapi a WooCommerce
  const handleSyncToWooCommerce = useCallback(async () => {
    setSyncing(true)
    setSyncResult(null)
    
    try {
      const response = await fetch('/api/tienda/productos/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platforms: ['woo_moraleja', 'woo_escolar'],
          direction: 'to_woocommerce'
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSyncResult({
          success: true,
          message: data.message || 'Sincronización a WooCommerce completada',
          details: data.summary
        })
        // Recargar la página después de 2 segundos
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setSyncResult({
          success: false,
          message: data.error || 'Error al sincronizar productos a WooCommerce'
        })
      }
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err.message || 'Error al conectar con el servidor'
      })
    } finally {
      setSyncing(false)
    }
  }, [])

  // Manejar selección de producto y cambiar a tab de details
  const handleProductSelect = useCallback((productId: string) => {
    setSelectedProductId(productId)
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
    <>
      {/* Alert de resultado de sincronización fuera del Card */}
      {syncResult && (
        <Alert 
          variant={syncResult.success ? 'success' : 'danger'} 
          dismissible 
          onClose={() => setSyncResult(null)}
          className="mb-3"
        >
          <strong>{syncResult.success ? '✅' : '❌'}</strong> {syncResult.message}
          {syncResult.details && (
            <div className="mt-2 small">
              <strong>Resumen:</strong>
              <ul className="mb-0 mt-1">
                <li>Productos encontrados: {syncResult.details.totalProducts}</li>
                <li>Productos creados: {syncResult.details.totalCreated}</li>
                <li>Productos omitidos: {syncResult.details.totalSkipped}</li>
                {syncResult.details.totalErrors > 0 && (
                  <li className="text-danger">Errores: {syncResult.details.totalErrors}</li>
                )}
              </ul>
            </div>
          )}
        </Alert>
      )}
      
      <Card>
        <CardBody>
          {/* Botones de sincronización */}
          <div className="d-flex justify-content-end align-items-center gap-2 mb-3">
            <Button
              variant="outline-primary"
              onClick={handleSyncProducts}
              disabled={syncing}
              size="sm"
              title="Traer productos desde WooCommerce a Strapi"
            >
              {syncing ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <TbRefresh className="me-1" />
                  Desde WooCommerce
                </>
              )}
            </Button>
            <Button
              variant="primary"
              onClick={handleSyncToWooCommerce}
              disabled={syncing}
              size="sm"
              title="Enviar productos desde Strapi a WooCommerce"
            >
              {syncing ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <TbRefresh className="me-1" />
                  A WooCommerce
                </>
              )}
            </Button>
          </div>
        
        <TabContainer activeKey={activeTab} onSelect={handleTabSelect}>
          <Nav variant="tabs" className="nav-bordered mb-3">
            <NavItem>
              <NavLink eventKey="listing">
                <TbList className="me-1" />
                Listing
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
              <ProductsListing 
                productos={productos} 
                error={error} 
                onProductSelect={handleProductSelect}
                onSwitchToGrid={handleSwitchToGrid}
              />
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
    </>
  )
}

export default ProductsTabs

