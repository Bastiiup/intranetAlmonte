'use client'
import { useKanbanContext } from '@/context/useKanbanContext'
import { Button, Col, Form, FormControl, FormGroup, FormLabel, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Row } from 'react-bootstrap'
import { Controller } from 'react-hook-form'
import { VariantType } from '@/types'
import { toPascalCase } from '@/helpers/casing'

const variants:VariantType[]=['primary','secondary','success','danger','warning','info','light','dark']

const Modals = () => {
  const { newTaskModal, taskForm, taskFormData, sectionFormData, sectionModal, sectionForm } = useKanbanContext()
  return (
    <>
      <Modal show={newTaskModal.open} aria-hidden={newTaskModal.open} onHide={newTaskModal.toggle} centered>
        <Form onSubmit={taskFormData ? taskForm.editRecord : taskForm.newRecord}>
          <ModalHeader closeButton>
            <ModalTitle>{taskFormData ? 'Editar Negocio' : 'Agregar Nuevo Negocio'}</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <FormGroup className="mb-3" controlId="taskTitle">
              <FormLabel>Título</FormLabel>
              <Controller
                control={taskForm.control}
                name="title"
                rules={{ required: 'El título es requerido' }}
                render={({ field }) => <FormControl {...field} value={field.value ?? ''} type="text" placeholder="Ingrese el título" />}
              />
            </FormGroup>

            <FormGroup className="mb-3" controlId="userName">
              <FormLabel>Nombre de Usuario</FormLabel>
              <Controller
                control={taskForm.control}
                name="userName"
                rules={{ required: 'El nombre de usuario es requerido' }}
                render={({ field }) => <FormControl {...field} value={field.value ?? ''} type="text" placeholder="Ingrese el nombre de usuario" />}
              />
            </FormGroup>

            <FormGroup className="mb-3" controlId="companyName">
              <FormLabel>Nombre de la Empresa</FormLabel>
              <Controller
                control={taskForm.control}
                name="companyName"
                rules={{ required: 'El nombre de la empresa es requerido' }}
                render={({ field }) => <FormControl {...field} value={field.value ?? ''} type="text" placeholder="Ingrese el nombre de la empresa" />}
              />
            </FormGroup>
            <FormGroup className="mb-3" controlId="amount">
              <FormLabel>Monto</FormLabel>
              <Controller
                control={taskForm.control}
                name="amount"
                rules={{ required: 'Ingrese el monto' }}
                render={({ field }) => <FormControl {...field} value={field.value ?? ''} type="text" placeholder="Ingrese el monto" />}
              />
            </FormGroup>
            <Form.Group className="mb-0" controlId="taskDate">
              <Form.Label>Fecha</Form.Label>
              <Controller
                control={taskForm.control}
                name="date"
                rules={{ required: 'La fecha es requerida' }}
                render={({ field }) => <FormControl {...field} value={field.value ?? ''} type="date" />}
              />
            </Form.Group>
          </ModalBody>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => newTaskModal.toggle()}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              {taskFormData ? 'Editar Negocio' : 'Agregar Negocio'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={sectionModal.open} aria-hidden={sectionModal.open} onHide={sectionModal.toggle} tabIndex={-1} role="dialog">
        <form onSubmit={sectionFormData ? sectionForm.editRecord : sectionForm.newRecord}>
          <ModalHeader closeButton>
            <ModalTitle className="m-0">{sectionFormData ? 'Editar Sección' : 'Agregar Nueva Sección'}</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <Row>
              <Col sm={12} className="mb-3">
                <FormLabel>Título</FormLabel>
                <Controller
                  control={sectionForm.control}
                  name="sectionTitle"
                  rules={{ required: 'El título es requerido' }}
                  render={({ field }) => (
                    <>
                      <FormControl {...field} value={field.value ?? ''} type="text" placeholder="Ingrese el título" />
                    </>
                  )}
                />
              </Col>
              <Col sm={12}>
                  <FormLabel>Variante</FormLabel>
                  <Controller
                    control={sectionForm.control}
                    name="sectionVariant"
                    rules={{ required: 'Seleccione una Variante' }}
                    render={({ field }) => (
                      <Form.Select
                        {...field}
                        value={field.value?.name || 'info'}
                        onChange={(e) => {
                          const idx = e.target.selectedIndex
                          field.onChange(variants[idx])
                        }}>
                        {variants.map((variant, idx) => (
                          <option value={variant} key={idx}>
                            {toPascalCase(variant)}
                          </option>
                        ))}
                      </Form.Select>
                    )}
                  />
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button variant="primary" type="submit">
              {sectionFormData ? 'Actualizar' : 'Guardar'}
            </Button>
            <Button variant="danger" onClick={() => sectionModal.toggle()} type="button">
              Cerrar
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  )
}

export default Modals
