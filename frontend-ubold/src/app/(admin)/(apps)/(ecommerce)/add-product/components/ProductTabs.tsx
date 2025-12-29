'use client'

import { memo, useCallback } from 'react'
import { TbBox, TbTruck, TbLink, TbTag, TbSettings, TbFileText } from 'react-icons/tb'
import { Card, CardBody, Nav, NavItem, NavLink } from 'react-bootstrap'

export type TabType = 'general' | 'inventario' | 'envio' | 'vinculados' | 'atributos' | 'avanzado'

interface ProductTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  children: React.ReactNode
}

const tabs = [
  { id: 'general' as TabType, label: 'General', icon: TbFileText },
  { id: 'inventario' as TabType, label: 'Inventario', icon: TbBox },
  { id: 'envio' as TabType, label: 'Envío', icon: TbTruck },
  { id: 'vinculados' as TabType, label: 'Productos vinculados', icon: TbLink },
  { id: 'atributos' as TabType, label: 'Atributos', icon: TbTag },
  { id: 'avanzado' as TabType, label: 'Avanzado', icon: TbSettings },
]

const ProductTabs = memo(function ProductTabs({ activeTab, onTabChange, children }: ProductTabsProps) {
  const handleTabClick = useCallback((tabId: TabType) => {
    onTabChange(tabId)
  }, [onTabChange])

  return (
    <div className="d-flex" style={{ minHeight: '600px' }}>
      {/* Sidebar de pestañas */}
      <div className="bg-light border-end" style={{ width: '200px', minHeight: '100%' }}>
        <Nav className="flex-column p-3" variant="pills">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <NavItem key={tab.id} className="mb-2">
                <NavLink
                  active={activeTab === tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className="d-flex align-items-center gap-2 cursor-pointer"
                  style={{ cursor: 'pointer' }}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </NavLink>
              </NavItem>
            )
          })}
        </Nav>
      </div>

      {/* Contenido de la pestaña activa */}
      <div className="flex-grow-1 p-4" style={{ backgroundColor: '#f8f9fa' }}>
        <Card>
          <CardBody>{children}</CardBody>
        </Card>
      </div>
    </div>
  )
})

export default ProductTabs

