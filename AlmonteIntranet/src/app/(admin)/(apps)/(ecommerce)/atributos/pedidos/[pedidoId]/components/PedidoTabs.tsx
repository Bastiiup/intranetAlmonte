'use client'

import { useState } from 'react'
import { Nav, NavItem, NavLink } from 'react-bootstrap'
import { TbFileText, TbEdit } from 'react-icons/tb'

export type PedidoTabType = 'detalle' | 'editar'

interface PedidoTabsProps {
  detalleContent: React.ReactNode
  editarContent: React.ReactNode
}

const PedidoTabs = ({ detalleContent, editarContent }: PedidoTabsProps) => {
  const [activeTab, setActiveTab] = useState<PedidoTabType>('detalle')

  return (
    <div>
      <Nav variant="tabs" className="mb-4 border-bottom">
        <NavItem>
          <NavLink
            active={activeTab === 'detalle'}
            onClick={() => setActiveTab('detalle')}
            style={{ cursor: 'pointer' }}
            className="d-flex align-items-center"
          >
            <TbFileText className="me-2" size={18} />
            Detalle de Pedido
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            active={activeTab === 'editar'}
            onClick={() => setActiveTab('editar')}
            style={{ cursor: 'pointer' }}
            className="d-flex align-items-center"
          >
            <TbEdit className="me-2" size={18} />
            Editar Estado
          </NavLink>
        </NavItem>
      </Nav>

      <div>
        {activeTab === 'detalle' ? detalleContent : editarContent}
      </div>
    </div>
  )
}

export default PedidoTabs

