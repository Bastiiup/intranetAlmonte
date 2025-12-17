'use client'
import Link from 'next/link'

interface LogoProps {
  className?: string
  size?: 'sm' | 'lg'
}

const Logo = ({ className = '', size = 'lg' }: LogoProps) => {
  // Dimensiones según el tamaño - respetando las variables CSS del tema
  // logo-lg-height y logo-sm-height son 22px según _root.scss
  const logoHeight = size === 'sm' ? 22 : 22
  const logoWidth = logoHeight // Mantener proporción cuadrada
  
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
          width: `${logoWidth}px`,
          height: `${logoHeight}px`,
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      >
        <svg
          id="logosandtypes_com"
          data-name="logosandtypes com"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 150 150"
          width={logoWidth}
          height={logoHeight}
          style={{
            display: 'block',
            width: `${logoWidth}px`,
            height: `${logoHeight}px`,
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          <defs>
            <style>
              {`.cls-1 {
                fill: none;
              }`}
            </style>
          </defs>
          <path className="cls-1" d="M0,0H150V150H0V0Z"/>
          <path d="M43.28,13.97c0,34.74,28.12,62.89,62.79,62.89,5.76,0,11.34-.79,16.65-2.26L106.08,13.97H43.28Z"/>
          <path d="M74.91,68.53l-42.93-12.18L10.36,136.65H56.83l18.08-68.12Z"/>
          <path d="M80.06,86.92l42.66-12.31,16.78,62.04h-46.46l-12.98-49.73Z"/>
        </svg>
      </div>
    </Link>
  )
}

export default Logo

