'use client'
import Loader from '@/components/Loader'
import { useLayoutContext } from '@/context/useLayoutContext'
import HorizontalLayout from '@/layouts/HorizontalLayout'
import VerticalLayout from '@/layouts/VerticalLayout'
import { ChildrenType } from '@/types'
import { Fragment, useEffect, useState } from 'react'
import CargaMasivaPDFsMinimized from '@/components/CargaMasivaPDFsMinimized'
import CargaMasivaPDFsModalGlobal from '@/components/CargaMasivaPDFsModalGlobal'

const MainLayout = ({ children }: ChildrenType) => {
  const { orientation } = useLayoutContext()

  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) return <Loader height="100vh" />

  return (
    <Fragment>
      {orientation === 'vertical' && <VerticalLayout>{children}</VerticalLayout>}
      {orientation === 'horizontal' && <HorizontalLayout>{children}</HorizontalLayout>}
      <CargaMasivaPDFsMinimized />
      <CargaMasivaPDFsModalGlobal />
    </Fragment>
  )
}

export default MainLayout
