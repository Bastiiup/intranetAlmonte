import { Container } from 'react-bootstrap'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import PipelinePage from '@/app/(admin)/(apps)/crm/pipeline/components/PipelinePage'

const Page = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Pipeline" subtitle="CRM" />

      <PipelinePage />
    </Container>
  )
}

export default Page
