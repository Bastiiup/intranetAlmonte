'use client'

import { useEffect, useState } from 'react'

export default function TestPage() {
  const [mounted, setMounted] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    setMounted(true)
    
    // Capturar errores de JavaScript
    const errorHandler = (event: ErrorEvent) => {
      setErrors(prev => [...prev, `Error: ${event.message} at ${event.filename}:${event.lineno}`])
    }
    
    window.addEventListener('error', errorHandler)
    
    return () => {
      window.removeEventListener('error', errorHandler)
    }
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Test Page - Railway Deployment</h1>
      <p>Si ves este mensaje, el servidor está funcionando correctamente.</p>
      <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
      <p><strong>Mounted:</strong> {mounted ? '✅ Sí' : '❌ No'}</p>
      <p><strong>User Agent:</strong> {typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A'}</p>
      
      {errors.length > 0 && (
        <div style={{ marginTop: '20px', padding: '10px', background: '#fee', border: '1px solid #fcc' }}>
          <h3>Errores detectados:</h3>
          <ul>
            {errors.map((error, idx) => (
              <li key={idx} style={{ color: 'red' }}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div style={{ marginTop: '20px', padding: '10px', background: '#eef', border: '1px solid #ccf' }}>
        <h3>Instrucciones:</h3>
        <ol>
          <li>Presiona F12 para abrir las herramientas de desarrollador</li>
          <li>Ve a la pestaña "Console"</li>
          <li>Copia todos los errores que aparezcan (texto en rojo)</li>
          <li>Ve a la pestaña "Network"</li>
          <li>Recarga la página (F5)</li>
          <li>Busca archivos con estado 404 (rojos)</li>
        </ol>
      </div>
    </div>
  )
}

