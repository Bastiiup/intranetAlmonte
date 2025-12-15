import { Variant } from 'react-bootstrap/esm/types'
import { IconType } from 'react-icons'

export type LayoutSkinType = 'default' | 'material' | 'modern' | 'saas' | 'flat' | 'minimal' | 'galaxy'

export type LayoutThemeType = 'light' | 'dark' | 'system'

export type LayoutOrientationType = 'vertical' | 'horizontal'

export type TopBarColorType = 'light' | 'dark' | 'gray' | 'gradient'


export type LayoutPositionType = 'fixed' | 'scrollable'

export type LayoutWidthType = 'fluid' | 'boxed'

export type SidenavColorType = 'light' | 'dark' | 'gray' | 'gradient' | 'image'

export type SidenavSizeType = 'default' | 'compact' | 'condensed' | 'on-hover' | 'on-hover-active' | 'offcanvas'

export type LayoutState = {
  skin: LayoutSkinType
  theme: LayoutThemeType
  orientation: LayoutOrientationType
  topBarColor: TopBarColorType
  sidenavSize: SidenavSizeType
  sidenavColor: SidenavColorType
  sidenavUser: boolean
  monochrome:boolean
  width: LayoutWidthType
  position: LayoutPositionType
}


export type LayoutType = {
  updateSettings: (newSettings: Partial<LayoutState>) => void
  isCustomizerOpen: boolean
  toggleCustomizer: () => void
  hideBackdrop: () => void
  showBackdrop: () => void
  reset: () => void
} & LayoutState

export type MenuItemType = {
  key: string
  label: string
  isTitle?: boolean
  icon?: IconType
  url?: string
  badge?: {
    variant: Variant
    text: string
  }
  parentKey?: string
  target?: string
  isDisabled?: boolean
  isSpecial?: boolean
  children?: MenuItemType[]
}
