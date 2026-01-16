'use client'

import { useState, useEffect, useMemo } from 'react'
import { FormGroup, FormLabel, FormControl, Row, Col } from 'react-bootstrap'
import { getPostalCode } from './ChilePostalCodes'

/**
 * Datos de Regiones y Comunas de Chile
 * Fuente: https://www.subdere.gov.cl/
 */
export const CHILE_REGIONS = [
  { id: '15', name: 'Arica y Parinacota', code: 'AP' },
  { id: '01', name: 'Tarapacá', code: 'TA' },
  { id: '02', name: 'Antofagasta', code: 'AN' },
  { id: '03', name: 'Atacama', code: 'AT' },
  { id: '04', name: 'Coquimbo', code: 'CO' },
  { id: '05', name: 'Valparaíso', code: 'VA' },
  { id: '06', name: 'Región del Libertador General Bernardo O\'Higgins', code: 'OH' },
  { id: '07', name: 'Región del Maule', code: 'MA' },
  { id: '16', name: 'Ñuble', code: 'NB' },
  { id: '08', name: 'Región del Biobío', code: 'BI' },
  { id: '09', name: 'Región de la Araucanía', code: 'AR' },
  { id: '14', name: 'Región de Los Ríos', code: 'LR' },
  { id: '10', name: 'Región de Los Lagos', code: 'LL' },
  { id: '11', name: 'Región de Aysén del General Carlos Ibáñez del Campo', code: 'AI' },
  { id: '12', name: 'Región de Magallanes y de la Antártica Chilena', code: 'MG' },
  { id: '13', name: 'Región Metropolitana de Santiago', code: 'RM' },
] as const

// Exportar para uso externo
export { CHILE_REGIONS }

export const CHILE_COMUNAS: Record<string, string[]> = {
  '15': ['Arica', 'Camarones', 'General Lagos', 'Putre'],
  '01': ['Alto Hospicio', 'Camiña', 'Colchane', 'Huara', 'Iquique', 'Pica', 'Pozo Almonte'],
  '02': ['Antofagasta', 'Calama', 'María Elena', 'Mejillones', 'Ollagüe', 'San Pedro de Atacama', 'Sierra Gorda', 'Taltal', 'Tocopilla'],
  '03': ['Alto del Carmen', 'Caldera', 'Chañaral', 'Copiapó', 'Diego de Almagro', 'Freirina', 'Huasco', 'Tierra Amarilla', 'Vallenar'],
  '04': ['Andacollo', 'Canela', 'Combarbalá', 'Coquimbo', 'Illapel', 'La Higuera', 'La Serena', 'Los Vilos', 'Monte Patria', 'Ovalle', 'Paiguano', 'Punitaqui', 'Río Hurtado', 'Salamanca', 'Vicuña'],
  '05': ['Algarrobo', 'Cabildo', 'Calera', 'Calle Larga', 'Cartagena', 'Casablanca', 'Catemu', 'Concón', 'El Quisco', 'El Tabo', 'Hijuelas', 'Isla de Pascua', 'Juan Fernández', 'La Calera', 'La Cruz', 'La Ligua', 'Limache', 'Llaillay', 'Los Andes', 'Nogales', 'Olmué', 'Panquehue', 'Papudo', 'Petorca', 'Puchuncaví', 'Putaendo', 'Quillota', 'Quilpué', 'Quintero', 'Rinconada', 'San Antonio', 'San Esteban', 'San Felipe', 'Santa María', 'Santo Domingo', 'Valparaíso', 'Villa Alemana', 'Viña del Mar', 'Zapallar'],
  '06': ['Chépica', 'Chimbarongo', 'Codegua', 'Coltauco', 'Coinco', 'Colchagua', 'Doñihue', 'Graneros', 'La Estrella', 'Las Cabras', 'Litueche', 'Lolol', 'Machalí', 'Malloa', 'Marchigüe', 'Mostazal', 'Nancagua', 'Navidad', 'Olivar', 'Palmilla', 'Paredones', 'Peralillo', 'Peumo', 'Pichidegua', 'Pichilemu', 'Placilla', 'Pumanque', 'Quinta de Tilcoco', 'Rancagua', 'Rengo', 'Requínoa', 'San Fernando', 'San Vicente', 'Santa Cruz', 'Talca', 'Teno', 'Vichuquén'],
  '07': ['Cauquenes', 'Chanco', 'Colbún', 'Constitución', 'Curepto', 'Curicó', 'Empedrado', 'Hualañé', 'Licantén', 'Linares', 'Longaví', 'Maule', 'Molina', 'Parral', 'Pelarco', 'Pelluhue', 'Pencahue', 'Rauco', 'Retiro', 'Río Claro', 'Romeral', 'Sagrada Familia', 'San Clemente', 'San Javier', 'San Rafael', 'Talca', 'Teno', 'Vichuquén', 'Villa Alegre', 'Yerbas Buenas'],
  '16': ['Bulnes', 'Chillán', 'Chillán Viejo', 'Cobquecura', 'Coelemu', 'Coihueco', 'El Carmen', 'Ninhue', 'Ñiquén', 'Pemuco', 'Pinto', 'Portezuelo', 'Quillón', 'Quirihue', 'Ránquil', 'San Carlos', 'San Fabián', 'San Ignacio', 'San Nicolás', 'Treguaco', 'Yungay'],
  '08': ['Alto Biobío', 'Antuco', 'Arauco', 'Cabrero', 'Cañete', 'Chiguayante', 'Concepción', 'Contulmo', 'Coronel', 'Curanilahue', 'Florida', 'Hualpén', 'Hualqui', 'Laja', 'Lebu', 'Los Álamos', 'Los Ángeles', 'Lota', 'Mulchén', 'Nacimiento', 'Negrete', 'Penco', 'Quilaco', 'Quilleco', 'San Pedro de la Paz', 'San Rosendo', 'Santa Bárbara', 'Santa Juana', 'Talcahuano', 'Tirúa', 'Tomé', 'Tucapel', 'Yumbel'],
  '09': ['Angol', 'Carahue', 'Cholchol', 'Collipulli', 'Cunco', 'Curacautín', 'Curarrehue', 'Ercilla', 'Freire', 'Galvarino', 'Gorbea', 'Lautaro', 'Loncoche', 'Lonquimay', 'Los Sauces', 'Lumaco', 'Melipeuco', 'Nueva Imperial', 'Padre Las Casas', 'Perquenco', 'Pitrufquén', 'Pucón', 'Puerto Saavedra', 'Purén', 'Renaico', 'Temuco', 'Teodoro Schmidt', 'Toltén', 'Traiguén', 'Victoria', 'Vilcún', 'Villarrica'],
  '14': ['Corral', 'Futrono', 'La Unión', 'Lago Ranco', 'Lanco', 'Los Lagos', 'Máfil', 'Mariquina', 'Paillaco', 'Panguipulli', 'Río Bueno', 'San José de la Mariquina', 'Valdivia'],
  '10': ['Ancud', 'Calbuco', 'Castro', 'Chaitén', 'Chonchi', 'Cochamó', 'Curaco de Vélez', 'Dalcahue', 'Fresia', 'Frutillar', 'Futaleufú', 'Hualaihué', 'Llanquihue', 'Los Muermos', 'Maullín', 'Osorno', 'Palena', 'Puerto Montt', 'Puerto Octay', 'Puerto Varas', 'Puqueldón', 'Purranque', 'Puyehue', 'Queilén', 'Quellón', 'Quemchi', 'Quinchao', 'Río Negro', 'San Juan de la Costa', 'San Pablo'],
  '11': ['Aysén', 'Chile Chico', 'Cisnes', 'Cochrane', 'Coihaique', 'Guaitecas', 'Lago Verde', 'O\'Higgins', 'Río Ibáñez', 'Tortel'],
  '12': ['Antártica', 'Cabo de Hornos', 'Laguna Blanca', 'Natales', 'Porvenir', 'Primavera', 'Punta Arenas', 'Río Verde', 'San Gregorio', 'Timaukel', 'Torres del Paine'],
  '13': ['Alhué', 'Buin', 'Calera de Tango', 'Cerrillos', 'Cerro Navia', 'Colina', 'Conchalí', 'Curacaví', 'El Bosque', 'El Monte', 'Estación Central', 'Huechuraba', 'Independencia', 'Isla de Maipo', 'La Cisterna', 'La Florida', 'La Granja', 'La Pintana', 'La Reina', 'Lampa', 'Las Condes', 'Lo Barnechea', 'Lo Espejo', 'Lo Prado', 'Macul', 'Maipú', 'María Pinto', 'Melipilla', 'Ñuñoa', 'Padre Hurtado', 'Paine', 'Pedro Aguirre Cerda', 'Peñaflor', 'Peñalolén', 'Pirque', 'Providencia', 'Pudahuel', 'Puente Alto', 'Quilicura', 'Quinta Normal', 'Recoleta', 'Renca', 'San Bernardo', 'San Joaquín', 'San José de Maipo', 'San Miguel', 'San Pedro', 'San Ramón', 'Santiago', 'Talagante', 'Tiltil', 'Vitacura'],
} as const

interface ChileRegionComunaProps {
  regionValue?: string
  comunaValue?: string
  onRegionChange: (region: string) => void
  onComunaChange: (comuna: string) => void
  onPostalCodeChange?: (postalCode: string) => void
  regionLabel?: string
  comunaLabel?: string
  regionRequired?: boolean
  comunaRequired?: boolean
  regionError?: string
  comunaError?: string
  regionPlaceholder?: string
  comunaPlaceholder?: string
  disabled?: boolean
  className?: string
  autoGeneratePostalCode?: boolean
}

/**
 * Componente para seleccionar Región y Comuna de Chile
 * Evita errores de tipeo al usar selectores validados
 */
export default function ChileRegionComuna({
  regionValue = '',
  comunaValue = '',
  onRegionChange,
  onComunaChange,
  onPostalCodeChange,
  regionLabel = 'Región',
  comunaLabel = 'Comuna',
  regionRequired = false,
  comunaRequired = false,
  regionError,
  comunaError,
  regionPlaceholder = 'Seleccione una región',
  comunaPlaceholder = 'Seleccione una comuna',
  disabled = false,
  className = '',
  autoGeneratePostalCode = true,
}: ChileRegionComunaProps) {
  // Helper para obtener el ID de región desde el nombre
  const getRegionIdFromName = (regionName: string): string | null => {
    if (!regionName) return null
    const region = CHILE_REGIONS.find(r => r.name === regionName)
    return region?.id || null
  }

  // Obtener el ID de la región seleccionada
  const selectedRegionId = getRegionIdFromName(regionValue)

  // Comunas disponibles según la región seleccionada
  const availableComunas = useMemo(() => {
    if (!selectedRegionId || !CHILE_COMUNAS[selectedRegionId]) {
      return []
    }
    return CHILE_COMUNAS[selectedRegionId].sort((a, b) => a.localeCompare(b))
  }, [selectedRegionId])

  // Resetear comuna si cambia la región y la comuna actual no pertenece a la nueva región
  useEffect(() => {
    if (selectedRegionId && comunaValue) {
      const comunas = CHILE_COMUNAS[selectedRegionId] || []
      if (!comunas.includes(comunaValue)) {
        onComunaChange('')
        // Limpiar código postal si cambia la región
        if (autoGeneratePostalCode && onPostalCodeChange) {
          onPostalCodeChange('')
        }
      }
    }
  }, [selectedRegionId, comunaValue, onComunaChange, autoGeneratePostalCode, onPostalCodeChange])

  // Generar código postal automáticamente cuando se selecciona región y comuna
  useEffect(() => {
    if (autoGeneratePostalCode && onPostalCodeChange && selectedRegionId && comunaValue) {
      const postalCode = getPostalCode(selectedRegionId, comunaValue)
      if (postalCode) {
        onPostalCodeChange(postalCode)
      }
    }
  }, [selectedRegionId, comunaValue, autoGeneratePostalCode, onPostalCodeChange])

  return (
    <Row className={className}>
      <Col md={6}>
        <FormGroup className="mb-3">
          <FormLabel>
            {regionLabel} {regionRequired && <span className="text-danger">*</span>}
          </FormLabel>
          <FormControl
            as="select"
            value={regionValue}
            onChange={(e) => {
              onRegionChange(e.target.value)
              // Limpiar código postal al cambiar región
              if (autoGeneratePostalCode && onPostalCodeChange) {
                onPostalCodeChange('')
              }
            }}
            isInvalid={!!regionError}
            required={regionRequired}
            disabled={disabled}
          >
            <option value="">{regionPlaceholder}</option>
            {CHILE_REGIONS.map((region) => (
              <option key={region.id} value={region.name}>
                {region.name}
              </option>
            ))}
          </FormControl>
          {regionError && (
            <FormControl.Feedback type="invalid">{regionError}</FormControl.Feedback>
          )}
        </FormGroup>
      </Col>
      <Col md={6}>
        <FormGroup className="mb-3">
          <FormLabel>
            {comunaLabel} {comunaRequired && <span className="text-danger">*</span>}
          </FormLabel>
          <FormControl
            as="select"
            value={comunaValue}
            onChange={(e) => {
              onComunaChange(e.target.value)
              // Generar código postal al seleccionar comuna
              if (autoGeneratePostalCode && onPostalCodeChange && selectedRegionId && e.target.value) {
                const postalCode = getPostalCode(selectedRegionId, e.target.value)
                if (postalCode) {
                  onPostalCodeChange(postalCode)
                }
              }
            }}
            disabled={!regionValue || disabled || availableComunas.length === 0}
            isInvalid={!!comunaError}
            required={comunaRequired}
          >
            <option value="">
              {!regionValue ? 'Primero seleccione una región' : comunaPlaceholder}
            </option>
            {availableComunas.map((comuna) => (
              <option key={comuna} value={comuna}>
                {comuna}
              </option>
            ))}
          </FormControl>
          {comunaError && (
            <FormControl.Feedback type="invalid">{comunaError}</FormControl.Feedback>
          )}
        </FormGroup>
      </Col>
    </Row>
  )
}

