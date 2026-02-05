import { Container } from 'react-bootstrap'
import type { Metadata } from 'next'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import GestorMultimediaClient from './components/GestorMultimediaClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Gestor Multimedia MIRA',
  description: 'Subida masiva a Bunny.net y vinculación de videos a libros MIRA',
}

export default function GestorMultimediaPage() {
  return (
    <Container fluid>
      <PageBreadcrumb title="Gestor Multimedia MIRA" subtitle="MIRA" />
      <GestorMultimediaClient />
    </Container>
  )
}
