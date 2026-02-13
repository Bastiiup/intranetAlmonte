# Guía: Cómo Funciona el Sistema de Múltiples PDFs

## 📋 Resumen

Sí, **todos los PDFs se agregan desde el mismo Excel de importación masiva**. El sistema crea automáticamente múltiples versiones de materiales cuando detecta diferentes listas para el mismo curso.

## 🔄 Cómo Funciona

### 1. Agrupación de Datos

El sistema agrupa los datos del Excel por esta clave única:
```
Colegio | Curso | Asignatura | Lista_nombre
```

**Ejemplo:**
- Mismo curso, diferentes listas:
  - `Colegio Ejemplo | 1º Básico | Lenguaje | Lista de Útiles` → Versión 1
  - `Colegio Ejemplo | 1º Básico | Lenguaje | Textos Escolares` → Versión 2
  - `Colegio Ejemplo | 1º Básico | Lenguaje | Plan Lector` → Versión 3

### 2. Creación de Versiones

Cada grupo diferente crea una **versión de materiales** separada en el mismo curso. Esto significa que:

- ✅ Un curso puede tener múltiples PDFs (Lista de Útiles, Textos Escolares, Plan Lector, etc.)
- ✅ Cada PDF tiene sus propios productos identificados
- ✅ Puedes cambiar entre PDFs en la página de validación

### 3. Cómo Agregar PDFs

Hay **dos formas** de agregar PDFs en el Excel:

#### Opción A: URL Automática (Recomendado)
En la columna `URL_lista`, pon la URL del PDF:
```excel
URL_lista: https://colegio.com/listas/lista-utiles.pdf
```

El sistema:
1. Descarga automáticamente el PDF desde la URL
2. Lo sube a Strapi
3. Lo asocia a la versión correspondiente

#### Opción B: Subida Manual
1. Deja `URL_lista` vacío o no lo incluyas
2. En el paso de **revisión** de la importación, sube el PDF manualmente para cada grupo

### 4. Estructura del Excel

Para crear múltiples PDFs en un mismo curso, simplemente cambia el `Lista_nombre`:

```excel
| Colegio      | Curso      | Asignatura | Lista_nombre      | URL_lista                          |
|-------------|------------|------------|-------------------|-------------------------------------|
| Colegio ABC | 1º Básico | Lenguaje  | Lista de Útiles  | https://colegio.com/utiles.pdf      |
| Colegio ABC | 1º Básico | Lenguaje  | Textos Escolares | https://colegio.com/textos.pdf     |
| Colegio ABC | 1º Básico | Lenguaje  | Plan Lector      | https://colegio.com/plan-lector.pdf |
```

**Resultado:** El curso "1º Básico" del "Colegio ABC" tendrá 3 versiones de materiales (3 PDFs diferentes).

### 5. Visualización en Validación

En la página de validación (`/crm/listas/[id]/validacion`):

1. Si hay **múltiples versiones**, aparece un **selector dropdown** arriba del PDF
2. El selector muestra:
   - Tipo de lista (Lista de Útiles, Textos Escolares, etc.)
   - Nombre del archivo
   - Cantidad de productos
   - Fecha de subida
3. Al cambiar de versión:
   - Se carga el PDF correspondiente
   - Se muestran los productos de esa versión
   - Se resetea a la primera página

## 📝 Ejemplo Práctico

### Escenario: Un curso con 3 listas diferentes

**Excel:**
```excel
Colegio: Colegio San José
RBD: 12345
Curso: 3º Básico
Asignatura: Lenguaje
Lista_nombre: Lista de Útiles
URL_lista: https://colegio.com/utiles-3basico.pdf
Libro_nombre: Cuaderno universitario
...

Colegio: Colegio San José
RBD: 12345
Curso: 3º Básico
Asignatura: Lenguaje
Lista_nombre: Textos Escolares
URL_lista: https://colegio.com/textos-3basico.pdf
Libro_nombre: Lenguaje y Comunicación 3º
...

Colegio: Colegio San José
RBD: 12345
Curso: 3º Básico
Asignatura: Lenguaje
Lista_nombre: Plan Lector
URL_lista: https://colegio.com/plan-lector-3basico.pdf
Libro_nombre: El Principito
...
```

**Resultado:**
- ✅ Se crea 1 curso: "3º Básico" del "Colegio San José"
- ✅ El curso tiene 3 versiones de materiales:
  - Versión 1: Lista de Útiles (con su PDF y productos)
  - Versión 2: Textos Escolares (con su PDF y productos)
  - Versión 3: Plan Lector (con su PDF y productos)
- ✅ En la página de validación, puedes cambiar entre las 3 listas usando el selector

## ⚠️ Puntos Importantes

1. **Lista_nombre diferente = Versión diferente**
   - Si quieres múltiples PDFs, usa diferentes `Lista_nombre` en el Excel

2. **Mismo Lista_nombre = Misma versión**
   - Si usas el mismo `Lista_nombre`, los productos se agregan a la misma versión

3. **URL_lista es opcional pero recomendado**
   - Si no pones URL, puedes subir el PDF manualmente en el paso de revisión

4. **Cada versión es independiente**
   - Los productos de una versión no se mezclan con otra
   - Cada PDF se procesa y valida por separado

## 🎯 Resumen Rápido

**Pregunta:** ¿Cómo agrego múltiples PDFs a un curso?

**Respuesta:** 
1. En el Excel, usa diferentes valores en `Lista_nombre` para el mismo curso
2. Pon la URL del PDF en `URL_lista` (o súbelo manualmente en revisión)
3. El sistema crea automáticamente una versión por cada `Lista_nombre` diferente
4. En validación, usa el selector para cambiar entre PDFs
