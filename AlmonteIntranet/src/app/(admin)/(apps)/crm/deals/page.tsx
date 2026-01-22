import { redirect } from 'next/navigation'

// Redirigir /crm/deals a /crm/opportunities (consolidación de módulos)
// Negocios y Oportunidades son el mismo módulo, solo se mantiene "Oportunidades" en el menú
export default function Page() {
  redirect('/crm/opportunities')
}
