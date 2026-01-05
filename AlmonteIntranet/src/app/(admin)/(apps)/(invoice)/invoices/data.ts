import { StaticImageData } from 'next/image'

import user10 from '@/assets/images/users/user-10.jpg'
import user2 from '@/assets/images/users/user-2.jpg'
import user3 from '@/assets/images/users/user-3.jpg'
import user4 from '@/assets/images/users/user-4.jpg'
import user7 from '@/assets/images/users/user-7.jpg'
import user8 from '@/assets/images/users/user-8.jpg'
import user9 from '@/assets/images/users/user-9.jpg'

export type InvoiceType = {
  id: string
  date: string
  name: string
  image?: StaticImageData
  email: string
  purchase: string
  amount: number
  status: 'paid' | 'pending' | 'overdue' | 'draft'
}

export const invoices: InvoiceType[] = []
