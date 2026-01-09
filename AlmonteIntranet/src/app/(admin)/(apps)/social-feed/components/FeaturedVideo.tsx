import { Card, CardBody, CardHeader, CardTitle, Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap'
import { TbDotsVertical } from 'react-icons/tb'
import Link from 'next/link'

const FeaturedVideo = () => {
  return (
    <Card>
      <CardHeader className="justify-content-between align-items-center border-dashed">
        <CardTitle className="mb-0">Featured Video For You</CardTitle>
        <Dropdown>
          <DropdownToggle variant="link" className="text-muted drop-arrow-none card-drop p-0">
            <TbDotsVertical className="fs-lg"/>
          </DropdownToggle>
          <DropdownMenu align="end">
            <DropdownItem>
              Watch Later
            </DropdownItem>
            <DropdownItem>
              Report Video
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </CardHeader>
      <CardBody>
        <div className="ratio ratio-16x9 rounded overflow-hidden">
          <iframe src="https://player.vimeo.com/video/357274789" allowFullScreen></iframe>
        </div>
      </CardBody>
    </Card>
  )
}

export default FeaturedVideo
