import SimplebarClient from '@/components/client-wrapper/SimplebarClient'
import Link from 'next/link'
import { Col, Dropdown, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap'
import {
  TbChartLine,
  TbBulb,
  TbCurrencyDollar,
  TbUsers,
  TbActivity,
  TbGauge,
  TbZoomCheck,
  TbLayoutKanban,
  TbCalendarStats,
  TbListCheck,
  TbUsersGroup,
  TbClipboardList,
  TbChartPie,
  TbFileInvoice,
  TbUserCircle,
  TbLock,
  TbShieldLock,
  TbNotes,
  TbSettings,
  TbUser,
  TbKey,
  TbChevronDown,
} from 'react-icons/tb'
import { IconType } from 'react-icons'

type MegaMenuType = {
  title: string
  links: {
    icon: IconType
    label: string
    url: string
  }[]
}

const megaMenuItems: MegaMenuType[] = [
  {
    title: 'Tableros y Análisis',
    links: [
      { label: 'Tablero de Ventas', url: '#;', icon: TbChartLine },
      { label: 'Tablero de Marketing', url: '#;', icon: TbBulb },
      { label: 'Resumen Financiero', url: '#;', icon: TbCurrencyDollar },
      { label: 'Análisis de Usuarios', url: '#;', icon: TbUsers },
      { label: 'Insights de Tráfico', url: '#;', icon: TbActivity },
      { label: 'Métricas de Rendimiento', url: '#;', icon: TbGauge },
      { label: 'Seguimiento de Conversiones', url: '#;', icon: TbZoomCheck },
    ],
  },
  {
    title: 'Gestión de Proyectos',
    links: [
      { label: 'Flujo Kanban', url: '#;', icon: TbLayoutKanban },
      { label: 'Cronograma del Proyecto', url: '#;', icon: TbCalendarStats },
      { label: 'Gestión de Tareas', url: '#;', icon: TbListCheck },
      { label: 'Miembros del Equipo', url: '#;', icon: TbUsersGroup },
      { label: 'Asignaciones', url: '#;', icon: TbClipboardList },
      { label: 'Asignación de Recursos', url: '#;', icon: TbChartPie },
      { label: 'Informes del Proyecto', url: '#;', icon: TbFileInvoice },
    ],
  },
  {
    title: 'Gestión de Usuarios',
    links: [
      { label: 'Perfiles de Usuario', url: '#;', icon: TbUserCircle },
      { label: 'Control de Acceso', url: '#;', icon: TbLock },
      { label: 'Permisos de Roles', url: '#;', icon: TbShieldLock },
      { label: 'Registros de Actividad', url: '#;', icon: TbNotes },
      { label: 'Configuración de Seguridad', url: '#;', icon: TbSettings },
      { label: 'Grupos de Usuarios', url: '#;', icon: TbUsers },
      { label: 'Autenticación', url: '#;', icon: TbKey },
    ],
  },
]

const MegaMenu = () => {
  return (
    <div className="topbar-item d-none d-md-flex">
      <Dropdown>
        <DropdownToggle as={'button'} className="topbar-link btn fw-medium btn-link dropdown-toggle drop-arrow-none">
          Menú Principal  <TbChevronDown className="ms-1 fs-16"/>
        </DropdownToggle>
        <DropdownMenu className="dropdown-menu-xxl p-0">
          <SimplebarClient className="h-100" style={{ maxHeight: '380px' }}>
            <Row className="g-0">
              {megaMenuItems.map((item, idx) => (
                <Col md={4} key={idx}>
                  <div className="p-2">
                    <h5 className="mb-1 fw-semibold fs-sm dropdown-header">{item.title}</h5>
                    <ul className="list-unstyled megamenu-list">
                      {item.links.map((link, index) => (
                        <li key={index}>
                          <Link href={link.url} className="dropdown-item">
                            <link.icon className="align-middle me-2 fs-16"/>
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Col>
              ))}
            </Row>
          </SimplebarClient>
        </DropdownMenu>
      </Dropdown>
    </div>
  )
}

export default MegaMenu
