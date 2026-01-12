/**
 * Helper para exportar materiales a PDF
 */

export interface MaterialPDF {
  material_nombre: string
  tipo: 'util' | 'libro' | 'cuaderno' | 'otro'
  cantidad: number
  obligatorio: boolean
  descripcion?: string
}

/**
 * Exporta materiales a PDF usando pdfmake
 */
export async function exportarMaterialesAPDF(
  materiales: MaterialPDF[],
  nombreArchivo: string = 'materiales',
  titulo: string = 'Lista de Materiales'
): Promise<void> {
  try {
    // Importar pdfmake dinámicamente
    const pdfMake = await import('pdfmake/build/pdfmake')
    const pdfFonts = await import('pdfmake/build/vfs_fonts')
    
    // Configurar las fuentes
    if (pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
      pdfMake.default.vfs = pdfFonts.pdfMake.vfs
    }

    // Preparar datos para la tabla
    const tableBody: any[] = [
      [
        { text: 'Cant.', style: 'tableHeader', alignment: 'center' },
        { text: 'Material', style: 'tableHeader' },
        { text: 'Tipo', style: 'tableHeader' },
        { text: 'Estado', style: 'tableHeader', alignment: 'center' },
        { text: 'Descripción', style: 'tableHeader' },
      ],
    ]

    materiales.forEach((material) => {
      tableBody.push([
        { text: String(material.cantidad || 1), alignment: 'center' },
        { text: material.material_nombre || 'Sin nombre' },
        {
          text:
            material.tipo === 'util'
              ? 'Útil Escolar'
              : material.tipo === 'libro'
              ? 'Libro'
              : material.tipo === 'cuaderno'
              ? 'Cuaderno'
              : material.tipo === 'otro'
              ? 'Otro'
              : 'Útil Escolar',
        },
        {
          text: material.obligatorio !== false ? 'Obligatorio' : 'Opcional',
          alignment: 'center',
          color: material.obligatorio !== false ? '#28a745' : '#6c757d',
        },
        { text: material.descripcion || '-', style: 'descripcion' },
      ])
    })

    // Definir el documento PDF
    const docDefinition: any = {
      content: [
        {
          text: titulo,
          style: 'header',
          margin: [0, 0, 0, 20],
        },
        {
          text: `Total de materiales: ${materiales.length}`,
          style: 'subheader',
          margin: [0, 0, 0, 15],
        },
        {
          table: {
            headerRows: 1,
            widths: ['8%', '35%', '20%', '15%', '22%'],
            body: tableBody,
          },
          layout: {
            hLineWidth: function (i: number, node: any) {
              return i === 0 || i === node.table.body.length ? 1 : 0.5
            },
            vLineWidth: function (i: number, node: any) {
              return i === 0 || i === node.table.widths.length ? 1 : 0.5
            },
            hLineColor: function (i: number, node: any) {
              return i === 0 || i === node.table.body.length ? '#000000' : '#cccccc'
            },
            vLineColor: function (i: number, node: any) {
              return i === 0 || i === node.table.widths.length ? '#000000' : '#cccccc'
            },
            paddingLeft: function (i: number) {
              return i === 0 ? 0 : 8
            },
            paddingRight: function (i: number, node: any) {
              return i === node.table.widths.length - 1 ? 0 : 8
            },
            paddingTop: 5,
            paddingBottom: 5,
          },
        },
        {
          text: `\nGenerado el ${new Date().toLocaleDateString('es-CL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}`,
          style: 'footer',
          alignment: 'right',
          margin: [0, 20, 0, 0],
        },
      ],
      styles: {
        header: {
          fontSize: 20,
          bold: true,
          alignment: 'center',
        },
        subheader: {
          fontSize: 12,
          color: '#666666',
        },
        tableHeader: {
          bold: true,
          fontSize: 11,
          color: '#ffffff',
          fillColor: '#495057',
        },
        descripcion: {
          fontSize: 9,
          color: '#666666',
        },
        footer: {
          fontSize: 8,
          color: '#999999',
        },
      },
      defaultStyle: {
        fontSize: 10,
        font: 'Roboto',
      },
      pageMargins: [40, 60, 40, 60],
    }

    // Generar y descargar el PDF
    pdfMake.default.createPdf(docDefinition).download(`${nombreArchivo}.pdf`)
  } catch (error: any) {
    console.error('Error al exportar materiales a PDF:', error)
    throw new Error('Error al generar el PDF: ' + (error.message || 'Error desconocido'))
  }
}
