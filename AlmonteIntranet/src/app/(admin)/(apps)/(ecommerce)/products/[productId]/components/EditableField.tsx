'use client'

import { useState, useEffect } from 'react'
import { Button, Form } from 'react-bootstrap'
import { TbPencil, TbCheck, TbX } from 'react-icons/tb'

interface EditableFieldProps {
  value: string
  onSave: (newValue: string) => Promise<void> | void
  label?: string
  placeholder?: string
  type?: 'text' | 'textarea' | 'number'
  className?: string
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span'
}

export default function EditableField({
  value,
  onSave,
  label,
  placeholder = 'Ingresa un valor...',
  type = 'text',
  className = '',
  as = 'span',
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value || '')
  const [isSaving, setIsSaving] = useState(false)

  // Actualizar editValue cuando value cambia externamente
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value || '')
    }
  }, [value, isEditing])

  const handleSave = async () => {
    console.log('[EditableField] Iniciando guardado:', {
      label,
      valorAnterior: value,
      valorNuevo: editValue,
      tipo: type,
    })
    
    setIsSaving(true)
    try {
      console.log('[EditableField] Llamando onSave...')
      await onSave(editValue)
      console.log('[EditableField] ✅ Guardado exitoso')
      setIsEditing(false)
    } catch (error: any) {
      console.error('[EditableField] ❌ Error al guardar:', {
        error,
        message: error?.message,
        stack: error?.stack,
        label,
        valorAnterior: value,
        valorNuevo: editValue,
      })
      // Re-lanzar el error para que el componente padre lo maneje
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const Tag = as

  if (isEditing) {
    return (
      <div className={`d-flex align-items-start gap-2 ${className}`}>
        {type === 'textarea' ? (
          <Form.Control
            as="textarea"
            rows={4}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={placeholder}
            className="flex-grow-1"
          />
        ) : (
          <Form.Control
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={placeholder}
            className="flex-grow-1"
          />
        )}
        <Button
          variant="success"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="btn-icon"
        >
          <TbCheck className="fs-lg" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCancel}
          disabled={isSaving}
          className="btn-icon"
        >
          <TbX className="fs-lg" />
        </Button>
      </div>
    )
  }

  return (
    <div className={`d-flex align-items-center gap-2 ${className}`}>
      <Tag className="mb-0 flex-grow-1">
        {value || <span className="text-muted">{placeholder}</span>}
      </Tag>
      <Button
        variant="light"
        size="sm"
        onClick={() => setIsEditing(true)}
        className="btn-icon"
        title={`Editar ${label || 'campo'}`}
      >
        <TbPencil className="fs-sm" />
      </Button>
    </div>
  )
}

