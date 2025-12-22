import { Col, Container, Row } from 'react-bootstrap'
import EstimationsCard from './components/EstimationsCard'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import EstimationsTable from './components/EstimationsTable'

const Page = () => {
    return (
        <Container fluid>
            <PageBreadcrumb title='Estimations' subtitle='CRM' />
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