/**
 * Tipos TypeScript para Haulmer (Espacio) - Facturación Electrónica
 * Documentación: https://espacio.haulmer.com/
 */

// Tipos de DTE según SII
export type TipoDTE = 33 | 34 | 39 | 41 | 56 | 61 | 52 | 46 | 110 | 111 | 112

// Estructura de documento según API de Haulmer
export interface HaulmerDTE {
  Encabezado: {
    IdDoc: {
      TipoDTE: TipoDTE // 33: Factura, 34: Factura Exenta, 39: Boleta, 56: Nota de Débito, etc.
      FchEmis: string // Fecha de emisión en formato AAAA-MM-DD
      FmaPago?: number // Forma de pago (opcional)
      FchVenc?: string // Fecha de vencimiento (opcional)
    }
    Emisor: {
      RUTEmisor: string // RUT del emisor (sin puntos, con guión)
      RznSoc: string // Razón social del emisor
      GiroEmis: string // Giro comercial del emisor
      DirOrigen: string // Dirección del emisor
      CmnaOrigen: string // Comuna del emisor
      CiudadOrigen?: string // Ciudad del emisor (opcional)
    }
    Receptor: {
      RUTRecep: string // RUT del receptor (sin puntos, con guión)
      RznSocRecep: string // Razón social del receptor
      GiroRecep?: string // Giro comercial del receptor (opcional)
      DirRecep: string // Dirección del receptor
      CmnaRecep: string // Comuna del receptor
      CiudadRecep?: string // Ciudad del receptor (opcional)
      Contacto?: string // Email o teléfono (opcional)
    }
  }
  Detalle: Array<{
    NmbItem: string // Nombre del ítem
    QtyItem: number // Cantidad
    UnmdItem: string // Unidad de medida (UN, KG, etc.)
    PrcItem: number // Precio unitario (sin decimales, en centavos)
    MontoItem: number // Monto total del ítem (sin decimales, en centavos)
    DscItem?: string // Descripción adicional (opcional)
    CdgItem?: { // Código del ítem (opcional)
      TpoCodigo: string
      VlrCodigo: string
    }
  }>
  Totales: {
    MntNeto: number // Monto neto (sin decimales, en centavos)
    IVA?: number // IVA (opcional, sin decimales, en centavos)
    MntExe?: number // Monto exento (opcional)
    MntTotal: number // Monto total (sin decimales, en centavos)
  }
  Referencia?: Array<{ // Referencias a otros documentos (opcional)
    TpoDocRef: string
    FolioRef: string
    FchRef: string
  }>
}

// Interfaz simplificada para uso interno (se transforma a HaulmerDTE)
export interface OpenFacturaDocument {
  tipo: 'factura' | 'boleta' | 'nota_credito' | 'nota_debito'
  folio?: number
  fecha: string
  receptor: {
    rut: string
    razon_social?: string
    giro?: string
    direccion?: string
    comuna?: string
    ciudad?: string
    email?: string
  }
  items: Array<{
    nombre: string
    cantidad: number
    precio: number
    descuento?: number
    impuesto?: number
    codigo?: string
  }>
  descuento_global?: number
  observaciones?: string
  referencia?: string
}

// Respuesta de la API de Haulmer al emitir un DTE
export interface HaulmerEmitResponse {
  success: boolean
  folio?: number
  documento_id?: string
  pdf_url?: string
  xml_url?: string
  timbre?: string
  estado?: string // Estado del documento
  error?: string
  message?: string
  data?: {
    folio?: number
    documento_id?: string
    pdf_url?: string
    xml_url?: string
    timbre?: string
  }
}

// Alias para compatibilidad
export interface OpenFacturaEmitResponse extends HaulmerEmitResponse {}

export interface OpenFacturaConfig {
  razon_social: string
  rut: string
  giro?: string
  direccion?: string
  comuna?: string
  ciudad?: string
  telefono?: string
  email?: string
}
