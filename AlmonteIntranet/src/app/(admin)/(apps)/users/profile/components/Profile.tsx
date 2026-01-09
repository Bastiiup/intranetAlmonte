'use client'

import Image from 'next/image'
import React, { useState, useEffect } from 'react'
import user3 from '@/assets/images/users/user-3.jpg'
import usFlag from '@/assets/images/flags/us.svg'
import { Button, Card, CardBody, Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap'
import Link from 'next/link'
import { TbBrandX, TbBriefcase, TbDotsVertical, TbLink, TbMail, TbMapPin, TbSchool, TbUsers, TbWorld } from 'react-icons/tb'
import { LuDribbble, LuFacebook, LuInstagram, LuLinkedin, LuYoutube } from 'react-icons/lu'
import { useAuth, getPersonaNombre, getPersonaEmail, getRolLabel } from '@/hooks/useAuth'
import { getAuthToken } from '@/lib/auth'

interface ProfileProps {
    colaboradorId?: string
}

const Profile = ({ colaboradorId }: ProfileProps) => {
    const { persona, colaborador, loading } = useAuth()
    const [profileData, setProfileData] = useState<any>(null)
    const [isLoadingProfile, setIsLoadingProfile] = useState(true)
    
    // Cargar datos completos del perfil
    useEffect(() => {
        const loadProfile = async () => {
            setIsLoadingProfile(true)
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
                        let data = result.data.data || result.data
                        
                        // Si viene de /api/colaboradores/[id], normalizar estructura
                        if (colaboradorId && data.attributes) {
                            // Extraer persona si está en attributes
                            if (data.attributes.persona) {
                                const personaData = data.attributes.persona.data || data.attributes.persona
                                data = {
                                    ...data,
                                    attributes: {
                                        ...data.attributes,
                                        persona: personaData
                                    }
                                }
                            }
                        }
                        
                        setProfileData(data)
                    }
                }
            } catch (err) {
                console.error('[Profile] Error al cargar perfil:', err)
            } finally {
                setIsLoadingProfile(false)
            }
        }
        if (!loading) {
            loadProfile()
        }
    }, [loading, colaboradorId])
    
    // Si estamos viendo otro perfil, usar datos de profileData
    // Normalizar estructura de persona (puede venir en diferentes formatos)
    let displayPersona = profileData?.persona || profileData?.attributes?.persona || persona
    if (displayPersona?.data) {
        displayPersona = displayPersona.data
    }
    if (displayPersona?.attributes) {
        displayPersona = { ...displayPersona, ...displayPersona.attributes }
    }
    
    const displayColaborador = profileData?.attributes || profileData || colaborador
    
    const nombreCompleto = displayPersona ? getPersonaNombre(displayPersona) : (displayColaborador?.email_login || 'Usuario')
    const email = getPersonaEmail(displayPersona, displayColaborador)
    const rolLabel = displayColaborador?.rol ? getRolLabel(displayColaborador.rol) : 'Usuario'
    
    // Obtener avatar - normalizar diferentes estructuras de imagen
    let avatarSrc = user3.src
    
    const personaImagen = displayPersona?.imagen || displayPersona?.attributes?.imagen
    
    // Intentar desde profileData primero (más actualizado)
    if (personaImagen?.url) {
        const imgUrl = personaImagen.url
        avatarSrc = imgUrl.startsWith('http') ? imgUrl : `${process.env.NEXT_PUBLIC_STRAPI_URL}${imgUrl}`
    }
    // Si imagen viene en estructura de componente contacto.imagen
    else if (personaImagen?.imagen) {
        const imagenComponent = personaImagen.imagen
        let imgUrl: string | null = null
        
        // Si es array (ESTRUCTURA REAL: imagen.imagen es array de objetos con url directa)
        if (Array.isArray(imagenComponent) && imagenComponent.length > 0) {
            // La URL viene directamente en el objeto, no en attributes
            imgUrl = imagenComponent[0]?.url || imagenComponent[0]?.attributes?.url || null
        }
        // Si tiene data
        else if (imagenComponent.data) {
            const dataArray = Array.isArray(imagenComponent.data) ? imagenComponent.data : [imagenComponent.data]
            if (dataArray.length > 0) {
                imgUrl = dataArray[0]?.attributes?.url || dataArray[0]?.url || null
            }
        }
        // Si es objeto directo
        else if (imagenComponent.url) {
            imgUrl = imagenComponent.url
        }
        
        if (imgUrl) {
            avatarSrc = imgUrl.startsWith('http') ? imgUrl : `${process.env.NEXT_PUBLIC_STRAPI_URL}${imgUrl}`
        }
    }
    
    // Obtener teléfono principal
    const telefono = displayPersona?.telefono_principal || 
                     (displayPersona?.telefonos && Array.isArray(displayPersona.telefonos) && displayPersona.telefonos.length > 0
                        ? displayPersona.telefonos[0]?.numero || ''
                        : '')
    
    // Obtener dirección
    const direccion = displayPersona?.direccion || null
    const direccionCompleta = direccion && typeof direccion === 'object' 
        ? [
            direccion.line1,
            direccion.line2,
            direccion.city,
            direccion.state,
            direccion.zipcode,
            direccion.country
          ].filter(Boolean).join(', ')
        : null
    
    // Obtener redes sociales
    const redesSociales = displayPersona?.redes_sociales || {}
    
    // Obtener skills
    const skills = displayPersona?.skills || []
    const skillsArray = Array.isArray(skills) ? skills : (typeof skills === 'string' ? skills.split(',').map(s => s.trim()) : [])
    
    // Función para navegar a Settings
    const handleEditProfile = () => {
        // Cambiar a la pestaña de Settings usando Bootstrap tab
        const settingsTab = document.querySelector('[data-bs-toggle="tab"][aria-controls="settings"]') as HTMLElement
        if (settingsTab) {
            settingsTab.click()
        } else {
            // Fallback: buscar por eventKey
            const tab = document.querySelector('[eventkey="settings"]') as HTMLElement
            if (tab) {
                tab.click()
            }
        }
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
                            <Link href="" className="link-reset">{isLoadingProfile || loading ? 'Cargando...' : nombreCompleto}</Link>
                            {displayPersona?.rut && (
                                <span className="ms-2 text-muted fs-sm">({displayPersona.rut})</span>
                            )}
                        </h5>
                        <p className="text-muted mb-2">{isLoadingProfile || loading ? '...' : rolLabel}</p>
                        {displayColaborador?.activo && (
                            <span className="badge text-bg-success badge-label">Activo</span>
                        )}
                    </div>
                    {!colaboradorId && (
                        <div className="ms-auto">
                            <Dropdown >
                                <DropdownToggle className="btn btn-icon btn-ghost-light text-muted drop-arrow-none" data-bs-toggle="dropdown">
                                    <TbDotsVertical className="fs-xl" />
                                </DropdownToggle>
                                <DropdownMenu align={'end'} className="dropdown-menu-end">
                                    <li><DropdownItem onClick={handleEditProfile}>Editar Perfil</DropdownItem></li>
                                </DropdownMenu>
                            </Dropdown>
                        </div>
                    )}
                </div>
                <div>
                    {displayPersona?.rut && (
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <div className="avatar-sm text-bg-light bg-opacity-75 d-flex align-items-center justify-content-center rounded-circle">
                                <TbBriefcase className="fs-xl" />
                            </div>
                            <p className="mb-0 fs-sm">RUT: <span className="text-dark fw-semibold">{displayPersona.rut}</span></p>
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
                    {direccionCompleta && (
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <div className="avatar-sm text-bg-light bg-opacity-75 d-flex align-items-center justify-content-center rounded-circle">
                                <TbMapPin className="fs-xl" />
                            </div>
                            <p className="mb-0 fs-sm">Dirección: <span className="text-dark fw-semibold">{direccionCompleta}</span></p>
                        </div>
                    )}
                    {displayColaborador?.email_login && (
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <div className="avatar-sm text-bg-light bg-opacity-75 d-flex align-items-center justify-content-center rounded-circle">
                                <TbUsers className="fs-xl" />
                            </div>
                            <p className="mb-0 fs-sm">Email de login: <span className="text-dark fw-semibold">{displayColaborador.email_login}</span></p>
                        </div>
                    )}
                    {displayColaborador?.rol && (
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <div className="avatar-sm text-bg-light bg-opacity-75 d-flex align-items-center justify-content-center rounded-circle">
                                <TbSchool className="fs-xl" />
                            </div>
                            <p className="mb-0 fs-sm">Rol: <span className="text-dark fw-semibold">{getRolLabel(displayColaborador.rol)}</span></p>
                        </div>
                    )}
                    {(redesSociales.facebook || redesSociales.twitter || redesSociales.instagram || redesSociales.linkedin || redesSociales.github || redesSociales.skype) && (
                        <div className="d-flex justify-content-center gap-2 mt-4 mb-2">
                            {redesSociales.facebook && (
                                <Link href={redesSociales.facebook} target="_blank" rel="noopener noreferrer" className="btn btn-icon rounded-circle btn-primary" title="Facebook">
                                    <LuFacebook className="fs-xl" />
                                </Link>
                            )}
                            {redesSociales.twitter && (
                                <Link href={redesSociales.twitter.startsWith('http') ? redesSociales.twitter : `https://twitter.com/${redesSociales.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="btn btn-icon rounded-circle btn-info" title="Twitter-x">
                                    <TbBrandX className="fs-xl" />
                                </Link>
                            )}
                            {redesSociales.instagram && (
                                <Link href={redesSociales.instagram} target="_blank" rel="noopener noreferrer" className="btn btn-icon rounded-circle btn-danger" title="Instagram">
                                    <LuInstagram className="fs-xl" />
                                </Link>
                            )}
                            {redesSociales.linkedin && (
                                <Link href={redesSociales.linkedin} target="_blank" rel="noopener noreferrer" className="btn btn-icon rounded-circle btn-secondary" title="LinkedIn">
                                    <LuLinkedin className="fs-xl" />
                                </Link>
                            )}
                            {redesSociales.github && (
                                <Link href={redesSociales.github.startsWith('http') ? redesSociales.github : `https://github.com/${redesSociales.github}`} target="_blank" rel="noopener noreferrer" className="btn btn-icon rounded-circle btn-dark" title="GitHub">
                                    <LuDribbble className="fs-xl" />
                                </Link>
                            )}
                            {redesSociales.skype && (
                                <Link href={`skype:${redesSociales.skype.replace('@', '')}?chat`} className="btn btn-icon rounded-circle btn-info" title="Skype">
                                    <TbLink className="fs-xl" />
                                </Link>
                            )}
                        </div>
                    )}
                </div>
                {skillsArray.length > 0 && (
                    <>
                        <h4 className="card-title mb-3 mt-4">Habilidades</h4>
                        <div className="d-flex flex-wrap gap-1">
                            {skillsArray.map((skill: string, idx: number) => (
                                <Button key={idx} variant='light' size='sm'>{skill}</Button>
                            ))}
                        </div>
                    </>
                )}
            </CardBody>
        </Card>
    )
}

export default Profile