# Guía de Testing - Módulo Leads

## 📋 Prerequisitos

### 1. Crear Content-Type "Lead" en Strapi

**Opción A: Usar el prompt con IA**
1. Abre el archivo `PROMPT-CREAR-LEAD-STRAPI.md`
2. Copia todo el contenido
3. Úsalo con Cursor/Claude/ChatGPT en el proyecto de Strapi
4. La IA creará el content-type automáticamente

**Opción B: Crear manualmente en Strapi Admin**
1. Ve a `https://strapi.moraleja.cl/admin` (o tu URL de Strapi)
2. Content-Type Builder → Create new collection type
3. Nombre: "Lead" (singular), API ID: `api::lead.lead`
4. Agregar campos según el schema en `PROMPT-CREAR-LEAD-STRAPI.md`
5. Guardar y publicar

### 2. Configurar Permisos en Strapi

1. Settings → Roles → Public (o el rol que uses)
2. En "Lead", habilitar:
   - ✅ find
   - ✅ findOne
   - ✅ create
   - ✅ update
   - ✅ delete

---

## 🧪 Testing Paso a Paso

### **Test 1: Verificar que el Content-Type existe**

1. Abre la consola del navegador (F12)
2. Ve a `/crm/leads`
3. Deberías ver:
   - Si el content-type NO existe: Mensaje de advertencia "El content-type 'Lead' no existe en Strapi"
   - Si el content-type existe: Lista vacía o con leads existentes

**Resultado esperado:** No debería haber errores en la consola, solo el mensaje informativo si no existe.

---

### **Test 2: Crear un Lead**

1. En `/crm/leads`, haz clic en "Nuevo Lead"
2. Completa el formulario:
   - **Nombre del Lead:** "Juan Pérez" (requerido)
   - **Empresa/Colegio:** "Colegio San José"
   - **Email:** "juan.perez@colegiosanjose.cl"
   - **Teléfono:** "+56 9 1234 5678"
   - **Monto Estimado:** 500000
   - **Etiqueta:** "Prospect" (media)
   - **Estado:** "In Progress"
   - **Fuente:** "Manual"
   - **Asignado a:** Selecciona un colaborador
3. Haz clic en "Guardar Lead"

**Resultado esperado:**
- El modal se cierra
- El lead aparece en la lista
- No hay errores en la consola

**Verificar en Strapi:**
- Ve a Strapi Admin → Content Manager → Lead
- Deberías ver el lead recién creado

---

### **Test 3: Listar Leads**

1. En `/crm/leads`, verifica que:
   - Los leads se muestran en la tabla
   - Las columnas están correctas (ID, Customer, Company, Email, Phone, Amount, Tags, Assigned, Status, Created)
   - La paginación funciona

**Resultado esperado:**
- Tabla muestra los leads correctamente
- Los logos/avatars se muestran (o default si no hay)
- Las etiquetas y estados tienen los colores correctos

---

### **Test 4: Búsqueda**

1. En el campo de búsqueda, escribe parte del nombre de un lead
2. Verifica que filtra correctamente

**Resultado esperado:**
- La tabla se actualiza mostrando solo los leads que coinciden
- La búsqueda funciona por nombre, email o empresa

---

### **Test 5: Filtros**

1. **Filtro por Etiqueta:**
   - Selecciona "Cold Lead" (baja)
   - Verifica que solo muestra leads con esa etiqueta

2. **Filtro por Estado:**
   - Selecciona "In Progress"
   - Verifica que solo muestra leads con ese estado

**Resultado esperado:**
- Los filtros funcionan correctamente
- La tabla se actualiza según el filtro seleccionado

---

### **Test 6: Paginación**

1. Crea varios leads (más de 8 para probar paginación)
2. Verifica que:
   - La paginación muestra el número correcto de páginas
   - Los botones "Anterior" y "Siguiente" funcionan
   - El contador de items es correcto

**Resultado esperado:**
- La paginación funciona correctamente
- Los datos se cargan al cambiar de página

---

### **Test 7: Editar Lead (si implementado)**

1. Haz clic en el botón de editar de un lead
2. Modifica algunos campos
3. Guarda los cambios

**Resultado esperado:**
- Los cambios se guardan correctamente
- La tabla se actualiza con los nuevos datos

---

### **Test 8: Eliminar Lead**

1. Selecciona uno o más leads (checkbox)
2. Haz clic en "Eliminar"
3. Confirma la eliminación

**Resultado esperado:**
- El lead se elimina (soft delete: `activo = false`)
- Desaparece de la lista
- No hay errores en la consola

**Verificar en Strapi:**
- El lead debería tener `activo = false` en Strapi

---

### **Test 9: Verificar Transformación de Datos**

1. Crea un lead con todos los campos
2. Verifica en la tabla que:
   - El ID está formateado como `#LD000001`
   - La etiqueta muestra el label correcto (Cold Lead, Prospect, Hot Lead)
   - El estado muestra el label correcto (In Progress, Proposal Sent, etc.)
   - El monto se muestra correctamente
   - El avatar del colaborador asignado se muestra

**Resultado esperado:**
- Todos los datos se transforman correctamente
- Los valores de Strapi (en inglés) se muestran traducidos en la UI

---

### **Test 10: Errores y Validaciones**

1. **Crear lead sin nombre:**
   - Intenta crear un lead sin nombre
   - Debería mostrar error de validación

2. **Crear lead con email inválido:**
   - Intenta crear un lead con email mal formateado
   - Debería mostrar error

**Resultado esperado:**
- Las validaciones funcionan correctamente
- Los errores se muestran claramente

---

## 🔍 Verificación en Strapi

### Verificar que los datos se guardan correctamente:

1. Ve a Strapi Admin → Content Manager → Lead
2. Abre un lead creado desde el frontend
3. Verifica que:
   - Todos los campos están guardados correctamente
   - Las relaciones (asignado_a) están conectadas
   - Los valores de enum (etiqueta, estado) son correctos

---

## 🐛 Debugging

### Si algo no funciona:

1. **Abrir consola del navegador (F12):**
   - Revisa errores en la pestaña "Console"
   - Revisa requests en la pestaña "Network"

2. **Verificar logs del servidor:**
   - Los logs de la API están en la consola del servidor
   - Busca logs que empiecen con `[API /crm/leads]`

3. **Verificar en Strapi:**
   - Asegúrate de que el content-type existe
   - Verifica que los permisos están configurados
   - Revisa que los campos coinciden con el schema

4. **Errores comunes:**
   - **404 Not Found:** El content-type no existe en Strapi
   - **403 Forbidden:** Los permisos no están configurados
   - **400 Bad Request:** Los datos enviados no coinciden con el schema

---

## ✅ Checklist de Testing

- [ ] Content-type "Lead" creado en Strapi
- [ ] Permisos configurados en Strapi
- [ ] Crear lead funciona
- [ ] Listar leads funciona
- [ ] Búsqueda funciona
- [ ] Filtros funcionan (etiqueta, estado)
- [ ] Paginación funciona
- [ ] Eliminar lead funciona (soft delete)
- [ ] Transformación de datos es correcta
- [ ] Validaciones funcionan
- [ ] Errores se muestran correctamente
- [ ] Datos se guardan correctamente en Strapi

---

## 🚀 Próximos Pasos Después del Testing

Una vez que todo funciona:

1. **Implementar "Convertir a Oportunidad"**
   - Botón en cada lead
   - Crea una Oportunidad con datos del lead
   - Marca el lead como convertido

2. **Implementar edición de leads**
   - Modal de edición similar al de creación
   - Cargar datos existentes
   - Actualizar via API PUT

3. **Mejoras adicionales:**
   - Vista de detalle del lead
   - Historial de actividades relacionadas
   - Notificaciones cuando se asigna un lead

---

## 📝 Notas

- Los leads se eliminan con soft delete (`activo = false`)
- Los IDs se formatean como `#LD000001` para mostrar
- Los valores de enum en Strapi están en inglés, pero se traducen en la UI
- Las relaciones (asignado_a, relacionado_con_persona, relacionado_con_colegio) son opcionales
