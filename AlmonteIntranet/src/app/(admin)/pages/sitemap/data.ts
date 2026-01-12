import { IconType } from 'react-icons'
import { TbCalendar, TbChartBar, TbHelp, TbLayoutDashboard, TbLock, TbLogout, TbMail, TbNotebook, TbSettings,
  TbSettings2, TbUser, TbUserPlus, TbUsers,
  TbWallet
} from 'react-icons/tb'

type SubPage = {
  label: string
  url: string
}

type PageItemType = {
  label: string
  url: string
  icon: IconType
  children?: SubPage[]
}

export const dashboardSitemap: PageItemType[] = [
  {
    label: 'Tableros',
    url: '/dashboards',
    icon: TbLayoutDashboard,
    children: [
      { label: 'Analíticas', url: '/dashboards/analytics' },
      { label: 'CRM', url: '/dashboards/crm' },
      { label: 'Ventas', url: '/dashboards/sales' },
      { label: 'Minimal', url: '/dashboards/minimal' },
      { label: 'Ecommerce', url: '/dashboards/ecommerce' },
    ],
  },
  {
    label: 'Perfil',
    url: '/profile',
    icon:TbUser,
    children: [
      { label: 'Resumen', url: '/profile/overview' },
      { label: 'Editar', url: '/profile/edit' },
      { label: 'Seguridad', url: '/profile/security' },
    ],
  },
  { label: 'Centro de Ayuda', url: '/help-center', icon: TbHelp},
  { label: 'Iniciar Sesión', url: '/login', icon: TbLock },
  { label: 'Registrarse', url: '/register', icon: TbUserPlus },
]

export const applications: PageItemType[] = [
  { label: 'Calendario', url: '/apps/calendar', icon: TbCalendar },
  {
    label: 'Correo',
    url: '/apps/email',
    icon: TbMail,
    children: [
      { label: 'Bandeja de Entrada', url: '/apps/email/inbox' },
      { label: 'Leer', url: '/apps/email/read' },
      { label: 'Redactar', url: '/apps/email/compose' },
    ],
  },
  {
    label: 'Usuarios',
    url: '/apps/users',
    icon: TbUsers,
    children: [
      { label: 'Lista', url: '/apps/users/list' },
      { label: 'Agregar Usuario', url: '/apps/users/add' },
      { label: 'Roles', url: '/apps/users/roles' },
    ],
  },
  {
    label: 'Proyectos',
    url: '/apps/projects',
    icon: TbNotebook,
    children: [
      { label: 'Resumen', url: '/apps/projects/overview' },
      { label: 'Crear', url: '/apps/projects/create' },
      { label: 'Tareas', url: '/apps/projects/tasks' },
    ],
  },
]

export const reportsSettings: PageItemType[] = [
  {
    label: 'Informes',
    url: '/reports',
    icon: TbChartBar,
    children: [
      { label: 'Ventas', url: '/reports/sales' },
      { label: 'Usuarios', url: '/reports/users' },
      { label: 'Rendimiento', url: '/reports/performance' },
    ],
  },
  {
    label: 'Facturación',
    url: '/billing',
    icon:TbWallet,
    children: [
      { label: 'Facturas', url: '/billing/invoices' },
      { label: 'Pagos', url: '/billing/payments' },
      { label: 'Métodos', url: '/billing/methods' },
    ],
  },
  {
    label: 'Configuración',
    url: '/settings',
    icon: TbSettings,
    children: [
      { label: 'General', url: '/settings/general' },
      { label: 'Apariencia', url: '/settings/appearance' },
      { label: 'Integraciones', url: '/settings/integrations' },
      { label: 'Registros de Auditoría', url: '/settings/audit-logs' },
    ],
  },
  {
    label: 'Cerrar Sesión',
    url: '/logout',
    icon: TbLogout,
  },
]