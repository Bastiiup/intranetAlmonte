/**
 * Componente para seleccionar la versión de la lista de materiales
 */

'use client'

import { Form } from 'react-bootstrap'
import { Alert } from 'react-bootstrap'

interface VersionSelectorProps {
  versiones: any[]
  versionSeleccionada: number | null
  mostrarTodosLosProductos: boolean
  onChangeVersion: (index: number) => void
  onChangeMostrarTodos: (mostrar: boolean) => void
  onRecargarProductos: () => void
}

export default function VersionSelector({
  versiones,
  versionSeleccionada,
  mostrarTodosLosProductos,
  onChangeVersion,
  onChangeMostrarTodos,
  onRecargarProductos
}: VersionSelectorProps) {
  // Filtrar solo versiones activas (activo !== false)
  const versionesActivas = versiones.filter((v: any) => v.activo !== false)
  
  if (versionesActivas.length <= 1) return null

  const versionesOrdenadas = [...versionesActivas].sort((a: any, b: any) => {
    const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
    const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
    return fechaB - fechaA
  })

  return (
    <div className="mb-2">
      <div className="d-flex align-items-center gap-3 mb-2">
        <div style={{ flex: 1 }}>
          <Form.Label className="mb-1 fw-bold">Seleccionar Lista de Materiales:</Form.Label>
          <Form.Select
            value={versionSeleccionada !== null ? versionSeleccionada : 0}
            onChange={(e) => onChangeVersion(parseInt(e.target.value, 10))}
            style={{ maxWidth: '400px' }}
            disabled={mostrarTodosLosProductos}
          >
            {versionesOrdenadas.map((version: any, index: number) => {
              const fecha = version.fecha_subida || version.fecha_actualizacion
              const fechaFormateada = fecha 
                ? new Date(fecha).toLocaleDateString('es-CL', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Sin fecha'
              const nombreArchivo = version.nombre_archivo || version.metadata?.nombre || `Lista ${index + 1}`
              const tipoLista = version.tipo_lista || version.nombre || 'Lista de Útiles'
              const productosCount = version.materiales?.length || 0
              
              return (
                <option key={index} value={index}>
                  {tipoLista} - {nombreArchivo} ({productosCount} productos) - {fechaFormateada}
                </option>
              )
            })}
          </Form.Select>
        </div>
        <div className="mt-4">
          <Form.Check
            type="switch"
            id="mostrar-todos-productos"
            label="Ver todos los productos juntos"
            checked={mostrarTodosLosProductos}
            onChange={(e) => {
              onChangeMostrarTodos(e.target.checked)
              // Recargar productos cuando cambia el switch
              setTimeout(() => onRecargarProductos(), 100)
            }}
          />
        </div>
      </div>
      {mostrarTodosLosProductos && (
        <Alert variant="info" className="mb-2" style={{ fontSize: '0.875rem' }}>
          <strong>📋 Vista combinada:</strong> Mostrando todos los productos de todas las versiones ({versionesOrdenadas.reduce((total: number, v: any) => total + (v.materiales?.length || 0), 0)} productos en total)
        </Alert>
      )}
    </div>
  )
}
