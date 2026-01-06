'use client'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import React from 'react'
import { Container } from 'react-bootstrap'
import Profile from './components/Profile'
import Account from './components/Account'
import ProfileBanner from './components/ProfileBanner'

const page = () => {
    return (
        <Container fluid>
            <PageBreadcrumb title="Profile" subtitle="Users" />
            <div className="row">
                <div className="col-12">
                    <article className="card overflow-hidden mb-0">
                        <ProfileBanner />
                    </article>
                </div>
            </div>
            <div className="px-3 mt-n4">
                <div className="row">
                    <div className="col-xl-4">
                        <Profile />
                    </div>
                    <div className="col-xl-8">
                        <Account />
                    </div>
                </div>
            </div>
        </Container>
    )
}

export default page