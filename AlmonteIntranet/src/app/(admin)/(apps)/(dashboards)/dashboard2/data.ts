import { TbChecklist, TbClipboardList, TbClockHour4, TbUserCog } from 'react-icons/tb'
import { IconType } from 'react-icons'
import { getColor } from '@/helpers/color'
import { ApexOptions } from 'apexcharts'

import product1 from '@/assets/images/products/1.png'
import product2 from '@/assets/images/products/2.png'
import product4 from '@/assets/images/products/4.png'
import product5 from '@/assets/images/products/5.png'
import product6 from '@/assets/images/products/6.png'

import user1 from '@/assets/images/users/user-1.jpg'
import user2 from '@/assets/images/users/user-2.jpg'
import user4 from '@/assets/images/users/user-4.jpg'
import user5 from '@/assets/images/users/user-5.jpg'
import user6 from '@/assets/images/users/user-6.jpg'

import deFlag from '@/assets/images/flags/de.svg'
import frFlag from '@/assets/images/flags/fr.svg'
import inFlag from '@/assets/images/flags/in.svg'
import usFlag from '@/assets/images/flags/us.svg'
import gbFlag from '@/assets/images/flags/gb.svg'
import caFlag from '@/assets/images/flags/ca.svg'
import jpFlag from '@/assets/images/flags/jp.svg'
import auFlag from '@/assets/images/flags/au.svg'
import brFlag from '@/assets/images/flags/br.svg'
import itFlag from '@/assets/images/flags/it.svg'

export type StatisticType = {
  icon: IconType
  title: string
  subtitle: string
  count: number
  variant: 'info' | 'success' | 'warning' | 'danger'
  progress: number
}

export type CountryDataType = {
  rank: number
  code: string
  name: string
  flag: string
  trend: { value: number; type: 'success' | 'danger' | 'warning' }
  activeProjects: number
  projectName: string
}

function generateRandomData(count: number, min: number, max: number) {
  return Array.from({ length: count }, () => Math.floor(Math.random() * (max - min + 1)) + min)
}

function generateSessionAndPageViewData(count: number) {
  const sessions = generateRandomData(count, 250, 450)
  const pageViews = sessions.map(
    (session) => Math.floor(session * (2 + Math.random() * 0.1)), // Page Views are 2x to 2.5x of Sessions
  )
  return { sessions, pageViews }
}

function generateData(baseval: number, count: number, yrange: any) {
  let i = 0
  const series = []
  while (i < count) {
    const x = Math.floor(Math.random() * (750 - 1 + 1)) + 1
    const y = Math.floor(Math.random() * (yrange.max - yrange.min + 1)) + yrange.min
    const z = Math.floor(Math.random() * (75 - 15 + 1)) + 15

    series.push([x, y, z])
    baseval += 86400000
    i++
  }
  return series
}

const { sessions, pageViews } = generateSessionAndPageViewData(19)

// Los stats ahora se generan dinámicamente desde getDashboard2Stats() en lib/getDashboardData2.ts
export const stats: StatisticType[] = []

// Los productos ahora se obtienen dinámicamente desde getProducts() en lib/getDashboardData2.ts
export const products = []

// Los pedidos ahora se obtienen dinámicamente desde getRecentOrders() en lib/getDashboardData2.ts
export const orders = []

export const projectOverviewChart: () => ApexOptions = () => ({
  chart: {
    height: 330,
    type: 'area',
    toolbar: { show: false },
  },
  dataLabels: {
    enabled: false,
  },
  stroke: {
    width: 2,
    curve: 'smooth',
  },
  colors: [getColor('chart-primary'), getColor('secondary')],
  series: [
    {
      name: 'Sessions',
      data: sessions,
    },
    {
      name: 'Page Views',
      data: pageViews,
    },
  ],
  legend: {
    offsetY: 5,
  },
  xaxis: {
    categories: [
      '',
      '8 AM',
      '9 AM',
      '10 AM',
      '11 AM',
      '12 PM',
      '1 PM',
      '2 PM',
      '3 PM',
      '4 PM',
      '5 PM',
      '6 PM',
      '7 PM',
      '8 PM',
      '9 PM',
      '10 PM',
      '11 PM',
      '12 AM',
      '',
    ],
    axisBorder: { show: false },
    axisTicks: { show: false },
    tickAmount: 6,
    labels: {
      style: {
        fontSize: '12px',
      },
    },
  },
  tooltip: {
    shared: true,
    y: {
      formatter: function (val, { seriesIndex }) {
        if (seriesIndex === 0) {
          return val + ' Sessions'
        } else if (seriesIndex === 1) {
          return val + ' Page Views'
        }
        return val.toString()
      },
    },
  },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.4,
      opacityTo: 0.2,
      stops: [15, 120, 100],
    },
  },
  grid: {
    borderColor: getColor('border-color'),
    padding: {
      bottom: 0,
    },
  },
})

export const taskProgressChart: () => ApexOptions = () => ({
  chart: {
    height: 330, // Increased height for spacing
    type: 'bubble',
    toolbar: {
      show: false,
    },
  },
  dataLabels: {
    enabled: false,
  },
  series: [
    {
      name: 'Bubble 1',
      data: generateData(new Date('11 Feb 2017 GMT').getTime(), 10, {
        min: 10,
        max: 60,
      }),
    },
    {
      name: 'Bubble 2',
      data: generateData(new Date('11 Feb 2017 GMT').getTime(), 10, {
        min: 10,
        max: 60,
      }),
    },
    {
      name: 'Bubble 3',
      data: generateData(new Date('11 Feb 2017 GMT').getTime(), 10, {
        min: 10,
        max: 60,
      }),
    },
  ],
  fill: {
    opacity: 0.8,
  },
  colors: [getColor('chart-primary'), getColor('secondary'), getColor('danger')],
  xaxis: {
    tickAmount: 12,
    type: 'category',
  },
  yaxis: {
    max: 70,
  },
  grid: {
    borderColor: getColor('border-color'),
    padding: {
      top: -20,
      right: 0,
      bottom: -5,
      left: 10,
    },
  },
  legend: {
    offsetY: 7,
  },
})

// Los datos de países ahora se obtienen dinámicamente desde getCountriesData() en lib/getDashboardData2.ts
export const countriesData: CountryDataType[] = []
