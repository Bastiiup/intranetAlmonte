import { StaticImageData } from 'next/image'
import { ReactNode } from 'react'
import { ChildrenType } from '@/types'
import { IconType } from 'react-icons'

export type FeedCardType = {
  avatar: StaticImageData
  name: string
  time: string
  description?: string
  children?: ReactNode
}

export type CommentType = {
  avatar: StaticImageData
  name: string
  message: string
  time: string
  reply?: CommentType[]
}

export type ActivityType = {
  avatar: StaticImageData
  name: string
  message: string
  time: string
  image?: StaticImageData
}

export type TrendingType = {
  title: string
  description: string
  url: string
}

export type RequestType = {
  avatar?: StaticImageData
  icon?: IconType
  iconBg?: string
  title: string
  description: string
  badge: { text: string; className: string }
  time: string
  action: string
}