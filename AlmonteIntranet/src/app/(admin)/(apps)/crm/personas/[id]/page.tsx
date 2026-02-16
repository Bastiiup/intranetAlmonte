import { redirect } from 'next/navigation'

// Redirigir /crm/personas/[id] a /crm/contacts/[id] (consolidación de módulos)
// Personas y Contactos son el mismo módulo, solo se mantiene "Contactos" en el menú
export default async function PersonaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/crm/contacts/${id}`)
}

