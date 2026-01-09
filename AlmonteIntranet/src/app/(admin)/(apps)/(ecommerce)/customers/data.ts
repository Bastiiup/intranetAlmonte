import { StaticImageData } from 'next/image'

import user1 from '@/assets/images/users/user-1.jpg'
import user10 from '@/assets/images/users/user-10.jpg'
import user2 from '@/assets/images/users/user-2.jpg'
import user3 from '@/assets/images/users/user-3.jpg'
import user4 from '@/assets/images/users/user-4.jpg'
import user5 from '@/assets/images/users/user-5.jpg'
import user6 from '@/assets/images/users/user-6.jpg'
import user7 from '@/assets/images/users/user-7.jpg'
import user8 from '@/assets/images/users/user-8.jpg'
import user9 from '@/assets/images/users/user-9.jpg'

import arFlag from '@/assets/images/flags/ar.svg'
import auFlag from '@/assets/images/flags/au.svg'
import deFlag from '@/assets/images/flags/de.svg'
import frFlag from '@/assets/images/flags/fr.svg'
import gbFlag from '@/assets/images/flags/gb.svg'
import inFlag from '@/assets/images/flags/in.svg'
import itFlag from '@/assets/images/flags/it.svg'
import jpFlag from '@/assets/images/flags/jp.svg'
import ruFlag from '@/assets/images/flags/ru.svg'
import usFlag from '@/assets/images/flags/us.svg'

export type CustomerType = {
  name: string
  email: string
  avatar: StaticImageData
  phone: string
  country: string
  countryFlag: StaticImageData
  joined: {
    date: string
    time: string
  }
  orders: number
  totalSpends: number
}

export const customers: CustomerType[] = []
