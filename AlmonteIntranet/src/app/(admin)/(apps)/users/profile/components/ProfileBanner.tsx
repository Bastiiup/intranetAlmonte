'use client'

<<<<<<< HEAD:AlmonteIntranet/src/app/(admin)/(apps)/users/profile/components/ProfileBanner.tsx
import React, { useState, useEffect } from 'react'
import profileBg from '@/assets/images/profile-bg.jpg'
import { Button, Spinner } from 'react-bootstrap'
import { TbCamera, TbX } from 'react-icons/tb'
import { useAuth } from '@/hooks/useAuth'
import { getAuthToken } from '@/lib/auth'

interface ProfileBannerProps {
    colaboradorId?: string
}

const ProfileBanner = ({ colaboradorId }: ProfileBannerProps) => {
    const { persona, colaborador, loading } = useAuth()
    const [bannerImage, setBannerImage] = useState<string | null>(null)
    const [bannerFile, setBannerFile] = useState<File | null>(null)
    const [bannerPreview, setBannerPreview] = useState<string | null>(null)
    const [uploadingBanner, setUploadingBanner] = useState(false)
    const [showUploadButton, setShowUploadButton] = useState(false)
    const [isOwnProfile, setIsOwnProfile] = useState(true)

    // Verificar si es el perfil propio
    useEffect(() => {
        if (colaboradorId) {
            const currentColaboradorId = (colaborador as any)?.documentId || colaborador?.id
            setIsOwnProfile(String(currentColaboradorId) === String(colaboradorId))
        } else {
            setIsOwnProfile(true)
        }
    }, [colaboradorId, colaborador])

    // Cargar portada del perfil
    useEffect(() => {
        const loadBanner = async () => {
            if (loading) return

            try {
                const token = getAuthToken()
                const headers: HeadersInit = {}
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`
                }

                // Si hay colaboradorId, cargar perfil de otro colaborador
                const endpoint = colaboradorId 
                    ? `/api/colaboradores/${colaboradorId}`
                    : '/api/colaboradores/me/profile'

                const response = await fetch(endpoint, {
                    headers,
                })
                
                if (response.ok) {
                    const result = await response.json()
                    if (result.success && result.data) {
                        // Normalizar estructura
                        const data = result.data.data || result.data
                        let personaData = colaboradorId 
                            ? (data.attributes?.persona || data.persona)
                            : result.data.persona

                        // Normalizar estructura de persona
                        if (personaData?.data) {
                            personaData = personaData.data
                        }
                        if (personaData?.attributes) {
                            personaData = { ...personaData, ...personaData.attributes }
                        }

                        // Obtener portada
                        const portada = personaData?.portada
                        if (portada) {
                            let portadaUrl: string | null = null

                            // Caso 1: URL directa
                            if (portada.url) {
                                portadaUrl = portada.url.startsWith('http') 
                                    ? portada.url 
                                    : `${process.env.NEXT_PUBLIC_STRAPI_URL}${portada.url}`
                            }
                            // Caso 2: Estructura de componente contacto.imagen (ESTRUCTURA REAL)
                            else if (portada.imagen) {
                                const imagenComponent = portada.imagen
                                
                                // Si es array directo (ESTRUCTURA REAL DE STRAPI)
                                if (Array.isArray(imagenComponent) && imagenComponent.length > 0) {
                                    const primeraImagen = imagenComponent[0]
                                    const url = primeraImagen?.url || primeraImagen?.attributes?.url || null
                                    if (url) {
                                        portadaUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
                                    }
                                }
                                // Si tiene data (estructura Strapi estándar alternativa)
                                else if (imagenComponent.data) {
                                    const dataArray = Array.isArray(imagenComponent.data) ? imagenComponent.data : [imagenComponent.data]
                                    if (dataArray.length > 0) {
                                        const primeraImagen = dataArray[0]
                                        const url = primeraImagen?.attributes?.url || primeraImagen?.url || null
                                        if (url) {
                                            portadaUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
                                        }
                                    }
                                }
                                // Si es objeto directo con url
                                else if (imagenComponent.url) {
                                    portadaUrl = imagenComponent.url.startsWith('http') 
                                        ? imagenComponent.url 
                                        : `${process.env.NEXT_PUBLIC_STRAPI_URL}${imagenComponent.url}`
                                }
                            }
                            // Caso 3: Data directamente
                            else if (portada.data) {
                                const dataArray = Array.isArray(portada.data) ? portada.data : [portada.data]
                                if (dataArray.length > 0) {
                                    const primeraImagen = dataArray[0]
                                    const url = primeraImagen?.attributes?.url || primeraImagen?.url || null
                                    if (url) {
                                        portadaUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
                                    }
                                }
                            }

                            if (portadaUrl) {
                                setBannerImage(portadaUrl)
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('[ProfileBanner] Error al cargar portada:', err)
            }
        }

        if (!loading) {
            loadBanner()
        }
    }, [loading, colaboradorId])

    // Manejar cambio de archivo
    const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setBannerFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setBannerPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    // Subir portada
    const uploadBanner = async () => {
        if (!bannerFile) return

        setUploadingBanner(true)
        try {
            const formData = new FormData()
            formData.append('file', bannerFile)

            const response = await fetch('/api/tienda/upload', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Error al subir la portada')
            }

            const result = await response.json()
            if (result.success && result.id) {
                // Actualizar perfil con la nueva portada
                const token = getAuthToken()
                const headers: HeadersInit = {
                    'Content-Type': 'application/json',
                }
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`
                }

                const updateResponse = await fetch('/api/colaboradores/me/profile', {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({
                        portada_id: result.id,
                    }),
                })

                if (!updateResponse.ok) {
                    const errorData = await updateResponse.json()
                    throw new Error(errorData.error || 'Error al actualizar la portada')
                }

                // Actualizar imagen mostrada
                if (bannerPreview) {
                    setBannerImage(bannerPreview)
                }
                setBannerFile(null)
                setBannerPreview(null)
                setShowUploadButton(false)

                // Recargar después de un momento para ver cambios
                setTimeout(() => {
                    window.location.reload()
                }, 1000)
            }
        } catch (err: any) {
            console.error('[ProfileBanner] Error al subir portada:', err)
            alert(err.message || 'Error al subir la portada')
        } finally {
            setUploadingBanner(false)
        }
    }

    // Cancelar cambio de portada
    const handleCancelBanner = () => {
        setBannerFile(null)
        setBannerPreview(null)
        setShowUploadButton(false)
    }

    const bannerUrl = bannerPreview || bannerImage || profileBg.src

    return (
        <div 
            className="position-relative card-side-img overflow-hidden" 
            style={{ minHeight: 300, backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            onMouseEnter={() => isOwnProfile && setShowUploadButton(true)}
            onMouseLeave={() => !bannerFile && setShowUploadButton(false)}
        >
            {/* Overlay (sin texto) */}
            <div className="p-4 card-img-overlay rounded-start-0 auth-overlay" />

            {/* Botón para cambiar portada (solo en perfil propio) */}
            {isOwnProfile && (
                <div 
                    className="position-absolute top-0 end-0 m-3"
                    style={{ zIndex: 10 }}
                >
                    {showUploadButton || bannerFile ? (
                        <div className="d-flex gap-2">
                            {bannerFile ? (
                                <>
                                    <Button
                                        variant="success"
                                        size="sm"
                                        onClick={uploadBanner}
                                        disabled={uploadingBanner}
                                    >
                                        {uploadingBanner ? (
                                            <>
                                                <Spinner animation="border" size="sm" className="me-2" />
                                                Subiendo...
                                            </>
                                        ) : (
                                            <>
                                                <TbCamera className="me-1" />
                                                Guardar
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={handleCancelBanner}
                                        disabled={uploadingBanner}
                                    >
                                        <TbX />
                                    </Button>
                                </>
                            ) : (
                                <label className="btn btn-primary btn-sm mb-0" style={{ cursor: 'pointer' }}>
                                    <TbCamera className="me-1" />
                                    Cambiar Portada
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleBannerChange}
                                        style={{ display: 'none' }}
                                    />
                                </label>
                            )}
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    )
}

export default ProfileBanner

=======
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
>>>>>>> origin/mati-integracion:frontend-ubold/src/app/(admin)/(apps)/users/profile/components/ProfileBanner.tsx
