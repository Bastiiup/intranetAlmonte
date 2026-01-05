'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface Usuario {
  id: number;
  email: string;
  licencias_activadas?: Array<{
    id: number;
    libro_mira: {
      id: number;
      documentId?: string;
      libro: {
        id: number;
        nombre_libro: string;
        isbn_libro?: string;
      };
    };
  }>;
}

interface LibroMira {
  id: number;
  documentId?: string;
  libro: {
    id: number;
    nombre_libro: string;
    isbn_libro?: string;
  };
}

export default function CrearEvaluacionPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [librosDisponibles, setLibrosDisponibles] = useState<LibroMira[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [nombre, setNombre] = useState('');
  const [libroSeleccionado, setLibroSeleccionado] = useState<string>('');
  const [categoria, setCategoria] = useState<string>('');
  const [cantidadPreguntas, setCantidadPreguntas] = useState(20);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Error/Success states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Cargar usuario y libros disponibles
  useEffect(() => {
    const cargarDatos = async () => {
      const userData = localStorage.getItem('mira_user');
      if (!userData) {
        router.push('/login');
        return;
      }

      try {
        const user = JSON.parse(userData);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://strapi.moraleja.cl';
        
        // Obtener datos completos del usuario
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
        const usuarioCompleto = data.data;
        setUsuario(usuarioCompleto);

        // Extraer libros únicos de las licencias activadas
        const licenciasActivas = usuarioCompleto.licencias_activadas?.filter((lic: any) => lic.activa) || [];
        const librosUnicos = new Map();
        
        licenciasActivas.forEach((licencia: any) => {
          const libroMira = licencia.libro_mira;
          if (libroMira) {
            const key = libroMira.documentId || libroMira.id;
            if (!librosUnicos.has(key)) {
              librosUnicos.set(key, {
                id: libroMira.id,
                documentId: libroMira.documentId,
                libro: libroMira.libro,
              });
            }
          }
        });

        setLibrosDisponibles(Array.from(librosUnicos.values()));
      } catch (err: any) {
        console.error('Error:', err);
        setError('Error al cargar los datos. Por favor, intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [router]);

  // Generar preview de imagen
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Solo se permiten archivos de imagen.');
        setSelectedFile(null);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('El archivo es demasiado grande. Máximo 10MB.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Solo se permiten archivos de imagen.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('El archivo es demasiado grande. Máximo 10MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleNext = () => {
    setError(null);
    
    if (!nombre.trim()) {
      setError('El nombre de la evaluación es requerido.');
      return;
    }
    if (!libroSeleccionado) {
      setError('Debes seleccionar un libro.');
      return;
    }
    if (!categoria) {
      setError('Debes seleccionar una categoría.');
      return;
    }
    if (!cantidadPreguntas || cantidadPreguntas < 1) {
      setError('La cantidad de preguntas debe ser mayor a 0.');
      return;
    }

    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    if (!selectedFile) {
      setError('Debes subir una imagen de la hoja maestra.');
      setSubmitting(false);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://strapi.moraleja.cl';
      const formData = new FormData();

      // Preparar data payload
      // Convertir libroSeleccionado a número (Strapi requiere números para relaciones)
      const libroMiraId = parseInt(libroSeleccionado, 10);
      if (isNaN(libroMiraId)) {
        throw new Error('ID de libro inválido');
      }

      const dataPayload = {
        nombre: nombre.trim(),
        categoria: categoria,
        cantidad_preguntas: cantidadPreguntas,
        libro_mira: libroMiraId,
        activo: true,
      };
      formData.append('data', JSON.stringify(dataPayload));

      // Agregar archivo
      formData.append('files.hoja_maestra_imagen', selectedFile, selectedFile.name);

      // Obtener token si existe
      const token = localStorage.getItem('mira_token');
      const headers: HeadersInit = {};
      if (token) {
        try {
          const tokenData = JSON.parse(token);
          headers['Authorization'] = `Bearer ${tokenData.jwt}`;
        } catch {
          // Si el token no es JSON, intentar usarlo directamente
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const response = await fetch(`${apiUrl}/api/evaluaciones`, {
        method: 'POST',
        headers: headers,
        body: formData,
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch (jsonError) {
        // Si la respuesta no es JSON, leer como texto
        const textError = await response.text();
        throw new Error(`Error ${response.status}: ${textError || 'No se pudo crear la evaluación'}`);
      }

      if (!response.ok) {
        throw new Error(
          responseData.error?.message || 
          responseData.message || 
          responseData.error?.details?.errors?.[0]?.message ||
          `Error ${response.status}: No se pudo crear la evaluación.`
        );
      }

      setSuccess('¡Evaluación creada exitosamente!');
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error('Error al crear evaluación:', err);
      setError(err.message || 'Error desconocido al crear la evaluación. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-300">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error al cargar los datos del usuario.</p>
          <Link href="/dashboard" className="text-blue-400 hover:text-blue-300">
            Volver al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header con botón volver */}
        <div className="mb-6">
          <Link href="/dashboard">
            <button className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 mb-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver al Dashboard
            </button>
          </Link>
        </div>

        {/* Card principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Indicador de pasos */}
          <div className="bg-gray-50 px-8 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                  step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  1
                </div>
                <span className={`font-medium ${step >= 1 ? 'text-gray-900' : 'text-gray-400'}`}>
                  Información Básica
                </span>
              </div>
              <div className="flex-1 h-0.5 bg-gray-300 mx-4"></div>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                  step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  2
                </div>
                <span className={`font-medium ${step >= 2 ? 'text-gray-900' : 'text-gray-400'}`}>
                  Hoja Maestra
                </span>
              </div>
            </div>
          </div>

          {/* Contenido del formulario */}
          <div className="p-8">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Crear Evaluación</h2>

                  <div className="space-y-6">
                    {/* Nombre Evaluación */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre Evaluación <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Ej: Ensayo Simce 1"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>

                    {/* Libro Asociado */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Libro Asociado <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={libroSeleccionado}
                        onChange={(e) => setLibroSeleccionado(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                      >
                        <option value="">Selecciona un libro</option>
                        {librosDisponibles.map((libro) => (
                          <option key={libro.documentId || libro.id} value={libro.documentId || libro.id}>
                            {libro.libro.nombre_libro} {libro.libro.isbn_libro ? `(ISBN: ${libro.libro.isbn_libro})` : ''}
                          </option>
                        ))}
                      </select>
                      {librosDisponibles.length === 0 && (
                        <p className="mt-2 text-sm text-gray-500">
                          No tienes libros activados. Activa un libro desde el dashboard primero.
                        </p>
                      )}
                    </div>

                    {/* Categoría */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Categoría <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={categoria}
                        onChange={(e) => setCategoria(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                      >
                        <option value="">Selecciona una categoría</option>
                        <option value="Básica">Básica</option>
                        <option value="Media">Media</option>
                        <option value="Simce">Simce</option>
                        <option value="Paes">Paes</option>
                        <option value="Universitaria">Universitaria</option>
                      </select>
                    </div>

                    {/* Cantidad de Preguntas */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cantidad de Preguntas <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={cantidadPreguntas}
                        onChange={(e) => setCantidadPreguntas(parseInt(e.target.value) || 0)}
                        min="1"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Botón Siguiente */}
                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={handleNext}
                      className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                    >
                      Siguiente
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Cargar Claves (Hoja Maestra)</h2>
                  <p className="text-gray-600 mb-6">
                    Asegúrate de marcar todas las respuestas correctas en la hoja.
                  </p>

                  {/* Área de subida de imagen */}
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    
                    {previewUrl ? (
                      <div className="space-y-4">
                        <img
                          src={previewUrl}
                          alt="Preview de la hoja maestra"
                          className="max-w-full max-h-96 mx-auto rounded-lg shadow-lg"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          Cambiar imagen
                        </button>
                      </div>
                    ) : (
                      <div>
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <p className="mt-4 text-lg font-medium text-gray-700">
                          Click para subir o arrastra una imagen aquí
                        </p>
                        <p className="mt-2 text-sm text-gray-500">
                          PNG, JPG, GIF hasta 10MB
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Botones */}
                  <div className="mt-8 flex justify-between">
                    <button
                      onClick={handleBack}
                      className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!selectedFile || submitting}
                      className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Creando...
                        </>
                      ) : (
                        'Finalizar y Crear'
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Mensajes de error/success */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg"
            >
              <strong>Error:</strong> {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg"
            >
              <strong>Éxito:</strong> {success}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

