import { Container } from 'react-bootstrap'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import PipelinePage from '@/app/(admin)/(apps)/crm/pipeline/components/PipelinePage'

const Page = () => {
  return (
    <Container fluid>
      <PageBreadcrumb 
        title="Pipeline" 
        subtitle="CRM" 
        infoText="El Pipeline (Embudo de Ventas) es una vista visual tipo Kanban que muestra todas las oportunidades organizadas por etapa: Calificación, Propuesta Enviada, Negociación, Ganada y Perdida. Puedes arrastrar y soltar las tarjetas entre etapas para actualizar el estado de cada oportunidad."
      />

      <PipelinePage />
    </Container>
  )
}

export default Page
