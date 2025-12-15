import { Container } from 'react-bootstrap'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import Inboxes from './components/Inboxes'

const Page = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Inbox" subtitle="Email" />
      <div className="outlook-box email-app gap-1">
        <Inboxes />
      </div>
    </Container>
  )
}

export default Page
