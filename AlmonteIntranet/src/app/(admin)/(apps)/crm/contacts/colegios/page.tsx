'use client'

// Esta página muestra contactos relacionados con colegios
// Reutiliza la página principal de contactos pero con filtro tipo=colegio
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Contacts from '../page'

export default function ContactosColegiosPage() {
  const searchParams = useSearchParams()
  
  // Asegurar que el parámetro tipo=colegio esté en la URL
  useEffect(() => {
    if (!searchParams.get('tipo') || searchParams.get('tipo') !== 'colegio') {
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.set('tipo', 'colegio')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [searchParams])
  
  return <Contacts />
}

