import React from 'react'
import { Modal, Button, Row, Col, Form, ModalHeader, ModalTitle, ModalBody, FormGroup, FormLabel, FormControl, ModalFooter } from 'react-bootstrap'
import FlatPicker from 'react-flatpickr'

type EstimationsModalProps = {
  show: boolean
  onHide: () => void
}

const EstimationsModal = ({ show, onHide }: EstimationsModalProps) => {
  return (
    <Modal show={show} onHide={onHide} size="lg">
      <ModalHeader closeButton>
        <ModalTitle as="h5">Crear Nueva Cotización</ModalTitle>
      </ModalHeader>

      <Form id="createEstimationForm">
        <ModalBody>
          <Row className="g-3">
            <Col md={6}>
              <FormGroup controlId="estimationTitle">
                <FormLabel>Nombre del Proyecto</FormLabel>
                <FormControl type="text" placeholder="Ingrese el nombre del proyecto" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="clientName">
                <FormLabel>Cliente</FormLabel>
                <FormControl type="text" placeholder="Ingrese el nombre del cliente" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="estimatedValue">
                <FormLabel>Valor Estimado (USD)</FormLabel>
                <FormControl type="number" placeholder="ej. 25000" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="estimator">
                <FormLabel>Cotizado Por</FormLabel>
                <FormControl type="text" placeholder="Ingrese el nombre del miembro del equipo" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="estimationStatus">
                <FormLabel>Estado</FormLabel>
                <Form.Select required defaultValue="">
                  <option value="">Seleccionar estado</option>
                  <option value="Approved">Aprobada</option>
                  <option value="In Review">En Revisión</option>
                  <option value="Pending">Pendiente</option>
                  <option value="Declined">Rechazada</option>
                  <option value="Sent">Enviada</option>
                </Form.Select>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="estimationTags">
                <FormLabel>Etiquetas</FormLabel>
                <FormControl type="text" placeholder="ej. CRM, Mobile, API" />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="createdDate">
                <FormLabel>Fecha de Creación</FormLabel>
                <FlatPicker className="form-control" />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="expectedCloseDate">
                <FormLabel>Cierre Esperado</FormLabel>
                <FlatPicker className="form-control" />
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onClick={onHide}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary">
            Guardar Cotización
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default EstimationsModal
