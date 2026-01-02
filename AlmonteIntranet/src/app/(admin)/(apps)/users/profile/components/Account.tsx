'use client'

import React, { useState, useEffect } from 'react'
import { Button, CardBody, CardHeader, CardTitle, Col, FormControl, FormLabel, Nav, NavItem, NavLink, Row, TabContainer, TabContent, Table, TabPane, Alert, Spinner } from 'react-bootstrap'
import { TbArrowBackUp, TbBrandFacebook, TbBrandGithub, TbBrandInstagram, TbBrandLinkedin, TbBrandSkype, TbBrandX, TbBriefcase, TbBuildingSkyscraper, TbCamera, TbChecklist, TbDeviceFloppy, TbHeart, TbHome, TbMapPin, TbMoodSmile, TbPencil, TbQuote, TbSettings, TbShare3, TbUser, TbUserCircle, TbWorld } from 'react-icons/tb'
import { taskData } from '../data'
import Image from 'next/image'
import Link from 'next/link'
import user3 from '@/assets/images/users/user-3.jpg'
import user2 from '@/assets/images/users/user-2.jpg'
import user4 from '@/assets/images/users/user-4.jpg'
import small1 from '@/assets/images/stock/small-1.jpg'
import small2 from '@/assets/images/stock/small-2.jpg'
import small3 from '@/assets/images/stock/small-3.jpg'
import user1 from '@/assets/images/users/user-1.jpg'
import { useAuth } from '@/hooks/useAuth'

const Account = () => {
    const { persona, colaborador, loading: authLoading } = useAuth()
    const [profileLoading, setProfileLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [profilePhoto, setProfilePhoto] = useState<File | null>(null)
    const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null)
    const [uploadingPhoto, setUploadingPhoto] = useState(false)

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
                const response = await fetch('/api/colaboradores/me/profile')
                if (response.ok) {
                    const result = await response.json()
                    if (result.success && result.data) {
                        const { persona: personaData, colaborador: colaboradorData } = result.data

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

                        // Si hay imagen, crear preview
                        if (personaData?.imagen?.url) {
                            const imageUrl = personaData.imagen.url.startsWith('http') 
                                ? personaData.imagen.url 
                                : `${process.env.NEXT_PUBLIC_STRAPI_URL}${personaData.imagen.url}`
                            setProfilePhotoPreview(imageUrl)
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
    }, [authLoading])

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
            const response = await fetch('/api/colaboradores/me/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
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

    // Obtener nombre completo para About Me
    const nombreCompleto = persona 
        ? `${persona.nombres || ''} ${persona.primer_apellido || ''} ${persona.segundo_apellido || ''}`.trim() 
        : colaborador?.email_login || 'Usuario'

    const bio = persona?.bio || ''

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
                                <span className="d-none d-md-block fw-bold">Timeline</span>
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
                            {bio ? (
                                <>
                                    <p>{bio}</p>
                                </>
                            ) : (
                                <p className="text-muted">No hay información personal disponible. Edita tu perfil en la pestaña "Configuración" para agregar información sobre ti.</p>
                            )}
                            <h4 className="card-title my-3 text-uppercase fs-sm"><TbChecklist /> Tareas:</h4>
                            <div className="table-responsive">
                                <Table className="table-centered table-custom table-sm table-nowrap table-hover mb-0">
                                    <thead className="bg-light bg-opacity-25 thead-sm">
                                        <tr className="text-uppercase fs-xxs">
                                            <th data-table-sort="task">Tarea</th>
                                            <th data-table-sort>Estado</th>
                                            <th data-table-sort="name">Asignado Por</th>
                                            <th data-table-sort>Fecha Inicio</th>
                                            <th data-table-sort>Prioridad</th>
                                            <th data-table-sort>Progreso</th>
                                            <th data-table-sort>Tiempo Total</th>
                                            <th style={{ width: 30 }} />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {
                                            taskData.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td>
                                                        <h5 className="fs-sm my-1"><a href="#" className="text-body">{item.title}</a></h5>
                                                        <span className="text-muted fs-xs">{item.due}</span>
                                                    </td>
                                                    <td><span className={`badge badge-${item.status.color} `}>{item.status.label}</span></td>
                                                    <td>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <div className="avatar avatar-sm">
                                                                <Image src={item.assignedBy.avatar} alt="avatar" className="img-fluid rounded-circle" />
                                                            </div>
                                                            <div>
                                                                <h5 className="text-nowrap fs-sm mb-0">{item.assignedBy.name}</h5>
                                                                <p className="text-muted fs-xs mb-0">{item.assignedBy.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>{item.startDate}</td>
                                                    <td><span className={`badge badge-${item.priority.color}`}>{item.priority.label}</span></td>
                                                    <td>{item.progress}</td>
                                                    <td>{item.timeSpent}</td>
                                                    <td><a href="#" className="text-muted fs-xxl"><TbPencil /></a></td>
                                                </tr>
                                            ))
                                        }
                                    </tbody>
                                </Table>
                            </div>
                        </TabPane>
                        <TabPane eventKey="timeline">
                            <form action="#" className="mb-3">
                                <textarea rows={3} className="form-control" placeholder="Escribe algo..." defaultValue={""} />
                                <div className="d-flex py-2 justify-content-between">
                                    <div>
                                        <Link href="" className="btn btn-sm btn-icon btn-light"><TbUser className="fs-md" /></Link>&nbsp;
                                        <Link href="" className="btn btn-sm btn-icon btn-light"><TbMapPin className="fs-md" /></Link>&nbsp;
                                        <Link href="" className="btn btn-sm btn-icon btn-light"><TbCamera className="fs-md" /></Link>&nbsp;
                                        <Link href="" className="btn btn-sm btn-icon btn-light"><TbMoodSmile className="fs-md" /></Link>
                                    </div>
                                    <button type="submit" className="btn btn-sm btn-dark">Publicar</button>
                                </div>
                            </form>
                            <div className="border border-light border-dashed rounded p-2 mb-3">
                                <div className="d-flex align-items-center mb-2">
                                    <Image className="me-2 avatar-md rounded-circle" src={user3} alt="Generic placeholder image" />
                                    <div className="w-100">
                                        <h5 className="m-0">Jeremy Tomlinson</h5>
                                        <p className="text-muted mb-0"><small>hace 2 minutos</small></p>
                                    </div>
                                </div>
                                <p>Historia basada en la idea de time lapse, animación próximamente!</p>
                                <Image src={small1} alt="post-img" className="rounded me-1" height={60} />&nbsp;
                                <Image src={small2} alt="post-img" className="rounded me-1" height={60} />&nbsp;
                                <Image src={small3} alt="post-img" className="rounded" height={60} />
                                <div className="mt-2">
                                    <Link href="" className="btn btn-sm btn-link text-muted"><TbArrowBackUp className="fs-sm me-1" /> Responder</Link>
                                    <Link href="" className="btn btn-sm btn-link text-muted"><TbHeart className="fs-sm me-1" /> Me gusta</Link>
                                    <Link href="" className="btn btn-sm btn-link text-muted"><TbShare3 className="fs-sm me-1" /> Compartir</Link>
                                </div>
                            </div>
                            <div className="d-flex align-items-center justify-content-center gap-2 p-3">
                                <strong>Cargando...</strong>
                                <div className="spinner-border spinner-border-sm text-danger" role="status" aria-hidden="true" />
                            </div>
                        </TabPane>
                        <TabPane eventKey="settings">
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
                                            <Image 
                                                src={profilePhotoPreview} 
                                                alt="Preview" 
                                                width={80} 
                                                height={80} 
                                                className="rounded-circle"
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
                        </TabPane>
                    </TabContent>
                </CardBody>
            </TabContainer>
        </div>
    )
}

export default Account
