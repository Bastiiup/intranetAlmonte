import { renderHook, act } from '@testing-library/react'
import useCalendar from '../useCalendar'
import { DateClickArg, EventClickArg, EventDropArg, DropArg } from '@fullcalendar/core'

// Mock de tipos para los eventos de FullCalendar
const createMockDateClickArg = (date: Date = new Date()): DateClickArg => ({
  date,
  dateStr: date.toISOString(),
  allDay: false,
  dayEl: document.createElement('div'),
  jsEvent: new MouseEvent('click') as any,
  view: {} as any,
})

const createMockEventClickArg = (id: string, title: string, className: string = ''): EventClickArg => ({
  event: {
    id,
    title,
    classNames: className ? [className] : [],
    start: new Date(),
    end: new Date(),
  } as any,
  jsEvent: new MouseEvent('click') as any,
  view: {} as any,
})

const createMockDropArg = (id: string, title: string, dateStr: string, className: string = ''): DropArg => ({
  date: new Date(dateStr),
  dateStr,
  draggedEl: {
    id,
    title,
    dataset: { class: className },
  } as any,
  jsEvent: new MouseEvent('drop') as any,
  view: {} as any,
})

const createMockEventDropArg = (id: string, title: string, className: string = ''): EventDropArg => ({
  event: {
    id,
    title,
    classNames: className ? [className] : [],
    start: new Date(),
    end: new Date(),
  } as any,
  oldEvent: {} as any,
  delta: {} as any,
  revert: jest.fn(),
  jsEvent: new MouseEvent('drop') as any,
  view: {} as any,
})

describe('useCalendar', () => {
  it('debe inicializar con eventos por defecto', () => {
    const { result } = renderHook(() => useCalendar())

    expect(result.current.events).toHaveLength(7)
    expect(result.current.show).toBe(false)
    expect(result.current.isEditable).toBe(false)
  })

  it('debe abrir el modal cuando se hace clic en una fecha', () => {
    const { result } = renderHook(() => useCalendar())

    const dateClickArg = createMockDateClickArg()

    act(() => {
      result.current.onDateClick(dateClickArg)
    })

    expect(result.current.show).toBe(true)
    expect(result.current.isEditable).toBe(false)
    expect(result.current.dateInfo).toBe(dateClickArg)
  })

  it('debe abrir el modal cuando se hace clic en un evento', () => {
    const { result } = renderHook(() => useCalendar())

    const eventClickArg = createMockEventClickArg('1', 'Test Event', 'bg-primary')

    act(() => {
      result.current.onEventClick(eventClickArg)
    })

    expect(result.current.show).toBe(true)
    expect(result.current.isEditable).toBe(true)
    expect(result.current.eventData?.id).toBe('1')
    expect(result.current.eventData?.title).toBe('Test Event')
  })

  it('debe cerrar el modal', () => {
    const { result } = renderHook(() => useCalendar())

    act(() => {
      result.current.onDateClick(createMockDateClickArg())
    })

    expect(result.current.show).toBe(true)

    act(() => {
      result.current.onCloseModal()
    })

    expect(result.current.show).toBe(false)
    expect(result.current.eventData).toBeUndefined()
    expect(result.current.dateInfo).toBeUndefined()
  })

  it('debe agregar un nuevo evento', () => {
    const { result } = renderHook(() => useCalendar())

    const initialLength = result.current.events.length
    const dateClickArg = createMockDateClickArg(new Date('2024-01-15'))

    act(() => {
      result.current.onDateClick(dateClickArg)
      result.current.onAddEvent({
        title: 'New Event',
        category: 'bg-primary',
      })
    })

    expect(result.current.events).toHaveLength(initialLength + 1)
    expect(result.current.show).toBe(false)
    expect(result.current.events[result.current.events.length - 1].title).toBe('New Event')
  })

  it('debe actualizar un evento existente', () => {
    const { result } = renderHook(() => useCalendar())

    const eventClickArg = createMockEventClickArg('1', 'Original Title')

    act(() => {
      result.current.onEventClick(eventClickArg)
      result.current.onUpdateEvent({
        title: 'Updated Title',
        category: 'bg-success',
      })
    })

    const updatedEvent = result.current.events.find(e => e.id === '1')
    expect(updatedEvent?.title).toBe('Updated Title')
    expect(updatedEvent?.className).toBe('bg-success')
    expect(result.current.show).toBe(false)
  })

  it('debe eliminar un evento', () => {
    const { result } = renderHook(() => useCalendar())

    const initialLength = result.current.events.length
    const eventClickArg = createMockEventClickArg('1', 'Event to Delete')

    act(() => {
      result.current.onEventClick(eventClickArg)
      result.current.onRemoveEvent()
    })

    expect(result.current.events).toHaveLength(initialLength - 1)
    expect(result.current.events.find(e => e.id === '1')).toBeUndefined()
    expect(result.current.show).toBe(false)
  })

  it('debe manejar drop de eventos externos', () => {
    const { result } = renderHook(() => useCalendar())

    const initialLength = result.current.events.length
    const dropArg = createMockDropArg('external-1', 'External Event', '2024-01-20', 'bg-info')

    act(() => {
      result.current.onDrop(dropArg)
    })

    expect(result.current.events).toHaveLength(initialLength + 1)
    const newEvent = result.current.events[result.current.events.length - 1]
    expect(newEvent.title).toBe('External Event')
    expect(newEvent.id).toBe('external-1')
  })

  it('debe manejar drop de eventos internos', () => {
    const { result } = renderHook(() => useCalendar())

    const eventDropArg = createMockEventDropArg('1', 'Moved Event', 'bg-warning')

    act(() => {
      result.current.onEventDrop(eventDropArg)
    })

    const movedEvent = result.current.events.find(e => e.id === '1')
    expect(movedEvent?.title).toBe('Moved Event')
    expect(result.current.isEditable).toBe(false)
  })

  it('debe crear un nuevo evento con createNewEvent', () => {
    const { result } = renderHook(() => useCalendar())

    act(() => {
      result.current.createNewEvent()
    })

    expect(result.current.show).toBe(true)
    expect(result.current.isEditable).toBe(false)
  })

  it('debe manejar eventos sin título en drop', () => {
    const { result } = renderHook(() => useCalendar())

    const initialLength = result.current.events.length
    const dropArg = createMockDropArg('no-title', '', '2024-01-20', 'bg-info')
    // Simular que no hay título
    dropArg.draggedEl.title = ''

    act(() => {
      result.current.onDrop(dropArg)
    })

    // No debe agregar el evento si no tiene título
    expect(result.current.events).toHaveLength(initialLength)
  })
})










