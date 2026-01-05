'use client'
import { useKanbanContext } from '@/context/useKanbanContext'
import { CardHeader } from 'react-bootstrap'
import { LuCalendarCheck, LuSearch, LuShuffle } from 'react-icons/lu'
import { TbPlus } from 'react-icons/tb'

type PipelineHeaderProps = {
  onAddClick?: () => void
}

const PipelineHeader = ({ onAddClick }: PipelineHeaderProps) => {
  const { sectionModal } = useKanbanContext()
  return (
    <CardHeader className=" d-none d-lg-flex border-light align-items-center gap-2">
      <div className="app-search">
        <input type="search" className="form-control" placeholder="Buscar oportunidades..." />
        <LuSearch className="app-search-icon text-muted" />
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2">
        <div className="app-search">
          <select className="form-select form-control">
            <option>Etapa</option>
            <option value="Qualification">Calificación</option>
            <option value="Proposal Sent">Propuesta Enviada</option>
            <option value="Negotiation">Negociación</option>
            <option value="Won">Ganada</option>
            <option value="Lost">Perdida</option>
          </select>
          <LuShuffle className="app-search-icon text-muted" />
        </div>

        <div className="app-search">
          <select className="form-select form-control">
            <option>Fecha de Cierre</option>
            <option value="Today">Hoy</option>
            <option value="This Week">Esta Semana</option>
            <option value="This Month">Este Mes</option>
          </select>
          <LuCalendarCheck className="app-search-icon text-muted" />
        </div>
      </div>

      <button type="submit" className="btn btn-secondary ms-lg-auto" onClick={onAddClick || (() => sectionModal.toggle())}>
        <TbPlus className="me-1" /> Agregar Oportunidad
      </button>
    </CardHeader>
  )
}

export default PipelineHeader
