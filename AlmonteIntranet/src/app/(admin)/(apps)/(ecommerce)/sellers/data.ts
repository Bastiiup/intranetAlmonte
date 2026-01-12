import { StaticImageData } from 'next/image'

import seller1 from '@/assets/images/sellers/1.png'
import seller10 from '@/assets/images/sellers/10.png'
import seller2 from '@/assets/images/sellers/2.png'
import seller3 from '@/assets/images/sellers/3.png'
import seller4 from '@/assets/images/sellers/4.png'
import seller5 from '@/assets/images/sellers/5.png'
import seller6 from '@/assets/images/sellers/6.png'
import seller7 from '@/assets/images/sellers/7.png'
import seller8 from '@/assets/images/sellers/8.png'
import seller9 from '@/assets/images/sellers/9.png'

import flagAU from '@/assets/images/flags/au.svg'
import flagBR from '@/assets/images/flags/br.svg'
import flagCA from '@/assets/images/flags/ca.svg'
import flagDE from '@/assets/images/flags/de.svg'
import flagFR from '@/assets/images/flags/fr.svg'
import flagGB from '@/assets/images/flags/gb.svg'
import flagIN from '@/assets/images/flags/in.svg'
import flagIT from '@/assets/images/flags/it.svg'
import flagJP from '@/assets/images/flags/jp.svg'
import flagUS from '@/assets/images/flags/us.svg'
import type { ApexOptions } from 'apexcharts'

export type SellerType = {
  id: number
  name: string
  image: StaticImageData
  products: number
  orders: number
  rating: number
  location: string
  flag: StaticImageData
  balance: number
  sinceYear: number
  chartType: 'bar' | 'line'
}

export const sellers: SellerType[] = []

function generateRandomData(count = 15, min = 5, max = 20) {
  return Array.from({ length: count }, () => Math.floor(Math.random() * (max - min + 1)) + min)
}

export const getSellerReportChartOptions = (type: 'line' | 'bar'): ApexOptions => {
  return {
    chart: {
      type: type,
      height: 30,
      width: 100,
      sparkline: {
        enabled: true,
      },
    },
    stroke: {
      width: type === 'line' ? 2 : 0,
      curve: (type === 'line' ? 'smooth' : 'straight') as 'smooth' | 'straight',
    },
    plotOptions: {
      bar: {
        columnWidth: '50%',
        borderRadius: 2,
      },
    },
    series: [
      {
        data: generateRandomData(),
      },
    ],
    colors: ['#3b82f6'],
    tooltip: {
      enabled: false,
    },
  }
}
