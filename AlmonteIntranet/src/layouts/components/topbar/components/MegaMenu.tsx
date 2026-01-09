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
    title: 'Dashboard & Analytics',
    links: [
      { label: 'Sales Dashboard', url: '#;', icon: TbChartLine },
      { label: 'Marketing Dashboard', url: '#;', icon: TbBulb },
      { label: 'Finance Overview', url: '#;', icon: TbCurrencyDollar },
      { label: 'User Analytics', url: '#;', icon: TbUsers },
      { label: 'Traffic Insights', url: '#;', icon: TbActivity },
      { label: 'Performance Metrics', url: '#;', icon: TbGauge },
      { label: 'Conversion Tracking', url: '#;', icon: TbZoomCheck },
    ],
  },
  {
    title: 'Project Management',
    links: [
      { label: 'Kanban Workflow', url: '#;', icon: TbLayoutKanban },
      { label: 'Project Timeline', url: '#;', icon: TbCalendarStats },
      { label: 'Task Management', url: '#;', icon: TbListCheck },
      { label: 'Team Members', url: '#;', icon: TbUsersGroup },
      { label: 'Assignments', url: '#;', icon: TbClipboardList },
      { label: 'Resource Allocation', url: '#;', icon: TbChartPie },
      { label: 'Project Reports', url: '#;', icon: TbFileInvoice },
    ],
  },
  {
    title: 'User Management',
    links: [
      { label: 'User Profiles', url: '#;', icon: TbUserCircle },
      { label: 'Access Control', url: '#;', icon: TbLock },
      { label: 'Role Permissions', url: '#;', icon: TbShieldLock },
      { label: 'Activity Logs', url: '#;', icon: TbNotes },
      { label: 'Security Settings', url: '#;', icon: TbSettings },
      { label: 'User Groups', url: '#;', icon: TbUsers },
      { label: 'Authentication', url: '#;', icon: TbKey },
    ],
  },
]

const MegaMenu = () => {
  return (
    <div className="topbar-item d-none d-md-flex">
      <Dropdown>
        <DropdownToggle as={'button'} className="topbar-link btn fw-medium btn-link dropdown-toggle drop-arrow-none">
          Mega Menu  <TbChevronDown className="ms-1 fs-16"/>
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
