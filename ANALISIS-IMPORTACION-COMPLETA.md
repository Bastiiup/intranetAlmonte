# 📊 Análisis Completo: Importación Completa (Plantilla) - `/crm/listas`

## 🎯 Resumen Ejecutivo

El sistema de **Importación Completa** permite cargar masivamente colegios, cursos, asignaturas y productos/libros desde un archivo Excel/CSV. El proceso se ejecuta completamente en el cliente (frontend) y realiza múltiples llamadas a APIs del servidor para crear/actualizar datos en Strapi.

---

## 📍 Ubicación y Componentes

### Archivos Principales:
- **Componente Modal:** `AlmonteIntranet/src/app/(admin)/(apps)/crm/listas/components/ImportacionCompletaModal.tsx`
- **Página Principal:** `AlmonteIntranet/src/app/(admin)/(apps)/crm/listas/page.tsx`
- **Componente Listing:** `AlmonteIntranet/src/app/(admin)/(apps)/crm/listas/components/ListasListing.tsx`

### Endpoints API Utilizados:
1. `GET /api/crm/colegios?page=1&pageSize=10000` - Obtener todos los colegios
2. `GET /api/crm/colegios?rbd={rbd}` - Buscar colegio por RBD
3. `POST /api/crm/colegios` - Crear nuevo colegio
4. `GET /api/crm/colegios/{colegioId}/cursos` - Obtener cursos de un colegio
5. `POST /api/crm/colegios/{colegioId}/cursos` - Crear nuevo curso
6. `GET /api/crm/cursos/{cursoId}` - Obtener curso por ID
7. `PUT /api/crm/cursos/{cursoId}` - Actualizar curso con versiones de materiales
8. `POST /api/upload` - Subir archivos PDF a Strapi
9. `POST /api/crm/listas/descargar-pdf` - Descargar PDF desde URL
10. `POST /api/crm/listas/importacion-completa-logs` - Enviar logs al servidor

---

## 🔄 Flujo Completo Paso a Paso

### **FASE 1: Carga y Lectura del Archivo Excel/CSV**

#### 1.1. Usuario Sube Archivo
- **Trigger:** `handleFileUpload` se ejecuta cuando el usuario selecciona un archivo
- **Validación:** 
  - Verifica que el archivo existe
  - No valida tipo de archivo explícitamente (acepta cualquier archivo)
- **Progreso:** Muestra barra de progreso (0-100%)

#### 1.2. Lectura del Archivo
```typescript
// Línea 474-486
const reader = new FileReader()
reader.readAsArrayBuffer(file) // Lee el archivo como ArrayBuffer
const workbook = XLSX.read(data, { type: 'array' }) // Convierte a workbook de Excel
const firstSheet = workbook.Sheets[workbook.SheetNames[0]] // Obtiene primera hoja
```

#### 1.3. Detección de Fila de Título
```typescript
// Línea 489-494
const firstRowA1 = (firstSheet['A1']?.w ?? '').toString()
const hasTitleRow = firstRowA1.includes('Plantilla') || firstRowA1.includes('Listas de Útiles')
const jsonDataRaw = XLSX.utils.sheet_to_json(firstSheet, {
  raw: false,
  ...(hasTitleRow && { range: 1 }), // Si hay título, saltar fila 1
})
```

**Lógica:**
- Si la celda A1 contiene "Plantilla" o "Listas de Útiles", se considera que la fila 1 es título
- En ese caso, la fila 2 se usa como encabezados y la fila 3+ como datos
- Si no hay título, la fila 1 son los encabezados

#### 1.4. Normalización de Nombres de Columnas
```typescript
// Línea 497-504
const normalizarClave = (key: string) => String(key).replace(/^\uFEFF/, '').trim()
// Quita BOM (Byte Order Mark) y espacios al inicio/final
```

**Problema que resuelve:** Excel a veces agrega caracteres invisibles (BOM) al guardar archivos, especialmente con encoding UTF-8.

#### 1.5. Resolución de Columnas (Detección Flexible)
```typescript
// Línea 508-524
const norm = (s: string) => String(s).toLowerCase().replace(/\s+/g, ' ').replace(/[º°]/g, 'o').trim()
const findKey = (variantes: string[]) => {
  // Busca columnas que coincidan con variantes (case-insensitive, sin acentos)
}

// Ejemplos de variantes detectadas:
const colRBD = findKey(['RBD', 'rbd', 'Codigo RBD', 'Código RBD'])
const colCurso = findKey(['Curso', 'curso', 'Nombre Curso'])
const colAsignatura = findKey(['Asignatura', 'asignatura', 'Materia', 'Ramo'])
const colProducto = findKey(['Producto', 'producto', 'Libro_nombre', 'Libro nombre', 'Item'])
```

**Características:**
- **Case-insensitive:** "RBD" = "rbd" = "Rbd"
- **Normaliza espacios:** "Libro nombre" = "Libro_nombre"
- **Reemplaza caracteres:** "Nº curso" = "No curso"
- **Múltiples variantes:** Acepta diferentes nombres para la misma columna

#### 1.6. Extracción de URL de PDF
```typescript
// Línea 532-595
const obtenerURLLista = (row: any): string | undefined => {
  // Busca en múltiples variantes de nombres de columna:
  // 'URL PDF', 'url pdf', 'Url Pdf', 'URL_PDF', 'url_pdf',
  // 'URL_lista', 'url_lista', 'URL', 'url', 'link_pdf', etc.
  
  // Valida que sea URL válida (debe empezar con http:// o https://)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
}
```

**Prioridad de búsqueda:**
1. Busca exacto (más rápido)
2. Busca case-insensitive
3. Busca si la key contiene "url" y "pdf"

---

### **FASE 2: Normalización y Agrupación de Datos**

#### 2.1. Normalización de Filas
```typescript
// Línea 604-680
const normalizedData: ImportRow[] = jsonData.map((row: any) => {
  // Usa valores de columnas resueltas + fallbacks por nombre
  return {
    Colegio: String(colegioVal ?? row.Colegio ?? row.colegio ?? '').trim(),
    RBD: rbdVal ? parseInt(String(rbdVal)) : undefined,
    Curso: String(cursoVal ?? row.Curso ?? row.curso ?? '').trim(),
    Asignatura: String(asignaturaVal ?? row.Asignatura ?? row.asignatura ?? '').trim(),
    Libro_nombre: String(productoVal ?? row.Libro_nombre ?? row.Producto ?? '').trim(),
    // ... más campos
  }
})
```

**Características:**
- **Fallbacks múltiples:** Si no encuentra en columna resuelta, busca en nombres alternativos
- **Conversión de tipos:** RBD se convierte a número, orden a número, etc.
- **Trim:** Elimina espacios al inicio/final

#### 2.2. Carga de Colegios Existentes (Optimización)
```typescript
// Línea 697-729
const colegiosResponse = await fetch('/api/crm/colegios?page=1&pageSize=10000')
// Carga TODOS los colegios para verificar cuáles ya existen

// Crea mapas para búsqueda rápida:
const colegiosExistentesMap = new Map<number, boolean>() // RBD -> existe
const colegiosExistentesPorNombre = new Map<string, boolean>() // Nombre normalizado -> existe
const colegiosDatosCompletosPorRBD = new Map<number, any>() // RBD -> datos completos
```

**Optimización:** Carga todos los colegios una sola vez al inicio para evitar múltiples llamadas a la API durante el procesamiento.

#### 2.3. Agrupación por Colegio + Curso + Asignatura + Lista
```typescript
// Línea 732-864
const agrupadoMap = new Map<string, AgrupadoPorLista>()

normalizedData.forEach((row) => {
  // Validación: necesita RBD o Colegio, Curso, Asignatura, y Producto
  const tieneDatosMinimos = (row.RBD || row.Colegio) && row.Curso && row.Asignatura && row.Libro_nombre
  
  if (!tieneDatosMinimos) {
    return // Saltar filas incompletas
  }
  
  // Crear clave única: colegio|curso|asignatura|lista
  const clave = `${identificadorColegio}|${row.Curso}|${row.Asignatura || 'Sin asignatura'}|${listaNombre}`
  
  if (!agrupadoMap.has(clave)) {
    // Crear nuevo grupo
    agrupadoMap.set(clave, {
      colegio: { nombre, rbd, comuna, orden, existe, datosCompletos },
      curso: { nombre, año, orden },
      asignatura: { nombre, orden },
      lista: { nombre, año, fecha_actualizacion, url_lista, ... },
      productos: [],
    })
  }
  
  // Agregar producto al grupo
  const grupo = agrupadoMap.get(clave)!
  grupo.productos.push(row)
})
```

**Estructura del agrupamiento:**
- **Clave única:** `"Colegio|Curso|Asignatura|Lista"`
- **Un grupo = Una versión de materiales** (una lista por asignatura)
- **Productos:** Todos los productos de esa asignatura se agrupan en el mismo grupo

#### 2.4. Extracción de Nivel y Grado del Curso
```typescript
// Línea 752-782
let nivel = 'Basica'
let grado = 1

// Si viene en columna separada
if (row.nivel || row.Nivel) {
  const nivelStr = String(row.nivel || row.Nivel || '').toLowerCase()
  nivel = nivelStr.includes('media') ? 'Media' : 'Basica'
} else {
  // Extraer del nombre del curso
  const nivelMatch = row.Curso.match(/(Básica|Basica|Media)/i)
  if (nivelMatch) {
    nivel = nivelMatch[0].toLowerCase().includes('basica') ? 'Basica' : 'Media'
  }
}

// Similar para grado
if (row.grado || row.Grado || row['Nº curso']) {
  grado = parseInt(String(row.grado || row.Grado || row['Nº curso'])) || 1
} else {
  const gradoMatch = row.Curso.match(/(\d+)/)
  if (gradoMatch) {
    grado = parseInt(gradoMatch[1]) || 1
  }
}
```

**Lógica:**
- **Prioridad 1:** Si viene en columna separada (`Nivel`, `Grado`), usa ese valor
- **Prioridad 2:** Extrae del nombre del curso usando regex
- **Default:** Nivel = "Basica", Grado = 1

---

### **FASE 3: Procesamiento de Grupos (Creación en Strapi)**

#### 3.1. Carga de Colegios (Nuevamente)
```typescript
// Línea 917-953
const colegiosResponse = await fetch('/api/crm/colegios?page=1&pageSize=10000')
// Crea mapas para búsqueda rápida durante el procesamiento
const colegiosMap = new Map<number, { id, nombre, datosCompletos }>() // RBD -> datos
const colegiosByName = new Map<string, { id, nombre, rbd, datosCompletos }>() // Nombre normalizado -> datos
```

**Nota:** Se carga nuevamente porque el procesamiento puede ocurrir después de que el usuario haya revisado los datos.

#### 3.2. Ordenamiento de Grupos
```typescript
// Línea 957-972
const gruposArray = Array.from(agrupado.entries())
  .map(([key, grupo]) => ({ key, grupo }))
  .sort((a, b) => {
    // Ordena por: orden_colegio -> orden_curso -> orden_asignatura -> orden_lista
    const ordenColegioA = a.grupo.colegio.orden || 0
    const ordenColegioB = b.grupo.colegio.orden || 0
    if (ordenColegioA !== ordenColegioB) return ordenColegioA - ordenColegioB
    // ... más comparaciones
  })
```

**Propósito:** Procesar los grupos en el orden correcto según los campos `Orden_*` del Excel.

#### 3.3. Procesamiento de Cada Grupo (Loop Principal)
```typescript
// Línea 983-2062
for (const { key: grupoKey, grupo } of gruposArray) {
  // Para cada grupo:
  // 1. Buscar/Crear Colegio
  // 2. Buscar/Crear Curso
  // 3. Procesar PDFs
  // 4. Crear Versión de Materiales
  // 5. Actualizar Curso en Strapi
}
```

---

### **FASE 4: Búsqueda/Creación de Colegio**

#### 4.1. Búsqueda por RBD (Prioridad 1)
```typescript
// Línea 999-1014
if (grupo.colegio.rbd !== null && grupo.colegio.rbd !== undefined) {
  const rbdNum = Number(grupo.colegio.rbd)
  if (!isNaN(rbdNum)) {
    const colegio = colegiosMap.get(rbdNum)
    if (colegio) {
      colegioId = colegio.id
      colegioExistente = colegio.datosCompletos
      // ✅ Colegio encontrado
    }
  }
}
```

#### 4.2. Búsqueda por Nombre (Prioridad 2)
```typescript
// Línea 1017-1032
if (!colegioId && grupo.colegio.nombre) {
  const normalizedName = grupo.colegio.nombre
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
  
  const colegio = colegiosByName.get(normalizedName)
  if (colegio) {
    colegioId = colegio.id
    // ✅ Colegio encontrado
  }
}
```

**Normalización:**
- Convierte a minúsculas
- Elimina espacios múltiples
- Quita acentos (normalización NFD)

#### 4.3. Creación de Colegio (Si No Existe)
```typescript
// Línea 1056-1220
if (!colegioId) {
  // Validación: requiere RBD
  if (!grupo.colegio.rbd) {
    results.push({
      success: false,
      message: `No se puede crear colegio "${grupo.colegio.nombre}" sin RBD`,
      tipo: 'colegio',
    })
    continue // Saltar este grupo
  }
  
  // Crear colegio
  const createColegioResponse = await fetch('/api/crm/colegios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      colegio_nombre: grupo.colegio.nombre,
      rbd: grupo.colegio.rbd,
      ...(grupo.colegio.comuna && { comuna: grupo.colegio.comuna }),
    }),
  })
  
  const createColegioResult = await createColegioResponse.json()
  
  if (createColegioResponse.ok && createColegioResult.success) {
    const nuevoColegio = createColegioResult.data
    colegioId = nuevoColegio.id || nuevoColegio.documentId
    
    // Agregar a mapas para futuras búsquedas
    colegiosMap.set(rbdNum, { id: colegioId, nombre: grupo.colegio.nombre, datosCompletos: nuevoColegio })
    // ... más código
  }
}
```

**Manejo de Errores:**
- Si el RBD ya existe, busca el colegio existente y lo usa
- Si hay otro error, lo reporta y continúa con el siguiente grupo

---

### **FASE 5: Búsqueda/Creación de Curso**

#### 5.1. Cache de Cursos Procesados
```typescript
// Línea 979
const cursosProcesadosMap = new Map<string, number | string>()
// Clave: "colegioId|nombreCurso|nivel|grado|año" -> cursoId
```

**Optimización:** Evita crear cursos duplicados cuando el mismo curso aparece con diferentes asignaturas/PDFs.

#### 5.2. Verificar Cache
```typescript
// Línea 1240-1248
const cursoKey = `${colegioId}|${grupo.curso.nombre.toLowerCase().trim()}|${nivel}|${grado}|${grupo.curso.año || new Date().getFullYear()}`
let cursoId: number | string | null = cursosProcesadosMap.get(cursoKey) || null

if (cursoId) {
  console.log(`♻️ Reutilizando curso ya procesado: ${grupo.curso.nombre} (ID: ${cursoId})`)
  // ✅ Curso ya existe en cache
}
```

#### 5.3. Búsqueda en Strapi
```typescript
// Línea 1251-1276
const cursosResponse = await fetch(`/api/crm/colegios/${colegioId}/cursos`)
const cursosResult = await cursosResponse.json()

if (cursosResult.success && Array.isArray(cursosResult.data)) {
  const cursoExistente = cursosResult.data.find((curso: any) => {
    const attrs = curso.attributes || curso
    return (
      (attrs.nombre_curso || '').toLowerCase().trim() === grupo.curso.nombre.toLowerCase().trim() &&
      attrs.nivel === nivel &&
      String(attrs.grado || '') === String(grado) &&
      (attrs.año || 0) === (grupo.curso.año || 0)
    )
  })
  
  if (cursoExistente) {
    cursoId = cursoExistente.documentId || cursoExistente.id
    cursosProcesadosMap.set(cursoKey, cursoId) // Guardar en cache
  }
}
```

**Criterios de búsqueda:**
- Nombre del curso (case-insensitive, sin espacios extra)
- Nivel (exacto: "Basica" o "Media")
- Grado (exacto como string)
- Año (exacto como número)

#### 5.4. Creación de Curso
```typescript
// Línea 1280-1338
if (!cursoId) {
  const createCursoResponse = await fetch(`/api/crm/colegios/${colegioId}/cursos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre_curso: grupo.curso.nombre,
      nivel,
      grado: String(grado),
      año: grupo.curso.año || new Date().getFullYear(),
      activo: true,
    }),
  })
  
  const createCursoResult = await createCursoResponse.json()
  
  if (createCursoResponse.ok && createCursoResult.success) {
    const nuevoCurso = createCursoResult.data
    cursoId = nuevoCurso.documentId || nuevoCurso.id
    cursosProcesadosMap.set(cursoKey, cursoId) // Guardar en cache
    
    // Esperar 1.5s para que Strapi procese el curso
    await new Promise(resolve => setTimeout(resolve, 1500))
  }
}
```

**Delay después de crear:** Espera 1.5 segundos para dar tiempo a Strapi de procesar el curso recién creado (evita problemas de eventual consistency).

---

### **FASE 6: Procesamiento de PDFs**

#### 6.1. Prioridad 1: PDFs Subidos Manualmente
```typescript
// Línea 1450-1592
// Buscar PDFs asignados a este grupo
const pdfsSubidos = pdfsPorGrupo.get(grupoKey) || pdfsPorGrupo.get(grupoKeyAlternativo) || []

if (pdfsSubidos.length > 0) {
  // Subir todos los PDFs
  for (let i = 0; i < pdfsSubidos.length; i++) {
    const pdf = pdfsSubidos[i]
    const nombrePDF = i === 0 
      ? `${grupo.lista.nombre || 'lista'}.pdf`
      : `${grupo.lista.nombre || 'lista'}_v${i + 1}.pdf`
    
    const resultadoPDF = await subirPDFaStrapi(pdf, nombrePDF)
    
    if (resultadoPDF.pdfUrl && resultadoPDF.pdfId) {
      pdfsSubidosConExito.push({
        pdfUrl: resultadoPDF.pdfUrl,
        pdfId: resultadoPDF.pdfId,
        nombre: nombrePDF,
        fecha: new Date().toISOString(),
      })
    }
    
    // Delay entre subidas (500ms)
    if (i < pdfsSubidos.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  // Usar el último PDF subido exitosamente como PDF principal
  if (pdfsSubidosConExito.length > 0) {
    const ultimoPDFExitoso = pdfsSubidosConExito[pdfsSubidosConExito.length - 1]
    pdfUrl = ultimoPDFExitoso.pdfUrl
    pdfId = ultimoPDFExitoso.pdfId
  }
}
```

**Función `subirPDFaStrapi`:**
```typescript
// Línea 2124-2283
const subirPDFaStrapi = async (pdfFile: File | Blob, nombreArchivo: string) => {
  const formData = new FormData()
  formData.append('files', pdfFile)
  
  const uploadResponse = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })
  
  const uploadResult = await uploadResponse.json()
  
  if (uploadResponse.ok && uploadResult.length > 0) {
    const uploadedFile = uploadResult[0]
    return {
      pdfUrl: uploadedFile.url,
      pdfId: uploadedFile.id,
    }
  }
}
```

#### 6.2. Prioridad 2: Descargar PDF desde URL
```typescript
// Línea 1594-1695
const urlListaParaDescarga = grupo.lista.url_lista
const debeDescargarDesdeURL = pdfsSubidosConExito.length === 0 && tieneURLParaDescarga

if (debeDescargarDesdeURL) {
  const nombrePDF = `${grupo.lista.nombre || 'lista'}-${grupo.asignatura.nombre || 'asignatura'}.pdf`
  const resultadoPDF = await descargarYSubirPDF(urlListaParaDescarga, nombrePDF)
  pdfUrl = resultadoPDF.pdfUrl
  pdfId = resultadoPDF.pdfId
}
```

**Función `descargarYSubirPDF`:**
```typescript
// Línea 2309-2400
const descargarYSubirPDF = async (url: string, nombreArchivo: string) => {
  // 1. Descargar PDF desde URL
  const downloadResponse = await fetch('/api/crm/listas/descargar-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  
  const downloadResult = await downloadResponse.json()
  
  if (downloadResult.success && downloadResult.pdfBlob) {
    // 2. Convertir blob a File
    const pdfBlob = new Blob([downloadResult.pdfBlob], { type: 'application/pdf' })
    const pdfFile = new File([pdfBlob], nombreArchivo, { type: 'application/pdf' })
    
    // 3. Subir a Strapi
    return await subirPDFaStrapi(pdfFile, nombreArchivo)
  }
}
```

**Lógica de prioridad:**
1. **Si hay PDFs subidos manualmente:** Usa esos (puede haber múltiples)
2. **Si no hay PDFs manuales pero hay URL:** Descarga desde URL
3. **Si no hay ni PDFs ni URL:** Continúa sin PDF (solo crea materiales)

---

### **FASE 7: Creación de Versión de Materiales**

#### 7.1. Ordenamiento de Productos
```typescript
// Línea 1353-1368
const productosOrdenados = grupo.productos
  .filter(p => p.Libro_nombre) // Solo productos con nombre
  .sort((a, b) => {
    const ordenA = a.Libro_orden || 999999
    const ordenB = b.Libro_orden || 999999
    return ordenA - ordenB
  })
```

**Propósito:** Mantener el orden de productos según el campo `Libro_orden` del Excel.

#### 7.2. Conversión a Formato de Materiales
```typescript
// Línea 1385-1410
const materiales = productosOrdenados.map((producto, index) => ({
  cantidad: producto.Libro_cantidad || 1,
  nombre: producto.Libro_nombre || '',
  isbn: producto.Libro_isbn || null,
  marca: producto.Libro_editorial || null,
  comprar: true,
  precio: 0,
  asignatura: grupo.asignatura.nombre || null,
  descripcion: [
    producto.Libro_autor ? `Autor: ${producto.Libro_autor}` : '',
    producto.Libro_observaciones || '',
    producto.Libro_mes_uso ? `Mes de uso: ${producto.Libro_mes_uso}` : '',
  ].filter(Boolean).join(' | ') || null,
  woocommerce_id: null,
  woocommerce_sku: producto.Libro_codigo || null,
  precio_woocommerce: null,
  stock_quantity: null,
  disponibilidad: 'no_encontrado',
  encontrado_en_woocommerce: false,
  imagen: null,
  coordenadas: null,
  orden_asignatura: grupo.asignatura.orden || null,
  orden_producto: producto.Libro_orden || (index + 1),
}))
```

**Mapeo de campos:**
- `Libro_nombre` → `nombre`
- `Libro_cantidad` → `cantidad` (default: 1)
- `Libro_isbn` → `isbn`
- `Libro_editorial` → `marca`
- `Libro_autor` + `Libro_observaciones` + `Libro_mes_uso` → `descripcion` (concatenados)
- `Libro_codigo` → `woocommerce_sku`
- `Libro_orden` → `orden_producto`

#### 7.3. Obtener Versiones Existentes del Curso
```typescript
// Línea 1698-1758
let versionesExistentes: any[] = []
let intentos = 0
const maxIntentos = 3

while (intentos < maxIntentos) {
  try {
    const cursoResponse = await fetch(`/api/crm/cursos/${cursoId}`)
    const cursoData = await cursoResponse.json()
    
    if (cursoData.success && cursoData.data) {
      const curso = cursoData.data
      const attrs = curso.attributes || curso
      versionesExistentes = attrs.versiones_materiales || []
      break // ✅ Éxito
    } else if (intentos < maxIntentos - 1) {
      // Reintentar con backoff exponencial
      const waitTime = 1000 * (intentos + 1)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      intentos++
    }
  } catch (err) {
    // Manejo de errores
  }
}
```

**Retry Logic:** Hasta 3 intentos con backoff exponencial (1s, 2s, 3s) para manejar latencia de Strapi.

#### 7.4. Crear Versión de Materiales
```typescript
// Línea 1812-1886
const versionMaterial = {
  id: versionesExistentes.length + 1,
  nombre_archivo: grupo.lista.nombre || 'Lista de útiles',
  fecha_subida: grupo.lista.fecha_actualizacion || new Date().toISOString(),
  fecha_actualizacion: grupo.lista.fecha_actualizacion || new Date().toISOString(),
  fecha_publicacion: grupo.lista.fecha_publicacion,
  materiales: materiales,
  pdf_url: pdfUrl || null,
  pdf_id: pdfId || null,
  metadata: {
    nombre: grupo.lista.nombre,
    asignatura: grupo.asignatura.nombre,
    orden_asignatura: grupo.asignatura.orden,
    url_lista: grupo.lista.url_lista,
    url_publicacion: grupo.lista.url_publicacion,
  },
}

// Si hay múltiples PDFs, crear una versión por cada PDF
const versionesParaAgregar: any[] = [versionMaterial]

if (pdfsSubidosConExito.length > 1) {
  for (let i = 0; i < pdfsSubidosConExito.length - 1; i++) {
    const pdfInfo = pdfsSubidosConExito[i]
    const versionAdicional = {
      id: versionesExistentes.length + versionesParaAgregar.length + 1,
      nombre_archivo: pdfInfo.nombre,
      fecha_subida: pdfInfo.fecha,
      materiales: materiales, // Mismos materiales para todas las versiones
      pdf_url: pdfInfo.pdfUrl,
      pdf_id: pdfInfo.pdfId,
      metadata: { ...versionMaterial.metadata, version: i + 1 },
    }
    versionesParaAgregar.push(versionAdicional)
  }
}

const versionesActualizadas = [...versionesExistentes, ...versionesParaAgregar]
```

**Estructura de versión:**
- **ID:** Incremental (versionesExistentes.length + 1)
- **Materiales:** Array de productos/materiales
- **PDF:** URL e ID del PDF (puede ser null)
- **Metadata:** Información adicional (asignatura, orden, URLs)

**Múltiples versiones:** Si hay múltiples PDFs, crea una versión por cada PDF (útil para versiones históricas o diferentes formatos).

---

### **FASE 8: Actualización del Curso en Strapi**

#### 8.1. Verificación del Curso (Con Retry Robusto)
```typescript
// Línea 1909-1963
let cursoExiste = false
let cursoIdVerificado: string | number | null = null
let verifyIntentos = 0
const maxVerifyIntentos = 5

while (verifyIntentos < maxVerifyIntentos && !cursoExiste) {
  try {
    const verifyResponse = await fetch(`/api/crm/cursos/${cursoId}`)
    const verifyData = await verifyResponse.json()
    
    if (verifyData.success && verifyData.data) {
      cursoExiste = true
      cursoIdVerificado = verifyData.data.documentId || verifyData.data.id || cursoId
      break // ✅ Curso verificado
    } else {
      // Backoff exponencial: 1s, 2s, 3s, 5s
      const waitTime = verifyIntentos === 0 ? 1000 : verifyIntentos === 1 ? 2000 : verifyIntentos === 2 ? 3000 : 5000
      await new Promise(resolve => setTimeout(resolve, waitTime))
      verifyIntentos++
    }
  } catch (err) {
    // Manejo de errores
  }
}
```

**Propósito:** Verificar que el curso existe antes de intentar actualizarlo (evita errores 404).

#### 8.2. Actualización del Curso (Con Retry)
```typescript
// Línea 1986-2044
let updateSuccess = false
let updateError: string | null = null
let updateIntentos = 0
const maxUpdateIntentos = 3

while (updateIntentos < maxUpdateIntentos && !updateSuccess) {
  try {
    const updateResponse = await fetch(`/api/crm/cursos/${cursoIdParaActualizar}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        versiones_materiales: versionesActualizadas,
      }),
    })
    
    const updateResult = await updateResponse.json()
    
    if (updateResponse.ok && updateResult.success) {
      updateSuccess = true
      results.push({
        success: true,
        message: `Lista "${grupo.lista.nombre}" (${grupo.asignatura.nombre}) creada con ${materiales.length} productos`,
        tipo: 'lista',
        datos: { cursoId: cursoIdParaActualizar, productos: materiales.length },
      })
      break // ✅ Éxito
    } else {
      updateError = updateResult.error || 'Error desconocido'
      if (updateIntentos < maxUpdateIntentos - 1) {
        const waitTime = 1000 * (updateIntentos + 1)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        updateIntentos++
      }
    }
  } catch (err) {
    // Manejo de errores
  }
}
```

**Payload enviado:**
```json
{
  "versiones_materiales": [
    {
      "id": 1,
      "nombre_archivo": "Lista de Útiles 2026",
      "fecha_subida": "2026-02-04T...",
      "fecha_actualizacion": "2026-02-04T...",
      "fecha_publicacion": "2026-02-04T...",
      "materiales": [
        {
          "cantidad": 2,
          "nombre": "Cuaderno Universitario",
          "isbn": "978-1234567890",
          "marca": "Editorial ABC",
          "comprar": true,
          "precio": 0,
          "asignatura": "Lenguaje y Comunicación",
          "descripcion": "Autor: Juan Pérez | Observaciones...",
          "woocommerce_sku": "COD123",
          "orden_asignatura": 1,
          "orden_producto": 1
        }
      ],
      "pdf_url": "https://strapi.../uploads/lista.pdf",
      "pdf_id": 123,
      "metadata": {
        "nombre": "Lista de Útiles 2026",
        "asignatura": "Lenguaje y Comunicación",
        "orden_asignatura": 1,
        "url_lista": "https://...",
        "url_publicacion": "https://..."
      }
    }
  ]
}
```

**Retry Logic:** Hasta 3 intentos con backoff exponencial (1s, 2s, 3s).

---

### **FASE 9: Finalización y Resultados**

#### 9.1. Recopilación de Resultados
```typescript
// Línea 2064-2089
setProcessResults(results)
setStep('complete')

// Mostrar notificación
const successCount = results.filter((r) => r.success).length
const errorCount = results.filter((r) => !r.success).length
mostrarNotificacion(
  'Importación Completada',
  `${successCount} grupos procesados exitosamente${errorCount > 0 ? `, ${errorCount} con errores` : ''}`,
  errorCount > 0 ? 'error' : 'success'
)

// Llamar a onSuccess para refrescar la tabla
if (onSuccess) {
  setTimeout(() => {
    onSuccess()
  }, 1000)
}
```

**Estructura de resultados:**
```typescript
interface ProcessResult {
  success: boolean
  message: string
  tipo: 'colegio' | 'curso' | 'lista'
  datos?: { id?: number | string; nombre?: string; productos?: number }
}
```

#### 9.2. Recarga de Listas
```typescript
// En ListasListing.tsx (línea 1117-1133)
onSuccess={() => {
  // Recargar listas después de dar más tiempo a Strapi para procesar
  setTimeout(() => {
    recargarListas()
  }, 2000)
  setTimeout(() => {
    recargarListas()
  }, 5000)
  setTimeout(() => {
    recargarListas()
  }, 8000)
}}
```

**Múltiples recargas:** Se recarga la tabla 3 veces (a los 2s, 5s y 8s) para asegurar que Strapi haya procesado todos los cambios.

---

## 📊 Flujo de Datos Completo

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USUARIO SUBE EXCEL/CSV                                    │
└────────────────────┬──────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. LECTURA Y NORMALIZACIÓN                                   │
│    - FileReader → ArrayBuffer                                │
│    - XLSX.read() → Workbook                                  │
│    - Detección de fila de título                             │
│    - Normalización de columnas (BOM, espacios)                │
│    - Resolución flexible de nombres de columnas              │
│    - Extracción de URL de PDF                                 │
└────────────────────┬──────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. AGRUPACIÓN                                                │
│    - Carga colegios existentes (optimización)                 │
│    - Agrupa por: Colegio|Curso|Asignatura|Lista              │
│    - Extrae nivel y grado del curso                           │
│    - Verifica si colegio existe                               │
└────────────────────┬──────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. REVISIÓN (Paso Opcional)                                  │
│    - Usuario revisa agrupamiento                             │
│    - Puede asignar PDFs manualmente                           │
│    - Puede mapear PDFs con IA                                │
└────────────────────┬──────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. PROCESAMIENTO (Loop por cada grupo)                       │
│    │                                                          │
│    ├─ 5.1. BUSCAR/CREAR COLEGIO                              │
│    │   - Busca por RBD (prioridad 1)                         │
│    │   - Busca por nombre (prioridad 2)                       │
│    │   - Crea si no existe (requiere RBD)                     │
│    │                                                          │
│    ├─ 5.2. BUSCAR/CREAR CURSO                                │
│    │   - Verifica cache de cursos procesados                  │
│    │   - Busca en Strapi por nombre+nivel+grado+año          │
│    │   - Crea si no existe                                    │
│    │   - Espera 1.5s después de crear                         │
│    │                                                          │
│    ├─ 5.3. PROCESAR PDFs                                     │
│    │   - Prioridad 1: PDFs subidos manualmente                │
│    │   - Prioridad 2: Descargar desde URL_lista               │
│    │   - Sube a Strapi (/api/upload)                          │
│    │                                                          │
│    ├─ 5.4. CREAR VERSIÓN DE MATERIALES                        │
│    │   - Ordena productos por Libro_orden                     │
│    │   - Convierte a formato de materiales                    │
│    │   - Obtiene versiones existentes (con retry)              │
│    │   - Crea nueva versión con PDF y materiales              │
│    │   - Si hay múltiples PDFs, crea múltiples versiones      │
│    │                                                          │
│    └─ 5.5. ACTUALIZAR CURSO EN STRAPI                        │
│        - Verifica que curso existe (5 intentos)                │
│        - Actualiza con versiones_materiales (3 intentos)      │
│        - PUT /api/crm/cursos/{cursoId}                        │
│                                                               │
└────────────────────┬──────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. RESULTADOS                                                │
│    - Muestra resumen: Exitosos / Errores                      │
│    - Recarga tabla principal (3 veces)                        │
│    - Notificación de éxito/error                             │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔍 Detalles Técnicos Importantes

### **Manejo de Errores y Retry Logic**

1. **Creación de Curso:**
   - Espera 1.5s después de crear para que Strapi procese
   - Cache de cursos procesados evita duplicados

2. **Obtención de Versiones Existentes:**
   - 3 intentos con backoff exponencial (1s, 2s, 3s)

3. **Verificación de Curso:**
   - 5 intentos con backoff exponencial (1s, 2s, 3s, 5s)

4. **Actualización de Curso:**
   - 3 intentos con backoff exponencial (1s, 2s, 3s)

### **Optimizaciones**

1. **Carga de Colegios:**
   - Se carga una sola vez al inicio (10000 colegios)
   - Se crean mapas para búsqueda O(1) por RBD y nombre

2. **Cache de Cursos:**
   - Map de cursos procesados evita crear duplicados
   - Clave única: `colegioId|nombreCurso|nivel|grado|año`

3. **Procesamiento Secuencial:**
   - Los grupos se procesan uno por uno (no en paralelo)
   - Evita saturar Strapi con múltiples requests simultáneos

### **Delays y Esperas**

- **Después de crear curso:** 1.5s
- **Entre subidas de PDF:** 500ms
- **Retry backoff:** 1s, 2s, 3s, 5s (dependiendo del caso)
- **Recarga de tabla:** 2s, 5s, 8s (múltiples recargas)

### **Estructura de Datos**

#### **ImportRow (Fila del Excel normalizada):**
```typescript
{
  Colegio: string
  RBD?: number
  Comuna?: string
  Orden_colegio?: number
  Curso: string
  Año_curso?: number
  Orden_curso?: number
  Asignatura: string
  Orden_asignatura?: number
  Lista_nombre: string
  Año_lista?: number
  Fecha_actualizacion?: string
  Fecha_publicacion?: string
  URL_lista?: string
  URL_publicacion?: string
  Orden_lista?: number
  Libro_nombre: string
  Libro_codigo?: string
  Libro_isbn?: string
  Libro_autor?: string
  Libro_editorial?: string
  Libro_orden?: number
  Libro_cantidad?: number
  Libro_observaciones?: string
  Libro_mes_uso?: string
  nivel?: string
  grado?: number
}
```

#### **AgrupadoPorLista (Grupo después de agrupación):**
```typescript
{
  colegio: {
    nombre: string
    rbd?: number
    comuna?: string
    orden?: number
    existe: boolean
    datosCompletos?: any
  }
  curso: {
    nombre: string
    año?: number
    orden?: number
  }
  asignatura: {
    nombre: string
    orden?: number
  }
  lista: {
    nombre: string
    año?: number
    fecha_actualizacion?: string
    fecha_publicacion?: string
    url_lista?: string
    url_publicacion?: string
    orden?: number
  }
  productos: ImportRow[]
}
```

#### **Versión de Materiales (Estructura final):**
```typescript
{
  id: number
  nombre_archivo: string
  fecha_subida: string
  fecha_actualizacion: string
  fecha_publicacion?: string
  materiales: Array<{
    cantidad: number
    nombre: string
    isbn?: string
    marca?: string
    comprar: boolean
    precio: number
    asignatura?: string
    descripcion?: string
    woocommerce_sku?: string
    orden_asignatura?: number
    orden_producto?: number
    // ... más campos
  }>
  pdf_url?: string
  pdf_id?: number
  metadata: {
    nombre: string
    asignatura: string
    orden_asignatura?: number
    url_lista?: string
    url_publicacion?: string
    version?: number
  }
}
```

---

## 🎯 Puntos Clave del Sistema

1. **Todo se procesa en el cliente (frontend):** No hay un endpoint único que procese todo, sino múltiples llamadas a APIs individuales.

2. **Procesamiento secuencial:** Los grupos se procesan uno por uno para evitar saturar Strapi.

3. **Manejo robusto de errores:** Múltiples intentos con backoff exponencial en operaciones críticas.

4. **Optimizaciones:** Cache de colegios y cursos para evitar búsquedas repetidas.

5. **Flexibilidad:** Acepta múltiples variantes de nombres de columnas (case-insensitive, con/sin espacios, etc.).

6. **Soporte para múltiples PDFs:** Puede crear múltiples versiones de materiales si hay múltiples PDFs.

7. **Delays estratégicos:** Esperas después de crear recursos para manejar eventual consistency de Strapi.

---

## 📝 Notas Finales

- El sistema es **completamente asíncrono** y usa `async/await` en todas las operaciones.
- Los **logs se envían al servidor** mediante `/api/crm/listas/importacion-completa-logs` para debugging.
- El **progreso se muestra en tiempo real** mediante `setProgress()` y `setProcessResults()`.
- Los **errores se recopilan** en el array `results` y se muestran al final del procesamiento.
