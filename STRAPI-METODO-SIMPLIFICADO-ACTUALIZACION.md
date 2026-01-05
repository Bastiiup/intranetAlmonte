# 📢 ACTUALIZACIÓN IMPORTANTE DE STRAPI

## ✅ CAMBIOS IMPLEMENTADOS EN STRAPI

### 1. ✅ PRESERVACIÓN AUTOMÁTICA DE externalIds
- Strapi ahora preserva automáticamente los IDs de WooCommerce
- **YA NO necesitas incluir "externalIds" al actualizar productos**
- No se crearán productos duplicados en WooCommerce

### 2. ✅ ACTUALIZACIÓN SIMPLIFICADA DE PRODUCTOS
- Solo envía los campos que cambien
- **NO necesitas obtener el producto completo antes de actualizar**
- **NO necesitas incluir externalIds en el payload**

### 3. ✅ rawWooData SIGUE FUNCIONANDO
- Funciona igual que antes, pero ahora no necesitas externalIds

---

## 📝 NUEVO MÉTODO PARA ACTUALIZAR PRODUCTOS (RECOMENDADO)

### MÉTODO SIMPLE (usa este):

```javascript
const payload = {
  data: {
    nombre_libro: "Título Editado",
    precio: 59990
    // ✅ NO incluir externalIds
  }
};

await fetch(`https://strapi.moraleja.cl/api/libros/${productoId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
```

---

## 🔧 IMPLEMENTACIÓN EN LA INTRANET

El código de la Intranet ya está actualizado para usar el nuevo método simplificado:

### Endpoint PUT (`/api/tienda/productos/[id]/route.ts`)
- ✅ Solo envía los campos que cambien
- ✅ NO incluye externalIds
- ✅ Strapi preserva automáticamente los IDs de WooCommerce

### Frontend (`edit-product/[id]/page.tsx`)
- ✅ Solo envía los campos del formulario
- ✅ NO incluye externalIds
- ✅ Método simplificado implementado

---

## ⚠️ IMPORTANTE

**Ya no necesitas incluir externalIds al actualizar productos.** Strapi los preserva automáticamente.

---

## 📋 CHECKLIST DE ACTUALIZACIÓN

- [x] Código de edición actualizado para NO incluir externalIds
- [x] Comentarios agregados explicando el nuevo método
- [x] Endpoint PUT simplificado
- [x] Frontend actualizado

---

## 🎯 RESULTADO

- ✅ Actualizaciones más simples
- ✅ No se crean productos duplicados
- ✅ Código más limpio y fácil de mantener
- ✅ Strapi maneja automáticamente la preservación de IDs






