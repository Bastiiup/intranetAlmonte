# Debug del Destacado Amarillo

## ✅ Cambios Realizados

1. **Parseo de coordenadas mejorado**: Ahora incluye `ancho` y `alto`
2. **Condición de renderizado mejorada**: Verifica que existan `posicion_x` y `posicion_y`
3. **Logging mejorado**: Muestra información detallada de las coordenadas

## 🔍 Pasos para Debug

### 1. Verificar que las coordenadas se están guardando

**En el backend (logs del servidor):**
Busca estos logs después de procesar un PDF:
```
✅ Coordenadas REALES para "nombre del producto"
📍 Coordenadas APROXIMADAS para "nombre del producto"
```

**Si ves "APROXIMADAS"**: La extracción de coordenadas reales está fallando
**Si ves "REALES"**: Las coordenadas se están extrayendo correctamente

### 2. Verificar que las coordenadas se están parseando en el frontend

**En la consola del navegador:**
Busca estos logs al cargar la página:
```
[ValidacionLista] 📍 Coordenadas parseadas para "nombre del producto"
[ValidacionLista] 📊 RESUMEN DE COORDENADAS
```

**Verifica:**
- `tienePosicionX: true`
- `tienePosicionY: true`
- `posicion_x` y `posicion_y` son números (no `undefined` o `null`)

### 3. Verificar que el producto se está seleccionando

**En la consola del navegador:**
Haz click en un producto y busca:
```
[ValidacionLista] 📍 CLICK en producto: ...
[ValidacionLista] 📍 Producto encontrado: ...
[ValidacionLista] 📍 Producto seleccionado: Seleccionado
```

**Verifica:**
- `tieneCoordenadas: true`
- `pagina` es un número válido
- `posicion_x` y `posicion_y` son números

### 4. Verificar que el overlay se está renderizando

**En la consola del navegador:**
Después de hacer click, busca:
```
[ValidacionLista] 🎯 Verificando renderizado de overlay: ...
```

**Verifica:**
- `tieneCoordenadas: true`
- `paginaCorrecta: true` (la página del producto coincide con la página actual del PDF)
- `tienePosiciones: true`
- `debeRenderizar: true`

**Si `debeRenderizar: false`**, revisa:
- ¿`paginaCorrecta` es `false`? → El producto está en otra página, cambia de página
- ¿`tienePosiciones` es `false`? → Las coordenadas no tienen `posicion_x` o `posicion_y`

### 5. Verificar la estructura de datos en Strapi

**En la base de datos o API:**
Verifica que `versiones_materiales[0].materiales[0].coordenadas` tenga esta estructura:
```json
{
  "pagina": 1,
  "posicion_x": 25.5,
  "posicion_y": 45.2,
  "region": "centro",
  "ancho": 15.3,
  "alto": 2.1
}
```

## 🐛 Problemas Comunes

### Problema 1: "No aparece el resaltado"

**Causa**: Las coordenadas no tienen `posicion_x` o `posicion_y`

**Solución**: 
1. Reprocesa el PDF con "Procesar con IA"
2. Verifica los logs del servidor para ver si se están extrayendo coordenadas reales
3. Si siempre se usan coordenadas aproximadas, puede ser que la extracción de coordenadas reales esté fallando

### Problema 2: "El resaltado aparece en el lugar equivocado"

**Causa**: Se están usando coordenadas aproximadas (no reales)

**Solución**:
1. Verifica los logs del servidor: ¿dice "REALES" o "APROXIMADAS"?
2. Si siempre dice "APROXIMADAS", la extracción de coordenadas reales está fallando
3. Revisa los logs de `extraerCoordenadasReales` para ver por qué no encuentra los productos

### Problema 3: "El resaltado no aparece en la página correcta"

**Causa**: La página calculada es incorrecta

**Solución**:
1. Verifica en los logs: `paginaCoordenadas` vs `paginaActual`
2. Si no coinciden, cambia manualmente a la página del producto
3. El resaltado debería aparecer cuando estés en la página correcta

### Problema 4: "Las coordenadas se guardan pero no se cargan"

**Causa**: Problema en el parseo de coordenadas desde Strapi

**Solución**:
1. Verifica los logs: `[ValidacionLista] 📍 Coordenadas parseadas`
2. Si las coordenadas son `undefined` o `null`, hay un problema en el parseo
3. Revisa la estructura de datos que viene de Strapi

## 📝 Checklist de Verificación

- [ ] Las coordenadas se están guardando en Strapi (verificar en logs del servidor)
- [ ] Las coordenadas se están parseando correctamente (verificar en consola del navegador)
- [ ] El producto se está seleccionando al hacer click (verificar en consola)
- [ ] La página del producto coincide con la página actual del PDF
- [ ] `posicion_x` y `posicion_y` son números válidos (no `undefined` o `null`)
- [ ] El overlay se está renderizando (`debeRenderizar: true`)

## 🔧 Próximos Pasos si No Funciona

1. **Comparte los logs del servidor** después de procesar un PDF
2. **Comparte los logs de la consola del navegador** después de hacer click en un producto
3. **Verifica la estructura de datos** en Strapi para un producto específico
4. **Indica qué comportamiento específico estás viendo** (¿no aparece nada? ¿aparece en lugar equivocado? ¿aparece en página incorrecta?)
