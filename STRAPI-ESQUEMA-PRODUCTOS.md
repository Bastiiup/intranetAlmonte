# Esquema de Productos en Strapi

Este documento describe qué campos son válidos en el esquema de Strapi para el tipo de contenido `libros` (productos).

## ⚠️ Campos que NO existen en Strapi

Los siguientes campos **NO deben enviarse** al crear/actualizar productos en Strapi porque no existen en el esquema:

- ❌ `precio` - Los precios se manejan mediante la relación `precios` (colección separada)
- ❌ `stock_quantity` - El stock se maneja mediante la relación `stocks` o `STOCKS` (colección separada)
- ❌ `woocommerce_id` - Este campo no existe en el esquema de Strapi

## ✅ Campos válidos en Strapi

### Campos básicos (texto)
- `nombre_libro` (string) - Nombre del libro
- `isbn_libro` (string) - ISBN del libro
- `subtitulo_libro` (string) - Subtítulo del libro
- `descripcion` (rich text blocks) - Descripción del libro

### Campos de relación
- `portada_libro` (media) - Imagen de portada (ID de archivo de Strapi)
- `obra` (relation) - Relación con obra
- `autor_relacion` (relation) - Relación con autor
- `editorial` (relation) - Relación con editorial
- `sello` (relation) - Relación con sello
- `coleccion` (relation) - Relación con colección
- `canales` (relation, multiple) - Canales de distribución
- `marcas` (relation, multiple) - Marcas
- `etiquetas` (relation, multiple) - Etiquetas
- `categorias_producto` (relation, multiple) - Categorías

### Relaciones para datos relacionados (colecciones separadas)
- `precios` (relation, multiple) - Precios del producto (colección `precios`)
- `stocks` o `STOCKS` (relation, multiple) - Stock del producto (colección `stocks`)

### Campos de metadatos
- ⚠️ `woocommerce_id` - Este campo NO existe en el esquema actual de Strapi. Si necesitas guardar el ID de WooCommerce, deberás agregarlo al esquema en el proyecto de Strapi.

### Campos numéricos opcionales
- `id_autor` (number) - ID numérico del autor
- `id_editorial` (number) - ID numérico de la editorial
- `id_sello` (number) - ID numérico del sello
- `id_coleccion` (number) - ID numérico de la colección
- `id_obra` (number) - ID numérico de la obra
- `numero_edicion` (number) - Número de edición
- `agno_edicion` (number) - Año de edición

### Campos de enumeración
- `idioma` (enum) - Idioma del libro
- `tipo_libro` (enum) - Tipo de libro
- `estado_edicion` (enum) - Estado de la edición (ej: "Vigente")

## 📝 Notas importantes

1. **Precios**: Para agregar precios a un producto, se debe crear un registro en la colección `precios` y relacionarlo con el libro mediante la relación `precios`.

2. **Stock**: Para agregar stock a un producto, se debe crear un registro en la colección `stocks` y relacionarlo con el libro mediante la relación `stocks` o `STOCKS`.

3. **Imágenes**: Las imágenes deben enviarse como ID numérico de Strapi (no como URL) cuando se crea/actualiza en Strapi. Para WooCommerce, se debe usar la URL completa.

4. **Campos en mayúsculas**: Algunos campos pueden venir en mayúsculas desde Strapi (ej: `NOMBRE_LIBRO`, `ISBN_LIBRO`), pero al crear/actualizar siempre usar minúsculas.

## 🔄 Diferencia con WooCommerce

| Campo | WooCommerce | Strapi |
|-------|-------------|--------|
| Precio | `regular_price` (campo directo) | Relación `precios` (colección) |
| Stock | `stock_quantity` (campo directo) | Relación `stocks` (colección) |
| Imagen | `images[].src` (URL completa) | `portada_libro` (ID numérico) |

## 📚 Referencias

- Ver código en: `frontend-ubold/src/app/api/tienda/productos/route.ts`
- Ver cómo se leen precios: `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/products/components/ProductsListing.tsx`
- Ver cómo se leen stocks: `frontend-ubold/src/app/tienda/productos/components/ProductosGrid.tsx`
