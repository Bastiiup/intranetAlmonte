'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { TbCamera } from 'react-icons/tb'
import profileBg from '@/assets/images/profile-bg.jpg'

interface ProfileBannerProps {
  colaboradorId?: string
}

const ProfileBanner: React.FC<ProfileBannerProps> = ({ colaboradorId }) => {
  const { colaborador: currentColaborador } = useAuth()
  const [portada, setPortada] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isOwnProfile = !colaboradorId

  useEffect(() => {
    loadPortada()
  }, [colaboradorId])

  const loadPortada = async () => {
    try {
      setLoading(true)
      const endpoint = colaboradorId
        ? `/api/colaboradores/${colaboradorId}`
        : '/api/colaboradores/me/profile'

      const response = await fetch(endpoint, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Error al cargar portada')
      }

      const data = await response.json()
      const colaboradorData = colaboradorId ? data.data : data
      const persona = colaboradorData?.persona || colaboradorData?.attributes?.persona

      // Normalizar estructura de portada (múltiples formatos posibles)
      let portadaUrl: string | null = null
      const portadaRaw = persona?.portada

      if (portadaRaw?.imagen) {
        const portadaData = portadaRaw.imagen
        if (Array.isArray(portadaData) && portadaData.length > 0) {
          const primeraPortada = portadaData[0]
          portadaUrl = primeraPortada.url || primeraPortada.attributes?.url || null
        } else if (portadaData?.url) {
          portadaUrl = portadaData.url
        } else if (portadaData?.data) {
          const dataArray = Array.isArray(portadaData.data) ? portadaData.data : [portadaData.data]
          if (dataArray.length > 0 && dataArray[0]?.attributes?.url) {
            portadaUrl = dataArray[0].attributes.url
          }
        }
      } else if (portadaRaw?.url) {
        portadaUrl = portadaRaw.url
      } else if (Array.isArray(portadaRaw) && portadaRaw.length > 0) {
        portadaUrl = portadaRaw[0]?.url || portadaRaw[0]?.attributes?.url || null
      }

      if (portadaUrl && !portadaUrl.startsWith('http')) {
        portadaUrl = `${process.env.NEXT_PUBLIC_STRAPI_URL}${portadaUrl}`
      }

      setPortada(portadaUrl)
    } catch (error) {
      console.error('Error al cargar portada:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen')
      return
    }

    // Crear preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.[0] && !preview) {
      return
    }

    if (!fileInputRef.current?.files?.[0]) {
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', fileInputRef.current.files[0])

      // Subir imagen
      const uploadResponse = await fetch('/api/tienda/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error || 'Error al subir imagen')
      }

      const uploadData = await uploadResponse.json()
      const imageId = uploadData.id || uploadData.data?.id

      if (!imageId) {
        throw new Error('No se recibió el ID de la imagen')
      }

      // Actualizar perfil con portada_id
      const updateResponse = await fetch('/api/colaboradores/me/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          portada_id: imageId,
        }),
      })

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json()
        throw new Error(errorData.error || 'Error al actualizar portada')
      }

      // Actualizar estado local con preview o URL nueva
      if (preview) {
        setPortada(preview)
      }

      // Recargar para obtener URL final
      await loadPortada()
      setPreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: any) {
      console.error('Error al subir portada:', error)
      alert(error.message || 'Error al subir portada')
    } finally {
      setUploading(false)
    }
  }

  const backgroundImage = preview || portada || profileBg.src

  return (
    <div
      className="position-relative card-side-img overflow-hidden"
      style={{
        minHeight: 300,
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {isOwnProfile && (
        <div className="position-absolute bottom-0 end-0 p-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="d-none"
          />
          {preview && (
            <div className="d-flex gap-2 mb-2">
              <button
                className="btn btn-sm btn-success"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? 'Subiendo...' : 'Guardar'}
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  setPreview(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }}
                disabled={uploading}
              >
                Cancelar
              </button>
            </div>
          )}
          <button
            className="btn btn-sm btn-light"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <TbCamera className="me-1" />
            {preview ? 'Cambiar' : 'Cambiar portada'}
          </button>
        </div>
      )}
    </div>
  )
}

export default ProfileBanner
