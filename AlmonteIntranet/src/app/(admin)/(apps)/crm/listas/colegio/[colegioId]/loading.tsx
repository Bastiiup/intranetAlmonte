'use client'

import { Container, Card, Placeholder } from 'react-bootstrap'

export default function Loading() {
  return (
    <Container fluid>
      {/* Header skeleton */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Placeholder as="div" animation="glow">
          <Placeholder xs={4} size="lg" style={{ height: '28px', borderRadius: '4px' }} />
        </Placeholder>
        <Placeholder as="div" animation="glow" style={{ marginTop: '8px' }}>
          <Placeholder xs={2} style={{ height: '16px', borderRadius: '4px' }} />
        </Placeholder>
      </div>

      {/* Main loading card */}
      <Card>
        <Card.Header style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Spinner */}
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}
              />
            </div>
            <div>
              <h4 style={{ color: 'white', margin: 0, fontWeight: 600 }}>
                Cargando cursos...
              </h4>
              <p style={{ color: 'rgba(255,255,255,0.8)', margin: '4px 0 0', fontSize: '0.9rem' }}>
                Obteniendo informacion del colegio
              </p>
            </div>
          </div>
        </Card.Header>

        <Card.Body style={{ padding: '2rem' }}>
          {/* Filtros skeleton */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '1.5rem',
            flexWrap: 'wrap'
          }}>
            {[1, 2, 3].map((i) => (
              <Placeholder key={i} as="div" animation="glow">
                <Placeholder
                  style={{
                    width: '150px',
                    height: '38px',
                    borderRadius: '6px',
                    display: 'inline-block'
                  }}
                />
              </Placeholder>
            ))}
          </div>

          {/* Table skeleton */}
          <div style={{
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            {/* Table header */}
            <div style={{
              background: '#f8f9fa',
              padding: '12px 16px',
              borderBottom: '1px solid #e9ecef',
              display: 'flex',
              gap: '16px'
            }}>
              {['Curso', 'Nivel', 'Productos', 'PDF', 'Estado', 'Acciones'].map((col, i) => (
                <Placeholder key={col} as="div" animation="glow" style={{ flex: i === 0 ? 2 : 1 }}>
                  <Placeholder style={{ height: '16px', borderRadius: '4px', width: '80%' }} />
                </Placeholder>
              ))}
            </div>

            {/* Table rows */}
            {[1, 2, 3, 4, 5].map((row) => (
              <div
                key={row}
                style={{
                  padding: '16px',
                  borderBottom: row < 5 ? '1px solid #e9ecef' : 'none',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'center'
                }}
              >
                {[2, 1, 1, 1, 1, 1].map((flex, i) => (
                  <Placeholder key={i} as="div" animation="glow" style={{ flex }}>
                    <Placeholder
                      style={{
                        height: i === 5 ? '32px' : '20px',
                        borderRadius: '4px',
                        width: i === 5 ? '100px' : '70%'
                      }}
                    />
                  </Placeholder>
                ))}
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>

      {/* Estilos de animacion */}
      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </Container>
  )
}
