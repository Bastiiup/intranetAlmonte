'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container, Row, Col, Card, Button, Form, Alert, Spinner } from 'react-bootstrap';

interface Usuario {
  id: number;
  email: string;
  persona: {
    data: {
      id: number;
      attributes: {
        nombres: string;
        primer_apellido?: string;
        segundo_apellido?: string;
      };
    };
  };
  licencias_activadas: {
    data: Array<{
      id: number;
      attributes: {
        codigo_activacion: string;
        libro_mira: {
          data: {
            id: number;
            attributes: {
              libro: {
                data: {
                  id: number;
                  attributes: {
                    nombre_libro: string;
                    portada_libro?: {
                      data: {
                        id: number;
                        attributes: {
                          url: string;
                          alternativeText?: string;
                        };
                      } | null;
                    };
                  };
                };
              };
            };
          };
        };
      };
    }>;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [codigoActivacion, setCodigoActivacion] = useState('');
  const [activando, setActivando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const verificarAuth = async () => {
      const userData = localStorage.getItem('mira_user');
      if (!userData) {
        router.push('/login');
        return;
      }

      try {
        const user = JSON.parse(userData);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://strapi.moraleja.cl';
        
        const response = await fetch(`${apiUrl}/api/personas-mira/auth/me?id=${user.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Error al cargar datos del usuario');
        }

        const data = await response.json();
        setUsuario(data.data);
      } catch (err: any) {
        console.error('Error:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    verificarAuth();
  }, [router]);

  const handleCerrarSesion = () => {
    localStorage.removeItem('mira_user');
    router.push('/login');
  };

  const handleActivarLibro = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setActivando(true);

    try {
      const userData = localStorage.getItem('mira_user');
      if (!userData) {
        throw new Error('No hay sesión activa');
      }

      const user = JSON.parse(userData);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://strapi.moraleja.cl';

      const response = await fetch(`${apiUrl}/api/licencias-estudiantes/activar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codigo: codigoActivacion.trim(),
          persona_mira_id: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error al activar el libro');
      }

      const data = await response.json();
      setSuccess(data.message || 'Libro activado exitosamente');
      setCodigoActivacion('');

      // Recargar datos del usuario
      const meResponse = await fetch(`${apiUrl}/api/personas-mira/auth/me?id=${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (meResponse.ok) {
        const meData = await meResponse.json();
        setUsuario(meData.data);
      }
    } catch (err: any) {
      setError(err.message || 'Error al activar el libro');
    } finally {
      setActivando(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Cargando...</span>
          </Spinner>
        </div>
      </Container>
    );
  }

  if (!usuario) {
    return null; // El useEffect debería redirigir
  }

  const nombreCompleto = [
    usuario.persona?.data?.attributes?.nombres,
    usuario.persona?.data?.attributes?.primer_apellido,
    usuario.persona?.data?.attributes?.segundo_apellido,
  ]
    .filter(Boolean)
    .join(' ') || 'Estudiante';

  const licencias = usuario.licencias_activadas?.data || [];

  return (
    <Container className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-1">Hola, {nombreCompleto}</h1>
              <p className="text-muted mb-0">{usuario.email}</p>
            </div>
            <Button variant="outline-danger" onClick={handleCerrarSesion}>
              Cerrar Sesión
            </Button>
          </div>
        </Col>
      </Row>

      {/* Sección Activar Nuevo Libro */}
      <Row className="mb-5">
        <Col>
          <Card className="shadow-sm">
            <Card.Header>
              <h5 className="mb-0">Activar Nuevo Libro</h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleActivarLibro}>
                <Row>
                  <Col md={8}>
                    <Form.Group className="mb-3">
                      <Form.Label>Código de Activación</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Ingresa el código (ej: TEST-123)"
                        value={codigoActivacion}
                        onChange={(e) => setCodigoActivacion(e.target.value)}
                        required
                        disabled={activando}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4} className="d-flex align-items-end">
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-100"
                      disabled={activando}
                    >
                      {activando ? 'Activando...' : 'Activar'}
                    </Button>
                  </Col>
                </Row>
                {error && (
                  <Alert variant="danger" className="mt-3 mb-0">
                    {error}
                  </Alert>
                )}
                {success && (
                  <Alert variant="success" className="mt-3 mb-0">
                    {success}
                  </Alert>
                )}
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Sección Mis Libros */}
      <Row>
        <Col>
          <h2 className="h4 mb-4">Mis Libros</h2>
          {licencias.length === 0 ? (
            <Card className="shadow-sm">
              <Card.Body className="text-center py-5">
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📚</div>
                <p className="text-muted mb-0">Aún no tienes libros activados</p>
                <p className="text-muted small mt-2">
                  Usa el código de activación que recibiste para activar tu primer libro
                </p>
              </Card.Body>
            </Card>
          ) : (
            <Row>
              {licencias.map((licencia) => {
                const libroMira = licencia.attributes.libro_mira?.data;
                const libro = libroMira?.attributes?.libro?.data?.attributes;
                const portada = libro?.portada_libro?.data?.attributes;
                const portadaUrl = portada?.url
                  ? `${process.env.NEXT_PUBLIC_API_URL || 'https://strapi.moraleja.cl'}${portada.url}`
                  : null;
                const libroMiraId = libroMira?.id;

                return (
                  <Col key={licencia.id} md={6} lg={4} className="mb-4">
                    <Link
                      href={`/dashboard/libro/${libroMiraId}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <Card className="h-100 shadow-sm" style={{ cursor: 'pointer', transition: 'transform 0.2s' }}>
                        <div
                          style={{
                            height: '300px',
                            overflow: 'hidden',
                            backgroundColor: '#f8f9fa',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {portadaUrl ? (
                            <img
                              src={portadaUrl}
                              alt={portada?.alternativeText || libro?.nombre_libro || 'Portada del libro'}
                              className="img-fluid"
                              style={{
                                maxHeight: '100%',
                                maxWidth: '100%',
                                objectFit: 'contain',
                              }}
                            />
                          ) : (
                            <div className="text-center text-muted">
                              <div style={{ fontSize: '4rem' }}>📖</div>
                              <p className="small mb-0">Sin portada</p>
                            </div>
                          )}
                        </div>
                        <Card.Body>
                          <Card.Title className="h6 mb-2">
                            {libro?.nombre_libro || 'Libro sin nombre'}
                          </Card.Title>
                          <Card.Text className="small text-muted mb-0">
                            Código: <code>{licencia.attributes.codigo_activacion}</code>
                          </Card.Text>
                        </Card.Body>
                        <style jsx>{`
                          :global(.card:hover) {
                            transform: translateY(-4px);
                            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
                          }
                        `}</style>
                      </Card>
                    </Link>
                  </Col>
                );
              })}
            </Row>
          )}
        </Col>
      </Row>
    </Container>
  );
}


