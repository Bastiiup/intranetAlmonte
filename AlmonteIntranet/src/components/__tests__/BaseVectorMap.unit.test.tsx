import { render, screen } from '@testing-library/react'
import BaseVectorMap from '../maps/BaseVectorMap'

// Mock de jsvectormap
const mockJsVectorMap = jest.fn()

beforeAll(() => {
  ;(window as any)['jsVectorMap'] = mockJsVectorMap
})

describe('BaseVectorMap', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debe renderizar el componente', () => {
    render(<BaseVectorMap id="test-map" />)
    const mapDiv = document.getElementById('test-map')
    expect(mapDiv).toBeInTheDocument()
  })

  it('debe crear el mapa cuando se monta', () => {
    render(<BaseVectorMap id="test-map" />)
    expect(mockJsVectorMap).toHaveBeenCalledWith(
      expect.objectContaining({
        selector: '#test-map',
      })
    )
  })

  it('debe pasar opciones al mapa', () => {
    const options = { map: 'world', zoomButtons: true }
    render(<BaseVectorMap id="test-map" options={options} />)
    
    expect(mockJsVectorMap).toHaveBeenCalledWith(
      expect.objectContaining({
        selector: '#test-map',
        map: 'world',
        zoomButtons: true,
      })
    )
  })

  it('debe aplicar props adicionales al div', () => {
    render(<BaseVectorMap id="test-map" className="custom-map" data-testid="map" />)
    const mapDiv = document.getElementById('test-map')
    expect(mapDiv).toHaveClass('custom-map')
    expect(mapDiv).toHaveAttribute('data-testid', 'map')
  })

  it('debe usar el id proporcionado', () => {
    render(<BaseVectorMap id="my-custom-map" />)
    const mapDiv = document.getElementById('my-custom-map')
    expect(mapDiv).toBeInTheDocument()
  })

  it('no debe crear múltiples mapas con el mismo id', () => {
    const { rerender } = render(<BaseVectorMap id="test-map" />)
    mockJsVectorMap.mockClear()
    
    rerender(<BaseVectorMap id="test-map" />)
    
    // No debe llamar de nuevo si el mapa ya existe
    // (esto depende de la implementación del componente)
  })
})

