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

/**
 * Exporta listas de un colegio a Excel
 * @param datosExportacion - Datos de exportación desde la API
 * @param nombreArchivo - Nombre del archivo (sin extensión)
 */
export async function exportarListasColegioAExcel(
  datosExportacion: {
    colegio: {
      nombre: string
      rbd?: string
    }
    datosExcel: Array<{
      Colegio: string
      RBD: string
      Curso: string
      Paralelo: string
      Nivel: string
      Grado: number
      Año: number
      Versión: string
      Fecha_Versión: string
      Producto: string
      ISBN: string
      Marca: string
      Cantidad: number
      Precio: number
      Precio_WooCommerce: string | number
      Asignatura: string
      Descripción: string
      Comprar: string
      Disponibilidad: string
      Stock: string | number
      Validado: string
    }>
  },
  nombreArchivo?: string
) {
  // Verificar que esté en el cliente
  if (typeof window === 'undefined') {
    console.error('exportarListasColegioAExcel solo puede ejecutarse en el cliente')
    return
  }

  try {
    // Importar dinámicamente xlsx solo cuando se necesite
    const XLSX = await import('xlsx')

    if (!datosExportacion.datosExcel || datosExportacion.datosExcel.length === 0) {
      alert('No hay productos para exportar')
      return
    }

    // Crear workbook
    const workbook = XLSX.utils.book_new()

    // Hoja principal con todos los productos
    const worksheet = XLSX.utils.json_to_sheet(datosExportacion.datosExcel)

    // Ajustar ancho de columnas
    const columnWidths = [
      { wch: 30 }, // Colegio
      { wch: 12 }, // RBD
      { wch: 25 }, // Curso
      { wch: 10 }, // Paralelo
      { wch: 10 }, // Nivel
      { wch: 8 },  // Grado
      { wch: 8 },  // Año
      { wch: 20 }, // Versión
      { wch: 12 }, // Fecha Versión
      { wch: 40 }, // Producto
      { wch: 15 }, // ISBN
      { wch: 15 }, // Marca
      { wch: 10 }, // Cantidad
      { wch: 12 }, // Precio
      { wch: 15 }, // Precio WooCommerce
      { wch: 20 }, // Asignatura
      { wch: 30 }, // Descripción
      { wch: 10 }, // Comprar
      { wch: 15 }, // Disponibilidad
      { wch: 10 }, // Stock
      { wch: 10 }, // Validado
    ]
    worksheet['!cols'] = columnWidths

    // Agregar worksheet al workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Listas Completas')

    // Crear hojas por curso si hay múltiples cursos
    const cursosUnicos = new Set(datosExportacion.datosExcel.map((row: any) => row.Curso))
    
    if (cursosUnicos.size > 1) {
      cursosUnicos.forEach((cursoNombre) => {
        const productosCurso = datosExportacion.datosExcel.filter((row: any) => row.Curso === cursoNombre)
        const worksheetCurso = XLSX.utils.json_to_sheet(productosCurso)
        worksheetCurso['!cols'] = columnWidths
        
        // Limitar nombre de hoja a 31 caracteres (límite de Excel)
        const nombreHoja = cursoNombre.length > 31 ? cursoNombre.substring(0, 28) + '...' : cursoNombre
        XLSX.utils.book_append_sheet(workbook, worksheetCurso, nombreHoja)
      })
    }

    // Generar archivo y descargar
    const fecha = new Date().toISOString().split('T')[0]
    const colegioNombreLimpio = datosExportacion.colegio.nombre
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 30)
    const nombre = nombreArchivo || `Listas_${colegioNombreLimpio}`
    const nombreCompleto = `${nombre}_${fecha}.xlsx`

    XLSX.writeFile(workbook, nombreCompleto)
    
    console.log(`✅ Exportación completada: ${datosExportacion.datosExcel.length} productos exportados`)
  } catch (error: any) {
    console.error('Error al exportar listas a Excel:', error)
    if (error.message?.includes('xlsx')) {
      alert('Error: No se pudo cargar la librería xlsx. Asegúrate de ejecutar: npm install')
    } else {
      alert('Error al exportar a Excel: ' + (error.message || 'Error desconocido'))
    }
  }
}