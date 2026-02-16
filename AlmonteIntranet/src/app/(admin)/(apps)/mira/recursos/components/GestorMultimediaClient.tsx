'use client'

import { Nav, NavItem, NavLink, TabContainer, TabContent, TabPane } from 'react-bootstrap'
import BunnyUploaderTab from './BunnyUploaderTab'
import SmartLinkerTab from './SmartLinkerTab'

export default function GestorMultimediaClient() {
  return (
    <TabContainer defaultActiveKey="upload">
      <Nav variant="tabs" className="mb-3">
        <NavItem>
          <NavLink eventKey="upload">Subida masiva (Bunny)</NavLink>
        </NavItem>
        <NavItem>
          <NavLink eventKey="link">Asignar a libro</NavLink>
        </NavItem>
      </Nav>
      <TabContent>
        <TabPane eventKey="upload">
          <BunnyUploaderTab />
        </TabPane>
        <TabPane eventKey="link">
          <SmartLinkerTab />
        </TabPane>
      </TabContent>
    </TabContainer>
  )
}
