import { KanbanSectionType, KanbanTaskType } from '@/types/kanban'
import { getOpportunities, type OpportunitiesQuery } from '../opportunities/data'
import type { OpportunitiesType } from '../types'
import user1 from '@/assets/images/users/user-1.jpg'

// Secciones del pipeline (etapas del proceso de venta)
export const kanbanSectionsData: KanbanSectionType[] = [
  {
    id: 'qualification',
    title: 'Qualification',
    variant: 'warning',
  },
  {
    id: 'proposal-sent',
    title: 'Proposal Sent',
    variant: 'info',
  },
  {
    id: 'negotiation',
    title: 'Negotiation',
    variant: 'primary',
  },
  {
    id: 'won',
    title: 'Won',
    variant: 'success',
  },
  {
    id: 'lost',
    title: 'Lost',
    variant: 'danger',
  },
]

// Mapeo de etapas de Strapi a IDs de secciones del kanban
const etapaToSectionId: Record<string, string> = {
  'Qualification': 'qualification',
  'Proposal Sent': 'proposal-sent',
  'Negotiation': 'negotiation',
  'Won': 'won',
  'Lost': 'lost',
}

// Mapeo inverso: ID de sección a etapa de Strapi
const sectionIdToEtapa: Record<string, string> = {
  'qualification': 'Qualification',
  'proposal-sent': 'Proposal Sent',
  'negotiation': 'Negotiation',
  'won': 'Won',
  'lost': 'Lost',
}

/**
 * Transforma una oportunidad a KanbanTaskType
 */
export function transformOpportunityToKanbanTask(opportunity: OpportunitiesType): KanbanTaskType {
  // Mapear etapa a sectionId
  const sectionId = etapaToSectionId[opportunity.stage] || 'qualification'
  
  // Mapear status a status del kanban
  let status: 'lead' | 'negotiation' | 'won' | 'lost' = 'lead'
  if (opportunity.stage === 'Won') {
    status = 'won'
  } else if (opportunity.stage === 'Lost') {
    status = 'lost'
  } else if (opportunity.stage === 'Negotiation') {
    status = 'negotiation'
  }
  
  // Extraer monto numérico del string (ej: "$50,000" -> 50000)
  const amountMatch = opportunity.amount.match(/[\d,]+/)
  const amount = amountMatch ? parseInt(amountMatch[0].replace(/,/g, '')) : 0
  
  return {
    id: opportunity.id,
    sectionId,
    title: opportunity.productName,
    user: opportunity.customerAvatar || user1,
    userName: opportunity.customerName,
    company: opportunity.productBy,
    date: opportunity.closeDate,
    messages: 0, // Por ahora, se puede implementar después
    tasks: 0, // Por ahora, se puede implementar después
    amount,
    status,
  }
}

/**
 * Obtiene las oportunidades desde Strapi y las transforma a KanbanTaskType
 */
export async function getPipelineTasks(): Promise<KanbanTaskType[]> {
  try {
    const query: OpportunitiesQuery = {
      page: 1,
      pageSize: 100, // Obtener todas las oportunidades activas
    }
    
    const result = await getOpportunities(query)
    
    // Transformar cada oportunidad a KanbanTaskType
    return result.opportunities.map(transformOpportunityToKanbanTask)
  } catch (error) {
    console.error('Error al obtener tareas del pipeline:', error)
    return []
  }
}

/**
 * Obtiene el nombre de la etapa desde el ID de sección
 */
export function getEtapaFromSectionId(sectionId: string): string {
  return sectionIdToEtapa[sectionId] || 'Qualification'
}

/**
 * Obtiene el ID de sección desde el nombre de la etapa
 */
export function getSectionIdFromEtapa(etapa: string): string {
  return etapaToSectionId[etapa] || 'qualification'
}

// Mantener datos mock para compatibilidad (se pueden eliminar después)
export const KanbanTaskData: KanbanTaskType[] = []
