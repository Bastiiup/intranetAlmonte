import PageBreadcrumb from '@/components/PageBreadcrumb'
import React from 'react'
import { Col, Container, Row } from 'react-bootstrap'
import CampaignCard from './components/CampaignCard'
import CampaignTable from './components/CampaignTable'

const Page = () => {
    return (
        <Container fluid>
            <PageBreadcrumb 
              title='Campaña' 
              subtitle='CRM' 
              infoText="Las Campañas son estrategias de marketing dirigidas a segmentos específicos de tu base de datos. Aquí puedes crear y gestionar campañas de email, seguimiento, promociones, y medir su efectividad. Cada campaña puede estar dirigida a contactos, leads o clientes específicos, y puedes hacer seguimiento de las conversiones y resultados."
            />
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