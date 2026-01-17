# 🔍 Cómo Ver Logs en Cursor - Guía Simple

## ✅ Los logs aparecen AUTOMÁTICAMENTE en la terminal

**NO necesitas un comando como `node logs`**. Los logs aparecen solos cuando el servidor está corriendo.

---

## 🖥️ Paso 1: Abre la Terminal de Cursor

1. **Presiona** `` Ctrl+` `` (Ctrl + backtick)
2. **O ve a**: View → Terminal

---

## 📊 Paso 2: Los Logs Aparecen Automáticamente

**Si el servidor está corriendo**, verás logs como estos:

```
▲ Next.js 16.0.10
- Local:        http://localhost:3000
- Ready in 2.3s

[API /crm/listas GET] Obteniendo cursos con PDFs...
[API /crm/listas GET] ✅ Cursos con PDFs encontrados: 7
```

---

## 🔍 Si NO Ves Logs

### Opción 1: El servidor no está corriendo

**Ejecuta esto en la terminal de Cursor:**

```bash
cd AlmonteIntranet
npm run dev
```

**Luego verás los logs automáticamente.**

### Opción 2: El servidor está corriendo en otra terminal

- Busca otras terminales abiertas
- O reinicia el servidor en la terminal actual

---

## 📋 Qué Verás Cuando Haces Algo

### Cuando eliminas un curso:

```
[API /crm/listas/[id] DELETE] Eliminando curso completo: 96
[API /crm/listas/[id] DELETE] ✅ Curso eliminado exitosamente
```

### Cuando importas cursos:

```
[Importación Masiva] Procesando fila 1/3: { ... }
[Importación Masiva] ✅ Curso creado: ID=102
```

### Si hay un error:

```
[API /crm/listas/[id] DELETE] ❌ Error: Curso no encontrado
```

---

## 💡 Tips

1. **Los logs aparecen en tiempo real** - No necesitas hacer nada especial
2. **Scroll hacia arriba** para ver logs anteriores
3. **Buscar**: Presiona `Ctrl+F` y escribe lo que buscas
4. **Limpiar**: Click derecho → "Clear" o escribe `clear`

---

## 🎯 Resumen

- ✅ **NO hay comando `node logs`**
- ✅ **Los logs aparecen automáticamente** en la terminal
- ✅ **Solo abre la terminal** (`` Ctrl+` ``) y verás los logs
- ✅ **Si no ves logs**, ejecuta `npm run dev` en la terminal

---

**¡Es así de simple! Solo abre la terminal y verás los logs.** 🎉
