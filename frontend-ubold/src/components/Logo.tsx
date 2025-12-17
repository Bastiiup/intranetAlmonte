'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'

interface LogoProps {
  className?: string
  size?: 'sm' | 'lg'
}

const Logo = ({ className = '', size = 'lg' }: LogoProps) => {
  const [imageError, setImageError] = useState(false)
  const [imageExists, setImageExists] = useState<boolean | null>(null)
  
  // Verificar si la imagen existe al montar el componente
  useEffect(() => {
    const img = new window.Image()
    img.onload = () => setImageExists(true)
    img.onerror = () => {
      setImageExists(false)
      setImageError(true)
    }
    img.src = '/images/logo/logo-moraleja.png'
  }, [])
  
  // Dimensiones del logo según el tamaño
  const logoDimensions = {
    lg: { width: 140, height: 40 },
    sm: { width: 100, height: 28 },
  }

  const dimensions = logoDimensions[size]

  // Componente de fallback (texto MORALEJA)
  const FallbackLogo = () => (
    <Link 
      href="/" 
      className={className} 
      style={{ 
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          fontSize: size === 'sm' ? '14px' : '18px',
          fontWeight: 'bold',
          color: '#14b8a6',
          letterSpacing: '1px',
          backgroundColor: '#000000',
          borderRadius: '4px',
          padding: size === 'sm' ? '4px 8px' : '6px 12px',
        }}
      >
        MORALEJA
      </div>
    </Link>
  )

  // Si hay error o la imagen no existe, mostrar fallback directamente
  // También mostrar fallback mientras se verifica si la imagen existe
  if (imageError || imageExists === false) {
    return <FallbackLogo />
  }

  // Si aún no se ha verificado, mostrar fallback temporalmente para evitar errores
  if (imageExists === null) {
    return <FallbackLogo />
  }

  // Solo mostrar la imagen si existe y no hay error
  return (
    <Link 
      href="/" 
      className={className} 
      style={{ 
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          position: 'relative',
          margin: '0 auto',
        }}
      >
        <Image
          src="/images/logo/logo-moraleja.png"
          alt="MORALEJA Logo"
          width={dimensions.width}
          height={dimensions.height}
          style={{
            objectFit: 'contain',
            width: '100%',
            height: '100%',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
          priority={false}
          onError={() => {
            setImageError(true)
            setImageExists(false)
          }}
        />
      </div>
    </Link>
  )
}

export default Logo

