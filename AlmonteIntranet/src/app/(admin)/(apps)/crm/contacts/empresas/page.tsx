'use client'

// Esta página muestra contactos relacionados con empresas
// Reutiliza la página principal de contactos pero con filtro tipo=empresa
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Contacts from '../page'

export default function ContactosEmpresasPage() {
  const searchParams = useSearchParams()
  
  // Asegurar que el parámetro tipo=empresa esté en la URL
  useEffect(() => {
    if (!searchParams.get('tipo') || searchParams.get('tipo') !== 'empresa') {
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.set('tipo', 'empresa')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [searchParams])
  
  return <Contacts />
}

