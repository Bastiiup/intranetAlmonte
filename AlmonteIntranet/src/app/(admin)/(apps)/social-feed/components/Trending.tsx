import { Card, CardBody, CardHeader, CardTitle, Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap'
import { TbAlertCircle, TbDotsVertical, TbRefresh, TbSettings, TbTrendingUp } from 'react-icons/tb'
import Link from 'next/link'
import { TrendingType } from '@/app/(admin)/(apps)/social-feed/types'
import clsx from 'clsx'

const trendings: TrendingType[] = [
  {
    title: 'Golden Globes:',
    description: 'The 27 Best moments from the Golden Globe Awards',
    url: '',
  },
  {
    title: 'World Cricket:',
    description: 'India has won ICC T20 World Cup Yesterday',
    url: '',
  },
  {
    title: 'Antarctica:',
    description: 'Melting of Totten Glacier could cause high risk to areas near by sea',
    url: '',
  },
  {
    title: 'Global Tournament:',
    description: 'America has won Football match Yesterday',
    url: '',
  },
]

const Trending = () => {
  return (
    <Card>
      <CardHeader className="justify-content-between align-items-center border-dashed">
        <CardTitle className="mb-0">Trending</CardTitle>
        <Dropdown>
          <DropdownToggle variant="link" className="text-muted drop-arrow-none card-drop p-0">
            <TbDotsVertical className="fs-lg" />
          </DropdownToggle>
          <DropdownMenu className="dropdown-menu-end">
            <DropdownItem >
              <TbRefresh className="me-2" />
              Refresh Feed
            </DropdownItem>
            <DropdownItem >
              <TbSettings className="me-2" />
              Manage Topics
            </DropdownItem>
            <DropdownItem >
              <TbAlertCircle className="me-2" />
              Report Issue
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </CardHeader>

      <CardBody>
        {trendings.map((item, idx) => (
          <div className={clsx('d-flex',{'mb-3': idx !== trendings.length - 1})} key={idx}>
            <TbTrendingUp className="text-primary me-2 mt-1" />
            <Link href={item.url || ''} className="link-reset text-decoration-none">
              <strong>{item.title}:</strong> {item.description}
            </Link>
          </div>
        ))}
      </CardBody>
    </Card>
  )
}

export default Trending
