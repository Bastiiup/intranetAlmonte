/**
 * Utilidades para exportar datos a Excel usando xlsx (SheetJS)
 * 
 * NOTA: Esta función solo funciona en el cliente (browser)
 */

interface MaterialExport {
  Material: string
  Tipo: string
  Cantidad: number
  Obligatorio: string
  Descripcion?: string
}

/**
 * Exporta materiales a un archivo Excel
 * @param materiales - Array de materiales a exportar
 * @param nombreArchivo - Nombre del archivo (sin extensión)
 */
export async function exportarMaterialesAExcel(
  materiales: Array<{
    material_nombre: string
    tipo: 'util' | 'libro' | 'cuaderno' | 'otro'
    cantidad: number
    obligatorio: boolean
    descripcion?: string
  }>,
  nombreArchivo: string = 'materiales'
) {
  // Verificar que esté en el cliente
  if (typeof window === 'undefined') {
    console.error('exportarMaterialesAExcel solo puede ejecutarse en el cliente')
    return
  }

  try {
    // Importar dinámicamente xlsx solo cuando se necesite
    const XLSX = await import('xlsx')

    // Mapear materiales al formato Excel
    const datosExport: MaterialExport[] = materiales.map((m) => {
      const tipoLabel =
        m.tipo === 'util'
          ? 'Útil Escolar'
          : m.tipo === 'libro'
          ? 'Libro'
          : m.tipo === 'cuaderno'
          ? 'Cuaderno'
          : 'Otro'

      return {
        Material: m.material_nombre,
        Tipo: tipoLabel,
        Cantidad: m.cantidad,
        Obligatorio: m.obligatorio ? 'Sí' : 'No',
        Descripcion: m.descripcion || '',
      }
    })

    // Crear workbook y worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(datosExport)

    // Ajustar ancho de columnas
    const columnWidths = [
      { wch: 40 }, // Material
      { wch: 15 }, // Tipo
      { wch: 10 }, // Cantidad
      { wch: 12 }, // Obligatorio
      { wch: 30 }, // Descripción
    ]
    worksheet['!cols'] = columnWidths

    // Agregar worksheet al workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Materiales')

    // Generar archivo y descargar
    const fecha = new Date().toISOString().split('T')[0]
    const nombreCompleto = `${nombreArchivo}_${fecha}.xlsx`

    XLSX.writeFile(workbook, nombreCompleto)
  } catch (error: any) {
    console.error('Error al exportar a Excel:', error)
    if (error.message?.includes('xlsx')) {
      alert('Error: No se pudo cargar la librería xlsx. Asegúrate de ejecutar: npm install')
    } else {
      alert('Error al exportar a Excel: ' + (error.message || 'Error desconocido'))
    }
  }
}

/**
 * Exporta una lista completa de útiles a Excel
 * @param listaUtiles - Objeto con nombre, nivel, grado y materiales
 * @param nombreArchivo - Nombre del archivo (sin extensión)
 */
export function exportarListaUtilesAExcel(
  listaUtiles: {
    nombre: string
    nivel?: string
    grado?: number | string
    materiales: Array<{
      material_nombre: string
      tipo: 'util' | 'libro' | 'cuaderno' | 'otro'
      cantidad: number
      obligatorio: boolean
      descripcion?: string
    }>
  },
  nombreArchivo?: string
) {
  const nombre = nombreArchivo || listaUtiles.nombre || 'lista_utiles'
  const nombreArchivoCompleto = listaUtiles.nivel && listaUtiles.grado
    ? `${nombre}_${listaUtiles.grado}°_${listaUtiles.nivel}`
    : nombre

  exportarMaterialesAExcel(listaUtiles.materiales, nombreArchivoCompleto)
}
