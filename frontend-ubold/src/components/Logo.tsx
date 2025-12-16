'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

interface LogoProps {
  className?: string
  size?: 'sm' | 'lg'
}

const Logo = ({ className = '', size = 'lg' }: LogoProps) => {
  const [imageError, setImageError] = useState(false)
  
  // Dimensiones del logo según el tamaño
  const logoDimensions = {
    lg: { width: 140, height: 40 },
    sm: { width: 100, height: 28 },
  }

  const dimensions = logoDimensions[size]

  // Fallback si la imagen no se carga
  if (imageError) {
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
            fontSize: size === 'sm' ? '14px' : '18px',
            fontWeight: 'bold',
            color: '#14b8a6',
            letterSpacing: '1px',
          }}
        >
          MORALEJA
        </div>
      </Link>
    )
  }

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
          priority
          onError={() => setImageError(true)}
        />
      </div>
    </Link>
  )
}

export default Logo

