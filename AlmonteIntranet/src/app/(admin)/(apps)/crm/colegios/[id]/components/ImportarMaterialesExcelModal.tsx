'use client'

import { useState, useCallback } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Alert, Table, FormGroup, FormLabel, FormControl } from 'react-bootstrap'
import { useDropzone } from 'react-dropzone'
import { LuUpload, LuFileSpreadsheet, LuX, LuCheck } from 'react-icons/lu'

interface Material {
  material_nombre: string
  tipo: 'util' | 'libro' | 'cuaderno' | 'otro'
  cantidad: number
  obligatorio: boolean
  descripcion?: string
}

interface ImportarMaterialesExcelModalProps {
  show: boolean
  onHide: () => void
  onImport: (materiales: Material[]) => void
}

const TIPOS_MATERIAL = [
  { value: 'util', label: 'Útil Escolar' },
  { value: 'libro', label: 'Libro' },
  { value: 'cuaderno', label: 'Cuaderno' },
  { value: 'otro', label: 'Otro' },
]

export default function ImportarMaterialesExcelModal({
  show,
  onHide,
  onImport,
}: ImportarMaterialesExcelModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [materialesPreview, setMaterialesPreview] = useState<Material[]>([])
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    setArchivoSeleccionado(file)
    setError(null)
    setLoading(true)

    try {
      // Validar tipo de archivo
      const allowedExtensions = ['.xlsx', '.xls', '.csv']
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
      
      if (!allowedExtensions.includes(fileExtension)) {
        throw new Error('Tipo de archivo no válido. Se aceptan: .xlsx, .xls, .csv')
      }

      // Validar tamaño (max 5MB)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        throw new Error('El archivo es demasiado grande. Tamaño máximo: 5MB')
      }

      // Crear FormData y enviar a la API
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/crm/listas-utiles/import-excel', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al procesar el archivo Excel')
      }

      if (result.data && Array.isArray(result.data.materiales)) {
        setMaterialesPreview(result.data.materiales)
      } else {
        throw new Error('Formato de respuesta inválido')
      }
    } catch (err: any) {
      console.error('Error al importar Excel:', err)
      setError(err.message || 'Error al procesar el archivo Excel')
      setMaterialesPreview([])
    } finally {
      setLoading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    disabled: loading,
  })

  const handleMaterialChange = (index: number, field: keyof Material, value: any) => {
    setMaterialesPreview((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, [field]: value } : m
      )
    )
  }

  const handleRemoveMaterial = (index: number) => {
    setMaterialesPreview((prev) => prev.filter((_, i) => i !== index))
  }

  const handleConfirm = () => {
    if (materialesPreview.length === 0) {
      setError('Debe haber al menos un material para importar')
      return
    }

    // Validar que todos los materiales tengan nombre
    const materialesInvalidos = materialesPreview.filter((m) => !m.material_nombre.trim())
    if (materialesInvalidos.length > 0) {
      setError('Todos los materiales deben tener un nombre')
      return
    }

    onImport(materialesPreview)
    handleClose()
  }

  const handleClose = () => {
    setMaterialesPreview([])
    setArchivoSeleccionado(null)
    setError(null)
    onHide()
  }

  return (
    <Modal show={show} onHide={handleClose} size="xl">
      <ModalHeader closeButton>
        <ModalTitle>
          <LuFileSpreadsheet className="me-2" size={20} />
          Importar Materiales desde Excel
        </ModalTitle>
      </ModalHeader>
      <ModalBody>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        {/* Área de Dropzone */}
        <div
          {...getRootProps()}
          className={`border rounded p-5 text-center mb-4 ${
            isDragActive ? 'border-primary bg-light' : 'border-dashed'
          }`}
          style={{
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          <input {...getInputProps()} />
          {loading ? (
            <>
              <div className="spinner-border text-primary mb-2" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p className="mb-0">Procesando archivo...</p>
            </>
          ) : archivoSeleccionado ? (
            <>
              <LuCheck className="text-success mb-2" size={48} />
              <p className="mb-1">
                <strong>{archivoSeleccionado.name}</strong>
              </p>
              <p className="text-muted mb-0 small">
                {archivoSeleccionado.size > 1024 * 1024
                  ? `${(archivoSeleccionado.size / (1024 * 1024)).toFixed(2)} MB`
                  : `${(archivoSeleccionado.size / 1024).toFixed(2)} KB`}
              </p>
              <p className="text-muted mt-2 mb-0 small">
                Haz clic para seleccionar otro archivo
              </p>
            </>
          ) : (
            <>
              <LuUpload className="text-muted mb-2" size={48} />
              <p className="mb-1">
                {isDragActive ? (
                  <strong>Suelta el archivo aquí</strong>
                ) : (
                  <>
                    <strong>Arrastra un archivo Excel aquí</strong>
                    <br />
                    o haz clic para seleccionar
                  </>
                )}
              </p>
              <p className="text-muted mb-0 small">
                Formatos aceptados: .xlsx, .xls, .csv (máx. 5MB)
              </p>
            </>
          )}
        </div>

        {/* Información del formato esperado */}
        <Alert variant="info" className="mb-3">
          <strong>Formato esperado del Excel:</strong>
          <br />
          <small>
            Las columnas deben ser (case-insensitive): <strong>Material</strong>, <strong>Tipo</strong>,{' '}
            <strong>Cantidad</strong>, <strong>Obligatorio</strong>, <strong>Descripción</strong> (opcional)
            <br />
            Ejemplo: Material | Tipo | Cantidad | Obligatorio | Descripción
          </small>
        </Alert>

        {/* Preview de materiales */}
        {materialesPreview.length > 0 && (
          <div>
            <h6 className="mb-3">
              Preview de Materiales ({materialesPreview.length} encontrados)
            </h6>
            <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Table striped bordered hover size="sm">
                <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                  <tr>
                    <th style={{ width: '30%' }}>Material *</th>
                    <th style={{ width: '15%' }}>Tipo *</th>
                    <th style={{ width: '10%' }}>Cantidad *</th>
                    <th style={{ width: '10%' }}>Obligatorio</th>
                    <th style={{ width: '25%' }}>Descripción</th>
                    <th style={{ width: '10%' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {materialesPreview.map((material, index) => (
                    <tr key={index}>
                      <td>
                        <FormControl
                          type="text"
                          value={material.material_nombre}
                          onChange={(e) =>
                            handleMaterialChange(index, 'material_nombre', e.target.value)
                          }
                          placeholder="Nombre del material"
                          size="sm"
                        />
                      </td>
                      <td>
                        <FormControl
                          as="select"
                          value={material.tipo}
                          onChange={(e) =>
                            handleMaterialChange(index, 'tipo', e.target.value as Material['tipo'])
                          }
                          size="sm"
                        >
                          {TIPOS_MATERIAL.map((tipo) => (
                            <option key={tipo.value} value={tipo.value}>
                              {tipo.label}
                            </option>
                          ))}
                        </FormControl>
                      </td>
                      <td>
                        <FormControl
                          type="number"
                          min="1"
                          value={material.cantidad}
                          onChange={(e) =>
                            handleMaterialChange(
                              index,
                              'cantidad',
                              parseInt(e.target.value) || 1
                            )
                          }
                          size="sm"
                        />
                      </td>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          checked={material.obligatorio}
                          onChange={(e) =>
                            handleMaterialChange(index, 'obligatorio', e.target.checked)
                          }
                          className="form-check-input"
                        />
                      </td>
                      <td>
                        <FormControl
                          type="text"
                          value={material.descripcion || ''}
                          onChange={(e) =>
                            handleMaterialChange(index, 'descripcion', e.target.value)
                          }
                          placeholder="Descripción opcional"
                          size="sm"
                        />
                      </td>
                      <td className="text-center">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleRemoveMaterial(index)}
                        >
                          <LuX size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <Alert variant="success" className="mt-3 mb-0">
              <small>
                ✅ Revisa y edita los materiales antes de confirmar. Puedes modificar cualquier campo
                o eliminar materiales que no desees importar.
              </small>
            </Alert>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={loading || materialesPreview.length === 0}
        >
          {loading ? 'Procesando...' : `Importar ${materialesPreview.length} Materiales`}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
