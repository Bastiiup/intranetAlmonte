import { TbCreditCard, TbRotateClockwise2, TbShoppingCart, TbUsers } from 'react-icons/tb'
import { IconType } from 'react-icons'
import { getColor } from '@/helpers/color'
import { ChartJSOptionsType } from '@/types'

import product1 from '@/assets/images/products/1.png'
import product2 from '@/assets/images/products/2.png'
import product3 from '@/assets/images/products/3.png'
import product4 from '@/assets/images/products/4.png'
import product5 from '@/assets/images/products/5.png'
import product6 from '@/assets/images/products/6.png'
import product7 from '@/assets/images/products/7.png'
import product8 from '@/assets/images/products/8.png'
import product9 from '@/assets/images/products/9.png'

import user1 from '@/assets/images/users/user-1.jpg'
import user2 from '@/assets/images/users/user-2.jpg'
import user3 from '@/assets/images/users/user-3.jpg'
import user4 from '@/assets/images/users/user-4.jpg'
import user5 from '@/assets/images/users/user-5.jpg'
import user6 from '@/assets/images/users/user-6.jpg'
import user7 from '@/assets/images/users/user-7.jpg'
import user8 from '@/assets/images/users/user-8.jpg'
import user9 from '@/assets/images/users/user-9.jpg'
import user10 from '@/assets/images/users/user-10.jpg'

import { StaticImageData } from 'next/image'

export type StatCard = {
  id: number
  title: string
  value: number
  suffix?: string
  prefix?: string
  icon: IconType
  iconBg?: string
}

export type ProductType = {
  id: number
  image: StaticImageData
  name: string
  category: string
  stock: string
  price: string
  ratings: number
  reviews: number
  status: string
  statusVariant: 'success' | 'warning' | 'danger'
}

export type OrderType = {
  id: string
  userImage: StaticImageData
  userName: string
  product: string
  date: string
  amount: string
  status: string
  statusVariant: 'success' | 'warning' | 'danger'
}

// Los statCards ahora se generan dinámicamente desde getDashboardStats() en lib/getDashboardData.ts
export const statCards: StatCard[] = []

export const totalSalesChart: () => ChartJSOptionsType = () => ({
  type: 'doughnut',
  data: {
    labels: ['Online Store', 'Retail Stores', 'B2B Revenue', 'Marketplace Revenue'],
      datasets: [
      {
        label: '2024',
        data: [300, 150, 100, 80],
        backgroundColor: [getColor('chart-primary'), getColor('chart-secondary'), getColor('chart-dark'), getColor('chart-gray')],
        borderColor: 'transparent',
        borderWidth: 1,
        weight: 1, // Outer ring
      },
      {
        label: '2023',
        data: [270, 135, 90, 72],
        backgroundColor: [
          getColor('chart-primary-rgb', 0.3),
          getColor('chart-secondary-rgb', 0.3),
          getColor('chart-dark-rgb', 0.3),
          getColor('chart-gray-rgb', 0.3),
        ],
        borderColor: 'transparent',
        borderWidth: 3,
        weight: 0.8, // Inner ring
      },
    ],
  },
  options: {
    cutout: '30%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: { family: getComputedStyle(document.body).fontFamily },
          color: getColor('secondary-color'),
          usePointStyle: true, // Show circles instead of default box
          pointStyle: 'circle', // Circle shape
          boxWidth: 8, // Circle size
          boxHeight: 8, // (optional) same as width by default
          padding: 15, // Space between legend items
        },
      },
      tooltip: {
        callbacks: {
          label: function (ctx) {
            return `${ctx.dataset.label} - ${ctx.label}: ${ctx.parsed}`
          },
        },
      },
    },
    scales: {
      x: { display: false },
      y: { display: false },
    },
  } as any,
})

const generateRandomData = (min: number, max: number) => Array.from({ length: 12 }, () => Math.floor(Math.random() * (max - min + 1)) + min)

const onlineSales = generateRandomData(1000, 1250)
const inStoreSales = generateRandomData(800, 1250)

const totalSales = generateRandomData(2500, 3500)

export const salesAnalyticsChart: () => ChartJSOptionsType = () => ({
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        type: 'bar',
        label: 'Online Sales',
        data: onlineSales,
        borderColor: getColor('chart-primary'),
        backgroundColor: getColor('chart-primary'),
        stack: 'sales',
        barThickness: 20,
        borderRadius: 6,
      },
      {
        type: 'bar',
        label: 'In-store Sales',
        data: inStoreSales,
        borderColor: getColor('chart-gray'),
        backgroundColor: getColor('chart-gray'),
        stack: 'sales',
        barThickness: 20,
        borderRadius: 6,
      },
      {
        type: 'line',
        label: 'Projected Sales',
        data: totalSales,
        borderColor: getColor('chart-dark'),
        backgroundColor: getColor('chart-dark-rgb', 0.2),
        borderWidth: 2,
        borderDash: [5, 5], // dashed line
        tension: 0.4,
        fill: false,
        yAxisID: 'y',
      },
    ],
  },
})

// Los productos ahora se obtienen dinámicamente desde getProducts() en lib/getDashboardData.ts
export const products: ProductType[] = []

// Los pedidos ahora se obtienen dinámicamente desde getRecentOrders() en lib/getDashboardData.ts
export const orders: OrderType[] = []
