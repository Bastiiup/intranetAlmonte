# Cómo Verificar si WooCommerce POS PRO está Instalado

## Método 1: Verificar en WordPress (Recomendado)

### Pasos:
1. **Accede al WordPress donde está WooCommerce**
   - Ve a: `https://staging.moraleja.cl/wp-admin` (o la URL de tu WordPress)
   - Inicia sesión como administrador

2. **Ve a Plugins**
   - En el menú lateral: **Plugins → Installed Plugins**
   - Busca: **"WCPOS"** o **"WooCommerce POS"**

3. **Verifica si está instalado:**
   - Si ves **"WCPOS"** o **"WooCommerce POS"** → Está instalado
   - Si dice **"WCPOS Pro"** → Tiene la versión Pro
   - Si no aparece → No está instalado

4. **Verifica la licencia Pro:**
   - Si está instalado, haz clic en **"Settings"** o **"Configuración"**
   - Busca una sección de **"License"** o **"Licencia"**
   - Si tiene un campo para ingresar una **"License Key"** y está activada → Tiene Pro

---

## Método 2: Verificar en el Código

### Buscar en los archivos de WordPress:
1. Ve a la carpeta de plugins de WordPress
2. Busca la carpeta: `wp-content/plugins/wcpos/` o `wp-content/plugins/woocommerce-pos/`
3. Si existe, abre el archivo principal (ej: `wcpos.php`)
4. Busca referencias a "Pro" o "Premium"

---

## Método 3: Verificar en la Base de Datos

### Consulta SQL:
```sql
SELECT * FROM wp_options 
WHERE option_name LIKE '%wcpos%' 
   OR option_name LIKE '%woocommerce_pos%'
   OR option_name LIKE '%pos_pro%';
```

---

## Método 4: Verificar en Strapi

Si WooCommerce se sincroniza con Strapi:
1. Ve a Strapi → Content Manager
2. Busca colecciones relacionadas con POS
3. Si hay datos de POS sincronizados, probablemente está instalado

---

## Método 5: Preguntar Directamente

**Preguntas para tu jefe:**
1. ¿Tienes instalado WooCommerce POS en WordPress?
2. ¿Tienes la versión Pro o la gratuita?
3. ¿Dónde está instalado? (¿En staging.moraleja.cl o staging.escolar.cl?)
4. ¿Tienes la clave de licencia de POS Pro?

---

## Si Tiene POS Pro Instalado

### Para integrarlo con la intranet:

**Opción A: A través de Strapi (Recomendado)**
- Si WooCommerce se sincroniza con Strapi, los datos de POS ya estarían disponibles
- Solo necesitamos conectarnos a Strapi (ya lo tenemos configurado)

**Opción B: Directamente con WooCommerce API**
- Necesitaríamos las credenciales de WooCommerce API
- Crear un cliente para conectarse directamente a WooCommerce

**Opción C: Usar la API de WCPOS**
- WCPOS Pro tiene su propia API REST
- Necesitaríamos configurar acceso a esa API

---

## Preguntas Específicas para tu Jefe

1. **¿Tienes WooCommerce POS instalado?**
   - ¿En qué WordPress? (staging.moraleja.cl o staging.escolar.cl)
   - ¿Versión Pro o gratuita?

2. **¿Cómo quieres que funcione el POS en la intranet?**
   - ¿Solo visualizar ventas del POS?
   - ¿Crear nuevas ventas desde la intranet?
   - ¿Ver estadísticas de ventas?

3. **¿Los datos del POS se sincronizan con Strapi?**
   - Si sí → Ya podemos conectarlo fácilmente
   - Si no → Necesitamos configurar la sincronización o conectarnos directamente a WooCommerce

---

## Próximos Pasos

1. **Verificar si está instalado** (usar Método 1)
2. **Confirmar versión** (Pro o gratuita)
3. **Ver cómo se sincroniza** (Strapi o directo a WooCommerce)
4. **Conectar con la intranet** según el método disponible


