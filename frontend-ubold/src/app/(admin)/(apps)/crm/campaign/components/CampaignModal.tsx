'use client'

import React, { useState, useEffect } from "react"
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
    FormSelect,
    ModalFooter,
    Alert,
} from "react-bootstrap"
import FlatPicker from 'react-flatpickr'

type CampaignModalProps = {
    show: boolean
    onHide: () => void
    onSuccess?: () => void
}

interface ColaboradorOption {
    id: number | string
    documentId?: string
    persona?: {
        nombre_completo?: string
    }
    email_login?: string
}

const ESTADOS = [
    { value: 'programada', label: 'Programada' },
    { value: 'en_progreso', label: 'En Progreso' },
    { value: 'exitosa', label: 'Exitosa' },
    { value: 'fallida', label: 'Fallida' },
    { value: 'en_curso', label: 'En Curso' },
]

const CampaignModal = ({ show, onHide, onSuccess }: CampaignModalProps) => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([])
    const [loadingData, setLoadingData] = useState(false)
    
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        presupuesto: '',
        objetivo: '',
        estado: 'programada',
        tags: '',
        fecha_inicio: '',
        fecha_fin: '',
        creado_por: '',
    })

    useEffect(() => {
        if (show) {
            loadColaboradores()
            // Resetear formulario
            setFormData({
                nombre: '',
                descripcion: '',
                presupuesto: '',
                objetivo: '',
                estado: 'programada',
                tags: '',
                fecha_inicio: '',
                fecha_fin: '',
                creado_por: '',
            })
            setError(null)
        }
    }, [show])

    const loadColaboradores = async () => {
        setLoadingData(true)
        try {
            const response = await fetch('/api/colaboradores?activo=true&pageSize=100')
            const result = await response.json()
            
            if (result.success && result.data) {
                setColaboradores(result.data)
            }
        } catch (err: any) {
            console.error('Error loading colaboradores:', err)
        } finally {
            setLoadingData(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (!formData.nombre.trim()) {
                throw new Error('El nombre de la campaña es obligatorio')
            }

            if (!formData.fecha_inicio) {
                throw new Error('La fecha de inicio es obligatoria')
            }

            // Procesar tags (separar por comas)
            const tagsArray = formData.tags
                ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
                : []

            const campaignData: any = {
                nombre: formData.nombre.trim(),
                descripcion: formData.descripcion.trim() || undefined,
                presupuesto: formData.presupuesto ? Number(formData.presupuesto) : 0,
                objetivo: formData.objetivo ? Number(formData.objetivo) : 0,
                estado: formData.estado,
                tags: tagsArray,
                fecha_inicio: formData.fecha_inicio,
                fecha_fin: formData.fecha_fin || undefined,
                creado_por: formData.creado_por || undefined,
            }

            const response = await fetch('/api/crm/campaigns', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(campaignData),
            })

            const result = await response.json()

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Error al crear campaña')
            }

            // Éxito
            onHide()
            if (onSuccess) {
                onSuccess()
            }
        } catch (err: any) {
            setError(err.message || 'Error al crear campaña')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal show={show} onHide={onHide} size="lg">
            <ModalHeader closeButton>
                <ModalTitle as="h5">Crear Nueva Campaña</ModalTitle>
            </ModalHeader>

            <Form id="createCampaignForm" onSubmit={handleSubmit}>
                <ModalBody>
                    {error && (
                        <Alert variant="danger" className="mb-3">
                            {error}
                        </Alert>
                    )}

                    <Row className="g-3">
                        <Col md={12}>
                            <FormGroup controlId="campaignName">
                                <FormLabel>Nombre de la Campaña <span className="text-danger">*</span></FormLabel>
                                <FormControl
                                    type="text"
                                    placeholder="Ej: Q4 Lead Nurture Campaign"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    required
                                    disabled={loading}
                                />
                            </FormGroup>
                        </Col>

                        <Col md={12}>
                            <FormGroup controlId="campaignDescription">
                                <FormLabel>Descripción</FormLabel>
                                <FormControl
                                    as="textarea"
                                    rows={3}
                                    placeholder="Descripción de la campaña..."
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                    disabled={loading}
                                />
                            </FormGroup>
                        </Col>

                        <Col md={6}>
                            <FormGroup controlId="campaignBudget">
                                <FormLabel>Presupuesto (USD) <span className="text-danger">*</span></FormLabel>
                                <FormControl
                                    type="number"
                                    placeholder="Ej: 12500"
                                    value={formData.presupuesto}
                                    onChange={(e) => setFormData({ ...formData, presupuesto: e.target.value })}
                                    min="0"
                                    step="0.01"
                                    required
                                    disabled={loading}
                                />
                            </FormGroup>
                        </Col>

                        <Col md={6}>
                            <FormGroup controlId="campaignGoal">
                                <FormLabel>Objetivo (USD) <span className="text-danger">*</span></FormLabel>
                                <FormControl
                                    type="number"
                                    placeholder="Ej: 80000"
                                    value={formData.objetivo}
                                    onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                                    min="0"
                                    step="0.01"
                                    required
                                    disabled={loading}
                                />
                            </FormGroup>
                        </Col>

                        <Col md={6}>
                            <FormGroup controlId="campaignStatus">
                                <FormLabel>Estado <span className="text-danger">*</span></FormLabel>
                                <FormSelect
                                    value={formData.estado}
                                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                                    required
                                    disabled={loading}
                                >
                                    {ESTADOS.map((estado) => (
                                        <option key={estado.value} value={estado.value}>
                                            {estado.label}
                                        </option>
                                    ))}
                                </FormSelect>
                            </FormGroup>
                        </Col>

                        <Col md={6}>
                            <FormGroup controlId="campaignCreator">
                                <FormLabel>Creado por <span className="text-danger">*</span></FormLabel>
                                <FormSelect
                                    value={formData.creado_por}
                                    onChange={(e) => setFormData({ ...formData, creado_por: e.target.value })}
                                    required
                                    disabled={loading || loadingData}
                                >
                                    <option value="">Seleccionar colaborador</option>
                                    {colaboradores.map((colaborador) => {
                                        const id = colaborador.documentId || colaborador.id
                                        const nombre = colaborador.persona?.nombre_completo || colaborador.email_login || `ID: ${id}`
                                        return (
                                            <option key={id} value={String(id)}>
                                                {nombre}
                                            </option>
                                        )
                                    })}
                                </FormSelect>
                            </FormGroup>
                        </Col>

                        <Col md={6}>
                            <FormGroup controlId="campaignStartDate">
                                <FormLabel>Fecha de Inicio <span className="text-danger">*</span></FormLabel>
                                <FormControl
                                    type="date"
                                    value={formData.fecha_inicio}
                                    onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                                    required
                                    disabled={loading}
                                />
                            </FormGroup>
                        </Col>

                        <Col md={6}>
                            <FormGroup controlId="campaignEndDate">
                                <FormLabel>Fecha de Fin</FormLabel>
                                <FormControl
                                    type="date"
                                    value={formData.fecha_fin}
                                    onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                                    disabled={loading}
                                />
                            </FormGroup>
                        </Col>

                        <Col md={12}>
                            <FormGroup controlId="campaignTags">
                                <FormLabel>Tags (separados por comas)</FormLabel>
                                <FormControl
                                    type="text"
                                    placeholder="Ej: Email, Retargeting, Automation"
                                    value={formData.tags}
                                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                    disabled={loading}
                                />
                                <small className="text-muted">Ejemplo: Email, Retargeting, Automation</small>
                            </FormGroup>
                        </Col>
                    </Row>
                </ModalBody>

                <ModalFooter>
                    <Button variant="light" onClick={onHide} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button type="submit" variant="primary" disabled={loading}>
                        {loading ? 'Guardando...' : 'Guardar Campaña'}
                    </Button>
                </ModalFooter>
            </Form>
        </Modal>
    )
}

export default CampaignModal
