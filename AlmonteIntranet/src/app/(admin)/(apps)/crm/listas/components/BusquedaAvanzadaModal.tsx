'use client'

import { useState, useEffect } from 'react'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormGroup,
  FormLabel,
  FormControl,
  Row,
  Col,
} from 'react-bootstrap'
import { LuSearch } from 'react-icons/lu'

interface BusquedaAvanzadaModalProps {
  show: boolean
  onHide: () => void
  onApply: (filters: any) => void
  colegios: string[]
}

export default function BusquedaAvanzadaModal({
  show,
  onHide,
  onApply,
  colegios,
}: BusquedaAvanzadaModalProps) {
  const [filters, setFilters] = useState({
    nombre: '',
    colegio: '',
    nivel: '',
    grado: '',
    año: '',
    estado: '',
  })

  const handleApply = () => {
    onApply(filters)
    onHide()
  }

  const handleReset = () => {
    setFilters({
      nombre: '',
      colegio: '',
      nivel: '',
      grado: '',
      año: '',
      estado: '',
    })
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <ModalHeader closeButton>
        <ModalTitle>
          <LuSearch className="me-2" />
          Búsqueda Avanzada
        </ModalTitle>
      </ModalHeader>
      <ModalBody>
        <Row>
          <Col xs={12}>
            <FormGroup className="mb-3">
              <FormLabel>Nombre del Curso</FormLabel>
              <FormControl
                type="text"
                value={filters.nombre}
                onChange={(e) => setFilters({ ...filters, nombre: e.target.value })}
                placeholder="Buscar por nombre..."
              />
            </FormGroup>
          </Col>

          <Col xs={12} sm={6}>
            <FormGroup className="mb-3">
              <FormLabel>Colegio</FormLabel>
              <FormControl
                as="select"
                value={filters.colegio}
                onChange={(e) => setFilters({ ...filters, colegio: e.target.value })}
              >
                <option value="">Todos los Colegios</option>
                {colegios.map((colegio) => (
                  <option key={colegio} value={colegio}>
                    {colegio}
                  </option>
                ))}
              </FormControl>
            </FormGroup>
          </Col>

          <Col xs={12} sm={6}>
            <FormGroup className="mb-3">
              <FormLabel>Nivel</FormLabel>
              <FormControl
                as="select"
                value={filters.nivel}
                onChange={(e) => setFilters({ ...filters, nivel: e.target.value })}
              >
                <option value="">Todos los Niveles</option>
                <option value="Basica">Básica</option>
                <option value="Media">Media</option>
              </FormControl>
            </FormGroup>
          </Col>

          <Col xs={12} sm={6}>
            <FormGroup className="mb-3">
              <FormLabel>Grado</FormLabel>
              <FormControl
                type="number"
                min="1"
                max="8"
                value={filters.grado}
                onChange={(e) => setFilters({ ...filters, grado: e.target.value })}
                placeholder="1-8"
              />
            </FormGroup>
          </Col>


          <Col xs={12} sm={6}>
            <FormGroup className="mb-3">
              <FormLabel>Año</FormLabel>
              <FormControl
                type="number"
                min="2020"
                max="2100"
                value={filters.año}
                onChange={(e) => setFilters({ ...filters, año: e.target.value })}
                placeholder="Ej: 2024"
              />
            </FormGroup>
          </Col>

          <Col xs={12} sm={6}>
            <FormGroup className="mb-3">
              <FormLabel>Estado</FormLabel>
              <FormControl
                as="select"
                value={filters.estado}
                onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
              >
                <option value="">Todos los Estados</option>
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </FormControl>
            </FormGroup>
          </Col>
        </Row>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={handleReset}>
          Limpiar
        </Button>
        <Button variant="secondary" onClick={onHide}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleApply}>
          <LuSearch className="me-2" />
          Aplicar Filtros
        </Button>
      </ModalFooter>
    </Modal>
  )
}
