'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Container, Row, Col, Card, Button, Spinner, Alert } from 'react-bootstrap';

interface LibroMira {
  id: number;
  attributes: {
    libro: {
      data: {
        id: number;
        attributes: {
          nombre_libro: string;
          subtitulo_libro?: string;
          isbn_libro: string;
          portada_libro?: {
            data: {
              id: number;
              attributes: {
                url: string;
                alternativeText?: string;
              };
            } | null;
          };
          autor_relacion?: {
            data: {
              id: number;
              attributes: {
                nombre_completo_autor: string;
              };
            } | null;
          };
          numero_edicion?: number;
          agno_edicion?: number;
        };
      };
    };
    google_drive_folder_id?: string;
    url_qr_redireccion?: string;
    codigo_activacion_base: string;
  };
}

export default function LibroDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [libro, setLibro] = useState<LibroMira | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLibro = async () => {
      if (!id) {
        setError('ID del libro no proporcionado');
        setLoading(false);
        return;
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://strapi.moraleja.cl';
        
        // Obtener el usuario del localStorage para el token (si es necesario)
        const userData = localStorage.getItem('mira_user');
        const user = userData ? JSON.parse(userData) : null;

        const response = await fetch(
          `${apiUrl}/api/libros-mira/${id}?populate=libro.portada_libro,libro.autor_relacion`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              // Si necesitas autenticación, agrega el token aquí
              // ...(user?.token && { Authorization: `Bearer ${user.token}` }),
            },
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Libro no encontrado');
          }
          throw new Error(`Error al cargar el libro: ${response.status}`);
        }

        const data = await response.json();
        setLibro(data.data);
      } catch (err: any) {
        setError(err.message || 'Error al cargar el libro');
      } finally {
        setLoading(false);
      }
    };

    fetchLibro();
  }, [id]);

  const handleGoogleDriveClick = () => {
    if (libro?.attributes?.google_drive_folder_id) {
      const driveUrl = `https://drive.google.com/drive/folders/${libro.attributes.google_drive_folder_id}`;
      window.open(driveUrl, '_blank');
    }
  };

  const handleQRClick = () => {
    if (libro?.attributes?.url_qr_redireccion) {
      window.open(libro.attributes.url_qr_redireccion, '_blank');
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

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error}</p>
          <Link href="/dashboard">
            <Button variant="primary">Volver al Dashboard</Button>
          </Link>
        </Alert>
      </Container>
    );
  }

  if (!libro) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          <Alert.Heading>Libro no encontrado</Alert.Heading>
          <p>El libro solicitado no existe o no está disponible.</p>
          <Link href="/dashboard">
            <Button variant="primary">Volver al Dashboard</Button>
          </Link>
        </Alert>
      </Container>
    );
  }

  const libroData = libro.attributes.libro.data.attributes;
  const portadaUrl = libroData.portada_libro?.data?.attributes?.url
    ? `${process.env.NEXT_PUBLIC_API_URL || 'https://strapi.moraleja.cl'}${libroData.portada_libro.data.attributes.url}`
    : null;
  const autor = libroData.autor_relacion?.data?.attributes?.nombre_completo_autor;
  const tieneRecursos = libro.attributes.google_drive_folder_id || libro.attributes.url_qr_redireccion;

  return (
    <Container className="py-4">
      {/* Botón Volver */}
      <div className="mb-4">
        <Link href="/dashboard">
          <Button variant="outline-secondary" size="sm">
            ← Volver al Dashboard
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="mb-4">
        <h1 className="display-4 mb-2">{libroData.nombre_libro}</h1>
        {libroData.subtitulo_libro && (
          <p className="lead text-muted">{libroData.subtitulo_libro}</p>
        )}
      </div>

      {/* Grid de 2 columnas */}
      <Row>
        {/* Columna Izquierda: Portada */}
        <Col md={6} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Body className="d-flex align-items-center justify-content-center" style={{ minHeight: '500px' }}>
              {portadaUrl ? (
                <img
                  src={portadaUrl}
                  alt={libroData.portada_libro?.data?.attributes?.alternativeText || libroData.nombre_libro}
                  className="img-fluid"
                  style={{ maxHeight: '500px', objectFit: 'contain' }}
                />
              ) : (
                <div className="text-center text-muted">
                  <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📚</div>
                  <p>Portada no disponible</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Columna Derecha: Información y Acciones */}
        <Col md={6}>
          {/* Información del Libro */}
          <Card className="mb-4 shadow-sm">
            <Card.Header>
              <h5 className="mb-0">Información del Libro</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <strong>ISBN:</strong> {libroData.isbn_libro}
              </div>
              {autor && (
                <div className="mb-3">
                  <strong>Autor:</strong> {autor}
                </div>
              )}
              {libroData.numero_edicion && (
                <div className="mb-3">
                  <strong>Edición:</strong> {libroData.numero_edicion}
                  {libroData.agno_edicion && ` (${libroData.agno_edicion})`}
                </div>
              )}
              <div className="mb-3">
                <strong>Código de Activación:</strong>{' '}
                <code className="bg-light px-2 py-1 rounded">{libro.attributes.codigo_activacion_base}</code>
              </div>
            </Card.Body>
          </Card>

          {/* Panel de Acciones */}
          <Card className="shadow-sm">
            <Card.Header>
              <h5 className="mb-0">Recursos y Acciones</h5>
            </Card.Header>
            <Card.Body>
              {tieneRecursos ? (
                <div className="d-grid gap-3">
                  {libro.attributes.google_drive_folder_id && (
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleGoogleDriveClick}
                      className="d-flex align-items-center justify-content-center gap-2"
                    >
                      <span style={{ fontSize: '1.5rem' }}>📂</span>
                      <span>Abrir Recursos en Google Drive</span>
                    </Button>
                  )}
                  {libro.attributes.url_qr_redireccion && (
                    <Button
                      variant="outline-primary"
                      size="lg"
                      onClick={handleQRClick}
                      className="d-flex align-items-center justify-content-center gap-2"
                    >
                      <span style={{ fontSize: '1.5rem' }}>🔗</span>
                      <span>Abrir Recurso QR</span>
                    </Button>
                  )}
                </div>
              ) : (
                <Alert variant="info" className="mb-0">
                  <Alert.Heading>Recursos Próximamente</Alert.Heading>
                  <p className="mb-0">
                    Próximamente agregaremos recursos para este título. 
                    Vuelve pronto para acceder a materiales adicionales.
                  </p>
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}


