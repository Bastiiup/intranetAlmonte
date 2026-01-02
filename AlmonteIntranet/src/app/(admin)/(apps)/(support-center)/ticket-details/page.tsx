import PageBreadcrumb from '@/components/PageBreadcrumb'
import React from 'react'
import { Col, Container, Row } from 'react-bootstrap'
import TicketDetails from './components/TicketDetails'
import ChatCard from '@/components/cards/ChatCard'

const Page = () => {
    return (
        <>
            <Container fluid>
                <PageBreadcrumb title="Tickets Details" subtitle="Support" />
                <Row>
                    <TicketDetails />
                    <Col xl={4}>
                        <ChatCard />
                    </Col>
                </Row>
            </Container>
        </>
    )
}

export default Page