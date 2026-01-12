'use client'
import { Button, Col, Form, FormControl, FormGroup, FormLabel, FormSelect, Modal, ModalFooter, ModalHeader, ModalTitle, Row } from 'react-bootstrap'
import Flatpickr from 'react-flatpickr'

const CreateDealModal = ({ show, toggleModal }: { show: boolean; toggleModal: () => void }) => {
  return (
    <Modal show={show} onHide={toggleModal} size="lg">
      <ModalHeader closeButton>
        <ModalTitle as="h5">Crear Nuevo Negocio</ModalTitle>
      </ModalHeader>

      <Form id="createDealForm">
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <FormGroup controlId="dealName">
                <FormLabel>Nombre del Negocio</FormLabel>
                <FormControl type="text" placeholder="Ingrese el nombre del negocio" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="companyName">
                <FormLabel>Empresa</FormLabel>
                <FormControl type="text" placeholder="Ingrese el nombre de la empresa" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="amount">
                <FormLabel>Monto (USD)</FormLabel>
                <Form.Control type="number" placeholder="ej. 100000" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="stage">
                <FormLabel>Etapa</FormLabel>
                <FormSelect required>
                  <option value="">Seleccionar etapa</option>
                  <option value="Qualification">Calificación</option>
                  <option value="Proposal Sent">Propuesta Enviada</option>
                  <option value="Negotiation">Negociación</option>
                  <option value="Won">Ganado</option>
                  <option value="Lost">Perdido</option>
                </FormSelect>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="probability">
                <FormLabel>Probabilidad (%)</FormLabel>
                <Form.Control type="number" min={0} max={100} placeholder="ej. 75" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="closingDate">
                <FormLabel>Fecha de Cierre Esperada</FormLabel>
                <Flatpickr className="form-control" required />
              </FormGroup>
            </Col>
          </Row>
        </Modal.Body>

        <ModalFooter>
          <Button variant="light" onClick={toggleModal}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit">
            Guardar Negocio
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default CreateDealModal
