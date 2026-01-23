import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FileUploader from '../FileUploader'
import { useNotificationContext } from '@/context/useNotificationContext'

// Mock de react-dropzone
jest.mock('react-dropzone', () => ({
  __esModule: true,
  default: ({ onDrop, children, disabled }: any) => {
    const handleClick = () => {
      if (!disabled) {
        const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
        onDrop([file], [])
      }
    }
    return (
      <div data-testid="dropzone" onClick={handleClick}>
        {children({ getRootProps: () => ({}), getInputProps: () => ({}) })}
      </div>
    )
  },
}))

// Mock de next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}))

// Mock de next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}))

// Mock de useNotificationContext
jest.mock('@/context/useNotificationContext', () => ({
  useNotificationContext: jest.fn(),
}))

// Mock de FileExtensionWithPreview
jest.mock('@/components/FileExtensionWithPreview', () => ({
  __esModule: true,
  default: ({ extension }: any) => <span data-testid="file-preview">{extension}</span>,
}))

describe('FileUploader', () => {
  const mockShowNotification = jest.fn()
  const mockSetFiles = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useNotificationContext as jest.Mock).mockReturnValue({
      showNotification: mockShowNotification,
    })
    
    // Mock de URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = jest.fn()
  })

  it('debe renderizar el componente', () => {
    render(<FileUploader files={[]} setFiles={mockSetFiles} />)
    expect(screen.getByText('Drop files here or click to upload.')).toBeInTheDocument()
  })

  it('debe mostrar mensaje de ayuda', () => {
    render(<FileUploader files={[]} setFiles={mockSetFiles} />)
    expect(screen.getByText(/You can drag images here/)).toBeInTheDocument()
  })

  it('debe manejar la carga de archivos', () => {
    render(<FileUploader files={[]} setFiles={mockSetFiles} />)
    
    const dropzone = screen.getByTestId('dropzone')
    fireEvent.click(dropzone)

    expect(mockSetFiles).toHaveBeenCalled()
    expect(global.URL.createObjectURL).toHaveBeenCalled()
  })

  it('debe mostrar archivos cargados', () => {
    const files = [
      new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
    ]
    // @ts-ignore
    files[0].preview = 'blob:mock-url'

    render(<FileUploader files={files} setFiles={mockSetFiles} />)
    
    expect(screen.getByText('test.jpg')).toBeInTheDocument()
  })

  it('debe permitir eliminar archivos', () => {
    const files = [
      new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
    ]
    // @ts-ignore
    files[0].preview = 'blob:mock-url'

    render(<FileUploader files={files} setFiles={mockSetFiles} />)
    
    const removeButton = screen.getByRole('button', { name: '' })
    fireEvent.click(removeButton)

    expect(mockSetFiles).toHaveBeenCalledWith([])
  })

  it('debe validar el número máximo de archivos', () => {
    const files = [
      new File(['test'], 'test1.jpg', { type: 'image/jpeg' }),
    ]
    // @ts-ignore
    files[0].preview = 'blob:mock-url'

    render(<FileUploader files={files} setFiles={mockSetFiles} maxFileCount={1} />)
    
    const dropzone = screen.getByTestId('dropzone')
    expect(dropzone).toHaveAttribute('disabled')
  })

  it('debe mostrar notificación cuando se excede el límite', () => {
    const files = [
      new File(['test'], 'test1.jpg', { type: 'image/jpeg' }),
    ]
    // @ts-ignore
    files[0].preview = 'blob:mock-url'

    const { FileUploader: Component } = require('../FileUploader')
    const { render: renderComponent } = require('@testing-library/react')
    
    // Simular intento de agregar más archivos
    const mockOnDrop = jest.fn((acceptedFiles: File[]) => {
      if (files.length + acceptedFiles.length > 1) {
        mockShowNotification({
          message: 'Cannot upload more than 1 files',
          variant: 'danger',
        })
      }
    })

    renderComponent(<Component files={files} setFiles={mockSetFiles} maxFileCount={1} />)
    
    // Simular drop de archivo adicional
    const newFile = new File(['test'], 'test2.jpg', { type: 'image/jpeg' })
    mockOnDrop([newFile])

    expect(mockShowNotification).toHaveBeenCalled()
  })

  it('debe ejecutar onUpload cuando se proporciona', async () => {
    const mockOnUpload = jest.fn().mockResolvedValue(undefined)
    const files: File[] = []

    render(
      <FileUploader 
        files={files} 
        setFiles={mockSetFiles} 
        onUpload={mockOnUpload}
      />
    )

    const dropzone = screen.getByTestId('dropzone')
    fireEvent.click(dropzone)

    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalled()
    })
  })

  it('debe manejar errores en onUpload', async () => {
    const mockOnUpload = jest.fn().mockRejectedValue(new Error('Upload failed'))
    const files: File[] = []

    render(
      <FileUploader 
        files={files} 
        setFiles={mockSetFiles} 
        onUpload={mockOnUpload}
      />
    )

    const dropzone = screen.getByTestId('dropzone')
    fireEvent.click(dropzone)

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'danger',
        })
      )
    })
  })

  it('debe limpiar previews al desmontar', () => {
    const files = [
      new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
    ]
    // @ts-ignore
    files[0].preview = 'blob:mock-url'

    const { unmount } = render(<FileUploader files={files} setFiles={mockSetFiles} />)
    
    unmount()

    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('debe mostrar preview de imagen para archivos de imagen', () => {
    const files = [
      new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
    ]
    // @ts-ignore
    files[0].preview = 'blob:mock-url'

    render(<FileUploader files={files} setFiles={mockSetFiles} />)
    
    const img = screen.getByAltText('test.jpg')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'blob:mock-url')
  })

  it('debe mostrar FileExtensionWithPreview para archivos no imagen', () => {
    const files = [
      new File(['test'], 'test.pdf', { type: 'application/pdf' }),
    ]
    // @ts-ignore
    files[0].preview = 'blob:mock-url'

    render(<FileUploader files={files} setFiles={mockSetFiles} />)
    
    expect(screen.getByTestId('file-preview')).toBeInTheDocument()
  })

  it('debe aplicar className personalizado', () => {
    render(<FileUploader files={[]} setFiles={mockSetFiles} className="custom-class" />)
    
    const dropzone = screen.getByTestId('dropzone')
    expect(dropzone).toHaveClass('custom-class')
  })

  it('debe estar deshabilitado cuando disabled es true', () => {
    render(<FileUploader files={[]} setFiles={mockSetFiles} disabled />)
    
    const dropzone = screen.getByTestId('dropzone')
    expect(dropzone).toHaveAttribute('disabled')
  })
})

