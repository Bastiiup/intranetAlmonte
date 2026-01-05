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

import flagBR from '@/assets/images/flags/br.svg'
import flagCA from '@/assets/images/flags/ca.svg'
import flagDE from '@/assets/images/flags/de.svg'
import flagEG from '@/assets/images/flags/eg.svg'
import flagFR from '@/assets/images/flags/fr.svg'
import flagUK from '@/assets/images/flags/gb.svg'
import flagIN from '@/assets/images/flags/in.svg'
import flagJP from '@/assets/images/flags/jp.svg'
import flagUS from '@/assets/images/flags/us.svg'
import { StaticImageData } from 'next/image'


export type CustomerType = {
  id: string
  name: string
  email: string
  avatar: StaticImageData
  phone: string
  country: string
  countryLabel: string
  countryFlag: StaticImageData
  joined: string
  type: string
  company: string
  status: 'Active' | 'Verification Pending' | 'Inactive' | 'Blocked'
}


export const customers: CustomerType[] = []
