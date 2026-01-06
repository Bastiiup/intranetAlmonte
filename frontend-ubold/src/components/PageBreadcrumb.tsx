import Link from 'next/link'
import { BreadcrumbItem, OverlayTrigger, Popover, Button } from 'react-bootstrap'
import { TbChevronRight } from 'react-icons/tb'
import { TbInfoCircle } from 'react-icons/tb'

type PageBreadcrumbProps = {
  title: string
  subtitle?: string
  infoText?: string
}

const PageBreadcrumb = ({ title, subtitle, infoText }: PageBreadcrumbProps) => {
  const infoPopover = infoText ? (
    <Popover id={`popover-${title}`} style={{ maxWidth: '400px' }}>
      <Popover.Header as="h6" className="fw-semibold">
        <TbInfoCircle className="me-1" />
        ¿Qué es {title}?
      </Popover.Header>
      <Popover.Body className="text-muted">
        {infoText}
      </Popover.Body>
    </Popover>
  ) : null

  return (
    <div className="page-title-head d-flex align-items-center">
      <div className="flex-grow-1 d-flex align-items-center gap-2">
        <h4 className="fs-xl fw-bold m-0">{title}</h4>
        {infoText && (
          <OverlayTrigger
            trigger={['hover', 'focus', 'click']}
            placement="bottom"
            overlay={infoPopover!}
          >
            <Button
              variant="link"
              className="p-0 text-muted d-flex align-items-center"
              style={{ 
                fontSize: '1.1rem',
                lineHeight: 1,
                textDecoration: 'none',
                cursor: 'help',
                border: 'none',
                minWidth: 'auto'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.classList.remove('text-muted')
                e.currentTarget.classList.add('text-primary')
              }}
              onMouseLeave={(e) => {
                e.currentTarget.classList.remove('text-primary')
                e.currentTarget.classList.add('text-muted')
              }}
            >
              <TbInfoCircle />
            </Button>
          </OverlayTrigger>
        )}
      </div>
      <div className="text-end">
        <div className="breadcrumb m-0 py-0 d-flex align-items-center gap-1">
          <BreadcrumbItem href="">
            Intranet Almonte
          </BreadcrumbItem>{' '}
          <TbChevronRight />
          {subtitle && (
            <>
              <BreadcrumbItem href="">
                {subtitle}
              </BreadcrumbItem>{' '}
              <TbChevronRight />
            </>
          )}
          <BreadcrumbItem active>{title}</BreadcrumbItem>
        </div>
      </div>
    </div>
  )
}

export default PageBreadcrumb
