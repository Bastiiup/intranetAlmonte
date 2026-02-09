# 🚀 Guía de Integración - Mejoras en Carga Masiva de PDFs por Colegio

## 📋 Resumen Ejecutivo

Se han implementado mejoras significativas en la funcionalidad de **Carga Masiva de PDFs por Colegio**, incluyendo:
- Minimización del proceso de carga con vista global
- Persistencia del estado al recargar la página
- Barra de progreso visible en el componente minimizado
- Cierre automático del modal al finalizar
- Notificaciones personalizadas con información del colegio
- Actualización automática de la tabla después del procesamiento

---

## 🎯 Funcionalidades Implementadas

### 1. **Minimización del Proceso de Carga**
- El modal puede minimizarse durante el procesamiento
- El proceso continúa ejecutándose en segundo plano
- Vista minimizada visible globalmente en todas las páginas
- El usuario puede continuar trabajando mientras se procesan los PDFs

### 2. **Persistencia del Estado**
- El estado del procesamiento se guarda en `localStorage`
- Al recargar la página, el modal se restaura automáticamente
- Se mantiene el progreso, información de PDFs y datos del colegio
- El componente minimizado persiste incluso después de navegar entre páginas

### 3. **Barra de Progreso Global**
- Barra de progreso visible en el componente minimizado
- Muestra el porcentaje de completado en tiempo real
- Cambia a verde cuando llega al 100%
- Se actualiza cada 500ms para mejor respuesta

### 4. **Cierre Automático y Notificaciones**
- El modal se cierra automáticamente 2 segundos después de completar
- Notificación personalizada: `"[Colegio] (RBD: [número]) procesado, listo para su uso!"`
- El componente minimizado desaparece automáticamente al finalizar

### 5. **Actualización Automática de Tabla**
- La tabla de listas se actualiza automáticamente al completar el procesamiento
- No requiere recargar la página manualmente
- Se realizan recargas automáticas a los 500ms y 2 segundos

---

## 📁 Archivos Modificados

### 1. **Componente Principal del Modal**
**Archivo:** `AlmonteIntranet/src/app/(admin)/(apps)/crm/listas/components/CargaMasivaPDFsPorColegioModal.tsx`

**Cambios principales:**
- ✅ Agregado estado `minimized` para controlar la minimización
- ✅ Lógica para guardar/restaurar estado desde `localStorage`
- ✅ Modificación de `handleClose` para minimizar en lugar de cerrar durante procesamiento
- ✅ Restauración automática del estado al abrir el modal
- ✅ Notificación personalizada con nombre del colegio y RBD
- ✅ Cierre automático del modal después de 2 segundos
- ✅ Disparo de evento `carga-masiva-pdfs-completada` al finalizar
- ✅ Todos los `window.dispatchEvent` envueltos en `setTimeout` para evitar errores de React

**Funciones clave:**
```typescript
// Guardar estado en localStorage
useEffect(() => {
  if (minimized) {
    localStorage.setItem('carga-masiva-pdfs-minimized', 'true')
    localStorage.setItem('carga-masiva-pdfs-processing', processing ? 'true' : 'false')
    localStorage.setItem('carga-masiva-pdfs-progress', progress.toString())
    // ... más datos
  }
}, [minimized, processing, progress, selectedColegio, año, urlOriginal, pdfs])

// Restaurar estado al abrir
useEffect(() => {
  if (show) {
    const isProcessing = localStorage.getItem('carga-masiva-pdfs-processing') === 'true'
    const savedProgress = localStorage.getItem('carga-masiva-pdfs-progress')
    // ... restaurar todo el estado
  }
}, [show])
```

### 2. **Componente Minimizado Global**
**Archivo:** `AlmonteIntranet/src/components/CargaMasivaPDFsMinimized.tsx` (NUEVO)

**Funcionalidad:**
- Componente global visible en todas las páginas
- Muestra barra de progreso, nombre del colegio y RBD
- Botón para maximizar/restaurar el modal
- Se oculta automáticamente cuando el procesamiento termina
- Se actualiza cada 500ms desde `localStorage`

**Características:**
```typescript
- Barra de progreso con porcentaje
- Información del colegio (nombre y RBD)
- Spinner animado durante el procesamiento
- Botón de maximizar para restaurar el modal
- Ocultación automática al completar (100%)
```

### 3. **Componente Modal Global**
**Archivo:** `AlmonteIntranet/src/components/CargaMasivaPDFsModalGlobal.tsx` (NUEVO)

**Funcionalidad:**
- Wrapper global para el modal de carga masiva
- Permite abrir el modal desde cualquier página mediante eventos
- Restaura automáticamente el modal al recargar si hay un proceso en curso
- Escucha el evento `carga-masiva-pdfs-open-modal`

**Características:**
```typescript
- Verificación al montar si hay proceso en curso
- Apertura automática del modal si hay proceso activo
- Manejo de eventos personalizados para abrir/cerrar
```

### 4. **Layout Principal**
**Archivo:** `AlmonteIntranet/src/layouts/MainLayout.tsx`

**Cambios:**
- ✅ Importados `CargaMasivaPDFsMinimized` y `CargaMasivaPDFsModalGlobal`
- ✅ Renderizados dentro del `Fragment` para disponibilidad global

**Código agregado:**
```typescript
import CargaMasivaPDFsMinimized from '@/components/CargaMasivaPDFsMinimized'
import CargaMasivaPDFsModalGlobal from '@/components/CargaMasivaPDFsModalGlobal'

// En el return:
<CargaMasivaPDFsMinimized />
<CargaMasivaPDFsModalGlobal />
```

### 5. **Componente de Listado**
**Archivo:** `AlmonteIntranet/src/app/(admin)/(apps)/crm/listas/components/ListasListing.tsx`

**Cambios:**
- ✅ Removido el modal local de carga masiva
- ✅ Modificado el botón para disparar evento `carga-masiva-pdfs-open-modal`
- ✅ Agregado listener para evento `carga-masiva-pdfs-completada`
- ✅ Recarga automática de la tabla cuando se completa el procesamiento

**Código agregado:**
```typescript
// Botón modificado
<Button variant="outline-primary" onClick={() => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('carga-masiva-pdfs-open-modal'))
  }
}}>
  <LuSparkles className="fs-sm me-2" /> Carga Masiva PDFs por Colegio
</Button>

// Listener para recarga automática
useEffect(() => {
  const handleCargaCompletada = (event: CustomEvent) => {
    setTimeout(() => recargarListas(), 500)
    setTimeout(() => recargarListas(), 2000)
  }
  window.addEventListener('carga-masiva-pdfs-completada', handleCargaCompletada)
  return () => {
    window.removeEventListener('carga-masiva-pdfs-completada', handleCargaCompletada)
  }
}, [])
```

### 6. **API Endpoint - Mejoras en Manejo de Errores**
**Archivo:** `AlmonteIntranet/src/app/api/crm/listas/carga-masiva-ia/route.ts`

**Cambios:**
- ✅ Mejorado el manejo de conversión de `documentId` a ID numérico
- ✅ Validación mejorada del ID del colegio antes de crear curso
- ✅ Logging mejorado para diagnóstico de errores
- ✅ Manejo de errores más descriptivo

**Mejoras clave:**
```typescript
// Conversión robusta de documentId a ID numérico
let colegioIdNum: number | string | null = null
if (typeof colegioId === 'string' && !/^\d+$/.test(colegioId)) {
  // Obtener ID numérico desde Strapi
  const colegioResponse = await strapiClient.get(`/api/colegios/${colegioId}?fields=id,documentId`)
  colegioIdNum = colegioData?.id || colegioAttrs?.id || null
}
```

---

## 🔧 Configuración y Uso

### Requisitos Previos
- Next.js 16.0.10 o superior
- React Bootstrap para componentes UI
- `react-icons/lu` para iconos
- `localStorage` disponible en el navegador

### Instalación

1. **Clonar la rama:**
```bash
git clone [url-del-repositorio]
git checkout [nombre-de-la-rama]
```

2. **Instalar dependencias:**
```bash
cd AlmonteIntranet
npm install
```

3. **Verificar que los componentes estén en su lugar:**
- `src/components/CargaMasivaPDFsMinimized.tsx` (NUEVO)
- `src/components/CargaMasivaPDFsModalGlobal.tsx` (NUEVO)
- `src/layouts/MainLayout.tsx` (MODIFICADO)
- `src/app/(admin)/(apps)/crm/listas/components/CargaMasivaPDFsPorColegioModal.tsx` (MODIFICADO)
- `src/app/(admin)/(apps)/crm/listas/components/ListasListing.tsx` (MODIFICADO)

### Uso

1. **Iniciar carga masiva:**
   - Ir a `/crm/listas`
   - Hacer clic en "Carga Masiva PDFs por Colegio"
   - Seleccionar colegio, año y subir PDFs
   - Iniciar el procesamiento

2. **Minimizar durante el procesamiento:**
   - Hacer clic en "Minimizar" o cerrar el modal
   - El proceso continúa en segundo plano
   - Aparece el componente minimizado en la esquina inferior derecha

3. **Restaurar el modal:**
   - Hacer clic en el botón de maximizar en el componente minimizado
   - O hacer clic en cualquier parte del componente minimizado

4. **Al completar:**
   - Se muestra notificación: `"[Colegio] (RBD: [número]) procesado, listo para su uso!"`
   - El modal se cierra automáticamente después de 2 segundos
   - La tabla se actualiza automáticamente
   - El componente minimizado desaparece

---

## 🔑 Claves de localStorage Utilizadas

| Clave | Descripción |
|-------|-------------|
| `carga-masiva-pdfs-processing` | Indica si hay un proceso en curso (`'true'` o `'false'`) |
| `carga-masiva-pdfs-minimized` | Indica si el modal está minimizado (`'true'` o `'false'`) |
| `carga-masiva-pdfs-progress` | Porcentaje de progreso (0-100) |
| `carga-masiva-pdfs-colegio` | Datos del colegio seleccionado (JSON) |
| `carga-masiva-pdfs-año` | Año seleccionado |
| `carga-masiva-pdfs-url-original` | URL original de donde se obtuvo el PDF |
| `carga-masiva-pdfs-pdfs-info` | Información detallada de cada PDF procesado (JSON) |

---

## 📡 Eventos Personalizados

### Eventos Disparados

1. **`carga-masiva-pdfs-update`**
   - Se dispara cuando cambia el estado del procesamiento
   - Actualiza el componente minimizado
   - **Uso:** Actualizar vista global del progreso

2. **`carga-masiva-pdfs-open-modal`**
   - Se dispara para abrir el modal globalmente
   - Puede incluir `detail: { restore: true }` para restaurar estado
   - **Uso:** Abrir el modal desde cualquier página

3. **`carga-masiva-pdfs-completada`**
   - Se dispara cuando el procesamiento termina exitosamente
   - Incluye detalles: `colegioId`, `colegioNombre`, `colegioRBD`, `successCount`, `errorCount`
   - **Uso:** Recargar automáticamente la tabla de listas

### Ejemplo de Uso de Eventos

```typescript
// Abrir modal desde cualquier componente
window.dispatchEvent(new CustomEvent('carga-masiva-pdfs-open-modal', {
  detail: { restore: true }
}))

// Escuchar cuando se completa
window.addEventListener('carga-masiva-pdfs-completada', (event: CustomEvent) => {
  console.log('Procesamiento completado:', event.detail)
  // Recargar datos, mostrar notificación, etc.
})
```

---

## 🐛 Correcciones de Errores

### 1. Error de React: "Cannot update a component while rendering"
**Problema:** Se intentaba actualizar `CargaMasivaPDFsMinimized` durante el renderizado de `CargaMasivaPDFsPorColegioModal`.

**Solución:** Todos los `window.dispatchEvent` se envuelven en `setTimeout(() => { ... }, 0)` para diferir la ejecución hasta después del renderizado.

### 2. Error al crear curso: ID de colegio inválido
**Problema:** Algunos colegios usan `documentId` en lugar de ID numérico, causando errores al crear cursos.

**Solución:** Mejorada la conversión de `documentId` a ID numérico con validación y manejo de errores robusto.

### 3. Modal no se restauraba al recargar
**Problema:** Al recargar la página, el modal no se abría automáticamente aunque hubiera un proceso en curso.

**Solución:** El componente `CargaMasivaPDFsModalGlobal` verifica al montar si hay un proceso en curso y abre el modal automáticamente.

---

## 🎨 Componentes UI Utilizados

- `Modal`, `ModalHeader`, `ModalTitle`, `ModalBody`, `ModalFooter` de React Bootstrap
- `Button`, `Alert`, `Spinner`, `ProgressBar`, `Table`, `Badge` de React Bootstrap
- `Select` de `react-select`
- Iconos: `LuMinimize2`, `LuMaximize2`, `LuSparkles`, `LuCheck`, `LuX` de `react-icons/lu`

---

## 📝 Notas Importantes

1. **Persistencia:** El estado se guarda en `localStorage`, por lo que persiste incluso si se cierra el navegador (pero no entre diferentes navegadores o dispositivos).

2. **Limpieza:** El `localStorage` se limpia automáticamente cuando:
   - El procesamiento termina exitosamente
   - El procesamiento termina con error
   - El usuario cierra el modal sin proceso activo

3. **Rendimiento:** El componente minimizado se actualiza cada 500ms para mantener la barra de progreso fluida.

4. **Compatibilidad:** Funciona en todos los navegadores modernos que soporten `localStorage` y `CustomEvent`.

---

## 🚀 Próximos Pasos (Opcional)

- [ ] Agregar historial de procesos completados
- [ ] Permitir pausar/reanudar el procesamiento
- [ ] Agregar notificaciones push para procesos largos
- [ ] Exportar reporte de procesamiento
- [ ] Agregar filtros en el componente minimizado

---

## 📞 Soporte

Si encuentras algún problema o tienes preguntas sobre la implementación, revisa:
1. Los logs de la consola del navegador
2. Los logs del servidor Next.js
3. El estado en `localStorage` (usando DevTools)

---

**Última actualización:** [Fecha actual]
**Versión:** 1.0.0
**Autor:** Matías
