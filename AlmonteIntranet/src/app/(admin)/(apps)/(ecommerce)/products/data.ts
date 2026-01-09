import { StaticImageData } from 'next/image'
import { IconType } from 'react-icons'
import { TbCurrencyDollar, TbPackage, TbShoppingCart, TbUsers } from 'react-icons/tb'

import product1 from '@/assets/images/products/1.png'
import product10 from '@/assets/images/products/10.png'
import product2 from '@/assets/images/products/2.png'
import product3 from '@/assets/images/products/3.png'
import product4 from '@/assets/images/products/4.png'
import product5 from '@/assets/images/products/5.png'
import product6 from '@/assets/images/products/6.png'
import product7 from '@/assets/images/products/7.png'
import product8 from '@/assets/images/products/8.png'
import product9 from '@/assets/images/products/9.png'
import { format, startOfYear, subDays } from 'date-fns'

export type ProductType = {
  image: StaticImageData
  name: string
  brand: string
  code: string
  category: string
  stock: number
  price: number
  sold: number
  rating: number
  reviews: number
  status: 'published' | 'pending' | 'rejected'
  date: string
  time: string
  url: string
}

const randomDate = (start: Date, end: Date): Date => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

const today = new Date()
const sevenDaysAgo = subDays(today, 7)
const thirtyDaysAgo = subDays(today, 30)
const yearStart = startOfYear(today)

const productDates = [
  ...Array(3)
    .fill(null)
    .map(() => randomDate(new Date(today.setHours(0, 0, 0, 0)), new Date())),
  ...Array(3)
    .fill(null)
    .map(() => randomDate(sevenDaysAgo, today)),
  ...Array(2)
    .fill(null)
    .map(() => randomDate(thirtyDaysAgo, sevenDaysAgo)),
  ...Array(2)
    .fill(null)
    .map(() => randomDate(yearStart, thirtyDaysAgo)),
]

export const productData: ProductType[] = []
