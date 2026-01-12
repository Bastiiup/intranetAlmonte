import { type MenuItemType } from '@/types/layout'
import { type IconType } from 'react-icons'
import {
  TbApps,
  TbBasket,
  TbBellRinging,
  TbCalendar,
  TbComponents,
  TbCreditCard,
  TbFolder,
  TbHeadset,
  TbLayoutDashboard,
  TbLock,
  TbLogout2,
  TbMessageDots,
  TbSettings2,
  TbUserCircle,
  TbUserHexagon,
  TbUsers,
} from 'react-icons/tb'
import {
  LuCalendar,
  LuChartNoAxesCombined,
  LuCircleGauge,
  LuDessert,
  LuEarth,
  LuEyeOff,
  LuFileInput,
  LuFileText,
  LuFingerprint,
  LuFolderOpenDot,
  LuHandshake,
  LuHousePlug,
  LuInbox,
  LuKey,
  LuLifeBuoy,
  LuListTree,
  LuMapPinned,
  LuMessageSquareDot,
  LuNotebookText,
  LuPanelRightClose,
  LuPanelTop,
  LuPencilRuler,
  LuProportions,
  LuReceiptText,
  LuRss,
  LuShieldAlert,
  LuShieldBan,
  LuShoppingBag,
  LuSparkles,
  LuTable,
  LuUsers,
} from 'react-icons/lu'

type UserDropdownItemType = {
  label?: string
  icon?: IconType
  url?: string
  isDivider?: boolean
  isHeader?: boolean
  class?: string
  isLogout?: boolean
}

export const userDropdownItems: UserDropdownItemType[] = [
  {
    label: '¡Bienvenido de nuevo!',
    isHeader: true,
  },
  {
    label: 'Perfil',
    icon: TbUserCircle,
    url: '/users/profile',
  },
  {
    label: 'Configuración de Cuenta',
    icon: TbSettings2,
    url: '#',
  },
  {
    isDivider: true,
  },
  {
    label: 'Cerrar Sesión',
    icon: TbLogout2,
    url: '#',
    class: 'text-danger fw-semibold',
    isLogout: true, // Marcar como logout para manejarlo de forma especial
  },
]

export const menuItems: MenuItemType[] = [
  { key: 'comercial', label: 'COMERCIAL', isTitle: true },
  {
    key: 'crm',
    label: 'CRM',
    icon: LuHandshake,
    children: [
      { key: 'crm-contacts', label: 'Contactos', url: '/crm/contacts' },
      { key: 'crm-colegios', label: 'Colegios', url: '/crm/colegios' },
      { key: 'crm-personas', label: 'Personas', url: '/crm/personas' },
      { key: 'crm-opportunities', label: 'Oportunidades', url: '/crm/opportunities' },
      // { key: 'crm-deals', label: 'Negocios', url: '/crm/deals' }, // Oculto - no se usa
      { key: 'crm-leads', label: 'Leads', url: '/crm/leads' },
      { key: 'crm-pipeline', label: 'Embudo', url: '/crm/pipeline' },
      { key: 'crm-campaign', label: 'Campaña', url: '/crm/campaign' },
      // { key: 'crm-proposals', label: 'Propuestas', url: '/crm/proposals' }, // Oculto - no se usa
      { key: 'crm-estimations', label: 'Cotizaciones', url: '/crm/estimations' },
      // { key: 'crm-customers', label: 'Clientes', url: '/crm/customers' }, // Oculto - no se usa
      { key: 'crm-activities', label: 'Actividades', url: '/crm/activities' },
      // { key: 'crm-automatizaciones', label: 'Automatizaciones', url: '/crm/automatizaciones' }, // Oculto - no se usa
    ],
  },
  // { key: 'atencion-clientes', label: 'ATENCIÓN CLIENTES', isTitle: true },
  // {
  //   key: 'support-center',
  //   label: 'Centro de Soporte',
  //   icon: TbSettings2,
  //   children: [
  //     { key: 'tickets-list', label: 'Tickets List', url: '/tickets-list' },
  //     { key: 'ticket-details', label: 'Ticket Details', url: '/ticket-details' },
  //     { key: 'ticket-create', label: 'Ticket Create', url: '/ticket-create' },
  //   ],
  // },
  { key: 'ecommerce-section', label: 'ECOMMERCE', isTitle: true },
  {
    key: 'products',
    label: 'Products',
    icon: LuShoppingBag,
    children: [
      { key: 'product-list', label: 'Listing', url: '/products' },
      { key: 'product-grid', label: 'Product Grid', url: '/products-grid' },
      { key: 'product-details', label: 'Product Details', url: '/products/1' },
      { key: 'add-product', label: 'Add Product', url: '/add-product' },
      { key: 'all-categories', label: 'Todas las Categorías', url: '/products/categorias' },
      { key: 'add-category', label: 'Agregar Categoría', url: '/products/categorias/agregar' },
      { key: 'categoria-requests', label: 'Solicitudes de Categorías', url: '/products/categorias/solicitudes', roles: ['super_admin', 'encargado_adquisiciones', 'supervisor'] },
      { key: 'all-tags', label: 'Todas las Etiquetas', url: '/products/etiquetas' },
      { key: 'add-tag', label: 'Agregar Etiqueta', url: '/products/etiquetas/agregar' },
      { key: 'etiqueta-requests', label: 'Solicitudes de Etiquetas', url: '/products/etiquetas/solicitudes', roles: ['super_admin', 'encargado_adquisiciones', 'supervisor'] },
      {
        key: 'atributos',
        label: 'Atributos',
        children: [
          { key: 'all-autores', label: 'Todos los Autores', url: '/products/atributos/autores' },
          { key: 'add-autor', label: 'Agregar Autor', url: '/products/atributos/autores/agregar' },
          { key: 'autor-requests', label: 'Solicitudes de Autores', url: '/products/atributos/autores/solicitudes', roles: ['super_admin', 'encargado_adquisiciones', 'supervisor'] },
          { key: 'all-colecciones', label: 'Todas las Colecciones', url: '/products/atributos/colecciones' },
          { key: 'add-coleccion', label: 'Agregar Colección', url: '/products/atributos/colecciones/agregar' },
          { key: 'coleccion-requests', label: 'Solicitudes de Colecciones', url: '/products/atributos/colecciones/solicitudes', roles: ['super_admin', 'encargado_adquisiciones', 'supervisor'] }, // soporte NO puede ver solicitudes
          { key: 'all-obras', label: 'Todas las Obras', url: '/products/atributos/obras' },
          { key: 'add-obra', label: 'Agregar Obra', url: '/products/atributos/obras/agregar' },
          { key: 'obra-requests', label: 'Solicitudes de Obras', url: '/products/atributos/obras/solicitudes', roles: ['super_admin', 'encargado_adquisiciones', 'supervisor'] }, // soporte NO puede ver solicitudes
          { key: 'all-sellos', label: 'Todos los Sellos', url: '/atributos/sello' },
          { key: 'add-sello', label: 'Agregar Sello', url: '/atributos/sello/agregar' },
          { key: 'sello-requests', label: 'Solicitudes de Sellos', url: '/atributos/sello/solicitudes', roles: ['super_admin', 'encargado_adquisiciones', 'supervisor'] },
          { key: 'all-marcas', label: 'Todas las Marcas', url: '/atributos/marca' },
          { key: 'add-marca', label: 'Agregar Marca', url: '/atributos/marca/agregar' },
          { key: 'marca-requests', label: 'Solicitudes de Marcas', url: '/atributos/marca/solicitudes', roles: ['super_admin', 'encargado_adquisiciones', 'supervisor'] },
        ],
      },
      { key: 'product-requests', label: 'Solicitudes de Productos', url: '/products/solicitudes', roles: ['super_admin', 'encargado_adquisiciones', 'supervisor'] },
    ],
  },
  {
    key: 'ecommerce',
    label: 'Ecommerce',
    icon: LuShoppingBag,
    roles: ['super_admin', 'encargado_adquisiciones', 'supervisor', 'soporte'], // Todos los roles pueden ver este menú
    children: [
      // { key: 'categories', label: 'Categories', url: '/categories' },
      { key: 'all-clients', label: 'Todos los Clientes', url: '/clientes', roles: ['super_admin', 'supervisor', 'soporte'] },
      {
        key: 'cupones',
        label: 'Cupones',
        roles: ['super_admin', 'supervisor', 'soporte'],
        children: [
          { key: 'all-cupones', label: 'Todos los Cupones', url: '/atributos/cupones' },
          { key: 'add-cupon', label: 'Agregar Cupón', url: '/atributos/cupones/agregar' },
        ],
      },
    ],
  },
  {
    key: 'pedidos',
    label: 'Pedidos',
    icon: LuReceiptText,
    roles: ['super_admin', 'supervisor', 'soporte'],
    children: [
      { key: 'all-pedidos', label: 'Todos los Pedidos', url: '/atributos/pedidos' },
      { key: 'add-pedido', label: 'Agregar Pedido', url: '/atributos/pedidos/agregar' },
    ],
  },
  { key: 'aplicaciones', label: 'APLICACIONES', isTitle: true },
  { key: 'chat', label: 'Chat', icon: LuMessageSquareDot, url: '/chat' },
  { key: 'logs', label: 'Logs de Actividades', icon: LuFileText, url: '/logs', roles: ['super_admin', 'supervisor', 'soporte'] },
  { key: 'equipos-section', label: 'EQUIPOS', isTitle: true },
  {
    key: 'equipos',
    label: 'Equipos',
    icon: LuUsers,
    children: [
      { key: 'colaboradores', label: 'Colaboradores', url: '/colaboradores', roles: ['super_admin', 'encargado_adquisiciones', 'supervisor'] },
      { key: 'colaboradores-solicitudes', label: 'Solicitudes de Colaboradores', url: '/colaboradores/solicitudes', roles: ['super_admin'] },
      { key: 'profile', label: 'Perfil', url: '/users/profile' },
    ],
  },
  { key: 'tienda-section', label: 'TIENDA', isTitle: true },
  {
    key: 'tienda',
    label: 'Tienda',
    icon: TbBasket,
    roles: ['super_admin', 'encargado_adquisiciones'], // supervisor y soporte NO pueden ver este menú
    children: [
      { key: 'tienda-pos', label: 'POS', url: '/tienda/pos' },
      { key: 'tienda-turno', label: 'Número de atención', url: '/tienda/turno' },
      {
        key: 'tienda-facturas',
        label: 'Facturas',
        children: [
          { key: 'tienda-facturas-listing', label: 'Todas las Facturas', url: '/tienda/facturas' },
        ],
      },
    ],
  },
]

export const horizontalMenuItems: MenuItemType[] = [
  {
    key: 'dashboards',
    label: 'Tableros',
    icon: TbLayoutDashboard,
    children: [
      { key: 'dashboard-v1', label: 'Tablero 1', url: '/dashboard' },
      { key: 'dashboard-v2', label: 'Tablero 2', url: '/dashboard2' },

    ],
  },
  {
    key: 'apps',
    label: 'Aplicaciones',
    icon: TbApps,
    children: [
      { key: 'calendar', label: 'Calendario', icon: TbCalendar, url: '/calendar' },
      { key: 'chat', label: 'Chat', icon: TbMessageDots, url: '/chat' },
      { key: 'file-manager', label: 'Gestor de Archivos', icon: TbFolder, url: '/file-manager' },
      {
        key: 'products',
        label: 'Productos',
        icon: TbBasket,
        children: [
          { key: 'product-list', label: 'Listado', url: '/products' },
          { key: 'product-grid', label: 'Cuadrícula de Productos', url: '/products-grid' },
          { key: 'product-details', label: 'Detalles del Producto', url: '/products/1' },
          { key: 'add-product', label: 'Agregar Producto', url: '/add-product' },
          { key: 'all-categories', label: 'Todas las Categorías', url: '/products/categorias' },
          { key: 'add-category', label: 'Agregar Categoría', url: '/products/categorias/agregar' },
          { key: 'categoria-requests', label: 'Solicitudes de Categorías', url: '/products/categorias/solicitudes', roles: ['super_admin', 'encargado_adquisiciones', 'supervisor'] },
          { key: 'all-tags', label: 'Todas las Etiquetas', url: '/products/etiquetas' },
          { key: 'add-tag', label: 'Agregar Etiqueta', url: '/products/etiquetas/agregar' },
          { key: 'etiqueta-requests', label: 'Solicitudes de Etiquetas', url: '/products/etiquetas/solicitudes', roles: ['super_admin', 'encargado_adquisiciones', 'supervisor'] },
          {
            key: 'atributos',
            label: 'Atributos',
            children: [
              { key: 'all-autores', label: 'Todos los Autores', url: '/products/atributos/autores' },
              { key: 'add-autor', label: 'Agregar Autor', url: '/products/atributos/autores/agregar' },
              { key: 'autor-requests', label: 'Solicitudes de Autores', url: '/products/atributos/autores/solicitudes', roles: ['super_admin', 'encargado_adquisiciones', 'supervisor'] },
              { key: 'all-colecciones', label: 'Todas las Colecciones', url: '/products/atributos/colecciones' },
              { key: 'add-coleccion', label: 'Agregar Colección', url: '/products/atributos/colecciones/agregar' },
              { key: 'all-obras', label: 'Todas las Obras', url: '/atributos/obras' },
              { key: 'add-obra', label: 'Agregar Obra', url: '/atributos/obras/agregar' },
              { key: 'all-sellos', label: 'Todos los Sellos', url: '/atributos/sello' },
              { key: 'add-sello', label: 'Agregar Sello', url: '/atributos/sello/agregar' },
              { key: 'sello-requests', label: 'Solicitudes de Sellos', url: '/atributos/sello/solicitudes', roles: ['super_admin', 'encargado_adquisiciones', 'supervisor'] },
              { key: 'all-marcas', label: 'Todas las Marcas', url: '/atributos/marca' },
              { key: 'add-marca', label: 'Agregar Marca', url: '/atributos/marca/agregar' },
              { key: 'marca-requests', label: 'Solicitudes de Marcas', url: '/atributos/marca/solicitudes', roles: ['super_admin', 'encargado_adquisiciones', 'supervisor'] },
            ],
          },
          { key: 'product-requests', label: 'Solicitudes de Productos', url: '/products/solicitudes', roles: ['super_admin', 'encargado_adquisiciones', 'supervisor'] },
        ],
      },
      {
        key: 'ecommerce',
        label: 'Ecommerce',
        icon: TbBasket,
        roles: ['super_admin', 'encargado_adquisiciones', 'supervisor', 'soporte'], // Todos los roles pueden ver este menú
        children: [
          { key: 'categories', label: 'Categorías', url: '/categories' },
          {
            key: 'orders',
            label: 'Pedidos',
            roles: ['super_admin', 'supervisor', 'soporte'],
            children: [
              { key: 'orders-list', label: 'Pedidos', url: '/orders' },
              { key: 'order-details', label: 'Detalles del Pedido', url: '/orders/1' },
            ],
          },
          { key: 'customers', label: 'Clientes', url: '/customers', roles: ['super_admin', 'supervisor', 'soporte'] },
          { key: 'all-clients', label: 'Todos los Clientes', url: '/clientes', roles: ['super_admin', 'supervisor', 'soporte'] },
          {
            key: 'cupones',
            label: 'Cupones',
            roles: ['super_admin', 'supervisor', 'soporte'],
            children: [
              { key: 'all-cupones', label: 'Todos los Cupones', url: '/atributos/cupones' },
              { key: 'add-cupon', label: 'Agregar Cupón', url: '/atributos/cupones/agregar' },
            ],
          },
          {
            key: 'pedidos',
            label: 'Pedidos',
            roles: ['super_admin', 'supervisor', 'soporte'],
            children: [
              { key: 'all-pedidos', label: 'Todos los Pedidos', url: '/atributos/pedidos' },
              { key: 'add-pedido', label: 'Agregar Pedido', url: '/atributos/pedidos/agregar' },
            ],
          },
        ],
      },
      {
        key: 'tienda',
        label: 'Tienda',
        icon: TbBasket,
        roles: ['super_admin', 'encargado_adquisiciones'], // supervisor y soporte NO pueden ver este menú
        children: [
          { key: 'tienda-pos', label: 'POS', url: '/tienda/pos' },
          { key: 'tienda-turno', label: 'Número de atención', url: '/tienda/turno' },
          {
            key: 'tienda-productos',
            label: 'Productos',
            children: [
              { key: 'tienda-productos-listing', label: 'Listing', url: '/tienda/productos' },
              { key: 'tienda-productos-editar', label: 'Editar Producto', url: '/tienda/productos/editar' },
            ],
          },
          {
            key: 'tienda-pedidos',
            label: 'Pedidos',
            roles: ['super_admin', 'supervisor', 'soporte'],
            children: [
              { key: 'tienda-pedidos-listing', label: 'Pedidos', url: '/tienda/pedidos' },
              { key: 'tienda-pedidos-editar', label: 'Edición de pedidos', url: '/tienda/pedidos/editar' },
            ],
          },
        ],
      },
      {
        key: 'email',
        label: 'Correo',
        icon: LuInbox,
        badge: { variant: 'danger', text: 'Nuevo' },
        children: [
          { key: 'inbox', label: 'Bandeja de Entrada', url: '/inbox' },
          { key: 'inbox-details', label: 'Detalles', url: '/inbox/1' },
          { key: 'email-compose', label: 'Redactar', url: '/email-compose' },
          { key: 'email-templates', label: 'Plantillas de Correo', url: '/email-templates' },
        ],
      },
      {
        key: 'crm',
        label: 'CRM',
        icon: LuHandshake,
        children: [
          { key: 'crm-contacts', label: 'Contactos', url: '/crm/contacts' },
          { key: 'crm-colegios', label: 'Colegios', url: '/crm/colegios' },
          { key: 'crm-personas', label: 'Personas', url: '/crm/personas' },
          { key: 'crm-opportunities', label: 'Oportunidades', url: '/crm/opportunities' },
          // { key: 'crm-deals', label: 'Negocios', url: '/crm/deals' }, // Oculto - no se usa
          { key: 'crm-leads', label: 'Leads', url: '/crm/leads' },
          { key: 'crm-pipeline', label: 'Embudo', url: '/crm/pipeline' },
          { key: 'crm-campaign', label: 'Campaña', url: '/crm/campaign' },
          // { key: 'crm-proposals', label: 'Propuestas', url: '/crm/proposals' }, // Oculto - no se usa
          { key: 'crm-estimations', label: 'Cotizaciones', url: '/crm/estimations' },
          // { key: 'crm-customers', label: 'Clientes', url: '/crm/customers' }, // Oculto - no se usa
          { key: 'crm-activities', label: 'Actividades', url: '/crm/activities' },
          // { key: 'crm-automatizaciones', label: 'Automatizaciones', url: '/crm/automatizaciones' }, // Oculto - no se usa
        ],
      },
      {
        key: 'users',
        label: 'Usuarios',
        icon: LuUsers,
        children: [
          { key: 'contacts', label: 'Contactos', url: '/users/contacts' },
          { key: 'profile', label: 'Perfil', url: '/users/profile' },
          { key: 'roles', label: 'Roles', url: '/users/roles' },
          { key: 'roles-details', label: 'Detalles de Roles', url: '/users/roles-details' },
          { key: 'permissions', label: 'Permisos', url: '/users/permissions' },
        ],
      },

      {
        key: 'invoice',
        label: 'Facturación',
        icon: LuReceiptText,
        children: [
          { key: 'invoice-list', label: 'Facturas', url: '/invoices' },
          { key: 'invoice-details', label: 'Factura Individual', url: '/invoices/1' },
          { key: 'add-invoice', label: 'Nueva Factura', url: '/add-invoice' },
        ],
      },
    ],
  },
  {
    key: 'pages',
    label: 'Pages',
    icon: LuNotebookText,
    children: [
      {
        key: 'general-pages',
        label: 'General Pages',
        icon: LuNotebookText,
        children: [
          { key: 'faq', label: 'FAQ', url: '/pages/faq' },
          { key: 'pricing', label: 'Pricing', url: '/pages/pricing' },
          { key: 'empty-page', label: 'Empty Page', url: '/pages/empty-page' },
          { key: 'timeline', label: 'Timeline', url: '/pages/timeline' },
          { key: 'sitemap', label: 'Sitemap', url: '/pages/sitemap' },
          { key: 'search-results', label: 'Search Results', url: '/pages/search-results' },
          { key: 'coming-soon', label: 'Coming Soon', url: '/coming-soon' },
          { key: 'terms-conditions', label: 'Terms & Conditions', url: '/pages/terms-conditions' },
        ],
      },
      {
        key: 'version-1',
        label: 'Basic',
        icon: LuShieldBan,
        children: [
          { key: 'sign-in', label: 'Sign In', url: '/auth-1/sign-in' },
          { key: 'sign-up', label: 'Sign Up', url: '/auth-1/sign-up' },
          { key: 'reset-pass', label: 'Reset Password', url: '/auth-1/reset-password' },
          { key: 'new-pass', label: 'New Password', url: '/auth-1/new-password' },
          { key: 'two-factor', label: 'Two Factor', url: '/auth-1/two-factor' },
          { key: 'lock-screen', label: 'Lock Screen', url: '/auth-1/lock-screen' },
          { key: 'success-mail', label: 'Success Mail', url: '/auth-1/success-mail' },
          { key: 'login-pin', label: 'Login with PIN', url: '/auth-1/login-pin' },
          { key: 'delete-account', label: 'Delete Account', url: '/auth-1/delete-account' },
        ],
      },
      {
        key: 'version-2',
        label: 'Cover',
        icon: TbUserHexagon,
        children: [
          { key: 'sign-in-2', label: 'Sign In', url: '/auth-2/sign-in' },
          { key: 'sign-up-2', label: 'Sign Up', url: '/auth-2/sign-up' },
          {
            key: 'reset-pass-2',
            label: 'Reset Password',
            url: '/auth-2/reset-password',
          },
          { key: 'new-pass-2', label: 'New Password', url: '/auth-2/new-password' },
          { key: 'two-factor-2', label: 'Two Factor', url: '/auth-2/two-factor' },
          { key: 'lock-screen-2', label: 'Lock Screen', url: '/auth-2/lock-screen' },
          { key: 'success-mail-2', label: 'Success Mail', url: '/auth-2/success-mail' },
          { key: 'login-pin-2', label: 'Login with PIN', url: '/auth-2/login-pin' },
          {
            key: 'delete-account-2',
            label: 'Delete Account',
            url: '/auth-2/delete-account',
          },
        ],
      },
      {
        key: 'error',
        label: 'Error Pages',
        icon: LuShieldAlert,
        children: [
          { key: 'error-400', label: '400', url: '/error/400' },
          { key: 'error-401', label: '401', url: '/error/401' },
          { key: 'error-403', label: '403', url: '/error/403' },
          { key: 'error-404', label: '404', url: '/error/404' },
          { key: 'error-408', label: '408', url: '/error/408' },
          { key: 'error-500', label: '500', url: '/error/500' },
          { key: 'maintenance', label: 'Maintenance', url: '/maintenance' },
        ],
      },
    ],
  },
  {
    key: 'components',
    label: 'Components',
    icon: TbComponents,
    children: [
      {
        key: 'ui-one',
        label: 'Base UI One',
        icon: LuPencilRuler,
        children: [
          {
            key: 'accordions',
            label: 'Accordions',
            url: '/ui/accordions',
          },
          {
            key: 'alerts',
            label: 'Alerts',
            url: '/ui/alerts',
          },
          {
            key: 'images',
            label: 'Images',
            url: '/ui/images',
          },
          {
            key: 'badges',
            label: 'Badges',
            url: '/ui/badges',
          },
          {
            key: 'breadcrumb',
            label: 'Breadcrumb',
            url: '/ui/breadcrumb',
          },
          {
            key: 'buttons',
            label: 'Buttons',
            url: '/ui/buttons',
          },
          {
            key: 'cards',
            label: 'Cards',
            url: '/ui/cards',
          },
          {
            key: 'carousel',
            label: 'Carousel',
            url: '/ui/carousel',
          },
          {
            key: 'collapse',
            label: 'Collapse',
            url: '/ui/collapse',
          },
          {
            key: 'colors',
            label: 'Colors',
            url: '/ui/colors',
          },
          {
            key: 'dropdowns',
            label: 'Dropdowns',
            url: '/ui/dropdowns',
          },
          {
            key: 'videos',
            label: 'Videos',
            url: '/ui/videos',
          },
          {
            key: 'grid',
            label: 'Grid Options',
            url: '/ui/grid',
          },
        ],
      },
      {
        key: 'ui-two',
        label: 'Base UI Two',
        icon: LuPencilRuler,
        children: [
          {
            key: 'links',
            label: 'Links',
            url: '/ui/links',
          },
          {
            key: 'list-group',
            label: 'List Group',
            url: '/ui/list-group',
          },
          {
            key: 'modals',
            label: 'Modals',
            url: '/ui/modals',
          },
          {
            key: 'notifications',
            label: 'Notifications',
            url: '/ui/notifications',
          },
          {
            key: 'offcanvas',
            label: 'Offcanvas',
            url: '/ui/offcanvas',
          },
          {
            key: 'placeholders',
            label: 'Placeholders',
            url: '/ui/placeholders',
          },
          {
            key: 'pagination',
            label: 'Pagination',
            url: '/ui/pagination',
          },
          {
            key: 'popovers',
            label: 'Popovers',
            url: '/ui/popovers',
          },
          {
            key: 'progress',
            label: 'Progress',
            url: '/ui/progress',
          },
          {
            key: 'spinners',
            label: 'Spinners',
            url: '/ui/spinners',
          },
          {
            key: 'tabs',
            label: 'Tabs',
            url: '/ui/tabs',
          },
          {
            key: 'tooltips',
            label: 'Tooltips',
            url: '/ui/tooltips',
          },
          {
            key: 'typography',
            label: 'Typography',
            url: '/ui/typography',
          },
          {
            key: 'utilities',
            label: 'Utilities',
            url: '/ui/utilities',
          },
        ],
      },
      {
        key: 'widgets',
        label: 'Widgets',
        icon: LuDessert,
        url: '/widgets',
      },

      {
        key: 'apexchart-1',
        label: 'Apex Charts 1',
        icon: LuChartNoAxesCombined,
        children: [
          { key: 'apex-area-chart', label: 'Area', url: '/charts/apex/area' },
          { key: 'apex-bar-chart', label: 'Bar', url: '/charts/apex/bar' },
          { key: 'apex-bubble-chart', label: 'Bubble', url: '/charts/apex/bubble' },
          { key: 'apex-candlestick-chart', label: 'Candlestick', url: '/charts/apex/candlestick' },
          { key: 'apex-column-chart', label: 'Column', url: '/charts/apex/column' },
          { key: 'apex-heatmap-chart', label: 'Heatmap', url: '/charts/apex/heatmap' },
          { key: 'apex-line-chart', label: 'Line', url: '/charts/apex/line' },
          { key: 'apex-mixed-chart', label: 'Mixed', url: '/charts/apex/mixed' },
          { key: 'apex-timeline-chart', label: 'Timeline', url: '/charts/apex/timeline' },
          { key: 'apex-boxplot-chart', label: 'Boxplot', url: '/charts/apex/boxplot' },
          { key: 'apex-treemap-chart', label: 'Treemap', url: '/charts/apex/treemap' },
        ],
      },
      {
        key: 'apexchart-2',
        label: 'Apex Charts 2',
        icon: LuChartNoAxesCombined,
        children: [
          { key: 'apex-pie-chart', label: 'Pie', url: '/charts/apex/pie' },
          { key: 'apex-radar-chart', label: 'Radar', url: '/charts/apex/radar' },
          { key: 'apex-radialbar-chart', label: 'Radialbar', url: '/charts/apex/radialbar' },
          { key: 'apex-scatter-chart', label: 'Scatter', url: '/charts/apex/scatter' },
          { key: 'apex-polar-area-chart', label: 'Polar Area', url: '/charts/apex/polar-area' },
          { key: 'apex-sparkline-chart', label: 'Sparklines', url: '/charts/apex/sparklines' },
          { key: 'apex-range-chart', label: 'Range', url: '/charts/apex/range' },
          { key: 'apex-funnel-chart', label: 'Funnel', url: '/charts/apex/funnel' },
          { key: 'apex-slope-chart', label: 'Slope', url: '/charts/apex/slope' },
          {
            key: 'apex-tree',
            label: 'Apex Tree',
            url: '/charts/apex-tree',
          },
        ],
      },

      {
        key: 'forms',
        label: 'Forms',
        icon: LuFileInput,
        children: [
          {
            key: 'form-basic-elements',
            label: 'Basic Elements',
            url: '/forms/basic',
          },
          {
            key: 'form-pickers',
            label: 'Pickers',
            url: '/forms/pickers',
          },
          {
            key: 'form-select',
            label: 'Select',
            url: '/forms/select',
          },
          {
            key: 'form-validation',
            label: 'Validation',
            url: '/forms/validation',
          },
          {
            key: 'form-wizard',
            label: 'Wizard',
            url: '/forms/wizard',
          },
          {
            key: 'form-file-uploads',
            label: 'File Uploads',
            url: '/forms/file-uploads',
          },
          {
            key: 'form-text-editors',
            label: 'Text Editors',
            url: '/forms/editors',
          },
          {
            key: 'form-slider',
            label: 'Slider',
            url: '/forms/slider',
          },
          {
            key: 'form-layouts',
            label: 'Layouts',
            url: '/forms/layouts',
          },
          {
            key: 'form-other-plugins',
            label: 'Other Plugins',
            url: '/forms/other-plugins',
          },
        ],
      },
      {
        key: 'icons',
        label: 'Icons',
        icon: LuSparkles,
        children: [
          {
            key: 'tabler-icons',
            label: 'Tabler',
            url: '/icons/tabler',
          },
          {
            key: 'lucide-icons',
            label: 'Lucide',
            url: '/icons/lucide',
          },
          {
            key: 'flags',
            label: 'Flags',
            url: '/icons/flags',
          },
        ],
      },
      {
        key: 'maps',
        label: 'Maps',
        icon: LuMapPinned,
        children: [
          {
            key: 'vector-maps',
            label: 'Vector Maps',
            url: '/maps/vector',
          },
          {
            key: 'leaflet-maps',
            label: 'Leaflet Maps',
            url: '/maps/leaflet',
          },
        ],
      },
    ],
  },
  {
    key: 'miscellaneous',
    label: 'Miscellaneous',
    icon: LuHousePlug,
    children: [
      { key: 'nestable-list', label: 'Nestable List', url: '/miscellaneous/nestable-list' },
      { key: 'pdf-viewer', label: 'PDF Viewer', url: '/miscellaneous/pdf-viewer' },
      { key: 'sweet-alert', label: 'Sweet Alert', url: '/miscellaneous/sweet-alert' },
      { key: 'password-meter', label: 'Password Meter', url: '/miscellaneous/password-meter' },
      { key: 'clipboard', label: 'Clipboard', url: '/miscellaneous/clipboard' },
      { key: 'tree-view', label: 'Tree View', url: '/miscellaneous/tree-view' },
      { key: 'tour', label: 'Tour', url: '/miscellaneous/tour' },
    ],
  },
  {
    key: 'tables',
    label: 'Tables',
    icon: LuTable,
    children: [
      {
        key: 'static-tables',
        label: 'Static Tables',
        url: '/tables/static',
      },
      {
        key: 'tanstack-tables',
        label: 'Tanstack Tables',
        url: '/tables/tanstack',
      },
      {
        key: 'data-tables',
        label: 'DataTables',
        badge: { variant: 'success', text: '13' },
        children: [
          { key: 'data-tables-basic', label: 'Basic', url: '/tables/data-tables/basic' },
          { key: 'data-tables-export-data', label: 'Export Data', url: '/tables/data-tables/export-data' },
          { key: 'data-tables-select', label: 'Select', url: '/tables/data-tables/select' },
          { key: 'data-tables-ajax', label: 'Ajax', url: '/tables/data-tables/ajax' },
          {
            key: 'data-tables-javascript-source',
            label: 'Javascript Source',
            url: '/tables/data-tables/javascript-source',
          },
          {
            key: 'data-tables-data-rendering',
            label: 'Data Rendering',
            url: '/tables/data-tables/data-rendering',
          },
          { key: 'data-tables-scroll', label: 'Scroll', url: '/tables/data-tables/scroll' },
          { key: 'data-tables-columns', label: 'Show & Hide Column', url: '/tables/data-tables/columns' },
          { key: 'data-tables-child-rows', label: 'Child Rows', url: '/tables/data-tables/child-rows' },
          {
            key: 'data-tables-column-searching',
            label: 'Column Searching',
            url: '/tables/data-tables/column-searching',
          },
          {
            key: 'data-tables-fixed-header',
            label: 'Fixed Header',
            url: '/tables/data-tables/fixed-header',
          },
          {
            key: 'data-tables-add-rows',
            label: 'Add Rows',
            url: '/tables/data-tables/add-rows',
          },
          {
            key: 'data-tables-checkbox-select',
            label: 'Checkbox Select',
            url: '/tables/data-tables/checkbox-select',
          },
        ],
      },
    ],
  },
  {
    key: 'layouts',
    label: 'Layouts',
    icon: LuProportions,
    children: [
      {
        key: 'layout-options',
        label: 'Layout Options',
        icon: LuProportions,
        children: [
          { key: 'scrollable', label: 'Scrollable', url: '/layouts/scrollable' },
          { key: 'compact', label: 'Compact', url: '/layouts/compact' },
          { key: 'boxed', label: 'Boxed', url: '/layouts/boxed' },
          { key: 'horizontal', label: 'Horizontal', url: '/layouts/horizontal' },
        ],
      },
      {
        key: 'sidebars',
        label: 'Sidebars',
        icon: LuPanelRightClose,
        children: [
          { key: 'compact-menu', label: 'Compact Menu', url: '/layouts/sidebars/compact' },
          { key: 'icon-view-menu', label: 'Icon View Menu', url: '/layouts/sidebars/icon-view' },
          { key: 'on-hover-menu', label: 'On Hover Menu', url: '/layouts/sidebars/on-hover' },
          {
            key: 'on-hover-active-menu',
            label: 'On Hover Active Menu',
            url: '/layouts/sidebars/on-hover-active',
          },
          { key: 'offcanvas-menu', label: 'Offcanvas Menu', url: '/layouts/sidebars/offcanvas' },
          {
            key: 'no-icons-with-lines-menu',
            label: 'No Icons With Lines',
            url: '/layouts/sidebars/no-icons-with-lines',
          },
          {
            key: 'with-lines-menu',
            label: 'Sidebar With Lines',
            url: '/layouts/sidebars/with-lines',
          },
          { key: 'light-menu', label: 'Light Menu', url: '/layouts/sidebars/light' },
          { key: 'gradient-menu', label: 'Gradient Menu', url: '/layouts/sidebars/gradient' },
          { key: 'gray-menu', label: 'Gray Menu', url: '/layouts/sidebars/gray' },
          { key: 'image-menu', label: 'Image Menu', url: '/layouts/sidebars/image' },
        ],
      },
      {
        key: 'topbars',
        label: 'Topbar',
        icon: LuPanelTop,
        children: [
          { key: 'dark-topbar', label: 'Dark Topbar', url: '/layouts/topbars/dark' },
          { key: 'gray-topbar', label: 'Gray Topbar', url: '/layouts/topbars/gray' },
          { key: 'gradient-topbar', label: 'Gradient Topbar', url: '/layouts/topbars/gradient' },
        ],
      },
    ],
  },
  {
    key: 'landing',
    label: 'Landing',
    icon: LuEarth,
    url: '/landing',
  },
]
