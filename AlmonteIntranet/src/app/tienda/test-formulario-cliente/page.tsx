'use client'

import { useState } from 'react'
import { Container, Alert, Button } from 'react-bootstrap'
import CustomerAddressForm from '../pos/components/CustomerAddressForm'

/**
 * Página de prueba para ver el formulario de cliente
 * Accede desde: /tienda/test-formulario-cliente
 */
export default function TestFormularioClientePage() {
  // Cliente de ejemplo para probar el formulario
  const [testCustomer] = useState({
    id: 999,
    email: 'cliente@ejemplo.cl',
    first_name: 'Juan',
    last_name: 'Pérez',
    billing: {
      first_name: 'Juan',
      last_name: 'Pérez',
      email: 'cliente@ejemplo.cl',
      phone: '+56 9 1234 5678',
      address_1: 'Av. Providencia 123',
      address_2: 'Depto 101',
      city: 'Santiago',
      state: 'Región Metropolitana',
      postcode: '7500000',
      country: 'CL',
    },
    shipping: {
      first_name: 'Juan',
      last_name: 'Pérez',
      address_1: 'Av. Providencia 123',
      address_2: 'Depto 101',
      city: 'Santiago',
      state: 'Región Metropolitana',
      postcode: '7500000',
      country: 'CL',
    },
    meta_data: [
      { key: '_billing_calle', value: 'Av. Providencia' },
      { key: '_billing_numero', value: '123' },
      { key: '_billing_dpto', value: '101' },
      { key: '_billing_block', value: '' },
      { key: '_billing_condominio', value: '' },
    ],
  })

  return (
    <Container fluid className="py-4">
      <div className="mb-4">
        <h1 className="h3 mb-2">Formulario de Cliente - Vista de Prueba</h1>
        <p className="text-muted">
          Esta es una página de prueba para ver cómo se ve el formulario de cliente.
          <br />
          <strong>Ruta:</strong> <code>/tienda/test-formulario-cliente</code>
        </p>
        <Alert variant="info" className="mb-4">
          <strong>Nota:</strong> Este formulario está usando datos de ejemplo. 
          Los cambios se guardarán en WooCommerce si el cliente existe.
        </Alert>
      </div>

      <CustomerAddressForm 
        customer={testCustomer}
        onSave={(updatedCustomer) => {
          console.log('Cliente actualizado:', updatedCustomer)
          alert('Cliente actualizado exitosamente (revisa la consola para ver los datos)')
        }}
        onCancel={() => {
          console.log('Cancelado')
        }}
      />

      <div className="mt-4 p-3 bg-light rounded">
        <h5 className="mb-3">Cómo acceder a esta página:</h5>
        <ol>
          <li>Desde el navegador, ve a: <code>/tienda/test-formulario-cliente</code></li>
          <li>O desde el POS, puedes ver el formulario cuando editas un cliente</li>
          <li>El formulario completo incluye:
            <ul>
              <li>Datos básicos (nombre, apellido, email, teléfono)</li>
              <li>Dirección de facturación detallada</li>
              <li>Dirección de envío (puede ser la misma que facturación)</li>
            </ul>
          </li>
        </ol>
      </div>
    </Container>
  )
}
