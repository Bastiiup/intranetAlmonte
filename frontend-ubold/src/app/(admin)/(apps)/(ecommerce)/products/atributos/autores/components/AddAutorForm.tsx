'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Form, Button, Row, Col, FormGroup, FormLabel, FormControl, Alert } from 'react-bootstrap'
import { LuSave, LuX } from 'react-icons/lu'

const AddAutorForm = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    nombre_completo_autor: '',
    nombres: '',
    primer_apellido: '',
    segundo_apellido: '',
    tipo_autor: 'Persona',
    foto: null as File | null,
    website: '',
    pais: '',
    // NOTA: estado_publicacion no se permite cambiar aquí, siempre será "pendiente" al crear
    // Solo se puede cambiar desde la página de Solicitudes
  })

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({
        ...prev,
        foto: e.target.files![0],
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Validar nombre completo obligatorio
      if (!formData.nombre_completo_autor.trim()) {
        throw new Error('El nombre completo del autor es obligatorio')
      }

      // Primero subir la foto si existe
      let fotoId = null
      if (formData.foto) {
        console.log('[AddAutor] Subiendo foto...')
        const uploadFormData = new FormData()
        uploadFormData.append('file', formData.foto)

        const uploadResponse = await fetch('/api/tienda/upload', {
          method: 'POST',
          body: uploadFormData,
        })

        const uploadResult = await uploadResponse.json()

        if (uploadResult.success && uploadResult.id) {
          fotoId = uploadResult.id
          console.log('[AddAutor] Foto subida con ID:', fotoId)
        } else {
          console.warn('[AddAutor] No se pudo subir la foto:', uploadResult.error)
          throw new Error(uploadResult.error || 'Error al subir la foto')
        }
      }

      // Preparar datos para Strapi (usar nombres del schema real)
      const autorData: any = {
        data: {
          nombre_completo_autor: formData.nombre_completo_autor.trim(),
          nombres: formData.nombres.trim() || null,
          primer_apellido: formData.primer_apellido.trim() || null,
          segundo_apellido: formData.segundo_apellido.trim() || null,
          tipo_autor: formData.tipo_autor,
          website: formData.website.trim() || null,
          pais: formData.pais || null,
          // estado_publicacion siempre será "pendiente" al crear (se envía en el backend)
          // Solo se puede cambiar desde la página de Solicitudes
        },
      }

      // Agregar foto si existe
      if (fotoId) {
        autorData.data.foto = fotoId
      }

      // Crear el autor
      const response = await fetch('/api/tienda/autores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(autorData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear el autor')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/products/atributos/autores')
      }, 1500)
    } catch (err: any) {
      console.error('Error al crear autor:', err)
      setError(err.message || 'Error al crear el autor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Row>
      <Col xs={12}>
        <Card>
          <CardHeader>
            <h4 className="card-title mb-0">Agregar Autor</h4>
          </CardHeader>
          <CardBody>
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert variant="success">
                Autor creado exitosamente. Redirigiendo...
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <Row>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>
                      Nombre Completo <span className="text-danger">*</span>
                    </FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Ej: Gabriel García Márquez"
                      value={formData.nombre_completo_autor}
                      onChange={(e) => handleFieldChange('nombre_completo_autor', e.target.value)}
                      required
                    />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>Tipo de Autor</FormLabel>
                    <FormControl
                      as="select"
                      value={formData.tipo_autor}
                      onChange={(e) => handleFieldChange('tipo_autor', e.target.value)}
                    >
                      <option value="Persona">Persona</option>
                      <option value="Empresa">Empresa</option>
                    </FormControl>
                  </FormGroup>
                </Col>
              </Row>

              <Row>
                <Col md={4}>
                  <FormGroup className="mb-3">
                    <FormLabel>Nombres</FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Ej: Gabriel"
                      value={formData.nombres}
                      onChange={(e) => handleFieldChange('nombres', e.target.value)}
                    />
                  </FormGroup>
                </Col>
                <Col md={4}>
                  <FormGroup className="mb-3">
                    <FormLabel>Primer Apellido</FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Ej: García"
                      value={formData.primer_apellido}
                      onChange={(e) => handleFieldChange('primer_apellido', e.target.value)}
                    />
                  </FormGroup>
                </Col>
                <Col md={4}>
                  <FormGroup className="mb-3">
                    <FormLabel>Segundo Apellido</FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Ej: Márquez"
                      value={formData.segundo_apellido}
                      onChange={(e) => handleFieldChange('segundo_apellido', e.target.value)}
                    />
                  </FormGroup>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>País</FormLabel>
                    <FormControl
                      as="select"
                      value={formData.pais}
                      onChange={(e) => handleFieldChange('pais', e.target.value)}
                    >
                      <option value="">Seleccionar país...</option>
                      <option value="Afganistán">Afganistán</option>
                      <option value="Albania">Albania</option>
                      <option value="Alemania">Alemania</option>
                      <option value="Andorra">Andorra</option>
                      <option value="Angola">Angola</option>
                      <option value="Antigua y Barbuda">Antigua y Barbuda</option>
                      <option value="Arabia Saudí">Arabia Saudí</option>
                      <option value="Argelia">Argelia</option>
                      <option value="Argentina">Argentina</option>
                      <option value="Armenia">Armenia</option>
                      <option value="Australia">Australia</option>
                      <option value="Austria">Austria</option>
                      <option value="Azerbaiyán">Azerbaiyán</option>
                      <option value="Bahamas">Bahamas</option>
                      <option value="Bangladés">Bangladés</option>
                      <option value="Barbados">Barbados</option>
                      <option value="Baréin">Baréin</option>
                      <option value="Bélgica">Bélgica</option>
                      <option value="Belice">Belice</option>
                      <option value="Benín">Benín</option>
                      <option value="Bielorrusia">Bielorrusia</option>
                      <option value="Birmania">Birmania</option>
                      <option value="Bolivia">Bolivia</option>
                      <option value="Bosnia y Herzegovina">Bosnia y Herzegovina</option>
                      <option value="Botsuana">Botsuana</option>
                      <option value="Brasil">Brasil</option>
                      <option value="Brunéi">Brunéi</option>
                      <option value="Bulgaria">Bulgaria</option>
                      <option value="Burkina Faso">Burkina Faso</option>
                      <option value="Burundi">Burundi</option>
                      <option value="Bután">Bután</option>
                      <option value="Cabo Verde">Cabo Verde</option>
                      <option value="Camboya">Camboya</option>
                      <option value="Camerún">Camerún</option>
                      <option value="Canadá">Canadá</option>
                      <option value="Catar">Catar</option>
                      <option value="Chad">Chad</option>
                      <option value="Chile">Chile</option>
                      <option value="China">China</option>
                      <option value="Chipre">Chipre</option>
                      <option value="Colombia">Colombia</option>
                      <option value="Comoras">Comoras</option>
                      <option value="Corea del Norte">Corea del Norte</option>
                      <option value="Corea del Sur">Corea del Sur</option>
                      <option value="Costa de Marfil">Costa de Marfil</option>
                      <option value="Costa Rica">Costa Rica</option>
                      <option value="Croacia">Croacia</option>
                      <option value="Cuba">Cuba</option>
                      <option value="Dinamarca">Dinamarca</option>
                      <option value="Dominica">Dominica</option>
                      <option value="Ecuador">Ecuador</option>
                      <option value="Egipto">Egipto</option>
                      <option value="El Salvador">El Salvador</option>
                      <option value="Emiratos Árabes Unidos">Emiratos Árabes Unidos</option>
                      <option value="Eritrea">Eritrea</option>
                      <option value="Eslovaquia">Eslovaquia</option>
                      <option value="Eslovenia">Eslovenia</option>
                      <option value="España">España</option>
                      <option value="Estados Unidos">Estados Unidos</option>
                      <option value="Estonia">Estonia</option>
                      <option value="Esuatini">Esuatini</option>
                      <option value="Etiopía">Etiopía</option>
                      <option value="Filipinas">Filipinas</option>
                      <option value="Finlandia">Finlandia</option>
                      <option value="Fiyi">Fiyi</option>
                      <option value="Francia">Francia</option>
                      <option value="Gabón">Gabón</option>
                      <option value="Gambia">Gambia</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Ghana">Ghana</option>
                      <option value="Granada">Granada</option>
                      <option value="Grecia">Grecia</option>
                      <option value="Guatemala">Guatemala</option>
                      <option value="Guinea">Guinea</option>
                      <option value="Guinea-Bisáu">Guinea-Bisáu</option>
                      <option value="Guinea Ecuatorial">Guinea Ecuatorial</option>
                      <option value="Guyana">Guyana</option>
                      <option value="Haití">Haití</option>
                      <option value="Honduras">Honduras</option>
                      <option value="Hungría">Hungría</option>
                      <option value="India">India</option>
                      <option value="Indonesia">Indonesia</option>
                      <option value="Irak">Irak</option>
                      <option value="Irán">Irán</option>
                      <option value="Irlanda">Irlanda</option>
                      <option value="Islandia">Islandia</option>
                      <option value="Islas Marshall">Islas Marshall</option>
                      <option value="Islas Salomón">Islas Salomón</option>
                      <option value="Israel">Israel</option>
                      <option value="Italia">Italia</option>
                      <option value="Jamaica">Jamaica</option>
                      <option value="Japón">Japón</option>
                      <option value="Jordania">Jordania</option>
                      <option value="Kazajistán">Kazajistán</option>
                      <option value="Kenia">Kenia</option>
                      <option value="Kirguistán">Kirguistán</option>
                      <option value="Kiribati">Kiribati</option>
                      <option value="Kuwait">Kuwait</option>
                      <option value="Laos">Laos</option>
                      <option value="Lesoto">Lesoto</option>
                      <option value="Letonia">Letonia</option>
                      <option value="Líbano">Líbano</option>
                      <option value="Liberia">Liberia</option>
                      <option value="Libia">Libia</option>
                      <option value="Liechtenstein">Liechtenstein</option>
                      <option value="Lituania">Lituania</option>
                      <option value="Luxemburgo">Luxemburgo</option>
                      <option value="Madagascar">Madagascar</option>
                      <option value="Malasia">Malasia</option>
                      <option value="Malaui">Malaui</option>
                      <option value="Maldivas">Maldivas</option>
                      <option value="Malí">Malí</option>
                      <option value="Malta">Malta</option>
                      <option value="Marruecos">Marruecos</option>
                      <option value="Mauricio">Mauricio</option>
                      <option value="Mauritania">Mauritania</option>
                      <option value="México">México</option>
                      <option value="Micronesia">Micronesia</option>
                      <option value="Moldavia">Moldavia</option>
                      <option value="Mónaco">Mónaco</option>
                      <option value="Mongolia">Mongolia</option>
                      <option value="Montenegro">Montenegro</option>
                      <option value="Mozambique">Mozambique</option>
                      <option value="Namibia">Namibia</option>
                      <option value="Nauru">Nauru</option>
                      <option value="Nepal">Nepal</option>
                      <option value="Nicaragua">Nicaragua</option>
                      <option value="Níger">Níger</option>
                      <option value="Nigeria">Nigeria</option>
                      <option value="Noruega">Noruega</option>
                      <option value="Nueva Zelanda">Nueva Zelanda</option>
                      <option value="Omán">Omán</option>
                      <option value="Países Bajos">Países Bajos</option>
                      <option value="Pakistán">Pakistán</option>
                      <option value="Palaos">Palaos</option>
                      <option value="Palestina">Palestina</option>
                      <option value="Panamá">Panamá</option>
                      <option value="Papúa Nueva Guinea">Papúa Nueva Guinea</option>
                      <option value="Paraguay">Paraguay</option>
                      <option value="Perú">Perú</option>
                      <option value="Polonia">Polonia</option>
                      <option value="Portugal">Portugal</option>
                      <option value="Reino Unido">Reino Unido</option>
                      <option value="República Centroafricana">República Centroafricana</option>
                      <option value="República Checa">República Checa</option>
                      <option value="República del Congo">República del Congo</option>
                      <option value="República Democrática del Congo">República Democrática del Congo</option>
                      <option value="República Dominicana">República Dominicana</option>
                      <option value="Ruanda">Ruanda</option>
                      <option value="Rumania">Rumania</option>
                      <option value="Rusia">Rusia</option>
                      <option value="Samoa">Samoa</option>
                      <option value="San Cristóbal y Nieves">San Cristóbal y Nieves</option>
                      <option value="San Marino">San Marino</option>
                      <option value="San Vicente y las Granadinas">San Vicente y las Granadinas</option>
                      <option value="Santa Lucía">Santa Lucía</option>
                      <option value="Santo Tomé y Príncipe">Santo Tomé y Príncipe</option>
                      <option value="Senegal">Senegal</option>
                      <option value="Serbia">Serbia</option>
                      <option value="Seychelles">Seychelles</option>
                      <option value="Sierra Leona">Sierra Leona</option>
                      <option value="Singapur">Singapur</option>
                      <option value="Siria">Siria</option>
                      <option value="Somalia">Somalia</option>
                      <option value="Sri Lanka">Sri Lanka</option>
                      <option value="Sudáfrica">Sudáfrica</option>
                      <option value="Sudán">Sudán</option>
                      <option value="Sudán del Sur">Sudán del Sur</option>
                      <option value="Suecia">Suecia</option>
                      <option value="Suiza">Suiza</option>
                      <option value="Surinam">Surinam</option>
                      <option value="Tailandia">Tailandia</option>
                      <option value="Tanzania">Tanzania</option>
                      <option value="Tayikistán">Tayikistán</option>
                      <option value="Timor Oriental">Timor Oriental</option>
                      <option value="Togo">Togo</option>
                      <option value="Tonga">Tonga</option>
                      <option value="Trinidad y Tobago">Trinidad y Tobago</option>
                      <option value="Túnez">Túnez</option>
                      <option value="Turkmenistán">Turkmenistán</option>
                      <option value="Turquía">Turquía</option>
                      <option value="Tuvalu">Tuvalu</option>
                      <option value="Ucrania">Ucrania</option>
                      <option value="Uganda">Uganda</option>
                      <option value="Uruguay">Uruguay</option>
                      <option value="Uzbekistán">Uzbekistán</option>
                      <option value="Vanuatu">Vanuatu</option>
                      <option value="Vaticano">Vaticano</option>
                      <option value="Venezuela">Venezuela</option>
                      <option value="Vietnam">Vietnam</option>
                      <option value="Yemen">Yemen</option>
                      <option value="Yibuti">Yibuti</option>
                      <option value="Zambia">Zambia</option>
                      <option value="Zimbabue">Zimbabue</option>
                    </FormControl>
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>Website</FormLabel>
                    <FormControl
                      type="url"
                      placeholder="https://ejemplo.com"
                      value={formData.website}
                      onChange={(e) => handleFieldChange('website', e.target.value)}
                    />
                  </FormGroup>
                </Col>
              </Row>


              <Row>
                <Col md={12}>
                  <FormGroup className="mb-3">
                    <FormLabel>Foto</FormLabel>
                    <FormControl
                      type="file"
                      accept="image/*"
                      onChange={handleFotoChange}
                    />
                    <small className="text-muted">Formatos permitidos: JPG, PNG, GIF</small>
                  </FormGroup>
                </Col>
              </Row>

              <div className="d-flex gap-2 justify-content-end">
                <Button
                  variant="light"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  <LuX className="me-1" /> Cancelar
                </Button>
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <LuSave className="me-1" /> Guardar Autor
                    </>
                  )}
                </Button>
              </div>
            </Form>
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}

export default AddAutorForm

