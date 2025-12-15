import { Container } from 'react-bootstrap'

import ProductsListing from '@/app/(admin)/(apps)/(ecommerce)/products/components/ProductsListing'
import PageBreadcrumb from '@/components/PageBreadcrumb'

const Page = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Products" subtitle="Ecommerce" />
      <ProductsListing />
    </Container>
  )
}

export default Page
