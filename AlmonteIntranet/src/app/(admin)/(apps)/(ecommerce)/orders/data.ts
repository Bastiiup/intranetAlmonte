import { StaticImageData } from 'next/image'
import { IconType } from 'react-icons'
import { TbCheck, TbHourglass, TbRepeat, TbShoppingCart, TbX } from 'react-icons/tb'

import user1 from '@/assets/images/users/user-1.jpg'
import user10 from '@/assets/images/users/user-10.jpg'
import user2 from '@/assets/images/users/user-2.jpg'
import user3 from '@/assets/images/users/user-3.jpg'
import user4 from '@/assets/images/users/user-4.jpg'
import user5 from '@/assets/images/users/user-5.jpg'
import user6 from '@/assets/images/users/user-6.jpg'
import user7 from '@/assets/images/users/user-7.jpg'
import user9 from '@/assets/images/users/user-9.jpg'

import amex from '@/assets/images/cards/american-express.svg'
import bhim from '@/assets/images/cards/bhim.svg'
import discover from '@/assets/images/cards/discover-card.svg'
import googleWallet from '@/assets/images/cards/google-wallet.svg'
import mastercard from '@/assets/images/cards/mastercard.svg'
import payoneer from '@/assets/images/cards/payoneer.svg'
import paypal from '@/assets/images/cards/paypal.svg'
import stripe from '@/assets/images/cards/stripe.svg'
import unionpay from '@/assets/images/cards/unionpay.svg'
import visa from '@/assets/images/cards/visa.svg'

export type OrderStatisticsType = {
  title: string
  count: number
  change: string
  icon: IconType
  prefix?: string
  suffix?: string
  variant: string
}

export type OrderType = {
  id: string
  number?: string // Número de pedido para mostrar
  displayId?: string // ID para mostrar en la tabla
  date: string
  time: string
  customer: {
    name: string
    avatar: StaticImageData
    email: string
  }
  amount: number
  paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded'
  orderStatus: 'delivered' | 'processing' | 'cancelled' | 'shipped'
  paymentMethod: {
    type: 'card' | 'upi' | 'other'
    image: StaticImageData
    vendor?: 'mastercard' | 'visa' | 'paypal' | 'stripe' | 'american-express' | 'discover' | 'unionpay' | 'payoneer' | 'google-wallet' | 'bhim'
    email?: string
    upiId?: string
    cardNumber?: string
  }
  _strapiDocumentId?: string // DocumentId de Strapi para referencia interna
}

export const orderStats: OrderStatisticsType[] = [
  {
    title: 'Completed Orders',
    count: 90.70,
    change: '+3.34',
    icon: TbCheck,
    variant: 'success',
    suffix:'k',
  },
  {
    title: 'Pending Orders',
    count: 557,
    change: '-1.12',
    icon: TbHourglass,
    variant: 'warning',
  },
  {
    title: 'Canceled Orders',
    count: 269,
    change: '-0.75',
    icon: TbX,
    variant: 'danger',
  },
  {
    title: 'New Orders',
    count: 9.30,
    change: '+4.22',
    icon: TbShoppingCart,
    variant: 'info',
    suffix:'k',
  },
  {
    title: 'Returned Orders',
    count: 8741,
    change: '+0.56',
    icon: TbRepeat,
    variant: 'primary',
  },
]

export const orders: OrderType[] = []
