# 📦 Instrucciones para Instalar Dependencia xlsx

## ⚠️ IMPORTANTE

Se agregó la dependencia `xlsx` al `package.json` para procesar archivos Excel, pero necesitas instalarla ejecutando:

```bash
cd AlmonteIntranet
npm install
```

O si prefieres instalar solo la dependencia:

```bash
cd AlmonteIntranet
npm install xlsx@^0.18.5
npm install --save-dev @types/xlsx@^0.0.36
```

## ✅ Ya está agregado en package.json

La dependencia ya está documentada en `package.json`, solo necesitas ejecutar `npm install` para instalarla.

## 🎯 Funcionalidad Implementada

Una vez instalada la dependencia, tendrás disponible:

1. **Importación Excel en CursoModal:**
   - Botón "Importar Excel" en la sección de Materiales Adicionales
   - Drag & drop o selección de archivo
   - Preview editable de materiales importados
   - Validación de formato y tamaño
   - Soporte para .xlsx, .xls, .csv

2. **API Route:**
   - `POST /api/crm/listas-utiles/import-excel`
   - Procesa archivos Excel y extrae materiales
   - Detecta columnas automáticamente (case-insensitive)
   - Normaliza tipos y valores

**Última actualización:** 10 de Enero 2026
