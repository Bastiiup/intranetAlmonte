# Configuración de Envío de Cotizaciones por Email

Este documento explica cómo configurar el sistema de envío de cotizaciones por email usando SendGrid.

## 📋 Requisitos

1. **Cuenta de SendGrid** activa
2. **API Key de SendGrid**
3. **Variables de entorno** configuradas

## 🔧 Configuración

### 1. Obtener API Key de SendGrid

1. Inicia sesión en [SendGrid](https://app.sendgrid.com/)
2. Ve a **Settings → API Keys**
3. Haz clic en **Create API Key**
4. Asigna un nombre (ej: "Intranet Almonte")
5. Selecciona permisos: **Full Access** o al menos **Mail Send**
6. Copia el API Key generado (solo se muestra una vez)

### 2. Configurar Variables de Entorno

Agrega las siguientes variables a tu archivo `.env.local`:

```env
# SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@tudominio.cl  # Opcional, default: noreply@moraleja.cl
```

**Importante:**
- Reemplaza `SG.xxxxxxxx...` con tu API Key real de SendGrid
- El email `SENDGRID_FROM_EMAIL` debe estar verificado en SendGrid
- Si no configuras `SENDGRID_FROM_EMAIL`, se usará `noreply@moraleja.cl` por defecto

### 3. Verificar Email Remitente en SendGrid

1. Ve a **Settings → Sender Authentication**
2. Verifica tu dominio o agrega un **Single Sender Verification**
3. Confirma el email que usarás como remitente

## 🚀 Uso del Sistema

### Enviar Cotización por Email

1. **Crear cotización** en el CRM (`/crm/estimations`)
2. **Asociar empresas** a la cotización
3. **Hacer clic en el botón de email** (📧) en la tabla de cotizaciones
4. El sistema:
   - Genera un token único de acceso
   - Envía correos a todas las empresas asociadas
   - Incluye un enlace único para cada empresa

### Acceso de Empresas

Las empresas recibirán un correo con:
- Detalles de la cotización
- Lista de productos incluidos
- Enlace único para acceder y responder

Al hacer clic en el enlace, las empresas pueden:
- Ver toda la información de la cotización
- Proporcionar su valor estimado
- Agregar notas o comentarios
- Enviar su respuesta

### Ver Respuestas

Las respuestas de las empresas se guardan en el campo `respuestas_empresas` de la cotización en Strapi.

Estructura de respuesta:
```json
[
  {
    "empresa_id": 1,
    "valor_empresa": 1500000,
    "notas": "Comentarios de la empresa",
    "fecha_respuesta": "2026-01-20T10:30:00.000Z"
  }
]
```

## 📧 Estructura del Email

El email enviado incluye:
- **Asunto:** "Cotización: [Nombre de la cotización]"
- **Contenido:**
  - Saludo personalizado con nombre de la empresa
  - Detalles de la cotización
  - Monto estimado (si está configurado)
  - Fecha de vencimiento (si está configurada)
  - Lista de productos incluidos
  - Botón para acceder a la cotización
  - Información del creador

## 🔒 Seguridad

- Cada cotización tiene un **token único** generado automáticamente
- El token permite acceso público **sin autenticación**
- Los tokens son seguros y no se pueden adivinar
- Solo las empresas con el enlace pueden acceder

## 🐛 Troubleshooting

### Error: "SENDGRID_API_KEY no está configurado"

**Solución:** Verifica que la variable `SENDGRID_API_KEY` esté en tu `.env.local` y reinicia el servidor.

### Error: "Email no enviado"

**Posibles causas:**
1. API Key inválida o sin permisos
2. Email remitente no verificado en SendGrid
3. Email destinatario inválido o sin formato correcto

**Solución:**
1. Verifica tu API Key en SendGrid
2. Asegúrate de que el email remitente esté verificado
3. Verifica que las empresas tengan emails válidos configurados

### Las empresas no reciben el correo

**Verifica:**
1. Revisa la carpeta de spam
2. Verifica que el email de la empresa esté correcto en Strapi
3. Revisa los logs de SendGrid en su dashboard
4. Verifica que el dominio remitente esté autenticado

## 📝 Notas Adicionales

- Los correos se envían de forma asíncrona
- Si una empresa no tiene email configurado, se mostrará un error pero el proceso continuará con las demás
- El estado de la cotización se actualiza automáticamente a "Enviada" cuando al menos un correo se envía exitosamente
- Puedes enviar la misma cotización múltiples veces si es necesario

## 🔗 Endpoints Relacionados

- `POST /api/crm/cotizaciones/[id]/enviar-email` - Envía cotización por email
- `GET /api/cotizacion/[token]` - Obtiene cotización por token (público)
- `POST /api/cotizacion/[token]` - Registra respuesta de empresa (público)
- `GET /cotizacion/[token]` - Página pública para ver y responder cotización





