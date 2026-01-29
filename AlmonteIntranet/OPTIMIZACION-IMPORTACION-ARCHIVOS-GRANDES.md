# Optimización para Importación de Archivos Grandes

## Problema Actual
- Base de datos Strapi: 500MB límite
- Archivos Excel grandes pueden sobrecargar el espacio
- Procesamiento de archivos grandes consume mucha memoria

## Soluciones Propuestas

### ✅ Opción 1: Procesamiento en Chunks (Ya Implementado Parcialmente)
**Ventajas:**
- Reduce carga de memoria
- Permite procesar archivos muy grandes
- Progreso visible

**Cómo funciona:**
- El archivo se divide en chunks de 5,000 filas
- Cada chunk se procesa y envía por separado
- Los resultados se acumulan

**Mejora propuesta:**
- Reducir chunk size a 1,000-2,000 filas para archivos muy grandes
- Agregar compresión antes de enviar

### ✅ Opción 2: Procesamiento en el Cliente (Navegador)
**Ventajas:**
- No consume espacio en Strapi
- Reduce carga del servidor
- Más rápido para el usuario

**Cómo funciona:**
- El archivo Excel se lee completamente en el navegador
- Se procesa y filtra localmente
- Solo se envían los datos necesarios (JSON comprimido) al servidor
- El servidor solo actualiza Strapi con los datos procesados

**Implementación:**
- Usar `xlsx` en el cliente (ya disponible)
- Procesar y filtrar datos antes de enviar
- Enviar solo campos necesarios (RBD, año, nivel, cantidad_alumnos)

### ✅ Opción 3: Filtrado y Limpieza de Datos
**Ventajas:**
- Reduce significativamente el tamaño de datos
- Solo guarda lo esencial en Strapi

**Cómo funciona:**
- Antes de procesar, filtrar filas duplicadas o inválidas
- Eliminar columnas no necesarias
- Normalizar datos (ej: convertir "I Medio" a grado 1)
- Agrupar datos similares antes de enviar

**Ejemplo:**
```javascript
// Antes: 10,000 filas con todas las columnas
// Después: Solo filas únicas con campos esenciales
// Reducción: ~70-80% del tamaño
```

### ✅ Opción 4: Compresión de Datos
**Ventajas:**
- Reduce tamaño de payload en ~60-80%
- Más rápido de transmitir

**Cómo funciona:**
- Comprimir JSON antes de enviar (gzip)
- El servidor descomprime automáticamente
- Next.js ya soporta compresión automática

### ✅ Opción 5: Procesamiento Incremental
**Ventajas:**
- Permite pausar/reanudar
- No pierde progreso si falla
- Mejor para archivos muy grandes

**Cómo funciona:**
- Guardar progreso en localStorage
- Procesar en batches pequeños
- Continuar desde donde se quedó si falla

### ✅ Opción 6: Validación Pre-Importación
**Ventajas:**
- Evita importar datos inválidos
- Reduce espacio desperdiciado
- Mejor calidad de datos

**Cómo funciona:**
- Validar archivo antes de procesar
- Mostrar resumen de datos a importar
- Permitir al usuario confirmar antes de importar

## Recomendación: Combinación de Opciones

### Para Archivos < 10MB:
- ✅ Procesamiento en cliente
- ✅ Filtrado de datos
- ✅ Compresión automática

### Para Archivos > 10MB:
- ✅ Procesamiento en chunks (1,000 filas)
- ✅ Procesamiento en cliente
- ✅ Filtrado y limpieza
- ✅ Validación pre-importación
- ✅ Progreso guardado en localStorage

## Implementación Propuesta

1. **Mejorar procesamiento en cliente:**
   - Mover toda la lógica de parsing al cliente
   - Enviar solo datos procesados (JSON)
   - Reducir tamaño de payload

2. **Agregar filtrado:**
   - Eliminar duplicados
   - Validar RBDs existentes antes de enviar
   - Normalizar datos

3. **Optimizar chunks:**
   - Reducir tamaño de chunk a 1,000-2,000 filas
   - Agregar compresión
   - Mejor manejo de errores

4. **Agregar validación:**
   - Mostrar resumen antes de importar
   - Validar estructura del archivo
   - Prevenir importaciones duplicadas

## Estimación de Reducción

**Antes:**
- Archivo Excel: 50MB
- Datos procesados: ~100MB en memoria
- Datos enviados: ~50MB JSON

**Después (con optimizaciones):**
- Archivo Excel: 50MB (solo lectura)
- Datos procesados: ~20MB (filtrados)
- Datos enviados: ~5-10MB (comprimidos)
- **Reducción: ~80-90%**

## Próximos Pasos

1. Implementar procesamiento completo en cliente
2. Agregar filtrado y validación
3. Optimizar chunks
4. Agregar compresión
5. Implementar guardado de progreso
