/**
 * Declaraciones de tipos para pdfmake
 */

declare module 'pdfmake/build/pdfmake' {
  const pdfMake: {
    vfs: any
    createPdf: (docDefinition: any) => {
      download: (filename: string) => void
      open: () => void
      print: () => void
      getBlob: (callback: (blob: Blob) => void) => void
      getBase64: (callback: (base64: string) => void) => void
      getDataUrl: (callback: (dataUrl: string) => void) => void
      getBuffer: (callback: (buffer: Buffer) => void) => void
    }
  }
  export default pdfMake
}

declare module 'pdfmake/build/vfs_fonts' {
  const pdfMake: {
    pdfMake?: {
      vfs?: any
    }
    vfs?: any
  }
  export default pdfMake
}
