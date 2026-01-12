import { ApexOptions } from 'apexcharts'
import { StaticImageData } from 'next/image'

import product2 from '@/assets/images/products/2.png'
import product3 from '@/assets/images/products/3.png'
import product4 from '@/assets/images/products/4.png'
import product5 from '@/assets/images/products/5.png'
import product6 from '@/assets/images/products/6.png'

import user2 from '@/assets/images/users/user-2.jpg'
import user3 from '@/assets/images/users/user-3.jpg'
import user4 from '@/assets/images/users/user-4.jpg'
import user6 from '@/assets/images/users/user-6.jpg'
import user8 from '@/assets/images/users/user-8.jpg'
import { getColor } from '@/helpers/color'

export type ProductReviewType = {
  id: number
  productName: string
  image: StaticImageData
  name: string
  avatar: StaticImageData
  email: string
  rating: number
  message: string
  description: string
  date: string
  time: string
  status: 'published' | 'pending'
}

export const reviews: { progress: number; count: number }[] = []

export const productReviews: ProductReviewType[] = []

export const getReviewChartOptions: () => ApexOptions = () => ({
  chart: {
    type: 'area',
    height: 185,
    toolbar: { show: false },
  },
  grid: {
    padding: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
  },
  series: [
    {
      name: 'Reviews',
      data: [5, 8, 6, 7, 10, 12, 9, 14, 11, 15, 17, 19, 14, 13, 16, 18, 22, 20, 19, 17, 15, 18, 20, 23, 21, 22, 24, 26, 25, 28],
    },
  ],
  xaxis: {
    categories: Array.from({ length: 30 }, (_, i) => `${i + 1}`),
    labels: {
      rotate: -45,
      style: {
        fontSize: '10px',
      },
    },
  },
  colors: [getColor('secondary')],
  fill: {
    opacity: 0.3,
  },
  stroke: {
    curve: 'smooth',
    width: 2,
  },
  dataLabels: {
    enabled: false,
  },
  tooltip: {
    y: {
      formatter: function (val) {
        return `${val} Reviews`
      },
    },
  },
})
