'use client'

import Image from 'next/image'
import React from 'react'
import user3 from '@/assets/images/users/user-3.jpg'
import usFlag from '@/assets/images/flags/us.svg'
import { Button, Card, CardBody, Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap'
import Link from 'next/link'
import { TbBrandX, TbBriefcase, TbDotsVertical, TbLink, TbMail, TbMapPin, TbSchool, TbUsers, TbWorld } from 'react-icons/tb'
import { LuDribbble, LuFacebook, LuInstagram, LuLinkedin, LuYoutube } from 'react-icons/lu'
import { useAuth, getPersonaNombre, getPersonaEmail, getRolLabel } from '@/hooks/useAuth'

const Profile = () => {
    const { persona, colaborador, loading } = useAuth()
    
    const nombreCompleto = persona ? getPersonaNombre(persona) : (colaborador?.email_login || 'Usuario')
    const email = getPersonaEmail(persona, colaborador)
    const rolLabel = colaborador?.rol ? getRolLabel(colaborador.rol) : 'Usuario'
    const avatarSrc = persona?.imagen?.url 
        ? `${process.env.NEXT_PUBLIC_STRAPI_URL}${persona.imagen.url}`
        : user3.src
    
    // Obtener teléfono principal
    const telefono = persona?.telefonos && Array.isArray(persona.telefonos) && persona.telefonos.length > 0
        ? persona.telefonos[0]?.numero || ''
        : ''

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