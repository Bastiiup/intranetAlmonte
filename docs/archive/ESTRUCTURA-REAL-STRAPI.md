# 📋 Estructura Real de Strapi - Verificada

**Fecha:** 8 de enero de 2026  
**Fuente:** Strapi Admin UI

---

## 🏗️ CONTENT TYPE: `colegio` / `colegios`

### Campos Principales
- `rbd` (Number) *
- `colegio_nombre` (Text) *
- `estado_nombre` (Enumeration)
- `estado` (Enumeration)
- `rbd_digito_verificador` (Text)
- `dependencia` (Enumeration)
- `ruralidad` (Enumeration)
- `estado_estab` (Enumeration)
- `region` (Text)
- `provincia` (Text)
- `zona` (Text)
- `comuna` (Relation manyToOne) → `Ubicación. Comuna`
- `cartera_asignaciones` (Relation oneToMany) → `Promoción · Colegios · Cartera Asignación`
- **`persona_trayectorias`** (Relation oneToMany) → **`Colegio · Profesores`** ⚠️

### Componentes Repeatables

#### `telefonos` (Repeatable Component)
- `telefono_norm` (Text)
- `telefono_raw` (Text)
- `fijo_o_movil` (Enumeration)
- `tipo` (Enumeration)
- `estado` (Enumeration)
- `principal` (Boolean)
- `vigente_hasta` (Date)
- `status` (Boolean)

#### `emails` (Repeatable Component)
- `email` (Email) *
- `tipo` (Enumeration)
- `principal` (Boolean)
- `vigente_hasta` (Date)
- `estado` (Enumeration)
- `status` (Boolean)

#### `direcciones` (Repeatable Component)
- `direccion_principal_envio_facturacion` (Enumeration)
- `comuna` (Relation oneWay) → `Ubicación. Comuna`
- `nombre_calle` (Text)
- `numero_calle` (Text)
- `complemento_direccion` (Text)
- `tipo_direccion` (Enumeration)

#### `Website` (Repeatable Component)
- `website` (Text)
- `estado` (Enumeration)
- `vigente_hasta` (Date)
- `status` (Boolean)

#### `logo` (Component)
- `imagen` (Multiple Media)
- `tipo` (Enumeration)
- `formato` (Enumeration)
- `estado` (Enumeration)
- `vigente_hasta` (Date)
- `status` (Boolean)

### Relaciones Adicionales
- `sostenedor` (Relation manyToOne) → `Colegio · Sostenedores`
- `listas_utiles` (Relation oneToMany) → `Listas · Colegio`
- `listas_escolares` (Relation oneToMany) → `Lista Escolar`
- `attio_company_id` (Text)
- `attio_metadata` (JSON)

---

## ⚠️ IMPORTANTE: Content Type de Trayectorias

**En Strapi Admin aparece como:**
- **Nombre visual:** `Colegio · Profesores`
- **Relación en `colegio`:** `persona_trayectorias` (oneToMany) → `Colegio · Profesores`

**Posibles nombres de endpoint:**
1. `/api/profesores` (si el content type se llama "profesores")
2. `/api/persona-trayectorias` (si el content type tiene nombre técnico diferente)
3. `/api/colegio-profesores` (si usa el nombre completo)

**⚠️ NECESITAMOS VERIFICAR:**
- ¿Cuál es el nombre real del content type en Strapi?
- ¿El endpoint es `/api/profesores` o `/api/persona-trayectorias`?
- ¿Funciona el endpoint actual `/api/persona-trayectorias`?

---

## 🔍 VERIFICACIÓN NECESARIA

### Opción 1: Probar endpoint actual
```bash
# Probar si funciona
GET /api/persona-trayectorias
```

### Opción 2: Verificar en Strapi Admin
1. Ir a Strapi Admin
2. Content-Type Builder
3. Buscar el content type que conecta `persona` y `colegio`
4. Ver el nombre técnico del content type
5. El endpoint será `/api/{nombre-tecnico}`

### Opción 3: Probar alternativas
```bash
# Probar diferentes nombres
GET /api/profesores
GET /api/colegio-profesores
GET /api/persona-trayectorias
```

---

## 📝 NOTAS

1. **El nombre visual en Strapi Admin puede ser diferente al nombre técnico del endpoint**
2. **Strapi genera endpoints basados en el nombre técnico del content type, no en el nombre visual**
3. **Si el endpoint actual funciona, no necesitamos cambiarlo**
4. **Si el endpoint actual NO funciona, necesitamos cambiar a `/api/profesores`**

---

**Última actualización:** 8 de enero de 2026
