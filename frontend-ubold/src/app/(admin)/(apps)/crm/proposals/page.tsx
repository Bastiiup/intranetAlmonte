import PageBreadcrumb from '@/components/PageBreadcrumb'
import React from 'react'
import { Col, Container, Row } from 'react-bootstrap'
import ProposalsCard from './components/ProposalsCard'
import ProposalsTable from './components/ProposalsTable'

const page = () => {
    return (
        <Container fluid>
            <PageBreadcrumb title='Proposals' subtitle='CRM' />
            <Row>
                <Col xs={12}>
                    <ProposalsCard />
                    <ProposalsTable />
                </Col>
            </Row>
        </Container >
    )
}

export default page