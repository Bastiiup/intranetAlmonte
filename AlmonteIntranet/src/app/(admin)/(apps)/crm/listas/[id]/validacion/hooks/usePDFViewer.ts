/**
 * Hook unificado para el visor de PDF
 * Incluye navegación, zoom y búsqueda/resaltado de texto (como Ctrl+F)
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { ProductoIdentificado } from '../types'

/** Rect normalizado en % para que el overlay escale con zoom/scroll */
export interface NormalizedRect {
  left: number
  top: number
  width: number
  height: number
}

export interface TextMatch {
  element: HTMLElement
  text: string
  index: number
  matchType: 'exact' | 'partial' | 'word'
  /** Posición en % relativa a la página (para overlay React) */
  rect?: NormalizedRect
}

export interface SearchState {
  query: string
  matches: TextMatch[]
  currentMatchIndex: number
  isSearching: boolean
  totalMatches: number
  searchStatus: 'idle' | 'searching' | 'found' | 'not-found'
}

export function usePDFViewer() {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null)

  // Ref al contenedor del PDF (el componente debe adjuntarlo al div que envuelve el PDF)
  const containerRef = useRef<HTMLDivElement>(null)
  const highlightedElements = useRef<HTMLElement[]>([])

  // Estado de búsqueda
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    matches: [],
    currentMatchIndex: 0,
    isSearching: false,
    totalMatches: 0,
    searchStatus: 'idle'
  })

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setPageNumber(1)
  }, [])

  const nextPage = useCallback(() => {
    setPageNumber(prev => (prev < numPages ? prev + 1 : prev))
  }, [numPages])

  const prevPage = useCallback(() => {
    setPageNumber(prev => (prev > 1 ? prev - 1 : prev))
  }, [])

  const onZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.2, 3))
  }, [])

  const onZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.2, 0.5))
  }, [])

  const onZoomReset = useCallback(() => setScale(1.0), [])

  const navegarAPagina = useCallback((pagina: number) => {
    if (pagina >= 1 && pagina <= numPages) {
      setPageNumber(pagina)
    }
  }, [numPages])

  const navegarAProducto = useCallback((producto: ProductoIdentificado) => {
    if (producto.coordenadas?.pagina) {
      navegarAPagina(producto.coordenadas.pagina)
    }
  }, [navegarAPagina])

  // --- Búsqueda y resaltado en el PDF ---
  const normalizeText = useCallback((text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,;:!?¿¡"'()\[\]{}<>\/\\@#$%^&*_+=|~`°ºª-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }, [])

  const findTextLayer = useCallback((container: HTMLElement): Element | null => {
    const selectors = ['.react-pdf__Page__textContent', '.textLayer', '[class*="textContent"]', '[class*="textLayer"]']
    for (const selector of selectors) {
      const el = container.querySelector(selector)
      if (el) return el
    }
    return null
  }, [])

  const clearHighlights = useCallback(() => {
    highlightedElements.current.forEach(el => {
      try {
        el.style.removeProperty('background-color')
        el.style.removeProperty('color')
        el.style.removeProperty('border-radius')
        el.style.removeProperty('padding')
        el.style.removeProperty('margin')
        el.style.removeProperty('box-shadow')
        el.style.removeProperty('outline')
        el.classList.remove('pdf-search-highlight', 'pdf-search-highlight-active')
      } catch (_e) {}
    })
    highlightedElements.current = []
  }, [])

  /** Palabras de OTRAS asignaturas: si aparecen en el texto PDF, descartar (regla 4) */
  const FORBIDDEN_BY_SUBJECT: Record<string, string[]> = {
    'lengua y literatura': ['matematica', 'historia', 'geografia', 'naturales', 'sociales', 'ingles'],
    'lenguaje': ['matematica', 'historia', 'geografia', 'naturales', 'sociales', 'ingles'],
    'matematica': ['lengua', 'literatura', 'historia', 'geografia', 'naturales', 'sociales', 'ingles'],
    'historia': ['lengua', 'literatura', 'matematica', 'naturales', 'ingles'],
    'geografia': ['lengua', 'literatura', 'matematica', 'historia', 'naturales', 'sociales', 'ingles'],
    'ciencias naturales': ['lengua', 'literatura', 'matematica', 'historia', 'geografia', 'sociales', 'ingles'],
    'ciencias sociales': ['lengua', 'literatura', 'matematica', 'historia', 'geografia', 'naturales', 'ingles'],
    'ingles': ['lengua', 'literatura', 'matematica', 'historia', 'geografia', 'naturales', 'sociales']
  }

  const getForbiddenWords = useCallback((asignatura: string | undefined): string[] => {
    if (!asignatura?.trim()) return []
    const key = normalizeText(asignatura)
    for (const [subj, words] of Object.entries(FORBIDDEN_BY_SUBJECT)) {
      if (key.includes(subj)) return words
    }
    if (key.includes('historia') || key.includes('geografia') || key.includes('sociales')) {
      return ['lengua', 'literatura', 'matematica', 'naturales', 'ingles']
    }
    return []
  }, [normalizeText])

  const isValidMatch = useCallback((
    candidateNorm: string,
    queryNorm: string,
    asignatura: string | undefined
  ): boolean => {
    const forbidden = getForbiddenWords(asignatura)
    for (const w of forbidden) {
      if (candidateNorm.includes(w)) return false
    }
    const qWords = queryNorm.split(/\s+/).filter(w => w.length >= 2)
    let found = 0
    for (const q of qWords) {
      if (candidateNorm.includes(q)) found++
    }
    return found / Math.max(qWords.length, 1) >= 0.85
  }, [getForbiddenWords])

  const performSearch = useCallback((
    query: string,
    textLayer: Element,
    options?: { isbn?: string; marca?: string; asignatura?: string }
  ) => {
    const textSpans = Array.from(textLayer.querySelectorAll('span')) as HTMLElement[]
    const normalizedQuery = normalizeText(query)

    const parts: { span: HTMLElement; text: string; norm: string }[] = []
    textSpans.forEach(span => {
      if (span.classList.contains('markedContent')) return
      const text = span.textContent || ''
      if (!text.trim()) return
      parts.push({ span, text, norm: normalizeText(text) })
    })

    let fullNorm = ''
    const spanRanges: { span: HTMLElement; start: number; end: number; text: string }[] = []
    parts.forEach(({ span, text, norm }) => {
      const start = fullNorm.length
      fullNorm += (fullNorm ? ' ' : '') + norm
      const end = fullNorm.length
      spanRanges.push({ span, start, end, text })
    })

    if (options?.isbn) {
      const isbnClean = options.isbn.replace(/[-\s]/g, '')
      const idx = fullNorm.indexOf(normalizeText(isbnClean))
      if (idx >= 0) {
        const matchSpans = spanRanges.filter(r => r.end > idx && r.start < idx + isbnClean.length)
        if (matchSpans.length > 0) {
          finishSearch(matchSpans.map((r, i) => ({
            element: r.span, text: r.text, index: i, matchType: 'exact' as const
          })))
          return
        }
      }
    }

    const exactIdx = fullNorm.indexOf(normalizedQuery)
    if (exactIdx >= 0) {
      const matchText = fullNorm.slice(exactIdx, exactIdx + normalizedQuery.length)
      const matchSpans = spanRanges.filter(r => r.end > exactIdx && r.start < exactIdx + normalizedQuery.length)
      if (matchSpans.length > 0 && isValidMatch(matchText, normalizedQuery, options?.asignatura)) {
        finishSearch(matchSpans.map((r, i) => ({
          element: r.span, text: r.text, index: i, matchType: 'exact' as const
        })))
        return
      }
    }

    const targetLen = normalizedQuery.length
    const step = targetLen < 20 ? 2 : 5
    let bestScore = 0
    let bestStart = 0
    let bestEnd = 0

    for (let s = 0; s < fullNorm.length; s += step) {
      for (const len of [targetLen, Math.floor(targetLen * 1.2), Math.floor(targetLen * 0.8)]) {
        const e = Math.min(s + len, fullNorm.length)
        const sub = fullNorm.slice(s, e)
        if (!isValidMatch(sub, normalizedQuery, options?.asignatura)) continue
        const qWords = normalizedQuery.split(/\s+/).filter(w => w.length >= 2)
        let found = 0
        for (const q of qWords) {
          if (sub.includes(q)) found++
        }
        const sim = found / Math.max(qWords.length, 1)
        if (sim > bestScore && sim >= 0.9) {
          bestScore = sim
          bestStart = s
          bestEnd = e
        }
      }
    }

    if (bestScore >= 0.9) {
      const matchSpans = spanRanges.filter(r => r.end > bestStart && r.start < bestEnd)
      const matches: TextMatch[] = matchSpans.map((r, i) => ({
        element: r.span, text: r.text, index: i,
        matchType: bestScore >= 0.95 ? 'exact' : 'partial'
      }))
      if (matches.length > 0) {
        finishSearch(matches)
        return
      }
    }

    finishSearch([])

    function finishSearch(matches: TextMatch[]) {
      const applyHighlight = (el: HTMLElement) => {
        el.classList.add('pdf-search-highlight')
        highlightedElements.current.push(el)
      }
      matches.forEach(m => applyHighlight(m.element))

      const pageContainer = textLayer.closest('.react-pdf__Page') as HTMLElement | null
      if (pageContainer && matches.length > 0) {
        const parentRect = pageContainer.getBoundingClientRect()
        matches.forEach(m => {
          const rect = m.element.getBoundingClientRect()
          m.rect = {
            left: ((rect.left - parentRect.left) / parentRect.width) * 100,
            top: ((rect.top - parentRect.top) / parentRect.height) * 100,
            width: (Math.max(rect.width, 2) / parentRect.width) * 100,
            height: (Math.max(rect.height, 2) / parentRect.height) * 100
          }
        })
        setTimeout(() => matches[0].element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }), 100)
      }

      setSearchState({
        query,
        matches,
        currentMatchIndex: 0,
        totalMatches: matches.length,
        isSearching: false,
        searchStatus: matches.length > 0 ? 'found' : 'not-found'
      })
    }
  }, [normalizeText, isValidMatch])

  const searchInPDF = useCallback((
    query: string,
    options?: { isbn?: string; marca?: string; asignatura?: string }
  ) => {
    const container = containerRef.current
    if (!container || !query.trim()) {
      clearHighlights()
      setSearchState({ query: '', matches: [], currentMatchIndex: 0, totalMatches: 0, isSearching: false, searchStatus: 'idle' })
      return
    }
    setSearchState(prev => ({ ...prev, isSearching: true, searchStatus: 'searching' }))
    clearHighlights()

    const trySearch = (attempt: number, maxAttempts: number) => {
      const textLayer = findTextLayer(container)
      const hasContent = textLayer && textLayer.querySelectorAll('span').length > 0
      if (hasContent && textLayer) {
        performSearch(query, textLayer, options)
        return
      }
      if (attempt < maxAttempts) {
        setTimeout(() => trySearch(attempt + 1, maxAttempts), 200 + attempt * 200)
      } else {
        setSearchState(prev => ({ ...prev, isSearching: false, searchStatus: 'not-found', totalMatches: 0 }))
      }
    }
    trySearch(1, 5)
  }, [clearHighlights, findTextLayer, performSearch])

  const nextMatch = useCallback(() => {
    if (searchState.matches.length <= 1) return
    const newIndex = (searchState.currentMatchIndex + 1) % searchState.matches.length
    const next = searchState.matches[newIndex]?.element
    if (next) next.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    setSearchState(prev => ({ ...prev, currentMatchIndex: newIndex }))
  }, [searchState.matches, searchState.currentMatchIndex])

  const prevMatch = useCallback(() => {
    if (searchState.matches.length <= 1) return
    const newIndex = searchState.currentMatchIndex === 0 ? searchState.matches.length - 1 : searchState.currentMatchIndex - 1
    const next = searchState.matches[newIndex]?.element
    if (next) next.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    setSearchState(prev => ({ ...prev, currentMatchIndex: newIndex }))
  }, [searchState.matches, searchState.currentMatchIndex])

  const clearSearch = useCallback(() => {
    clearHighlights()
    setSearchState({ query: '', matches: [], currentMatchIndex: 0, totalMatches: 0, isSearching: false, searchStatus: 'idle' })
  }, [clearHighlights])

  useEffect(() => () => clearHighlights(), [clearHighlights])

  return {
    numPages,
    pageNumber,
    scale,
    pageDimensions,
    setNumPages,
    setPageNumber,
    setScale,
    setPageDimensions,
    containerRef,
    onDocumentLoadSuccess,
    nextPage,
    prevPage,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    navegarAPagina,
    navegarAProducto,
    searchState,
    searchInPDF,
    nextMatch,
    prevMatch,
    clearSearch
  }
}
