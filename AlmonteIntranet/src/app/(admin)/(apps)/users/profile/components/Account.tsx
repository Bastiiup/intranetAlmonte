'use client'

import React, { useState, useEffect } from 'react'
import { Button, CardBody, CardHeader, CardTitle, Col, FormControl, FormLabel, Nav, NavItem, NavLink, Row, TabContainer, TabContent, Table, TabPane, Alert, Spinner } from 'react-bootstrap'
import { TbArrowBackUp, TbBrandFacebook, TbBrandGithub, TbBrandInstagram, TbBrandLinkedin, TbBrandSkype, TbBrandX, TbBriefcase, TbCamera, TbChecklist, TbDeviceFloppy, TbHome, TbMapPin, TbMoodSmile, TbPencil, TbSettings, TbShare3, TbUser, TbUserCircle, TbWorld } from 'react-icons/tb'
import Link from 'next/link'
import { useAuth, getPersonaNombre } from '@/hooks/useAuth'
import { getAuthToken } from '@/lib/auth'

interface AccountProps {
    colaboradorId?: string
}

const Account = ({ colaboradorId }: AccountProps) => {
    const { persona, colaborador, loading: authLoading } = useAuth()
    const [profileLoading, setProfileLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [profilePhoto, setProfilePhoto] = useState<File | null>(null)
    const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null)
    const [uploadingPhoto, setUploadingPhoto] = useState(false)
    
    // Estado para Timeline
    const [timelinePosts, setTimelinePosts] = useState<any[]>([])
    const [loadingTimeline, setLoadingTimeline] = useState(true)
    const [newPostText, setNewPostText] = useState('')
    const [posting, setPosting] = useState(false)
    
    // Estado para datos del perfil que se está viendo (para "Sobre Mí" y línea de tiempo)
    const [viewingProfileData, setViewingProfileData] = useState<any>(null)

    // Estado del formulario
    const [formData, setFormData] = useState({
        nombres: '',
        primer_apellido: '',
        segundo_apellido: '',
        job_title: '',
        telefono: '',
        bio: '',
        email_login: '',
        password: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        zipcode: '',
        country: '',
        company_name: '',
        company_website: '',
        social_facebook: '',
        social_twitter: '',
        social_instagram: '',
        social_linkedin: '',
        social_github: '',
        social_skype: '',
    })

    // Cargar datos del perfil
    useEffect(() => {
        const loadProfile = async () => {
            if (authLoading) return

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
                        // Normalizar estructura: puede venir como data.data o data directamente
                        const data = result.data.data || result.data
                        const personaData = colaboradorId 
                            ? (data.attributes?.persona || data.persona)
                            : result.data.persona
                        const colaboradorData = colaboradorId
                            ? (data.attributes || data)
                            : result.data.colaborador
                        
                        // Guardar datos del perfil que se está viendo
                        setViewingProfileData({
                            persona: personaData,
                            colaborador: colaboradorData
                        })
                        
                        console.log('[Account] Datos completos recibidos:', JSON.stringify(result.data, null, 2))
                        console.log('[Account] Estructura de personaData:', JSON.stringify(personaData, null, 2))

                        // Llenar formulario con datos existentes
                        setFormData({
                            nombres: personaData?.nombres || '',
                            primer_apellido: personaData?.primer_apellido || '',
                            segundo_apellido: personaData?.segundo_apellido || '',
                            job_title: personaData?.job_title || '',
                            telefono: personaData?.telefono_principal || 
                                      (personaData?.telefonos && Array.isArray(personaData.telefonos) && personaData.telefonos.length > 0 
                                        ? personaData.telefonos[0].numero || '' 
                                        : ''),
                            bio: personaData?.bio || '',
                            email_login: colaboradorData?.email_login || '',
                            password: '',
                            address_line1: personaData?.direccion?.line1 || '',
                            address_line2: personaData?.direccion?.line2 || '',
                            city: personaData?.direccion?.city || '',
                            state: personaData?.direccion?.state || '',
                            zipcode: personaData?.direccion?.zipcode || '',
                            country: personaData?.direccion?.country || '',
                            company_name: personaData?.direccion?.company_name || '',
                            company_website: personaData?.direccion?.company_website || '',
                            social_facebook: personaData?.redes_sociales?.facebook || '',
                            social_twitter: personaData?.redes_sociales?.twitter || '',
                            social_instagram: personaData?.redes_sociales?.instagram || '',
                            social_linkedin: personaData?.redes_sociales?.linkedin || '',
                            social_github: personaData?.redes_sociales?.github || '',
                            social_skype: personaData?.redes_sociales?.skype || '',
                        })

                        // Si hay imagen, crear preview - normalizar diferentes estructuras
                        let imageUrl: string | null = null
                        
                        console.log('[Account] Estructura de imagen recibida:', JSON.stringify(personaData?.imagen, null, 2))
                        console.log('[Account] Tipo de imagen:', typeof personaData?.imagen)
                        console.log('[Account] ¿Es null/undefined?', personaData?.imagen === null || personaData?.imagen === undefined)
                        
                        if (personaData?.imagen) {
                            console.log('[Account] ✅ Imagen existe, procesando...')
                            // Estructura normalizada del API (url directa)
                            if (personaData.imagen.url) {
                                imageUrl = personaData.imagen.url.startsWith('http') 
                                    ? personaData.imagen.url 
                                    : `${process.env.NEXT_PUBLIC_STRAPI_URL}${personaData.imagen.url}`
                                console.log('[Account] ✅ Imagen encontrada en estructura normalizada:', imageUrl)
                            }
                            // Si imagen viene en estructura de componente contacto.imagen
                            else if (personaData.imagen.imagen) {
                                const imagenComponent = personaData.imagen.imagen
                                console.log('[Account] Estructura de componente imagen:', JSON.stringify(imagenComponent, null, 2))
                                
                                // Si es array directo
                                // Si es array (ESTRUCTURA REAL: imagen.imagen es array de objetos con url directa)
                                if (Array.isArray(imagenComponent) && imagenComponent.length > 0) {
                                    const primeraImagen = imagenComponent[0]
                                    // La URL viene directamente en el objeto, no en attributes
                                    const url = primeraImagen?.url || primeraImagen?.attributes?.url || null
                                    if (url) {
                                        // La URL ya viene completa desde S3 (https://media.moraleja.cl/...)
                                        imageUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
                                        console.log('[Account] ✅ Imagen encontrada en array:', imageUrl)
                                    }
                                }
                                // Si tiene data (estructura Strapi estándar)
                                else if (imagenComponent.data) {
                                    const dataArray = Array.isArray(imagenComponent.data) ? imagenComponent.data : [imagenComponent.data]
                                    if (dataArray.length > 0) {
                                        const primeraImagen = dataArray[0]
                                        const url = primeraImagen?.attributes?.url || primeraImagen?.url || null
                                        if (url) {
                                            imageUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
                                            console.log('[Account] ✅ Imagen encontrada en data:', imageUrl)
                                        }
                                    }
                                }
                                // Si es objeto directo con url
                                else if (imagenComponent.url) {
                                    imageUrl = imagenComponent.url.startsWith('http') 
                                        ? imagenComponent.url 
                                        : `${process.env.NEXT_PUBLIC_STRAPI_URL}${imagenComponent.url}`
                                    console.log('[Account] ✅ Imagen encontrada en objeto directo:', imageUrl)
                                }
                            }
                            // Si imagen tiene data directamente (sin componente)
                            else if (personaData.imagen.data) {
                                const dataArray = Array.isArray(personaData.imagen.data) ? personaData.imagen.data : [personaData.imagen.data]
                                if (dataArray.length > 0) {
                                    const primeraImagen = dataArray[0]
                                    const url = primeraImagen?.attributes?.url || primeraImagen?.url || null
                                    if (url) {
                                        imageUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`
                                        console.log('[Account] ✅ Imagen encontrada en data directa:', imageUrl)
                                    }
                                }
                            }
                        }
                        
                        if (imageUrl) {
                            console.log('[Account] ✅ Estableciendo preview de imagen:', imageUrl)
                            setProfilePhotoPreview(imageUrl)
                        } else {
                            console.warn('[Account] ⚠️ No se pudo encontrar URL de imagen en ninguna estructura')
                        }
                    }
                }
            } catch (err: any) {
                console.error('[Account] Error al cargar perfil:', err)
            } finally {
                setProfileLoading(false)
            }
        }

        loadProfile()
    }, [authLoading, colaboradorId])
    
    // Cargar timeline (logs de actividades del usuario)
    useEffect(() => {
        const loadTimeline = async () => {
            // Si estamos viendo otro perfil, usar el colaboradorId proporcionado
            const targetColaboradorId = colaboradorId || colaborador?.id || colaborador?.documentId
            
            if (authLoading || !targetColaboradorId) {
                console.log('[Línea de Tiempo] ⏳ Esperando autenticación o colaborador:', { authLoading, colaboradorId: targetColaboradorId })
                return
            }
            
            setLoadingTimeline(true)
            try {
                
                if (!targetColaboradorId) {
                    console.error('[Línea de Tiempo] ❌ No se pudo obtener ID del colaborador')
                    setTimelinePosts([])
                    setLoadingTimeline(false)
                    return
                }
                
                console.log('[Línea de Tiempo] 🔍 Cargando logs para colaborador:', targetColaboradorId, {
                    esOtroPerfil: !!colaboradorId,
                    tieneId: !!colaborador?.id,
                    tieneDocumentId: !!(colaborador as any)?.documentId,
                })
                
                // Usar el endpoint específico del usuario (igual que la página de logs)
                // Este endpoint ya filtra por usuario, así que no necesitamos filtrar manualmente
                const response = await fetch(`/api/logs/usuario/${targetColaboradorId}?page=1&pageSize=50&sort=fecha:desc`, {
                    cache: 'no-store',
                })
                
                if (response.ok) {
                    const result = await response.json()
                    console.log('[Línea de Tiempo] 📥 Respuesta recibida:', {
                        success: result.success,
                        totalLogs: result.data?.length || 0,
                        usuarioInfo: result.usuarioInfo,
                    })
                    
                    if (result.success && result.data) {
                        // El endpoint ya filtra por usuario, así que usar directamente los datos
                        const logsArray = Array.isArray(result.data) ? result.data : [result.data]
                        
                        // Guardar información del usuario del perfil que se está viendo
                        if (result.usuarioInfo && colaboradorId) {
                            setViewingProfileData((prev: any) => ({
                                ...prev,
                                persona: result.usuarioInfo.persona || prev?.persona,
                                colaborador: result.usuarioInfo || prev?.colaborador
                            }))
                        }
                        
                        console.log('[Línea de Tiempo] ✅ Logs obtenidos:', logsArray.length)
                        setTimelinePosts(logsArray)
                    } else {
                        console.warn('[Línea de Tiempo] ⚠️ Respuesta sin éxito o sin datos:', result)
                        setTimelinePosts([])
                    }
                } else {
                    const errorText = await response.text()
                    console.error('[Línea de Tiempo] ❌ Error en respuesta:', response.status, errorText)
                    
                    // Si el endpoint falla, intentar obtener todos los logs y filtrar manualmente
                    console.log('[Línea de Tiempo] ⚠️ Intentando fallback: obtener todos los logs')
                    try {
                        const fallbackResponse = await fetch(`/api/logs?page=1&pageSize=200&sort=fecha:desc`, {
                            cache: 'no-store',
                        })
                        
                        if (fallbackResponse.ok) {
                            const fallbackResult = await fallbackResponse.json()
                            if (fallbackResult.success && fallbackResult.data) {
                                // Filtrar manualmente por usuario
                                const colaboradorIds = [
                                    targetColaboradorId,
                                    String(targetColaboradorId),
                                ].filter(Boolean)
                                
                                const userLogs = fallbackResult.data.filter((log: any) => {
                                    const logAttrs = log.attributes || log
                                    const posiblesUsuarios = [
                                        logAttrs.usuario?.data,
                                        logAttrs.usuario,
                                        log.usuario?.data,
                                        log.usuario,
                                    ].filter(Boolean)
                                    
                                    const logUsuarioIds: (string | number)[] = []
                                    posiblesUsuarios.forEach((usuario: any) => {
                                        if (typeof usuario === 'object') {
                                            if (usuario.id) logUsuarioIds.push(usuario.id, String(usuario.id))
                                            if (usuario.documentId) logUsuarioIds.push(usuario.documentId, String(usuario.documentId))
                                        } else if (typeof usuario === 'number' || typeof usuario === 'string') {
                                            logUsuarioIds.push(usuario, String(usuario))
                                        }
                                    })
                                    
                                    return colaboradorIds.some(cId => 
                                        logUsuarioIds.some(lId => String(cId) === String(lId))
                                    )
                                })
                                
                                console.log('[Línea de Tiempo] ✅ Logs filtrados (fallback):', userLogs.length)
                                setTimelinePosts(userLogs)
                            } else {
                                setTimelinePosts([])
                            }
                        } else {
                            setTimelinePosts([])
                        }
                    } catch (fallbackErr) {
                        console.error('[Línea de Tiempo] ❌ Error en fallback:', fallbackErr)
                        setTimelinePosts([])
                    }
                }
            } catch (err: any) {
                console.error('[Línea de Tiempo] ❌ Error al cargar timeline:', err)
                setTimelinePosts([])
            } finally {
                setLoadingTimeline(false)
            }
        }
        
        loadTimeline()
    }, [authLoading, colaborador?.id, (colaborador as any)?.documentId, colaboradorId])

    // Manejar cambio de foto
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            setProfilePhoto(file)
            
            // Crear preview
            const reader = new FileReader()
            reader.onloadend = () => {
                setProfilePhotoPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    // Subir foto de perfil
    const uploadProfilePhoto = async (): Promise<number | null> => {
        if (!profilePhoto) return null

        setUploadingPhoto(true)
        try {
            const formData = new FormData()
            formData.append('file', profilePhoto)

            const response = await fetch('/api/tienda/upload', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Error al subir la foto')
            }

            const result = await response.json()
            if (result.success && result.id) {
                return result.id
            }
            return null
        } catch (err: any) {
            console.error('[Account] Error al subir foto:', err)
            throw err
        } finally {
            setUploadingPhoto(false)
        }
    }

    // Manejar envío del formulario
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setSuccess(false)
        setError(null)

        try {
            // Subir foto si hay una nueva
            let imagenId: number | null = null
            if (profilePhoto) {
                imagenId = await uploadProfilePhoto()
                if (!imagenId) {
                    throw new Error('Error al subir la foto de perfil')
                }
            }

            // Preparar datos para enviar
            const updateData: any = {
                nombres: formData.nombres,
                primer_apellido: formData.primer_apellido,
                segundo_apellido: formData.segundo_apellido,
                job_title: formData.job_title,
                telefono: formData.telefono,
                bio: formData.bio,
                email_login: formData.email_login,
                ...(formData.password && { password: formData.password }),
                ...(imagenId && { imagen_id: imagenId }),
                direccion: {
                    line1: formData.address_line1,
                    line2: formData.address_line2,
                    city: formData.city,
                    state: formData.state,
                    zipcode: formData.zipcode,
                    country: formData.country,
                },
                redes_sociales: {
                    facebook: formData.social_facebook,
                    twitter: formData.social_twitter,
                    instagram: formData.social_instagram,
                    linkedin: formData.social_linkedin,
                    github: formData.social_github,
                    skype: formData.social_skype,
                },
            }

            // Enviar actualización
            const token = getAuthToken()
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            }
            if (token) {
                headers['Authorization'] = `Bearer ${token}`
            }

            const response = await fetch('/api/colaboradores/me/profile', {
                method: 'PUT',
                headers,
                body: JSON.stringify(updateData),
            })

            const result = await response.json()

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Error al actualizar el perfil')
            }

            setSuccess(true)
            setProfilePhoto(null) // Limpiar foto después de guardar

            // Recargar página después de 2 segundos para ver cambios
            setTimeout(() => {
                window.location.reload()
            }, 2000)
        } catch (err: any) {
            console.error('[Account] Error al guardar perfil:', err)
            setError(err.message || 'Error al guardar los cambios')
        } finally {
            setSaving(false)
        }
    }

    // Obtener nombre completo y bio del perfil que se está viendo
    const viewingPersona = colaboradorId ? (viewingProfileData?.persona) : persona
    const nombreCompleto = viewingPersona 
        ? getPersonaNombre(viewingPersona)
        : (colaboradorId ? (viewingProfileData?.colaborador?.email_login) : (colaborador?.email_login || 'Usuario'))

    const bio = viewingPersona?.bio || formData.bio || ''

    if (profileLoading || authLoading) {
        return (
            <div className="card">
                <CardBody className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3 text-muted">Cargando perfil...</p>
                </CardBody>
            </div>
        )
    }

    return (
        <div className="card">
            <TabContainer defaultActiveKey='timeline'>
                <CardHeader className="card-tabs d-flex align-items-center">
                    <div className="flex-grow-1">
                        <CardTitle as={'h4'}>Mi Cuenta</CardTitle>
                    </div>
                    <Nav className="nav-tabs card-header-tabs nav-bordered">
                        <NavItem>
                            <NavLink eventKey="about-me" data-bs-toggle="tab" aria-expanded="false">
                                <TbHome className="d-md-none d-block" />
                                <span className="d-none d-md-block fw-bold">Sobre Mí</span>
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink eventKey="timeline" data-bs-toggle="tab" aria-expanded="true">
                                <TbUserCircle className="d-md-none d-block" />
                                <span className="d-none d-md-block fw-bold">Línea de Tiempo</span>
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink eventKey="settings" data-bs-toggle="tab" aria-expanded="false">
                                <TbSettings className="d-md-none d-block" />
                                <span className="d-none d-md-block fw-bold">Configuración</span>
                            </NavLink>
                        </NavItem>
                    </Nav>
                </CardHeader>
                <CardBody>
                    {success && (
                        <Alert variant="success" dismissible onClose={() => setSuccess(false)}>
                            Perfil actualizado exitosamente
                        </Alert>
                    )}
                    {error && (
                        <Alert variant="danger" dismissible onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}
                    <TabContent>
                        <TabPane eventKey="about-me">
                            <Row>
                                <Col md={12}>
                                    <h5 className="mb-3"><TbUser className="me-2" /> Información Personal</h5>
                                    {bio ? (
                                        <div className="mb-4">
                                            <p className="text-muted mb-2">Biografía:</p>
                                            <p>{bio}</p>
                                        </div>
                                    ) : (
                                        <Alert variant="info" className="mb-4">
                                            <p className="mb-0">No hay biografía disponible. Edita tu perfil en la pestaña "Configuración" para agregar información sobre ti.</p>
                                        </Alert>
                                    )}
                                    
                                    <Row className="mb-4">
                                        <Col md={6}>
                                            <div className="mb-3">
                                                <p className="text-muted mb-1"><TbBriefcase className="me-2" /> Cargo / Título</p>
                                                <p className="mb-0">{colaboradorId ? (viewingPersona?.job_title || <span className="text-muted">No especificado</span>) : (formData.job_title || <span className="text-muted">No especificado</span>)}</p>
                                            </div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="mb-3">
                                                <p className="text-muted mb-1"><TbWorld className="me-2" /> Teléfono</p>
                                                <p className="mb-0">{colaboradorId ? (viewingPersona?.telefono_principal || (viewingPersona?.telefonos && Array.isArray(viewingPersona.telefonos) && viewingPersona.telefonos.length > 0 ? viewingPersona.telefonos[0].numero : '') || <span className="text-muted">No especificado</span>) : (formData.telefono || <span className="text-muted">No especificado</span>)}</p>
                                            </div>
                                        </Col>
                                    </Row>
                                    
                                    {((colaboradorId ? (viewingPersona?.direccion?.line1 || viewingPersona?.direccion?.city || viewingPersona?.direccion?.country) : (formData.address_line1 || formData.city || formData.country))) && (
                                        <div className="mb-4">
                                            <h6 className="mb-2"><TbMapPin className="me-2" /> Dirección</h6>
                                            <p className="mb-0">
                                                {colaboradorId ? (
                                                    [
                                                        viewingPersona?.direccion?.line1,
                                                        viewingPersona?.direccion?.line2,
                                                        viewingPersona?.direccion?.city,
                                                        viewingPersona?.direccion?.state,
                                                        viewingPersona?.direccion?.zipcode,
                                                        viewingPersona?.direccion?.country
                                                    ].filter(Boolean).join(', ') || <span className="text-muted">No especificada</span>
                                                ) : (
                                                    [
                                                        formData.address_line1,
                                                        formData.address_line2,
                                                        formData.city,
                                                        formData.state,
                                                        formData.zipcode,
                                                        formData.country
                                                    ].filter(Boolean).join(', ') || <span className="text-muted">No especificada</span>
                                                )}
                                            </p>
                                        </div>
                                    )}
                                    
                                    {((colaboradorId ? (viewingPersona?.redes_sociales?.facebook || viewingPersona?.redes_sociales?.twitter || viewingPersona?.redes_sociales?.instagram || viewingPersona?.redes_sociales?.linkedin || viewingPersona?.redes_sociales?.github || viewingPersona?.redes_sociales?.skype) : (formData.social_facebook || formData.social_twitter || formData.social_instagram || formData.social_linkedin || formData.social_github || formData.social_skype))) && (
                                        <div className="mb-4">
                                            <h6 className="mb-2"><TbWorld className="me-2" /> Redes Sociales</h6>
                                            <div className="d-flex flex-wrap gap-2">
                                                {(colaboradorId ? viewingPersona?.redes_sociales?.facebook : formData.social_facebook) && (
                                                    <Link href={colaboradorId ? viewingPersona.redes_sociales.facebook : formData.social_facebook} target="_blank" className="btn btn-sm btn-outline-primary">
                                                        <TbBrandFacebook className="me-1" /> Facebook
                                                    </Link>
                                                )}
                                                {(colaboradorId ? viewingPersona?.redes_sociales?.twitter : formData.social_twitter) && (
                                                    <Link href={colaboradorId ? viewingPersona.redes_sociales.twitter : formData.social_twitter} target="_blank" className="btn btn-sm btn-outline-dark">
                                                        <TbBrandX className="me-1" /> Twitter
                                                    </Link>
                                                )}
                                                {(colaboradorId ? viewingPersona?.redes_sociales?.instagram : formData.social_instagram) && (
                                                    <Link href={colaboradorId ? viewingPersona.redes_sociales.instagram : formData.social_instagram} target="_blank" className="btn btn-sm btn-outline-danger">
                                                        <TbBrandInstagram className="me-1" /> Instagram
                                                    </Link>
                                                )}
                                                {(colaboradorId ? viewingPersona?.redes_sociales?.linkedin : formData.social_linkedin) && (
                                                    <Link href={colaboradorId ? viewingPersona.redes_sociales.linkedin : formData.social_linkedin} target="_blank" className="btn btn-sm btn-outline-primary">
                                                        <TbBrandLinkedin className="me-1" /> LinkedIn
                                                    </Link>
                                                )}
                                                {(colaboradorId ? viewingPersona?.redes_sociales?.github : formData.social_github) && (
                                                    <Link href={colaboradorId ? viewingPersona.redes_sociales.github : formData.social_github} target="_blank" className="btn btn-sm btn-outline-dark">
                                                        <TbBrandGithub className="me-1" /> GitHub
                                                    </Link>
                                                )}
                                                {(colaboradorId ? viewingPersona?.redes_sociales?.skype : formData.social_skype) && (
                                                    <Link href={colaboradorId ? viewingPersona.redes_sociales.skype : formData.social_skype} target="_blank" className="btn btn-sm btn-outline-info">
                                                        <TbBrandSkype className="me-1" /> Skype
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </Col>
                            </Row>
                        </TabPane>
                        <TabPane eventKey="timeline">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h6 className="mb-0">Línea de Tiempo de Actividades</h6>
                                <Button 
                                    variant="outline-primary" 
                                    size="sm"
                                    onClick={async () => {
                                        setLoadingTimeline(true)
                                        try {
                                            const targetColaboradorId = colaboradorId || (colaborador as any)?.documentId || colaborador?.id
                                            
                                            if (!targetColaboradorId) {
                                                console.error('[Línea de Tiempo] ❌ No se pudo obtener ID del colaborador')
                                                setLoadingTimeline(false)
                                                return
                                            }
                                            
                                            // Usar el endpoint específico del usuario (igual que loadTimeline)
                                            const response = await fetch(`/api/logs/usuario/${targetColaboradorId}?page=1&pageSize=50&sort=fecha:desc`, {
                                                cache: 'no-store',
                                            })
                                            
                                            if (response.ok) {
                                                const result = await response.json()
                                                if (result.success && result.data) {
                                                    const logsArray = Array.isArray(result.data) ? result.data : [result.data]
                                                    console.log('[Línea de Tiempo] 🔄 Recargado:', logsArray.length, 'logs')
                                                    setTimelinePosts(logsArray)
                                                }
                                            }
                                        } catch (err: any) {
                                            console.error('[Línea de Tiempo] Error al recargar:', err)
                                        } finally {
                                            setLoadingTimeline(false)
                                        }
                                    }}
                                    disabled={loadingTimeline}
                                >
                                    {loadingTimeline ? (
                                        <>
                                            <Spinner animation="border" size="sm" className="me-2" />
                                            Cargando...
                                        </>
                                    ) : (
                                        '🔄 Recargar'
                                    )}
                                </Button>
                            </div>
                            {!colaboradorId && (
                                <form onSubmit={async (e) => {
                                    e.preventDefault()
                                    if (!newPostText.trim() || posting) return
                                    
                                    setPosting(true)
                                    try {
                                        const token = getAuthToken()
                                        const headers: HeadersInit = {
                                            'Content-Type': 'application/json',
                                        }
                                        if (token) {
                                            headers['Authorization'] = `Bearer ${token}`
                                        }
                                        
                                        // Crear un log de actividad como post
                                        const response = await fetch('/api/logs', {
                                            method: 'POST',
                                            headers,
                                            body: JSON.stringify({
                                                accion: 'crear',
                                                entidad: 'timeline',
                                                descripcion: newPostText.trim(),
                                                metadata: { tipo: 'post_timeline' },
                                            }),
                                        })
                                        
                                        if (response.ok) {
                                            const postResult = await response.json()
                                            console.log('[Timeline] ✅ Post creado:', postResult)
                                            setNewPostText('')
                                            setSuccess(true)
                                            
                                            // Esperar un momento para que Strapi procese el log
                                            await new Promise(resolve => setTimeout(resolve, 500))
                                            
                                            // Recargar timeline usando el mismo método que loadTimeline
                                            const targetColaboradorId = (colaborador as any)?.documentId || colaborador?.id
                                            
                                            if (targetColaboradorId) {
                                                const timelineResponse = await fetch(`/api/logs/usuario/${targetColaboradorId}?page=1&pageSize=50&sort=fecha:desc`, {
                                                    cache: 'no-store',
                                                })
                                                
                                                if (timelineResponse.ok) {
                                                    const result = await timelineResponse.json()
                                                    if (result.success && result.data) {
                                                        const logsArray = Array.isArray(result.data) ? result.data : [result.data]
                                                        console.log('[Línea de Tiempo] 🔄 Recargado después de post:', logsArray.length, 'logs')
                                                        setTimelinePosts(logsArray)
                                                    }
                                                }
                                            }
                                        } else {
                                            const errorData = await response.json()
                                            console.error('[Timeline] ❌ Error al crear post:', errorData)
                                            setError(errorData.error || 'Error al publicar el post')
                                        }
                                    } catch (err: any) {
                                        console.error('[Account] Error al publicar post:', err)
                                        setError('Error al publicar el post')
                                    } finally {
                                        setPosting(false)
                                    }
                                }} className="mb-3">
                                    <textarea 
                                        rows={3} 
                                        className="form-control" 
                                        placeholder="Escribe algo..." 
                                        value={newPostText}
                                        onChange={(e) => setNewPostText(e.target.value)}
                                        disabled={posting}
                                    />
                                    <div className="d-flex py-2 justify-content-between">
                                        <div>
                                            <button type="button" className="btn btn-sm btn-icon btn-light" disabled><TbUser className="fs-md" /></button>&nbsp;
                                            <button type="button" className="btn btn-sm btn-icon btn-light" disabled><TbMapPin className="fs-md" /></button>&nbsp;
                                            <button type="button" className="btn btn-sm btn-icon btn-light" disabled><TbCamera className="fs-md" /></button>&nbsp;
                                            <button type="button" className="btn btn-sm btn-icon btn-light" disabled><TbMoodSmile className="fs-md" /></button>
                                        </div>
                                        <button 
                                            type="submit" 
                                            className="btn btn-sm btn-dark"
                                            disabled={!newPostText.trim() || posting}
                                        >
                                            {posting ? (
                                                <>
                                                    <Spinner animation="border" size="sm" className="me-2" />
                                                    Publicando...
                                                </>
                                            ) : (
                                                'Publicar'
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}
                            
                            {loadingTimeline ? (
                                <div className="d-flex align-items-center justify-content-center gap-2 p-3">
                                    <Spinner animation="border" size="sm" variant="primary" />
                                    <strong>Cargando actividades...</strong>
                                </div>
                            ) : timelinePosts.length === 0 ? (
                                <Alert variant="info">
                                    <p className="mb-0">
                                        <strong>No hay actividades en tu línea de tiempo.</strong>
                                        <br />
                                        <small>
                                            Esto puede deberse a que:
                                            <ul className="mb-0 mt-2">
                                                <li>No has realizado acciones en el sistema aún</li>
                                                <li>Los logs no están asociados correctamente a tu usuario</li>
                                                <li>Intenta recargar usando el botón arriba</li>
                                            </ul>
                                            <br />
                                            <strong>Colaborador ID:</strong> {colaborador?.id || 'N/A'}
                                            {colaborador && (colaborador as any).documentId && (
                                                <> | <strong>Document ID:</strong> {(colaborador as any).documentId}</>
                                            )}
                                        </small>
                                    </p>
                                </Alert>
                            ) : (
                                <div className="timeline timeline-icon-bordered">
                                    {timelinePosts.map((log: any, idx: number) => {
                                        const attrs = log.attributes || log
                                        const fecha = attrs.fecha || attrs.createdAt || new Date().toISOString()
                                        const fechaDate = new Date(fecha)
                                        const fechaFormateada = fechaDate.toLocaleDateString('es-CL', { 
                                            day: 'numeric', 
                                            month: 'short', 
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })
                                        
                                        // Calcular tiempo relativo
                                        const ahora = new Date()
                                        const diffMs = ahora.getTime() - fechaDate.getTime()
                                        const diffMins = Math.floor(diffMs / 60000)
                                        const diffHours = Math.floor(diffMs / 3600000)
                                        const diffDays = Math.floor(diffMs / 86400000)
                                        
                                        let tiempoRelativo = 'hace un momento'
                                        if (diffMins < 1) {
                                            tiempoRelativo = 'hace un momento'
                                        } else if (diffMins < 60) {
                                            tiempoRelativo = `hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`
                                        } else if (diffHours < 24) {
                                            tiempoRelativo = `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
                                        } else if (diffDays < 7) {
                                            tiempoRelativo = `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`
                                        } else {
                                            tiempoRelativo = fechaFormateada
                                        }
                                        
                                        const descripcion = attrs.descripcion || attrs.descripcion || 'Sin descripción'
                                        const accion = attrs.accion || 'Acción'
                                        const entidad = attrs.entidad || 'Sistema'
                                        
                                        // Parsear metadata si es string
                                        let metadataParsed: any = {}
                                        if (log.metadata) {
                                            if (typeof log.metadata === 'string') {
                                                try {
                                                    metadataParsed = JSON.parse(log.metadata)
                                                } catch {
                                                    metadataParsed = {}
                                                }
                                            } else {
                                                metadataParsed = log.metadata
                                            }
                                        }
                                        
                                        // Determinar icono según acción
                                        let icono = TbUserCircle
                                        let variant = 'primary'
                                        
                                        // Verificar primero si es un post del timeline (debe tener prioridad)
                                        const esPostTimeline = metadataParsed.tipo === 'post_timeline' || entidad === 'timeline'
                                        
                                        if (accion.includes('crear') && esPostTimeline) {
                                            // Post del timeline - mostrar como publicación
                                            icono = TbShare3
                                            variant = 'info'
                                        } else if (accion.includes('crear')) {
                                            icono = TbChecklist
                                            variant = 'success'
                                        } else if (accion.includes('editar') || accion.includes('actualizar')) {
                                            icono = TbPencil
                                            variant = 'warning'
                                        } else if (accion.includes('eliminar') || accion.includes('borrar')) {
                                            icono = TbArrowBackUp
                                            variant = 'danger'
                                        } else if (accion.includes('login')) {
                                            icono = TbUserCircle
                                            variant = 'primary'
                                        } else if (accion.includes('logout')) {
                                            icono = TbArrowBackUp
                                            variant = 'secondary'
                                        } else if (accion.includes('publicar')) {
                                            // Mantener compatibilidad por si acaso
                                            icono = TbShare3
                                            variant = 'info'
                                        }
                                        
                                        const Icono = icono
                                        
                                        // Obtener nombre del colaborador del perfil que se está viendo
                                        const logNombreCompleto = colaboradorId 
                                            ? (viewingProfileData?.persona ? getPersonaNombre(viewingProfileData.persona) : nombreCompleto)
                                            : nombreCompleto
                                        
                                        return (
                                            <div key={log.id || idx} className="timeline-item d-flex align-items-start">
                                                <div className="timeline-time pe-3 text-muted">{tiempoRelativo}</div>
                                                <div className="timeline-dot">
                                                    <Icono className={`text-${variant}`} />
                                                </div>
                                                <div className={`timeline-content ps-3 ${idx !== timelinePosts.length - 1 ? 'pb-4' : ''}`}>
                                                    {esPostTimeline ? (
                                                        <>
                                                            <p className="mb-0">{descripcion}</p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <h5 className="mb-1">{logNombreCompleto}</h5>
                                                            <p className="mb-1">{descripcion}</p>
                                                            <small className="text-muted">
                                                                {accion} • {entidad}
                                                            </small>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </TabPane>
                        <TabPane eventKey="settings">
                            {colaboradorId ? (
                                <Alert variant="info">
                                    <p className="mb-0">Estás viendo el perfil de otro colaborador. Solo puedes editar tu propio perfil.</p>
                                </Alert>
                            ) : (
                                <form onSubmit={handleSubmit}>
                                <h5 className="mb-3 text-uppercase bg-light-subtle p-1 border-dashed border rounded border-light text-center"><TbUserCircle className="me-1" /> Información Personal</h5>
                                <Row>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <FormLabel htmlFor="firstname">Nombres</FormLabel>
                                            <FormControl 
                                                type="text" 
                                                id="firstname" 
                                                placeholder="Ingresa tus nombres"
                                                value={formData.nombres}
                                                onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                                            />
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <FormLabel htmlFor="lastname">Apellidos</FormLabel>
                                            <FormControl 
                                                type="text" 
                                                id="lastname" 
                                                placeholder="Ingresa tus apellidos"
                                                value={`${formData.primer_apellido} ${formData.segundo_apellido}`.trim()}
                                                onChange={(e) => {
                                                    const apellidos = e.target.value.split(' ')
                                                    setFormData({ 
                                                        ...formData, 
                                                        primer_apellido: apellidos[0] || '',
                                                        segundo_apellido: apellidos.slice(1).join(' ') || ''
                                                    })
                                                }}
                                            />
                                        </div>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <FormLabel htmlFor="jobtitle">Cargo / Título</FormLabel>
                                            <FormControl 
                                                type="text" 
                                                id="jobtitle" 
                                                placeholder="ej. Desarrollador UI, Diseñador"
                                                value={formData.job_title}
                                                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                                            />
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <FormLabel htmlFor="phone">Teléfono</FormLabel>
                                            <FormControl 
                                                type="text" 
                                                id="phone" 
                                                placeholder="+56 9 1234 5678"
                                                value={formData.telefono}
                                                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                            />
                                        </div>
                                    </Col>
                                </Row>
                                <div className="mb-3">
                                    <FormLabel htmlFor="userbio">Biografía</FormLabel>
                                    <FormControl 
                                        as={'textarea'} 
                                        id="userbio" 
                                        rows={4} 
                                        placeholder="Escribe algo sobre ti..."
                                        value={formData.bio}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    />
                                </div>
                                <Row>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <FormLabel htmlFor="useremail">Email</FormLabel>
                                            <FormControl 
                                                type="email" 
                                                id="useremail" 
                                                placeholder="Ingresa tu email"
                                                value={formData.email_login}
                                                onChange={(e) => setFormData({ ...formData, email_login: e.target.value })}
                                            />
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <FormLabel htmlFor="userpassword">Nueva Contraseña</FormLabel>
                                            <FormControl 
                                                type="password" 
                                                id="userpassword" 
                                                placeholder="Deja vacío para no cambiar"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            />
                                            <span className="form-text fs-xs fst-italic text-muted">Deja vacío si no quieres cambiar la contraseña</span>
                                        </div>
                                    </Col>
                                </Row>
                                <div className="mb-4">
                                    <FormLabel htmlFor="profilephoto">Foto de Perfil</FormLabel>
                                    <div className="d-flex align-items-center gap-3 mb-2">
                                        {profilePhotoPreview && (
                                            <img 
                                                src={profilePhotoPreview} 
                                                alt="Preview" 
                                                width={80} 
                                                height={80} 
                                                className="rounded-circle"
                                                style={{ objectFit: 'cover' }}
                                            />
                                        )}
                                        <FormControl 
                                            type="file" 
                                            id="profilephoto" 
                                            accept="image/*"
                                            onChange={handlePhotoChange}
                                            disabled={uploadingPhoto}
                                        />
                                    </div>
                                    {uploadingPhoto && (
                                        <div className="d-flex align-items-center gap-2">
                                            <Spinner animation="border" size="sm" />
                                            <span className="text-muted fs-sm">Subiendo foto...</span>
                                        </div>
                                    )}
                                </div>
                                <h5 className="mb-3 text-uppercase bg-light-subtle p-1 border-dashed border rounded border-light text-center">
                                    <TbMapPin className="me-1" /> Información de Dirección
                                </h5>
                                <Row>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <FormLabel htmlFor="address-line1">Dirección Línea 1</FormLabel>
                                            <FormControl 
                                                type="text" 
                                                id="address-line1" 
                                                placeholder="Calle, Apartamento, Unidad, etc."
                                                value={formData.address_line1}
                                                onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                                            />
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <FormLabel htmlFor="address-line2">Dirección Línea 2</FormLabel>
                                            <FormControl 
                                                type="text" 
                                                id="address-line2" 
                                                placeholder="Opcional"
                                                value={formData.address_line2}
                                                onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                                            />
                                        </div>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col md={4}>
                                        <div className="mb-3">
                                            <FormLabel htmlFor="city">Ciudad</FormLabel>
                                            <FormControl 
                                                type="text" 
                                                id="city" 
                                                placeholder="Ciudad"
                                                value={formData.city}
                                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            />
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="mb-3">
                                            <FormLabel htmlFor="state">Región / Provincia</FormLabel>
                                            <FormControl 
                                                type="text" 
                                                id="state" 
                                                placeholder="Región o Provincia"
                                                value={formData.state}
                                                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                            />
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="mb-3">
                                            <FormLabel htmlFor="zipcode">Código Postal</FormLabel>
                                            <FormControl 
                                                type="text" 
                                                id="zipcode" 
                                                placeholder="Código Postal"
                                                value={formData.zipcode}
                                                onChange={(e) => setFormData({ ...formData, zipcode: e.target.value })}
                                            />
                                        </div>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <FormLabel htmlFor="country">País</FormLabel>
                                            <FormControl 
                                                type="text" 
                                                id="country" 
                                                placeholder="País"
                                                value={formData.country}
                                                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                            />
                                        </div>
                                    </Col>
                                </Row>
                                <h5 className="mb-3 text-uppercase bg-light-subtle p-1 border-dashed border rounded border-light text-center"><TbWorld className="me-1" /> Redes Sociales</h5>
                                <div className="row g-3">
                                    <Col md={6}>
                                        <FormLabel htmlFor="social-fb">Facebook</FormLabel>
                                        <div className="input-group">
                                            <span className="input-group-text"><TbBrandFacebook /></span>
                                            <FormControl 
                                                type="text" 
                                                id="social-fb" 
                                                placeholder="URL de Facebook"
                                                value={formData.social_facebook}
                                                onChange={(e) => setFormData({ ...formData, social_facebook: e.target.value })}
                                            />
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <FormLabel htmlFor="social-tw">Twitter X</FormLabel>
                                        <div className="input-group">
                                            <span className="input-group-text"><TbBrandX /></span>
                                            <FormControl 
                                                type="text" 
                                                id="social-tw" 
                                                placeholder="@usuario"
                                                value={formData.social_twitter}
                                                onChange={(e) => setFormData({ ...formData, social_twitter: e.target.value })}
                                            />
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <FormLabel htmlFor="social-insta">Instagram</FormLabel>
                                        <div className="input-group">
                                            <span className="input-group-text"><TbBrandInstagram /></span>
                                            <FormControl 
                                                type="text" 
                                                id="social-insta" 
                                                placeholder="URL de Instagram"
                                                value={formData.social_instagram}
                                                onChange={(e) => setFormData({ ...formData, social_instagram: e.target.value })}
                                            />
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <FormLabel htmlFor="social-lin">LinkedIn</FormLabel>
                                        <div className="input-group">
                                            <span className="input-group-text"><TbBrandLinkedin /></span>
                                            <FormControl 
                                                type="text" 
                                                id="social-lin" 
                                                placeholder="Perfil de LinkedIn"
                                                value={formData.social_linkedin}
                                                onChange={(e) => setFormData({ ...formData, social_linkedin: e.target.value })}
                                            />
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <FormLabel htmlFor="social-gh">GitHub</FormLabel>
                                        <div className="input-group">
                                            <span className="input-group-text"><TbBrandGithub /></span>
                                            <FormControl 
                                                type="text" 
                                                id="social-gh" 
                                                placeholder="Usuario de GitHub"
                                                value={formData.social_github}
                                                onChange={(e) => setFormData({ ...formData, social_github: e.target.value })}
                                            />
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <FormLabel htmlFor="social-sky">Skype</FormLabel>
                                        <div className="input-group">
                                            <span className="input-group-text"><TbBrandSkype /></span>
                                            <FormControl 
                                                type="text" 
                                                id="social-sky" 
                                                placeholder="@usuario"
                                                value={formData.social_skype}
                                                onChange={(e) => setFormData({ ...formData, social_skype: e.target.value })}
                                            />
                                        </div>
                                    </Col>
                                </div>
                                <div className="text-end mt-4">
                                    <Button 
                                        variant='success' 
                                        type="submit"
                                        disabled={saving || uploadingPhoto}
                                    >
                                        {saving ? (
                                            <>
                                                <Spinner animation="border" size="sm" className="me-2" />
                                                Guardando...
                                            </>
                                        ) : (
                                            <>
                                                <TbDeviceFloppy className="me-1" /> Guardar Cambios
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                            )}
                        </TabPane>
                    </TabContent>
                </CardBody>
            </TabContainer>
        </div>
    )
}

export default Account
