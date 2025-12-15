import PageBreadcrumb from '@/components/PageBreadcrumb'
import React from 'react'
import { Container } from 'react-bootstrap'
import ApiKeyTabel from './components/ApiKeyTabel'

const Page = () => {
    return (
        <Container fluid>
            <PageBreadcrumb title="API Keys" subtitle="Apps" />
            <ApiKeyTabel />
        </Container>
    )
}

export default Page