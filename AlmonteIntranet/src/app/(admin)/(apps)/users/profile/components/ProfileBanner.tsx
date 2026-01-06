'use client'

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
                        console.log('[ProfileBanner] 🔍 Portada raw recibida:', JSON.stringify(portada, null, 2))
                        console.log('[ProfileBanner] 🔍 Estructura completa personaData:', JSON.stringify(personaData, null, 2))
                        
                        if (portada) {
                            let portadaUrl: string | null = null

                            // Caso 1: URL directa
                            if (portada.url) {
                                portadaUrl = portada.url.startsWith('http') 
                                    ? portada.url 
                                    : `${process.env.NEXT_PUBLIC_STRAPI_URL}${portada.url}`
                                console.log('[ProfileBanner] ✅ Portada URL directa:', portadaUrl)
                            }
                            // Caso 2: Estructura de componente contacto.imagen (ESTRUCTURA REAL)
                            else if (portada.imagen) {
                                const imagenComponent = portada.imagen
                                console.log('[ProfileBanner] 🔍 Estructura imagenComponent:', JSON.stringify(imagenComponent, null, 2))
                                
                                // Si es array directo (ESTRUCTURA REAL DE STRAPI)
                                if (Array.isArray(imagenComponent) && imagenComponent.length > 0) {
                                    const primeraImagen = imagenComponent[0]
                                    console.log('[ProfileBanner] 🔍 Primera imagen del array:', JSON.stringify(primeraImagen, null, 2))
                                    const url = primeraImagen?.url || primeraImagen?.attributes?.url || null
                                    if (url) {
                                        portadaUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
                                        console.log('[ProfileBanner] ✅ Portada URL desde array:', portadaUrl)
                                    } else {
                                        console.warn('[ProfileBanner] ⚠️ No se encontró URL en primera imagen del array')
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
                                            console.log('[ProfileBanner] ✅ Portada URL desde data:', portadaUrl)
                                        }
                                    }
                                }
                                // Si es objeto directo con url
                                else if (imagenComponent.url) {
                                    portadaUrl = imagenComponent.url.startsWith('http') 
                                        ? imagenComponent.url 
                                        : `${process.env.NEXT_PUBLIC_STRAPI_URL}${imagenComponent.url}`
                                    console.log('[ProfileBanner] ✅ Portada URL desde objeto directo:', portadaUrl)
                                } else {
                                    console.warn('[ProfileBanner] ⚠️ Estructura de imagenComponent no reconocida:', JSON.stringify(imagenComponent, null, 2))
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
                                        console.log('[ProfileBanner] ✅ Portada URL desde data directo:', portadaUrl)
                                    }
                                }
                            } else {
                                console.warn('[ProfileBanner] ⚠️ Estructura de portada no reconocida:', JSON.stringify(portada, null, 2))
                            }

                            if (portadaUrl) {
                                console.log('[ProfileBanner] ✅ Estableciendo bannerImage:', portadaUrl)
                                setBannerImage(portadaUrl)
                            } else {
                                console.warn('[ProfileBanner] ⚠️ No se pudo extraer URL de portada')
                            }
                        } else {
                            console.log('[ProfileBanner] ℹ️ No hay portada en personaData')
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

