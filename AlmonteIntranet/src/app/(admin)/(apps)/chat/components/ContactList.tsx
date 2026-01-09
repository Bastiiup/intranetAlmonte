'use client'
import { ContactType } from '@/app/(admin)/(apps)/chat/types'
import SimplebarClient from '@/components/client-wrapper/SimplebarClient'
import Image from 'next/image'
import { useState } from 'react'
import { Button, Card, CardHeader, FormControl, ListGroup, ListGroupItem } from 'react-bootstrap'
import { LuSearch } from 'react-icons/lu'
import { TbPencilPlus } from 'react-icons/tb'

type PropsType = {
  contacts: ContactType[]
  setContact: (contact: ContactType) => void
}

const ContactList = ({ contacts, setContact }: PropsType) => {
  const [currentContact, setCurrentContact] = useState<ContactType | null>(contacts[0] || null)
  const [searchTerm, setSearchTerm] = useState('')

  // filter contacts by name or lastMessage
  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false),
  )

  // Actualizar currentContact cuando cambia el primer contacto
  if (contacts.length > 0 && (!currentContact || !contacts.find((c) => c.id === currentContact.id))) {
    setCurrentContact(contacts[0])
  }

  return (
    <Card className="h-100 mb-0 border-end-0 rounded-end-0">
      <CardHeader className="p-3 border-light card-bg d-block">
        <div className="d-flex gap-2">
          <div className="app-search flex-grow-1">
            <FormControl
              type="text"
              className="bg-light-subtle border-light"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <LuSearch className="app-search-icon text-muted" />
          </div>
          <Button variant="dark" className="btn-icon">
            <TbPencilPlus className="fs-xl" />
          </Button>
        </div>
      </CardHeader>
      <SimplebarClient className="card-body p-2" style={{ height: 'calc(100% - 100px)' }} data-simplebar data-simplebar-md>
        {filteredContacts.length === 0 ? (
          <div className="text-center text-muted p-4">
            {searchTerm ? 'No se encontraron contactos' : 'No hay contactos disponibles'}
          </div>
        ) : (
          <ListGroup variant="flush" className="chat-list">
            {filteredContacts.map((contact) => (
            <ListGroupItem
              key={contact.id}
              action
              className={`d-flex gap-2 justify-content-between ${currentContact && contact.id === currentContact.id ? 'active' : ''}`}
              onClick={() => {
                setContact(contact)
                setCurrentContact(contact)
              }}>
              <span className="d-flex justify-content-start align-items-center gap-2 overflow-hidden">
                <span className="avatar avatar-sm flex-shrink-0">
                  {contact.avatar ? (
                    <Image 
                      src={typeof contact.avatar === 'object' && 'src' in contact.avatar 
                        ? contact.avatar.src 
                        : (contact.avatar as any).src} 
                      alt="" 
                      height={36} 
                      width={36} 
                      className="img-fluid rounded-circle" 
                    />
                  ) : (
                    <span className="avatar-title text-bg-primary fw-bold rounded-circle">{contact.name.charAt(0).toUpperCase()}</span>
                  )}
                </span>
                <span className="overflow-hidden">
                  <span className="text-nowrap fw-semibold fs-base mb-0 lh-base">{contact.name}</span>
                  {contact.lastMessage && <span className="text-muted d-block fs-xs mb-0 text-truncate">{contact.lastMessage}</span>}
                </span>
              </span>
              <span className="d-flex flex-column gap-1 justify-content-center flex-shrink-0 align-items-end">
                {contact.timestamp && <span className="text-muted fs-xs">{contact.timestamp}</span>}
                {contact.unreadMessages && <span className="badge text-bg-primary fs-xxs">{contact.unreadMessages}</span>}
              </span>
            </ListGroupItem>
            ))}
          </ListGroup>
        )}
      </SimplebarClient>
    </Card>
  )
}

export default ContactList
