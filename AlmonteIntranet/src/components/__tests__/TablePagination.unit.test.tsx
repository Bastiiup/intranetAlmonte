import { render, screen, fireEvent } from '@testing-library/react'
import TablePagination from '../table/TablePagination'

// Mock de react-icons
jest.mock('react-icons/tb', () => ({
  TbChevronLeft: () => <span data-testid="chevron-left">←</span>,
  TbChevronRight: () => <span data-testid="chevron-right">→</span>,
}))

describe('TablePagination', () => {
  const mockPreviousPage = jest.fn()
  const mockNextPage = jest.fn()
  const mockSetPageIndex = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debe renderizar el componente', () => {
    render(
      <TablePagination
        totalItems={100}
        start={1}
        end={10}
        previousPage={mockPreviousPage}
        canPreviousPage={true}
        pageCount={10}
        pageIndex={0}
        setPageIndex={mockSetPageIndex}
        nextPage={mockNextPage}
        canNextPage={true}
      />
    )
    expect(screen.getByTestId('chevron-left')).toBeInTheDocument()
    expect(screen.getByTestId('chevron-right')).toBeInTheDocument()
  })

  it('debe mostrar información cuando showInfo es true', () => {
    render(
      <TablePagination
        totalItems={100}
        start={1}
        end={10}
        showInfo={true}
        previousPage={mockPreviousPage}
        canPreviousPage={true}
        pageCount={10}
        pageIndex={0}
        setPageIndex={mockSetPageIndex}
        nextPage={mockNextPage}
        canNextPage={true}
      />
    )
    expect(screen.getByText(/Mostrando/)).toBeInTheDocument()
    const infoText = screen.getByText(/Mostrando/)
    expect(infoText).toHaveTextContent('1')
    expect(infoText).toHaveTextContent('10')
    expect(infoText).toHaveTextContent('100')
  })

  it('no debe mostrar información cuando showInfo es false', () => {
    render(
      <TablePagination
        totalItems={100}
        start={1}
        end={10}
        showInfo={false}
        previousPage={mockPreviousPage}
        canPreviousPage={true}
        pageCount={10}
        pageIndex={0}
        setPageIndex={mockSetPageIndex}
        nextPage={mockNextPage}
        canNextPage={true}
      />
    )
    expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument()
  })

  it('debe usar itemsName personalizado', () => {
    render(
      <TablePagination
        totalItems={100}
        start={1}
        end={10}
        showInfo={true}
        itemsName="productos"
        previousPage={mockPreviousPage}
        canPreviousPage={true}
        pageCount={10}
        pageIndex={0}
        setPageIndex={mockSetPageIndex}
        nextPage={mockNextPage}
        canNextPage={true}
      />
    )
    expect(screen.getByText(/productos/)).toBeInTheDocument()
  })

  it('debe renderizar botones de página', () => {
    render(
      <TablePagination
        totalItems={30}
        start={1}
        end={10}
        previousPage={mockPreviousPage}
        canPreviousPage={true}
        pageCount={3}
        pageIndex={0}
        setPageIndex={mockSetPageIndex}
        nextPage={mockNextPage}
        canNextPage={true}
      />
    )
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('debe marcar la página activa', () => {
    render(
      <TablePagination
        totalItems={30}
        start={11}
        end={20}
        previousPage={mockPreviousPage}
        canPreviousPage={true}
        pageCount={3}
        pageIndex={1}
        setPageIndex={mockSetPageIndex}
        nextPage={mockNextPage}
        canNextPage={true}
      />
    )
    const activeButton = screen.getByText('2').closest('li')
    expect(activeButton).toHaveClass('active')
  })

  it('debe llamar setPageIndex cuando se hace clic en una página', () => {
    render(
      <TablePagination
        totalItems={30}
        start={1}
        end={10}
        previousPage={mockPreviousPage}
        canPreviousPage={true}
        pageCount={3}
        pageIndex={0}
        setPageIndex={mockSetPageIndex}
        nextPage={mockNextPage}
        canNextPage={true}
      />
    )
    const page2Button = screen.getByText('2')
    fireEvent.click(page2Button)
    
    expect(mockSetPageIndex).toHaveBeenCalledWith(1)
  })

  it('debe llamar previousPage cuando se hace clic en el botón anterior', () => {
    render(
      <TablePagination
        totalItems={30}
        start={11}
        end={20}
        previousPage={mockPreviousPage}
        canPreviousPage={true}
        pageCount={3}
        pageIndex={1}
        setPageIndex={mockSetPageIndex}
        nextPage={mockNextPage}
        canNextPage={true}
      />
    )
    const previousButton = screen.getByTestId('chevron-left').closest('button')
    fireEvent.click(previousButton!)
    
    expect(mockPreviousPage).toHaveBeenCalled()
  })

  it('debe llamar nextPage cuando se hace clic en el botón siguiente', () => {
    render(
      <TablePagination
        totalItems={30}
        start={1}
        end={10}
        previousPage={mockPreviousPage}
        canPreviousPage={true}
        pageCount={3}
        pageIndex={0}
        setPageIndex={mockSetPageIndex}
        nextPage={mockNextPage}
        canNextPage={true}
      />
    )
    const nextButton = screen.getByTestId('chevron-right').closest('button')
    fireEvent.click(nextButton!)
    
    expect(mockNextPage).toHaveBeenCalled()
  })

  it('debe deshabilitar botón anterior cuando canPreviousPage es false', () => {
    render(
      <TablePagination
        totalItems={30}
        start={1}
        end={10}
        previousPage={mockPreviousPage}
        canPreviousPage={false}
        pageCount={3}
        pageIndex={0}
        setPageIndex={mockSetPageIndex}
        nextPage={mockNextPage}
        canNextPage={true}
      />
    )
    const previousButton = screen.getByTestId('chevron-left').closest('button')
    expect(previousButton).toBeDisabled()
  })

  it('debe deshabilitar botón siguiente cuando canNextPage es false', () => {
    render(
      <TablePagination
        totalItems={30}
        start={21}
        end={30}
        previousPage={mockPreviousPage}
        canPreviousPage={true}
        pageCount={3}
        pageIndex={2}
        setPageIndex={mockSetPageIndex}
        nextPage={mockNextPage}
        canNextPage={false}
      />
    )
    const nextButton = screen.getByTestId('chevron-right').closest('button')
    expect(nextButton).toBeDisabled()
  })

  it('debe aplicar className personalizado', () => {
    render(
      <TablePagination
        totalItems={30}
        start={1}
        end={10}
        className="custom-pagination"
        previousPage={mockPreviousPage}
        canPreviousPage={true}
        pageCount={3}
        pageIndex={0}
        setPageIndex={mockSetPageIndex}
        nextPage={mockNextPage}
        canNextPage={true}
      />
    )
    const pagination = screen.getByTestId('chevron-left').closest('ul')
    expect(pagination).toHaveClass('custom-pagination')
  })
})

