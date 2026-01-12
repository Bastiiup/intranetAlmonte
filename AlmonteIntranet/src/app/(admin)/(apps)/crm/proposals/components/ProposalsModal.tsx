import React from "react";
import {
    Modal,
    Button,
    Row,
    Col,
    Form,
    ModalHeader,
    ModalTitle,
    ModalBody,
    FormGroup,
    FormLabel,
    FormControl,
    ModalFooter,
} from "react-bootstrap";
import FlatPicker from 'react-flatpickr'

type ProposalsModalProps = {
    show: boolean;
    onHide: () => void;
};

const ProposalsModal = ({ show, onHide }: ProposalsModalProps) => {
    return (
        <Modal show={show} onHide={onHide} size="lg">
            <ModalHeader closeButton>
                <ModalTitle as="h5">Crear Nueva Propuesta</ModalTitle>
            </ModalHeader>

            <Form id="createEstimationForm">
                <ModalBody>
                    <Row className="g-3">

                        <Col md={6}>
                            <FormGroup controlId="estimationTitle">
                                <FormLabel>ID de Propuesta</FormLabel>
                                <FormControl
                                    type="text"
                                    placeholder="Ingrese ID de propuesta (ej. #PS008120)"
                                    required
                                />
                            </FormGroup>
                        </Col>


                        <Col md={6}>
                            <FormGroup controlId="clientName">
                                <FormLabel>Asunto</FormLabel>
                                <FormControl
                                    type="text"
                                    placeholder="Ingrese el asunto de la propuesta"
                                    required
                                />
                            </FormGroup>
                        </Col>


                        <Col md={6}>
                            <FormGroup controlId="estimatedValue">
                                <FormLabel>Enviar A (Cliente)</FormLabel>
                                <FormControl
                                    type="number"
                                    placeholder="Ingrese el nombre del cliente"
                                    required
                                />
                            </FormGroup>
                        </Col>


                        <Col md={6}>
                            <FormGroup controlId="estimator">
                                <FormLabel>Valor (USD)</FormLabel>
                                <FormControl
                                    type="text"
                                    placeholder="ej. 15000"
                                    required
                                />
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
                                <FormControl
                                    type="text"
                                    placeholder="ej. CRM, Mobile, API"
                                />
                            </FormGroup>
                        </Col>

        
                        <Col md={6}>
                            <FormGroup controlId="createdDate">
                                <FormLabel>Fecha de Creación</FormLabel>
                              <FlatPicker className="form-control" options={{ dateFormat: "d M Y" }} required/>
                            </FormGroup>
                        </Col>


                        <Col md={6}>
                            <FormGroup controlId="expectedCloseDate">
                                <FormLabel>Válida Hasta</FormLabel>
                              <FlatPicker className="form-control" options={{ dateFormat: "d M Y" }} required/>
                            </FormGroup>
                        </Col>
                    </Row>
                </ModalBody>

                <ModalFooter>
                    <Button variant="light" onClick={onHide}>
                        Cancelar
                    </Button>
                    <Button type="submit" variant="primary">
                        Guardar Propuesta
                    </Button>
                </ModalFooter>
            </Form>
        </Modal>
    );
};

export default ProposalsModal;
