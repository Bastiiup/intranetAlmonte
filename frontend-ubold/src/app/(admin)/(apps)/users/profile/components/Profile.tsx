'use client'

import Image from 'next/image'
import React, { useState, useEffect } from 'react'
import user3 from '@/assets/images/users/user-3.jpg'
import usFlag from '@/assets/images/flags/us.svg'
import { Button, Card, CardBody, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Spinner } from 'react-bootstrap'
import Link from 'next/link'
import { TbBrandX, TbBriefcase, TbDotsVertical, TbLink, TbMail, TbMapPin, TbSchool, TbUsers, TbWorld } from 'react-icons/tb'
import { LuDribbble, LuFacebook, LuInstagram, LuLinkedin, LuYoutube } from 'react-icons/lu'
import { useAuth, getPersonaNombre, getPersonaEmail, getRolLabel } from '@/hooks/useAuth'

interface ProfileProps {
    colaboradorId?: string
}

const Profile = ({ colaboradorId }: ProfileProps) => {
    const { persona: currentPersona, colaborador: currentColaborador, loading: authLoading } = useAuth()
    const [profileData, setProfileData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (colaboradorId) {
            loadProfile()
        } else {
            setLoading(false)
        }
    }, [colaboradorId])

    const loadProfile = async () => {
        if (!colaboradorId) return
        
        try {
            setLoading(true)
            const response = await fetch(`/api/colaboradores/${colaboradorId}`, {
                credentials: 'include',
            })

            if (!response.ok) {
                throw new Error('Error al cargar perfil')
            }

            const data = await response.json()
            setProfileData(data.data || data)
        } catch (error) {
            console.error('Error al cargar perfil:', error)
        } finally {
            setLoading(false)
        }
    }

    // Usar datos cargados o datos del usuario autenticado
    const colaboradorData = colaboradorId ? profileData : currentColaborador
    const personaData = colaboradorId 
        ? (profileData?.persona || profileData?.attributes?.persona)
        : currentPersona

    // Normalizar estructura de persona
    const personaAttrs = personaData?.attributes || personaData || {}
    
    const nombreCompleto = personaAttrs.nombre_completo || 
                          (personaAttrs.nombres && personaAttrs.primer_apellido 
                            ? `${personaAttrs.nombres} ${personaAttrs.primer_apellido} ${personaAttrs.segundo_apellido || ''}`.trim()
                            : (colaboradorData?.email_login || 'Usuario'))
    
    const email = personaAttrs.emails && Array.isArray(personaAttrs.emails) && personaAttrs.emails.length > 0
        ? personaAttrs.emails[0]?.email || colaboradorData?.email_login
        : colaboradorData?.email_login || ''
    
    const rolLabel = colaboradorData?.rol ? getRolLabel(colaboradorData.rol) : 'Usuario'
    
    // Normalizar imagen
    let avatarSrc = user3.src
    const imagenRaw = personaAttrs.imagen
    if (imagenRaw?.url) {
        avatarSrc = imagenRaw.url.startsWith('http') 
            ? imagenRaw.url 
            : `${process.env.NEXT_PUBLIC_STRAPI_URL}${imagenRaw.url}`
    }
    
    // Obtener teléfono principal
    const telefono = personaAttrs.telefonos && Array.isArray(personaAttrs.telefonos) && personaAttrs.telefonos.length > 0
        ? personaAttrs.telefonos[0]?.telefono_raw || personaAttrs.telefonos[0]?.numero || ''
        : ''

    if (loading && colaboradorId) {
        return (
            <Card className="card-top-sticky">
                <CardBody>
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-2 text-muted">Cargando perfil...</p>
                    </div>
                </CardBody>
            </Card>
        )
    }

    return (
        <Card className="card-top-sticky">
            <CardBody>
                <div className="d-flex align-items-center mb-4">
                    <div className="me-3 position-relative">
                        <Image src={avatarSrc} alt="avatar" className="rounded-circle" width={72} height={72} />
                    </div>
                    <div>
                        <h5 className="mb-0 d-flex align-items-center">
                            <Link href="" className="link-reset">{loading ? 'Cargando...' : nombreCompleto}</Link>
                            {persona?.rut && (
                                <span className="ms-2 text-muted fs-sm">({persona.rut})</span>
                            )}
                        </h5>
                        <p className="text-muted mb-2">{loading ? '...' : rolLabel}</p>
                        {colaboradorData?.activo && (
                            <span className="badge text-bg-success badge-label">Activo</span>
                        )}
                    </div>
                    <div className="ms-auto">
                        <Dropdown >
                            <DropdownToggle className="btn btn-icon btn-ghost-light text-muted drop-arrow-none" data-bs-toggle="dropdown">
                                <TbDotsVertical className="fs-xl" />
                            </DropdownToggle>
                            <DropdownMenu align={'end'} className="dropdown-menu-end">
                                <li><DropdownItem>Edit Profile</DropdownItem></li>
                                <li><DropdownItem className="text-danger">Report</DropdownItem></li>
                            </DropdownMenu>
                        </Dropdown>
                    </div>
                </div>
                <div>
                    {persona?.rut && (
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <div className="avatar-sm text-bg-light bg-opacity-75 d-flex align-items-center justify-content-center rounded-circle">
                                <TbBriefcase className="fs-xl" />
                            </div>
                            <p className="mb-0 fs-sm">RUT: <span className="text-dark fw-semibold">{persona.rut}</span></p>
                        </div>
                    )}
                    {email && (
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <div className="avatar-sm text-bg-light bg-opacity-75 d-flex align-items-center justify-content-center rounded-circle">
                                <TbMail className="fs-xl" />
                            </div>
                            <p className="mb-0 fs-sm">Email <Link href={`mailto:${email}`} className="text-primary fw-semibold">{email}</Link>
                            </p>
                        </div>
                    )}
                    {telefono && (
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <div className="avatar-sm text-bg-light bg-opacity-75 d-flex align-items-center justify-content-center rounded-circle">
                                <TbMapPin className="fs-xl" />
                            </div>
                            <p className="mb-0 fs-sm">Teléfono: <span className="text-dark fw-semibold">{telefono}</span></p>
                        </div>
                    )}
                    {colaboradorData?.email_login && (
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <div className="avatar-sm text-bg-light bg-opacity-75 d-flex align-items-center justify-content-center rounded-circle">
                                <TbUsers className="fs-xl" />
                            </div>
                            <p className="mb-0 fs-sm">Email de login: <span className="text-dark fw-semibold">{colaboradorData.email_login}</span></p>
                        </div>
                    )}
                    {colaboradorData?.rol && (
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <div className="avatar-sm text-bg-light bg-opacity-75 d-flex align-items-center justify-content-center rounded-circle">
                                <TbSchool className="fs-xl" />
                            </div>
                            <p className="mb-0 fs-sm">Rol: <span className="text-dark fw-semibold">{getRolLabel(colaboradorData.rol)}</span></p>
                        </div>
                    )}
                    <div className="d-flex justify-content-center gap-2 mt-4 mb-2">
                        <Link href="" className="btn btn-icon rounded-circle btn-primary" title="Facebook">
                            <LuFacebook className="fs-xl" />
                        </Link>
                        <Link href="" className="btn btn-icon rounded-circle btn-info" title="Twitter-x">
                            <TbBrandX className="fs-xl" />
                        </Link>
                        <Link href="" className="btn btn-icon rounded-circle btn-danger" title="Instagram">
                            <LuInstagram className="fs-xl" />
                        </Link>
                        <Link href="" className="btn btn-icon rounded-circle btn-success" title="WhatsApp">
                            <LuDribbble className="fs-xl" />
                        </Link>
                        <Link href="" className="btn btn-icon rounded-circle btn-secondary" title="LinkedIn">
                            <LuLinkedin className="fs-xl" />
                        </Link>
                        <Link href="" className="btn btn-icon rounded-circle btn-danger" title="YouTube">
                            <LuYoutube className="fs-xl" />
                        </Link>
                    </div>
                </div>
                <h4 className="card-title mb-3 mt-4">Skills</h4>
                <div className="d-flex flex-wrap gap-1">
                    <Button variant='light' size='sm'>Product Design</Button>
                    <Button variant='light' size='sm'>UI/UX</Button>
                    <Button variant='light' size='sm'>Tailwind CSS</Button>
                    <Button variant='light' size='sm'>Bootstrap</Button>
                    <Button variant='light' size='sm'>React.js</Button>
                    <Button variant='light' size='sm'>Next.js</Button>
                    <Button variant='light' size='sm'>Vue.js</Button>
                    <Button variant='light' size='sm'>Figma</Button>
                    <Button variant='light' size='sm'>Design Systems</Button>
                    <Button variant='light' size='sm'>Template Authoring</Button>
                    <Button variant='light' size='sm'>Responsive Design</Button>
                    <Button variant='light' size='sm'>Component Libraries</Button>
                </div>
            </CardBody>
        </Card>
    )
}

export default Profile