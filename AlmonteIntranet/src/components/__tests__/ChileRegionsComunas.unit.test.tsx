import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChileRegionComuna, { CHILE_REGIONS, CHILE_COMUNAS } from '../common/ChileRegionsComunas'

// Mock de ChilePostalCodes
const mockGetPostalCode = jest.fn((regionId, comuna) => {
  if (regionId === '13' && comuna === 'Santiago') return '8320000'
  return null
})

jest.mock('../common/ChilePostalCodes', () => ({
  getPostalCode: (regionId: string, comuna: string) => mockGetPostalCode(regionId, comuna),
}))

describe('ChileRegionComuna', () => {
  const mockOnRegionChange = jest.fn()
  const mockOnComunaChange = jest.fn()
  const mockOnPostalCodeChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetPostalCode.mockClear()
  })

  it('debe renderizar el componente', () => {
    render(
      <ChileRegionComuna
        onRegionChange={mockOnRegionChange}
        onComunaChange={mockOnComunaChange}
      />
    )
    expect(screen.getByText('Región')).toBeInTheDocument()
    expect(screen.getByText('Comuna')).toBeInTheDocument()
  })

  it('debe mostrar todas las regiones', () => {
    render(
      <ChileRegionComuna
        onRegionChange={mockOnRegionChange}
        onComunaChange={mockOnComunaChange}
      />
    )
    
    CHILE_REGIONS.forEach(region => {
      expect(screen.getByText(region.name)).toBeInTheDocument()
    })
  })

  it('debe llamar onRegionChange cuando se selecciona una región', () => {
    render(
      <ChileRegionComuna
        onRegionChange={mockOnRegionChange}
        onComunaChange={mockOnComunaChange}
      />
    )
    
    const regionSelect = screen.getByLabelText(/Región/)
    fireEvent.change(regionSelect, { target: { value: CHILE_REGIONS[0].name } })
    
    expect(mockOnRegionChange).toHaveBeenCalledWith(CHILE_REGIONS[0].name)
  })

  it('debe mostrar comunas cuando se selecciona una región', () => {
    render(
      <ChileRegionComuna
        regionValue={CHILE_REGIONS[12].name} // Región Metropolitana
        onRegionChange={mockOnRegionChange}
        onComunaChange={mockOnComunaChange}
      />
    )
    
    const comunas = CHILE_COMUNAS['13']
    comunas.slice(0, 5).forEach(comuna => {
      expect(screen.getByText(comuna)).toBeInTheDocument()
    })
  })

  it('debe llamar onComunaChange cuando se selecciona una comuna', () => {
    render(
      <ChileRegionComuna
        regionValue={CHILE_REGIONS[12].name}
        onRegionChange={mockOnRegionChange}
        onComunaChange={mockOnComunaChange}
      />
    )
    
    const comunaSelect = screen.getByLabelText(/Comuna/)
    const comunas = CHILE_COMUNAS['13']
    fireEvent.change(comunaSelect, { target: { value: comunas[0] } })
    
    expect(mockOnComunaChange).toHaveBeenCalledWith(comunas[0])
  })

  it('debe deshabilitar comuna cuando no hay región seleccionada', () => {
    const { container } = render(
      <ChileRegionComuna
        onRegionChange={mockOnRegionChange}
        onComunaChange={mockOnComunaChange}
      />
    )
    
    // Buscar el select de comuna directamente ya que los labels no tienen htmlFor
    const selects = container.querySelectorAll('select')
    const comunaSelect = selects[1] // El segundo select es el de comuna
    expect(comunaSelect).toBeDisabled()
  })

  it('debe mostrar placeholder cuando no hay región seleccionada', () => {
    const { container } = render(
      <ChileRegionComuna
        onRegionChange={mockOnRegionChange}
        onComunaChange={mockOnComunaChange}
      />
    )
    
    // Buscar el select de comuna directamente ya que los labels no tienen htmlFor
    const selects = container.querySelectorAll('select')
    const comunaSelect = selects[1] // El segundo select es el de comuna
    expect(comunaSelect).toHaveTextContent('Primero seleccione una región')
  })

  it('debe limpiar comuna cuando cambia la región', async () => {
    const { container, rerender } = render(
      <ChileRegionComuna
        regionValue={CHILE_REGIONS[0].name}
        comunaValue={CHILE_COMUNAS['15'][0]}
        onRegionChange={mockOnRegionChange}
        onComunaChange={mockOnComunaChange}
      />
    )
    
    // Cambiar la región usando rerender para que el componente detecte el cambio
    rerender(
      <ChileRegionComuna
        regionValue={CHILE_REGIONS[1].name}
        comunaValue={CHILE_COMUNAS['15'][0]} // Comuna de la región anterior
        onRegionChange={mockOnRegionChange}
        onComunaChange={mockOnComunaChange}
      />
    )
    
    // Esperar a que se ejecute el useEffect
    await waitFor(() => {
      expect(mockOnComunaChange).toHaveBeenCalledWith('')
    })
  })

  it('debe generar código postal automáticamente', async () => {
    // Encontrar el índice correcto de la Región Metropolitana (id: '13')
    const regionMetropolitana = CHILE_REGIONS.find(r => r.id === '13')
    expect(regionMetropolitana).toBeDefined()
    
    render(
      <ChileRegionComuna
        regionValue={regionMetropolitana!.name} // Región Metropolitana (id: '13')
        comunaValue="Santiago"
        onRegionChange={mockOnRegionChange}
        onComunaChange={mockOnComunaChange}
        onPostalCodeChange={mockOnPostalCodeChange}
        autoGeneratePostalCode={true}
      />
    )
    
    // Esperar a que se ejecute el useEffect que genera el código postal
    await waitFor(() => {
      // Verificar que getPostalCode fue llamado con los parámetros correctos
      expect(mockGetPostalCode).toHaveBeenCalledWith('13', 'Santiago')
      // Verificar que onPostalCodeChange fue llamado
      expect(mockOnPostalCodeChange).toHaveBeenCalled()
    }, { timeout: 1000 })
    
    // Verificar que se llamó con el código postal correcto
    expect(mockOnPostalCodeChange).toHaveBeenCalledWith('8320000')
  })

  it('debe usar labels personalizados', () => {
    render(
      <ChileRegionComuna
        regionLabel="Región de Chile"
        comunaLabel="Comuna de Chile"
        onRegionChange={mockOnRegionChange}
        onComunaChange={mockOnComunaChange}
      />
    )
    expect(screen.getByText('Región de Chile')).toBeInTheDocument()
    expect(screen.getByText('Comuna de Chile')).toBeInTheDocument()
  })

  it('debe mostrar asterisco cuando es requerido', () => {
    render(
      <ChileRegionComuna
        regionRequired={true}
        comunaRequired={true}
        onRegionChange={mockOnRegionChange}
        onComunaChange={mockOnComunaChange}
      />
    )
    const asterisks = screen.getAllByText('*')
    expect(asterisks.length).toBe(2)
  })

  it('debe mostrar errores cuando se proporcionan', () => {
    render(
      <ChileRegionComuna
        regionError="Error en región"
        comunaError="Error en comuna"
        onRegionChange={mockOnRegionChange}
        onComunaChange={mockOnComunaChange}
      />
    )
    expect(screen.getByText('Error en región')).toBeInTheDocument()
    expect(screen.getByText('Error en comuna')).toBeInTheDocument()
  })

  it('debe deshabilitar campos cuando disabled es true', () => {
    const { container } = render(
      <ChileRegionComuna
        disabled={true}
        onRegionChange={mockOnRegionChange}
        onComunaChange={mockOnComunaChange}
      />
    )
    
    const selects = container.querySelectorAll('select')
    expect(selects.length).toBeGreaterThanOrEqual(2)
    expect(selects[0]).toBeDisabled()
    expect(selects[1]).toBeDisabled()
  })

  it('debe aplicar className personalizado', () => {
    const { container } = render(
      <ChileRegionComuna
        className="custom-class"
        onRegionChange={mockOnRegionChange}
        onComunaChange={mockOnComunaChange}
      />
    )
    const row = container.querySelector('.row')
    expect(row).toHaveClass('custom-class')
  })
})

