'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePlatform } from '@/hooks/usePlatform'

import logoDark from '@/assets/images/logo-black.png'
import logo from '@/assets/images/logo.png'

const AppLogo = ({ height }: { height?: number }) => {
  const platform = usePlatform()
  
  // Por ahora usamos el mismo logo para todas las plataformas
  // En el futuro se pueden agregar logos específicos:
  // - logo-moraleja.png / logo-moraleja-black.png
  // - logo-escolar.png / logo-escolar-black.png
  // - logo-general.png / logo-general-black.png (o el actual)
  
  // TODO: Agregar logos específicos por plataforma cuando estén disponibles
  const logoLightSrc = logo
  const logoDarkSrc = logoDark
  
  // Si hay logos específicos, se pueden usar así:
  // const logoLightSrc = platform === 'moraleja' 
  //   ? require('@/assets/images/logo-moraleja.png')
  //   : platform === 'escolar'
  //   ? require('@/assets/images/logo-escolar.png')
  //   : logo
  
  return (
    <>
      <Link href="/" className="logo-dark">
        <Image src={logoDarkSrc} alt={`${platform} dark logo`} height={height ?? 28} />
      </Link>
      <Link href="/" className="logo-light">
        <Image src={logoLightSrc} alt={`${platform} logo`} height={height ?? 28} />
      </Link>
    </>
  )
}

export default AppLogo
