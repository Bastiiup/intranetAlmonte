import PageBreadcrumb from '@/components/PageBreadcrumb'
import React from 'react'
import { Col, Container, Row } from 'react-bootstrap'
import ProposalsCard from './components/ProposalsCard'
import ProposalsTable from './components/ProposalsTable'

const page = () => {
    return (
        <Container fluid>
            <PageBreadcrumb 
                title='Propuestas' 
                subtitle='CRM' 
                infoText="Las Propuestas son documentos comerciales enviados a empresas o clientes con ofertas detalladas de productos o servicios. Aquí puedes gestionar el ciclo completo de cada propuesta: creación, envío, seguimiento de aperturas, respuestas y aprobación. Las propuestas están vinculadas a oportunidades y empresas."
            />
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