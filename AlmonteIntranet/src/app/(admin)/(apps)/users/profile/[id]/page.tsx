'use client'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import React from 'react'
import { Container } from 'react-bootstrap'
import Profile from '../components/Profile'
import Account from '../components/Account'
import ProfileBanner from '../components/ProfileBanner'
import { use } from 'react'

interface PageProps {
  params: Promise<{ id: string }>
}

const page = ({ params }: PageProps) => {
    const { id } = use(params)
    
    return (
        <Container fluid>
            <PageBreadcrumb title="Perfil" subtitle="Usuarios" />
            <div className="row">
                <div className="col-12">
                    <article className="card overflow-hidden mb-0">
                        <ProfileBanner colaboradorId={id} />
                    </article>
                </div>
            </div>
            <div className="px-3 mt-n4">
                <div className="row">
                    <div className="col-xl-4">
                        <Profile colaboradorId={id} />
                    </div>
                    <div className="col-xl-8">
                        <Account colaboradorId={id} />
                    </div>
                </div>
            </div>
        </Container>
    )
}

export default page

