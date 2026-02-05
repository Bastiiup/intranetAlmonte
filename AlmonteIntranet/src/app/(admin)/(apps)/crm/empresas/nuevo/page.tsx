'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Container, Card, CardHeader, CardBody, Alert } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import EmpresaForm from '../components/EmpresaForm'

const NuevoEmpresaPage = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (data: any) => {
    setLoading(true)
    setError(null)

    try {
      // Preparar datos para la API
      const empresaData = {
        empresa_nombre: data.empresa_nombre,
        razon_social: data.razon_social,
        rut: data.rut,
        giro: data.giro,
        estado: data.estado,
        region: data.region,
        comunaId: data.comunaId,
        telefonos: data.telefonos.filter((t: any) => t.telefono_raw),
        emails: data.emails.filter((e: any) => e.email),
        direcciones: data.direcciones.filter((d: any) => d.nombre_calle || d.numero_calle),
        datos_facturacion: data.datos_facturacion,
        es_empresa_propia: data.es_empresa_propia || false,
      }

      const response = await fetch('/api/crm/empresas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(empresaData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al crear la empresa')
      }

      // Revalidar datos para sincronización bidireccional
      router.refresh()
      
      // Redirigir a la ficha de la empresa creada
      const empresaId = result.data?.documentId || result.data?.id
      if (empresaId) {
        router.push(`/crm/empresas/${empresaId}`)
      } else {
        router.push('/crm/empresas')
      }
    } catch (err: any) {
      console.error('Error al crear empresa:', err)
      setError(err.message || 'Error al crear la empresa')
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/crm/empresas')
  }

  return (
    <Container fluid>
      <PageBreadcrumb 
        title="Nueva Empresa" 
        subtitle="CRM - Empresas" 
      />
      
      <Card>
        <CardHeader>
          <h4 className="mb-0">Crear Nueva Empresa</h4>
        </CardHeader>
        <CardBody>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
              {error}
            </Alert>
          )}
          
          <EmpresaForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
            error={error}
          />
        </CardBody>
      </Card>
    </Container>
  )
}

export default NuevoEmpresaPage





