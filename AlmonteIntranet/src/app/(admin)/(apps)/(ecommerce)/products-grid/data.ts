import { type StaticImageData } from 'next/image'

import product1 from '@/assets/images/products/1.png'
import product2 from '@/assets/images/products/2.png'
import product3 from '@/assets/images/products/3.png'
import product4 from '@/assets/images/products/4.png'
import product5 from '@/assets/images/products/5.png'
import product6 from '@/assets/images/products/6.png'
import product7 from '@/assets/images/products/7.png'
import product8 from '@/assets/images/products/8.png'
import product9 from '@/assets/images/products/9.png'
import product10 from '@/assets/images/products/10.png'

export type ProductType = {
  id: number
  title: string
  image: StaticImageData
  alt: string
  originalPrice: string
  discountedPrice: string
  discount?: number
  rating: number
  reviews: number
}

export const productsData: ProductType[] = []
