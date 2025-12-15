'use client'
import { getSellerChartOptions } from '@/app/(admin)/(apps)/(ecommerce)/sellers/[sellerId]/data'
import ApexChartClient from '@/components/client-wrapper/ApexChartClient'
import { Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap'

const SellerOverview = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle as={'h4'}>Seller Overview</CardTitle>
      </CardHeader>
      <CardBody>
        <ApexChartClient getOptions={getSellerChartOptions} series={getSellerChartOptions().series} type="bar" height={370} />
      </CardBody>
    </Card>
  )
}

export default SellerOverview
