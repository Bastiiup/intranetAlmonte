import { Col, Container, Row } from 'react-bootstrap'
import EstimationsCard from './components/EstimationsCard'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import EstimationsTable from './components/EstimationsTable'

const Page = () => {
    return (
        <Container fluid>
            <PageBreadcrumb 
                title='Cotizaciones' 
                subtitle='CRM' 
                infoText="Las Cotizaciones son estimaciones de precios y servicios para clientes potenciales. Aquí puedes gestionar cada cotización desde su creación hasta su aceptación o rechazo. Las cotizaciones pueden estar relacionadas con oportunidades, empresas y productos específicos."
            />
            <Row>
                <Col xs={12}>
                    <EstimationsCard />
                    <EstimationsTable />
                </Col>
            </Row>
        </Container >
    )
}

export default Page