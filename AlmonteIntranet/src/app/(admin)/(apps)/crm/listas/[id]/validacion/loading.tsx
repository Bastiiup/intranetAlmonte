'use client'

import { Container, Row, Col, Card, Placeholder } from 'react-bootstrap'

export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '1.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div className="d-flex justify-content-between align-items-center">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Spinner */}
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  border: '3px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}
              />
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
                Cargando validacion...
              </h2>
              <p style={{ margin: '4px 0 0', opacity: 0.8, fontSize: '0.9rem' }}>
                Obteniendo datos del PDF y productos
              </p>
            </div>
          </div>
          <Placeholder.Button variant="light" xs={1} style={{ width: '100px' }} />
        </div>
      </div>

      {/* Main Content */}
      <Row className="g-0" style={{ flex: '1 1 auto', minHeight: 0 }}>
        {/* Columna Izquierda: Productos */}
        <Col xs={12} md={6} style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 'calc(100vh - 200px)',
          borderRight: '1px solid #dee2e6',
          backgroundColor: 'white'
        }}>
          {/* Filtros */}
          <div style={{ padding: '1rem', borderBottom: '1px solid #e9ecef' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {[1, 2, 3].map((i) => (
                <Placeholder key={i} as="div" animation="glow">
                  <Placeholder
                    style={{
                      width: '100px',
                      height: '32px',
                      borderRadius: '6px',
                      display: 'inline-block'
                    }}
                  />
                </Placeholder>
              ))}
            </div>
            <Placeholder as="div" animation="glow">
              <Placeholder style={{ width: '100%', height: '38px', borderRadius: '6px' }} />
            </Placeholder>
          </div>

          {/* Tabla de productos skeleton */}
          <div style={{ flex: 1, padding: '1rem' }}>
            {[1, 2, 3, 4, 5, 6].map((row) => (
              <div
                key={row}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '12px 0',
                  borderBottom: '1px solid #f0f0f0',
                  alignItems: 'center'
                }}
              >
                <Placeholder as="div" animation="glow" style={{ width: '24px' }}>
                  <Placeholder style={{ width: '24px', height: '24px', borderRadius: '4px' }} />
                </Placeholder>
                <Placeholder as="div" animation="glow" style={{ width: '60px' }}>
                  <Placeholder style={{ width: '60px', height: '60px', borderRadius: '6px' }} />
                </Placeholder>
                <Placeholder as="div" animation="glow" style={{ flex: 1 }}>
                  <Placeholder style={{ width: '80%', height: '18px', borderRadius: '4px', marginBottom: '6px' }} />
                  <Placeholder style={{ width: '50%', height: '14px', borderRadius: '4px' }} />
                </Placeholder>
                <Placeholder as="div" animation="glow" style={{ width: '80px' }}>
                  <Placeholder style={{ width: '80px', height: '28px', borderRadius: '4px' }} />
                </Placeholder>
              </div>
            ))}
          </div>
        </Col>

        {/* Columna Derecha: PDF Viewer */}
        <Col xs={12} md={6} style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 'calc(100vh - 200px)',
          background: '#f5f5f5'
        }}>
          <Card className="h-100 border-0 rounded-0">
            <Card.Body className="d-flex flex-column h-100 p-0">
              {/* Header del PDF */}
              <div style={{
                padding: '1rem',
                borderBottom: '1px solid #dee2e6',
                background: 'white'
              }}>
                <Placeholder as="div" animation="glow">
                  <Placeholder style={{ width: '60%', height: '20px', borderRadius: '4px', marginBottom: '8px' }} />
                  <Placeholder style={{ width: '40%', height: '14px', borderRadius: '4px' }} />
                </Placeholder>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Placeholder key={i} as="div" animation="glow">
                      <Placeholder style={{ width: '36px', height: '36px', borderRadius: '6px' }} />
                    </Placeholder>
                  ))}
                </div>
              </div>

              {/* Area del PDF */}
              <div style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: '#e5e5e5',
                padding: '2rem'
              }}>
                <div style={{
                  background: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  padding: '2rem',
                  textAlign: 'center',
                  width: '300px'
                }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      margin: '0 auto 1rem',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        border: '4px solid rgba(255,255,255,0.3)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}
                    />
                  </div>
                  <h5 style={{ color: '#333', marginBottom: '0.5rem' }}>Cargando PDF...</h5>
                  <p style={{ color: '#666', fontSize: '0.85rem', margin: 0 }}>
                    Preparando el visor de documentos
                  </p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Estilos de animacion */}
      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
