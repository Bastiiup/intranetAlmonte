'use client'

import { memo } from 'react'
import { Alert, Button } from 'react-bootstrap'

interface AtributosTabProps {
  formData: any
  updateField: (field: string, value: any) => void
}

const AtributosTab = memo(function AtributosTab({ formData, updateField }: AtributosTabProps) {
  return (
    <div>
      <h5 className="mb-4">Atributos del Producto</h5>
      
      <Alert variant="info" dismissible>
        Agrega información descriptiva que los clientes puedan utilizar para buscar este producto en tu tienda, como "Material" o "Talla".
      </Alert>

      <div className="d-flex gap-2 mb-3">
        <Button variant="outline-primary">Agregar nuevo</Button>
        <Button variant="outline-secondary">Agregar existente</Button>
      </div>

      <Alert variant="warning">
        <strong>Nota:</strong> La funcionalidad de atributos está en desarrollo. Por ahora, puedes agregar atributos manualmente desde WooCommerce.
      </Alert>
    </div>
  )
})

export default AtributosTab
