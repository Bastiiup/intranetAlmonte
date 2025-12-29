# Configuración de Haulmer (Espacio) para Facturación Electrónica

## Variables de Entorno Requeridas

### API Key de Haulmer
```
HAULMER_API_KEY=be794bb58cc048548e3483daa42995ef
```
O también puedes usar (para compatibilidad):
```
OPENFACTURA_API_KEY=be794bb58cc048548e3483daa42995ef
```

### Subscription Key (Opcional, puede ser la misma que API Key)
Algunas APIs de Haulmer requieren un "subscription key" adicional. Si es diferente a tu API Key, configúralo:
```
HAULMER_SUBSCRIPTION_KEY=tu-subscription-key-aqui
```
O:
```
OPENFACTURA_SUBSCRIPTION_KEY=tu-subscription-key-aqui
```

**Nota:** Si no se configura, se usará automáticamente el valor de `HAULMER_API_KEY`.

### URL Base de la API (Opcional)
Por defecto usa: `https://dev-api.haulmer.com` (API de OpenFactura)
También puedes usar: `https://api.haulmer.com` o `https://espacio.haulmer.com`
```
HAULMER_API_URL=https://dev-api.haulmer.com
```
O también:
```
OPENFACTURA_API_URL=https://dev-api.haulmer.com
```

### Datos del Emisor (Requeridos)

Estos datos deben coincidir exactamente con los configurados en tu cuenta de Haulmer:

```
HAULMER_EMISOR_RUT=12345678-9
HAULMER_EMISOR_RAZON_SOCIAL=Nombre de tu Empresa
HAULMER_EMISOR_GIRO=Giro Comercial
HAULMER_EMISOR_DIRECCION=Dirección Completa
HAULMER_EMISOR_COMUNA=Comuna
HAULMER_EMISOR_CIUDAD=Ciudad (Opcional)
```

O puedes usar nombres alternativos (para compatibilidad):
```
EMISOR_RUT=12345678-9
EMISOR_RAZON_SOCIAL=Nombre de tu Empresa
EMISOR_GIRO=Giro Comercial
EMISOR_DIRECCION=Dirección Completa
EMISOR_COMUNA=Comuna
EMISOR_CIUDAD=Ciudad
```

## Configuración en Railway

1. Ve a tu proyecto en Railway
2. Selecciona el servicio
3. Ve a la pestaña **Variables**
4. Agrega cada variable de entorno con su valor correspondiente
5. Guarda los cambios (Railway reiniciará automáticamente)

## Tipos de Documentos Soportados

- **33**: Factura Electrónica
- **34**: Factura Exenta
- **39**: Boleta Electrónica (por defecto)
- **41**: Boleta Exenta
- **56**: Nota de Débito
- **61**: Nota de Crédito

## Estructura de la API

La integración transforma automáticamente los datos al formato que espera Haulmer:

- **Encabezado**: Información del documento, emisor y receptor
- **Detalle**: Array de items con productos/servicios
- **Totales**: Montos netos, IVA y totales

Los precios se convierten automáticamente a centavos (sin decimales) como requiere la API de Haulmer.

## Endpoints Utilizados

**⚠️ IMPORTANTE:** Los endpoints exactos pueden variar según tu configuración de Haulmer. Si recibes errores 405, verifica:

1. **Endpoint correcto en tu cuenta de Haulmer:**
   - Accede a https://espacio.haulmer.com/
   - Ve a Configuración → API
   - Revisa la documentación de endpoints disponible

2. **Endpoints oficiales de OpenFactura:**
   - `POST /v2/dte/document` - Emitir un documento tributario electrónico (endpoint principal)
   - `POST /v1/dte/document` - Versión alternativa
   - `GET /v2/dte/document/{id}` - Consultar estado de un documento
   
   **URL Base:** `https://dev-api.haulmer.com` o `https://api.haulmer.com`

3. **Si usas OpenFactura (servicio de Haulmer):**
   - El endpoint puede ser diferente
   - Verifica en la documentación de OpenFactura

## Autenticación

La API de Haulmer puede usar múltiples métodos de autenticación:

1. **X-API-Key**: Header principal para autenticación
   ```
   X-API-Key: tu-api-key
   ```

2. **Ocp-Apim-Subscription-Key**: Header requerido por algunas APIs de Haulmer (Azure API Management)
   ```
   Ocp-Apim-Subscription-Key: tu-subscription-key
   ```
   Si no configuras `HAULMER_SUBSCRIPTION_KEY`, se usará automáticamente el valor de `HAULMER_API_KEY`.

3. **Authorization Bearer**: También se envía como fallback
   ```
   Authorization: Bearer tu-api-key
   ```

El sistema intenta enviar todos estos headers para máxima compatibilidad.

## ¿Qué son los Folios Timbrados?

Los **folios timbrados** son números de folio que han sido previamente autorizados y timbrados por el SII (Servicio de Impuestos Internos) de Chile. 

**Antes de poder emitir facturas electrónicas, necesitas tener folios disponibles que hayan sido timbrados.**

### ¿Por qué son necesarios?

- Cada factura electrónica debe tener un número de folio único y autorizado
- El SII valida que el folio esté dentro de un rango autorizado para tu empresa
- Sin folios timbrados, no podrás emitir facturas electrónicas

### Cómo Timbrar Folios en Haulmer

1. **Accede a tu cuenta en Haulmer**: Inicia sesión en https://espacio.haulmer.com/

2. **Navega al módulo de Documentos Electrónicos**: 
   - Selecciona el módulo de "Documentos Electrónicos"

3. **Timbrar Folios**:
   - En la barra lateral, ve a la sección "General"
   - Haz clic en "Timbrar Folios"
   - Presiona el botón "Timbrar folios"
   - Selecciona el tipo de documento (Factura, Boleta, etc.)
   - Indica la cantidad de folios que necesitas (ej: 1000, 5000, etc.)
   - Confirma la solicitud

4. **Espera la autorización del SII**:
   - El SII procesará tu solicitud (puede tomar algunas horas o días)
   - Puedes verificar el estado en la tabla de documentos habilitados
   - Usa el botón "Actualizar información" para ver el estado actual

5. **Verifica que tengas folios disponibles**:
   - Una vez autorizados, verás cuántos folios tienes disponibles
   - Cada vez que emitas una factura, se usará un folio de tu rango autorizado

### Recomendaciones

- Solicita una cantidad ligeramente menor al máximo autorizado para evitar errores
- Monitorea cuántos folios te quedan disponibles
- Solicita más folios antes de que se te acaben

## Notas Importantes

1. **Datos del Emisor**: Los datos del emisor (RUT, razón social, dirección, etc.) deben coincidir **exactamente** con los configurados en tu cuenta de Haulmer. Cualquier discrepancia puede causar errores.

2. **Timbraje y Folios**: **IMPORTANTE**: Antes de emitir facturas, asegúrate de tener folios timbrados y disponibles en tu cuenta de Haulmer. Sin folios, la emisión de facturas fallará.

3. **Formato de RUT**: Los RUTs deben estar en formato `12345678-9` (con guión, sin puntos).

4. **Precios**: Los precios se convierten automáticamente a centavos (multiplicados por 100) para cumplir con el formato de la API.

5. **IVA**: El IVA se calcula automáticamente si se proporciona en los items. Para boletas a consumidor final, normalmente no se incluye IVA.

## Solución de Problemas

### Error: "Datos del emisor no configurados"
- Verifica que todas las variables `HAULMER_EMISOR_*` estén configuradas en Railway

### Error: "Haulmer API Key no configurada"
- Verifica que `HAULMER_API_KEY` esté configurada en Railway
- La API key se obtiene desde el Espacio de Trabajo de Haulmer → Configuración → API

### Error: "RUT inválido"
- Verifica que el RUT esté en formato correcto (con guión, sin puntos)
- Ejemplo correcto: `12345678-9`
- Ejemplo incorrecto: `12.345.678-9` o `123456789`

### Error al emitir documento
- **Verifica que tengas folios timbrados disponibles en Haulmer**:
  - Ve a https://espacio.haulmer.com/
  - Revisa en "Documentos Electrónicos" → "General" cuántos folios tienes disponibles
  - Si no tienes folios, solicita el timbraje siguiendo los pasos arriba
- Verifica que los datos del emisor coincidan exactamente con Haulmer
- Revisa los logs en Railway para más detalles del error
- Verifica que el tipo de documento (factura/boleta) coincida con los folios que tienes timbrados

## Documentación Oficial

- Portal de Haulmer: https://espacio.haulmer.com/
- Centro de Ayuda: https://help.haulmer.com/
- Changelog de la API: https://changelog.haulmer.com/
