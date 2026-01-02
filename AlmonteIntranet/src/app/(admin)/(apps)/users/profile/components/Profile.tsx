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

const Profile = () => {
    const { persona, colaborador, loading } = useAuth()
    const [profileData, setProfileData] = useState<any>(null)
    
    // Cargar datos completos del perfil
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const response = await fetch('/api/colaboradores/me/profile')
                if (response.ok) {
                    const result = await response.json()
                    if (result.success && result.data) {
                        setProfileData(result.data)
                    }
                }
            } catch (err) {
                console.error('[Profile] Error al cargar perfil:', err)
            }
        }
        if (!loading) {
            loadProfile()
        }
    }, [loading])
    
    const nombreCompleto = persona ? getPersonaNombre(persona) : (colaborador?.email_login || 'Usuario')
    const email = getPersonaEmail(persona, colaborador)
    const rolLabel = colaborador?.rol ? getRolLabel(colaborador.rol) : 'Usuario'
    
    // Obtener avatar
    let avatarSrc = user3.src
    if (persona?.imagen?.url) {
        avatarSrc = persona.imagen.url.startsWith('http') 
            ? persona.imagen.url 
            : `${process.env.NEXT_PUBLIC_STRAPI_URL}${persona.imagen.url}`
    } else if (profileData?.persona?.imagen?.url) {
        const imgUrl = profileData.persona.imagen.url
        avatarSrc = imgUrl.startsWith('http') ? imgUrl : `${process.env.NEXT_PUBLIC_STRAPI_URL}${imgUrl}`
    }
    
    // Obtener teléfono principal
    const telefono = profileData?.persona?.telefono_principal || 
                     (persona?.telefonos && Array.isArray(persona.telefonos) && persona.telefonos.length > 0
                        ? persona.telefonos[0]?.numero || ''
                        : '')
    
    // Obtener redes sociales
    const redesSociales = profileData?.persona?.redes_sociales || {}
    
    // Obtener skills
    const skills = profileData?.persona?.skills || []
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
                            <Link href="" className="link-reset">{loading ? 'Cargando...' : nombreCompleto}</Link>
                            {persona?.rut && (
                                <span className="ms-2 text-muted fs-sm">({persona.rut})</span>
                            )}
                        </h5>
                        <p className="text-muted mb-2">{loading ? '...' : rolLabel}</p>
                        {colaborador?.activo && (
                            <span className="badge text-bg-success badge-label">Activo</span>
                        )}
                    </div>
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
                    {colaborador?.email_login && (
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <div className="avatar-sm text-bg-light bg-opacity-75 d-flex align-items-center justify-content-center rounded-circle">
                                <TbUsers className="fs-xl" />
                            </div>
                            <p className="mb-0 fs-sm">Email de login: <span className="text-dark fw-semibold">{colaborador.email_login}</span></p>
                        </div>
                    )}
                    {colaborador?.rol && (
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <div className="avatar-sm text-bg-light bg-opacity-75 d-flex align-items-center justify-content-center rounded-circle">
                                <TbSchool className="fs-xl" />
                            </div>
                            <p className="mb-0 fs-sm">Rol: <span className="text-dark fw-semibold">{getRolLabel(colaborador.rol)}</span></p>
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