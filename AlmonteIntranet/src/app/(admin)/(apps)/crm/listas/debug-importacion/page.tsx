'use client'

import { useState } from 'react'
import { Button, Form, Alert, Table, Card } from 'react-bootstrap'
import * as XLSX from 'xlsx'

export default function DebugImportacionPage() {
  const [debugData, setDebugData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    const reader = new FileReader()

    reader.onload = async (event) => {
      try {
        const data = event.target?.result
        if (!data) {
          setError('No se pudo leer el archivo')
          return
        }

        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const firstSheet = workbook.Sheets[firstSheetName]

        // Leer como JSON (sin procesar)
        const jsonDataRaw = XLSX.utils.sheet_to_json(firstSheet, { 
          raw: false,
          defval: '',
        })

        // Leer primera fila como texto para ver encabezados
        const firstRowA1 = (firstSheet['A1']?.w ?? '').toString()
        const hasTitleRow = firstRowA1.includes('Plantilla') || firstRowA1.includes('Listas de Útiles')

        // Leer encabezados directamente
        const headers: string[] = []
        const range = XLSX.utils.decode_range(firstSheet['!ref'] || 'A1:Z1')
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: hasTitleRow ? 1 : 0, c: C })
          const cell = firstSheet[cellAddress]
          headers.push(cell?.w || cell?.v || `Columna ${C + 1}`)
        }

        // Detectar columnas
        const norm = (s: string) => String(s).toLowerCase().replace(/\s+/g, ' ').replace(/[º°]/g, 'o').trim()
        const findKey = (variantes: string[]) => {
          const set = new Set(variantes.map(v => norm(v)))
          return headers.find(k => set.has(norm(k))) || headers.find(k => variantes.some(v => norm(k).includes(norm(v)) || norm(v).includes(norm(k))))
        }

        const colRBD = findKey(['RBD', 'rbd', 'Codigo RBD', 'Código RBD'])
        const colCurso = findKey(['Curso', 'curso', 'Nombre Curso'])
        const colNcurso = findKey(['Nº curso', 'N° curso', 'No curso', 'Grado', 'grado'])
        const colAño = findKey(['Año', 'ano', 'Año_curso', 'Año_curso'])
        const colURLPDF = findKey(['URL PDF', 'url pdf', 'Url Pdf', 'URL_PDF', 'url_pdf', 'URL_lista', 'url_lista'])
        const colURLOriginal = findKey(['URL ORIGINAL', 'url original', 'URL_ORIGINAL', 'url_original'])
        const colFecha = findKey(['FECHA DE ACTUALIZACION DE LISTA DE UTILES', 'Fecha de actualizacion de lista de utiles', 'FECHA_ACTUALIZACION_LISTA'])

        // Normalizar datos
        const normalizedData = jsonDataRaw.map((row: any, index: number) => {
          const getVal = (variantes: string[]) => {
            for (const v of variantes) {
              if (row[v] !== undefined && row[v] !== null && String(row[v]).trim() !== '') {
                return row[v]
              }
            }
            return undefined
          }

          const rbdVal = colRBD ? row[colRBD] : getVal(['RBD', 'rbd'])
          const cursoVal = colCurso ? row[colCurso] : getVal(['Curso', 'curso'])
          const ncursoVal = colNcurso ? row[colNcurso] : getVal(['Nº curso', 'N° curso', 'Grado', 'grado'])
          const añoVal = colAño ? row[colAño] : getVal(['Año', 'ano', 'Año_curso'])

          return {
            fila: index + 1,
            raw: row,
            normalized: {
              RBD: rbdVal,
              Curso: cursoVal,
              'Nº curso': ncursoVal,
              Año: añoVal,
              'URL PDF': colURLPDF ? row[colURLPDF] : undefined,
              'URL ORIGINAL': colURLOriginal ? row[colURLOriginal] : undefined,
              'FECHA ACTUALIZACION': colFecha ? row[colFecha] : undefined,
            },
            validation: {
              tieneRBD: !!rbdVal,
              tieneCurso: !!cursoVal,
              tieneNcurso: !!ncursoVal,
              tieneAño: !!añoVal,
              esValida: !!(rbdVal && cursoVal && ncursoVal && añoVal),
            },
          }
        })

        setDebugData({
          fileName: file.name,
          fileSize: file.size,
          sheetName: firstSheetName,
          hasTitleRow,
          headers,
          columnasDetectadas: {
            RBD: colRBD,
            Curso: colCurso,
            'Nº curso': colNcurso,
            Año: colAño,
            'URL PDF': colURLPDF,
            'URL ORIGINAL': colURLOriginal,
            'FECHA ACTUALIZACION': colFecha,
          },
          totalFilas: jsonDataRaw.length,
          filasValidas: normalizedData.filter((f: any) => f.validation.esValida).length,
          filasInvalidas: normalizedData.filter((f: any) => !f.validation.esValida).length,
          datos: normalizedData,
          rawData: jsonDataRaw.slice(0, 5), // Primeras 5 filas crudas
        })
      } catch (err: any) {
        setError(`Error al leer el archivo: ${err.message}`)
        console.error('Error en debug:', err)
      }
    }

    reader.readAsArrayBuffer(file)
  }

  return (
    <div className="container-fluid py-4">
      <Card>
        <Card.Header>
          <h2>🔍 Debug: Importación Completa</h2>
          <p className="mb-0 text-muted">Página de debug para analizar archivos Excel de importación</p>
        </Card.Header>
        <Card.Body>
          <Form.Group className="mb-4">
            <Form.Label>Subir archivo Excel para analizar:</Form.Label>
            <Form.Control type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
          </Form.Group>

          {error && (
            <Alert variant="danger">
              <strong>Error:</strong> {error}
            </Alert>
          )}

          {debugData && (
            <div>
              <h3>📊 Información del Archivo</h3>
              <Table striped bordered className="mb-4">
                <tbody>
                  <tr>
                    <td><strong>Nombre del archivo:</strong></td>
                    <td>{debugData.fileName}</td>
                  </tr>
                  <tr>
                    <td><strong>Tamaño:</strong></td>
                    <td>{(debugData.fileSize / 1024).toFixed(2)} KB</td>
                  </tr>
                  <tr>
                    <td><strong>Hoja:</strong></td>
                    <td>{debugData.sheetName}</td>
                  </tr>
                  <tr>
                    <td><strong>Tiene fila de título:</strong></td>
                    <td>{debugData.hasTitleRow ? '✅ Sí' : '❌ No'}</td>
                  </tr>
                  <tr>
                    <td><strong>Total de filas:</strong></td>
                    <td>{debugData.totalFilas}</td>
                  </tr>
                  <tr>
                    <td><strong>Filas válidas:</strong></td>
                    <td>
                      <span className="text-success">{debugData.filasValidas}</span>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Filas inválidas:</strong></td>
                    <td>
                      <span className="text-danger">{debugData.filasInvalidas}</span>
                    </td>
                  </tr>
                </tbody>
              </Table>

              <h3>📋 Encabezados Detectados</h3>
              <Table striped bordered className="mb-4">
                <thead>
                  <tr>
                    <th>Columna</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {debugData.headers.map((header: string, index: number) => (
                    <tr key={index}>
                      <td>{String.fromCharCode(65 + index)}</td>
                      <td>{header || '(vacío)'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              <h3>🔍 Columnas Mapeadas</h3>
              <Table striped bordered className="mb-4">
                <thead>
                  <tr>
                    <th>Campo</th>
                    <th>Columna Detectada</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(debugData.columnasDetectadas).map(([campo, columna]: [string, any]) => (
                    <tr key={campo}>
                      <td><strong>{campo}</strong></td>
                      <td>{columna || '(no detectada)'}</td>
                      <td>{columna ? '✅' : '❌'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              <h3>📝 Datos Normalizados (Primeras 10 filas)</h3>
              <div className="table-responsive">
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Fila</th>
                      <th>RBD</th>
                      <th>Curso</th>
                      <th>Nº curso</th>
                      <th>Año</th>
                      <th>URL PDF</th>
                      <th>URL ORIGINAL</th>
                      <th>FECHA</th>
                      <th>Válida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debugData.datos.slice(0, 10).map((fila: any) => (
                      <tr key={fila.fila} className={fila.validation.esValida ? '' : 'table-warning'}>
                        <td>{fila.fila}</td>
                        <td>{fila.normalized.RBD || '-'}</td>
                        <td>{fila.normalized.Curso || '-'}</td>
                        <td>{fila.normalized['Nº curso'] || '-'}</td>
                        <td>{fila.normalized.Año || '-'}</td>
                        <td className="text-truncate" style={{ maxWidth: '200px' }}>
                          {fila.normalized['URL PDF'] || '-'}
                        </td>
                        <td className="text-truncate" style={{ maxWidth: '200px' }}>
                          {fila.normalized['URL ORIGINAL'] || '-'}
                        </td>
                        <td>{fila.normalized['FECHA ACTUALIZACION'] || '-'}</td>
                        <td>{fila.validation.esValida ? '✅' : '❌'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              <h3>🔍 Datos Crudos (Primeras 5 filas)</h3>
              <pre className="bg-light p-3 rounded" style={{ maxHeight: '400px', overflow: 'auto' }}>
                {JSON.stringify(debugData.rawData, null, 2)}
              </pre>

              <h3>📊 Resumen de Validación</h3>
              <Table striped bordered>
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Tiene RBD</th>
                    <th>Tiene Curso</th>
                    <th>Tiene Nº curso</th>
                    <th>Tiene Año</th>
                    <th>Es Válida</th>
                  </tr>
                </thead>
                <tbody>
                  {debugData.datos.slice(0, 10).map((fila: any) => (
                    <tr key={fila.fila}>
                      <td>{fila.fila}</td>
                      <td>{fila.validation.tieneRBD ? '✅' : '❌'}</td>
                      <td>{fila.validation.tieneCurso ? '✅' : '❌'}</td>
                      <td>{fila.validation.tieneNcurso ? '✅' : '❌'}</td>
                      <td>{fila.validation.tieneAño ? '✅' : '❌'}</td>
                      <td>{fila.validation.esValida ? '✅' : '❌'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  )
}
