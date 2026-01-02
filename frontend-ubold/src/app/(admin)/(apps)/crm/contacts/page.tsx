'use client'

import { useState, useEffect } from 'react'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Card, CardBody, CardFooter, Col, Container, Row, Spinner } from 'react-bootstrap'
import { getContacts, type ContactsQuery } from './data'
import Image from 'next/image'
import { generateInitials } from '@/helpers/casing'
import Link from 'next/link'
import { TbMail, TbPhone } from 'react-icons/tb'
import type { ContactType } from '@/app/(admin)/(apps)/crm/types'

const ContactCard = ({ item }: { item: ContactType }) => {
  const { stats, avatar, label, email, name, categories, phone, description } = item
  return (
    <Card>
      <CardBody className="d-flex align-items-start">
        {avatar ? (
          <Image 
            src={typeof avatar === 'string' ? avatar : avatar} 
            alt="avatar" 
            className="rounded-circle me-3" 
            width="64" 
            height="64" 
          />
        ) : (
          <div className="avatar rounded-circle me-3 flex-shrink-0" style={{ height: '64px', width: '64px' }}>
            <span className="avatar-title text-bg-primary fw-semibold rounded-circle fs-22">{generateInitials(name)}</span>
          </div>
        )}

        <div className="flex-grow-1">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <Link href="/users/profile" className="link-reset">
                {name}
              </Link>
            </h5>
            <span className={`badge badge-label bg-${label.variant}`}>{label.text}</span>
          </div>
          <p className="mb-3 text-muted fs-xs">{description}</p>

          <div className="mb-2">
            {email && (
              <div className="d-flex align-items-center gap-2 mb-1">
                <div className="avatar-xs avatar-img-size fs-24">
                  <span className="avatar-title text-bg-light fs-sm rounded-circle">
                    <TbMail />
                  </span>
                </div>
                <h5 className="fs-base mb-0 fw-medium">
                  <Link href={`mailto:${email}`} className="link-reset">
                    {email}
                  </Link>
                </h5>
              </div>
            )}
            {phone && (
              <div className="d-flex align-items-center gap-2">
                <div className="avatar-xs avatar-img-size fs-24">
                  <span className="avatar-title text-bg-light fs-sm rounded-circle">
                    <TbPhone />
                  </span>
                </div>
                <h5 className="fs-base mb-0 fw-medium">
                  <Link href={`tel:${phone}`} className="link-reset">
                    {phone}
                  </Link>
                </h5>
              </div>
            )}
          </div>

          <div>
            {categories.map((category, idx) => (
              <span className={`badge ${category.variant ==='light' ? `text-bg-${category.variant}` : `badge-soft-${category.variant}`}  me-1`} key={idx}>
                {category.name}
              </span>
            ))}
          </div>
        </div>
      </CardBody>

      {stats && stats.length > 0 && (
        <CardFooter className="bg-light-subtle d-flex justify-content-between text-center border-top border-dashed">
          {stats.map((stat, idx) => (
            <div key={idx}>
              <h5 className="mb-0">{stat.prefix || ''}{stat.count}{stat.suffix || ''}</h5>
              <span className="text-muted">{stat.title}</span>
            </div>
          ))}
        </CardFooter>
      )}
    </Card>
  )
}

const Contacts = () => {
  const [contactsData, setContactsData] = useState<ContactType[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0, pageCount: 0 })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadContacts = async () => {
      setLoading(true)
      setError(null)
      try {
        const query: ContactsQuery = {
          page: pagination.page,
          pageSize: pagination.pageSize,
        }
        
        const result = await getContacts(query)
        setContactsData(result.contacts)
        setPagination(prev => ({
          ...prev,
          total: result.pagination.total,
          pageCount: result.pagination.pageCount
        }))
      } catch (err: any) {
        console.error('Error loading contacts:', err)
        setError(err.message || 'Error al cargar contactos')
      } finally {
        setLoading(false)
      }
    }
    
    loadContacts()
  }, [pagination.page, pagination.pageSize])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.pageCount) {
      setPagination(prev => ({ ...prev, page: newPage }))
    }
  }

  if (loading) {
    return (
      <Container fluid>
        <PageBreadcrumb title={'Contacts'} subtitle={'CRM'} />
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Cargando contactos...</p>
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container fluid>
        <PageBreadcrumb title={'Contacts'} subtitle={'CRM'} />
        <div className="alert alert-danger" role="alert">
          <strong>Error:</strong> {error}
        </div>
      </Container>
    )
  }

  return (
    <Container fluid>
      <PageBreadcrumb title={'Contacts'} subtitle={'CRM'} />

      {contactsData.length === 0 ? (
        <div className="text-center py-5">
          <p className="text-muted">No se encontraron contactos.</p>
        </div>
      ) : (
        <>
          <Row>
            {contactsData.map((item) => (
              <Col md={6} xxl={4} key={item.id}>
                <ContactCard item={item} />
              </Col>
            ))}
          </Row>

          {pagination.pageCount > 1 && (
            <ul className="pagination pagination-rounded pagination-boxed justify-content-center">
              <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  aria-label="Previous"
                >
                  <span aria-hidden="true">«</span>
                </button>
              </li>
              {Array.from({ length: Math.min(5, pagination.pageCount) }, (_, i) => {
                let pageNum
                if (pagination.pageCount <= 5) {
                  pageNum = i + 1
                } else if (pagination.page <= 3) {
                  pageNum = i + 1
                } else if (pagination.page >= pagination.pageCount - 2) {
                  pageNum = pagination.pageCount - 4 + i
                } else {
                  pageNum = pagination.page - 2 + i
                }
                return (
                  <li key={pageNum} className={`page-item ${pagination.page === pageNum ? 'active' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </button>
                  </li>
                )
              })}
              <li className={`page-item ${pagination.page === pagination.pageCount ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pageCount}
                  aria-label="Next"
                >
                  <span aria-hidden="true">»</span>
                </button>
              </li>
            </ul>
          )}
        </>
      )}
    </Container>
  )
}

export default Contacts
