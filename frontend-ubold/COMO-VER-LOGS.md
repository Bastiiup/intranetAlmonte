# Cómo ver los logs en Opera GX

## Método 1: Herramientas de Desarrollador (Recomendado)

1. **Abre la página del chat** en Opera GX
   - Ve a: `https://tu-url-de-railway.app/chat`

2. **Abre las herramientas de desarrollador:**
   - Presiona `F12` en tu teclado
   - O presiona `Ctrl + Shift + I` (Windows/Linux)
   - O haz clic derecho en la página → "Inspeccionar" o "Inspeccionar elemento"

3. **Ve a la pestaña "Console" (Consola)**
   - Deberías ver una ventana en la parte inferior o lateral de la pantalla
   - Haz clic en la pestaña que dice "Console" o "Consola"

4. **Filtra los logs:**
   - En el buscador de la consola (donde dice "Filter"), escribe: `[Chat]` o `[API`
   - Esto mostrará solo los logs relacionados con el chat

5. **Recarga la página:**
   - Presiona `F5` o `Ctrl + R` para recargar
   - Deberías ver logs que empiezan con `[Chat]` o `[API`

6. **Envía un mensaje:**
   - Escribe un mensaje y envíalo
   - Observa los logs que aparecen en la consola

7. **Cambia a la otra cuenta:**
   - Abre otra ventana/incógnito o cierra sesión y entra con la otra cuenta
   - Observa los logs cuando llegue el mensaje

## Método 2: Captura de Pantalla

Si no puedes copiar los logs, puedes hacer una captura de pantalla:
1. Abre la consola (`F12`)
2. Ve a la pestaña "Console"
3. Presiona `Print Screen` o usa la herramienta de captura de Windows
4. Comparte la imagen

## Qué buscar en los logs:

Busca estos mensajes específicos:
- `[API /chat/mensajes] Datos recibidos:`
- `[Chat] Datos recibidos de API:`
- `[Chat] Mensaje mapeado:`

Copia todo el texto que aparezca después de estos mensajes.

## Si no ves la consola:

1. Asegúrate de que la ventana de herramientas de desarrollador esté abierta (`F12`)
2. Busca las pestañas en la parte superior: Elements, Console, Network, etc.
3. Haz clic en "Console"
4. Si está minimizada, busca un ícono de consola o arrastra la ventana para hacerla más grande

