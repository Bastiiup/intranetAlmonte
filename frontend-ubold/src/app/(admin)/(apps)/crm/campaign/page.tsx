import PageBreadcrumb from '@/components/PageBreadcrumb'
import React from 'react'
import { Col, Container, Row } from 'react-bootstrap'
import CampaignCard from './components/CampaignCard'
import CampaignTable from './components/CampaignTable'

const Page = () => {
    return (
        <Container fluid>
            <PageBreadcrumb title='Compaign' subtitle='CRM' />
            <Row>
                <Col xs={12}>
                    <CampaignCard />
                    <CampaignTable />
                </Col>
            </Row>
        </Container>
    )
}

export default Page