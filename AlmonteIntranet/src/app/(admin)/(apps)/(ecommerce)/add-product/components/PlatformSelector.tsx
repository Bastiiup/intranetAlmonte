'use client'

import { FormGroup, FormLabel, FormCheck } from 'react-bootstrap'

interface PlatformSelectorProps {
  selectedPlatforms: string[]
  onChange: (platforms: string[]) => void
}

export default function PlatformSelector({ selectedPlatforms, onChange }: PlatformSelectorProps) {
  const handlePlatformChange = (platform: string, checked: boolean) => {
    if (checked) {
      if (!selectedPlatforms.includes(platform)) {
        onChange([...selectedPlatforms, platform])
      }
    } else {
      onChange(selectedPlatforms.filter((p) => p !== platform))
    }
  }

  return (
    <div className="bg-white border rounded p-3 mb-3">
      <FormLabel className="fw-bold mb-2">Plataformas de Publicación</FormLabel>
      <div className="d-flex gap-4">
        <FormCheck
          type="checkbox"
          id="platform_moraleja"
          label="Moraleja"
          checked={selectedPlatforms.includes('woo_moraleja')}
          onChange={(e) => handlePlatformChange('woo_moraleja', e.target.checked)}
        />
        <FormCheck
          type="checkbox"
          id="platform_escolar"
          label="Escolar"
          checked={selectedPlatforms.includes('woo_escolar')}
          onChange={(e) => handlePlatformChange('woo_escolar', e.target.checked)}
        />
      </div>
      <small className="text-muted">
        Selecciona en qué plataforma(s) se publicará este producto. Si no seleccionas ninguna, se publicará en ambas automáticamente.
      </small>
    </div>
  )
}

