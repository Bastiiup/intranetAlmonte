import { redirect } from 'next/navigation'

// Redirigir /crm/personas a /crm/contacts (consolidación de módulos)
// Personas y Contactos son el mismo módulo, solo se mantiene "Contactos" en el menú
export default function Page() {
  redirect('/crm/contacts')
}

