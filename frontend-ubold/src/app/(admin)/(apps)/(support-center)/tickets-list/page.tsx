import PageBreadcrumb from "@/components/PageBreadcrumb"
import { Container } from "react-bootstrap"
import TicketsWidget from "./components/TicketsWidget"
import TicketTabel from "./components/TicketTabel"


const Page = () => {



    return (
        <>
            <PageBreadcrumb title="Tickets List" subtitle="Support" />
            <Container fluid>
                <TicketsWidget />
                <TicketTabel />
            </Container>
        </>

    )
}

export default Page