/**
 * Hook para buscar texto exacto en el PDF (como Ctrl+F)
 * Busca en el TextLayer renderizado del PDF y resalta las coincidencias exactas
 */

import { useState, useCallback, useRef, useEffect } from 'react'

export interface TextMatch {
  element: HTMLElement
  text: string
  index: number
  matchType: 'exact' | 'partial' | 'word'
}

export interface SearchState {
  query: string
  matches: TextMatch[]
  currentMatchIndex: number
  isSearching: boolean
  totalMatches: number
  searchStatus: 'idle' | 'searching' | 'found' | 'not-found'
}

export function useTextSearch() {
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    matches: [],
    currentMatchIndex: 0,
    isSearching: false,
    totalMatches: 0,
    searchStatus: 'idle'
  })

  const highlightedElements = useRef<HTMLElement[]>([])

  // Limpiar highlights anteriores
  const clearHighlights = useCallback(() => {
    highlightedElements.current.forEach(el => {
      try {
        el.style.backgroundColor = ''
        el.style.color = ''
        el.style.borderRadius = ''
        el.style.boxShadow = ''
        el.style.outline = ''
        el.style.transition = ''
        el.classList.remove('pdf-search-highlight', 'pdf-search-highlight-active')
      } catch (e) {
        // Elemento ya no existe
      }
    })
    highlightedElements.current = []
  }, [])

  // Normalizar texto para comparación
  const normalizeText = useCallback((text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,;:!?¿¡"'()\[\]{}<>\/\\@#$%^&*_+=|~`°ºª-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }, [])

  // Buscar el TextLayer en el contenedor
  const findTextLayer = useCallback((container: HTMLElement): Element | null => {
    // Intentar varios selectores posibles
    const selectors = [
      '.react-pdf__Page__textContent',
      '.textLayer',
      '[class*="textContent"]',
      '[class*="textLayer"]'
    ]

    for (const selector of selectors) {
      const element = container.querySelector(selector)
      if (element) {
        return element
      }
    }

    return null
  }, [])

  // Ejecutar la búsqueda real (definido antes de searchInPDF para evitar referencia circular)
  const performSearch = useCallback((
    query: string,
    textLayer: Element,
    options?: { isbn?: string; marca?: string }
  ) => {
    const textSpans = textLayer.querySelectorAll('span')
    const matches: TextMatch[] = []
    const normalizedQuery = normalizeText(query)

    // Términos de búsqueda ordenados por prioridad
    const searchTerms: { term: string; type: 'exact' | 'partial' | 'word' }[] = []

    // 1. ISBN (si está disponible)
    if (options?.isbn) {
      const cleanIsbn = options.isbn.replace(/[-\s]/g, '')
      searchTerms.push({ term: cleanIsbn, type: 'exact' })
      searchTerms.push({ term: options.isbn, type: 'exact' })
    }

    // 2. Nombre completo normalizado
    searchTerms.push({ term: normalizedQuery, type: 'exact' })

    // 3. Palabras clave del nombre (mínimo 4 caracteres)
    const words = normalizedQuery
      .split(' ')
      .filter(w => w.length >= 4)
      .sort((a, b) => b.length - a.length)

    words.forEach(word => {
      searchTerms.push({ term: word, type: 'word' })
    })

    // Buscar coincidencias
    const matchedElements = new Set<HTMLElement>()

    for (const { term, type } of searchTerms) {
      if (term.length < 3) continue

      textSpans.forEach((span, index) => {
        const el = span as HTMLElement
        if (matchedElements.has(el)) return

        const spanText = normalizeText(span.textContent || '')

        if (spanText.includes(term)) {
          matchedElements.add(el)
          matches.push({
            element: el,
            text: span.textContent || '',
            index,
            matchType: type
          })
        }
      })

      // Si encontramos matches exactos, detenernos
      if (matches.length > 0 && type === 'exact') {
        break
      }
    }

    // Ordenar matches
    matches.sort((a, b) => {
      const typeOrder = { exact: 0, partial: 1, word: 2 }
      if (typeOrder[a.matchType] !== typeOrder[b.matchType]) {
        return typeOrder[a.matchType] - typeOrder[b.matchType]
      }
      return a.index - b.index
    })

    // Aplicar highlights
    matches.forEach((match) => {
      const el = match.element
      el.classList.add('pdf-search-highlight')

      const isExact = match.matchType === 'exact'
      el.style.backgroundColor = isExact
        ? 'rgba(76, 175, 80, 0.6)'
        : 'rgba(255, 235, 59, 0.6)'
      el.style.color = '#000'
      el.style.borderRadius = '2px'
      el.style.transition = 'all 0.2s ease'

      highlightedElements.current.push(el)
    })

    // Marcar el primer match como activo
    if (matches.length > 0) {
      const firstMatch = matches[0].element
      firstMatch.classList.add('pdf-search-highlight-active')
      firstMatch.style.backgroundColor = 'rgba(255, 87, 34, 0.85)'
      firstMatch.style.outline = '3px solid rgba(255, 87, 34, 0.9)'
      firstMatch.style.boxShadow = '0 0 12px rgba(255, 87, 34, 0.6)'

      // Scroll al primer match
      setTimeout(() => {
        try {
          firstMatch.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
          })
        } catch (e) {
          // Ignorar errores de scroll
        }
      }, 100)
    }

    setSearchState({
      query,
      matches,
      currentMatchIndex: 0,
      totalMatches: matches.length,
      isSearching: false,
      searchStatus: matches.length > 0 ? 'found' : 'not-found'
    })
  }, [normalizeText])

  // Buscar texto en el PDF con reintentos robustos
  const searchInPDF = useCallback((
    query: string,
    container: HTMLElement | null,
    options?: { isbn?: string; marca?: string }
  ) => {
    if (!container || !query.trim()) {
      clearHighlights()
      setSearchState({
        query: '',
        matches: [],
        currentMatchIndex: 0,
        totalMatches: 0,
        isSearching: false,
        searchStatus: 'idle'
      })
      return
    }

    setSearchState(prev => ({ ...prev, isSearching: true, searchStatus: 'searching' }))
    clearHighlights()

    // Función para intentar buscar el TextLayer con reintentos
    const trySearch = (attempt: number, maxAttempts: number) => {
      const textLayer = findTextLayer(container)

      // Verificar que el TextLayer tenga contenido (spans)
      const hasContent = textLayer && textLayer.querySelectorAll('span').length > 0

      if (hasContent && textLayer) {
        console.log(`[useTextSearch] TextLayer encontrado en intento ${attempt}, spans: ${textLayer.querySelectorAll('span').length}`)
        performSearch(query, textLayer, options)
        return
      }

      if (attempt < maxAttempts) {
        // Incrementar el delay con cada intento
        const delay = 200 + (attempt * 200)
        console.log(`[useTextSearch] TextLayer no listo, reintento ${attempt + 1}/${maxAttempts} en ${delay}ms`)
        setTimeout(() => trySearch(attempt + 1, maxAttempts), delay)
      } else {
        console.log('[useTextSearch] TextLayer no encontrado después de todos los intentos')
        setSearchState(prev => ({
          ...prev,
          isSearching: false,
          searchStatus: 'not-found',
          totalMatches: 0
        }))
      }
    }

    // Comenzar con el primer intento
    trySearch(1, 5)
  }, [clearHighlights, findTextLayer, performSearch])

  // Navegar al siguiente match
  const nextMatch = useCallback(() => {
    if (searchState.matches.length <= 1) return

    const newIndex = (searchState.currentMatchIndex + 1) % searchState.matches.length

    // Quitar highlight activo del actual
    const currentEl = searchState.matches[searchState.currentMatchIndex]?.element
    if (currentEl) {
      currentEl.classList.remove('pdf-search-highlight-active')
      const isExact = searchState.matches[searchState.currentMatchIndex].matchType === 'exact'
      currentEl.style.backgroundColor = isExact
        ? 'rgba(76, 175, 80, 0.6)'
        : 'rgba(255, 235, 59, 0.6)'
      currentEl.style.outline = ''
      currentEl.style.boxShadow = ''
    }

    // Agregar highlight activo al nuevo
    const newEl = searchState.matches[newIndex]?.element
    if (newEl) {
      newEl.classList.add('pdf-search-highlight-active')
      newEl.style.backgroundColor = 'rgba(255, 87, 34, 0.85)'
      newEl.style.outline = '3px solid rgba(255, 87, 34, 0.9)'
      newEl.style.boxShadow = '0 0 12px rgba(255, 87, 34, 0.6)'
      newEl.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      })
    }

    setSearchState(prev => ({ ...prev, currentMatchIndex: newIndex }))
  }, [searchState.matches, searchState.currentMatchIndex])

  // Navegar al match anterior
  const prevMatch = useCallback(() => {
    if (searchState.matches.length <= 1) return

    const newIndex = searchState.currentMatchIndex === 0
      ? searchState.matches.length - 1
      : searchState.currentMatchIndex - 1

    const currentEl = searchState.matches[searchState.currentMatchIndex]?.element
    if (currentEl) {
      currentEl.classList.remove('pdf-search-highlight-active')
      const isExact = searchState.matches[searchState.currentMatchIndex].matchType === 'exact'
      currentEl.style.backgroundColor = isExact
        ? 'rgba(76, 175, 80, 0.6)'
        : 'rgba(255, 235, 59, 0.6)'
      currentEl.style.outline = ''
      currentEl.style.boxShadow = ''
    }

    const newEl = searchState.matches[newIndex]?.element
    if (newEl) {
      newEl.classList.add('pdf-search-highlight-active')
      newEl.style.backgroundColor = 'rgba(255, 87, 34, 0.85)'
      newEl.style.outline = '3px solid rgba(255, 87, 34, 0.9)'
      newEl.style.boxShadow = '0 0 12px rgba(255, 87, 34, 0.6)'
      newEl.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      })
    }

    setSearchState(prev => ({ ...prev, currentMatchIndex: newIndex }))
  }, [searchState.matches, searchState.currentMatchIndex])

  // Limpiar búsqueda
  const clearSearch = useCallback(() => {
    clearHighlights()
    setSearchState({
      query: '',
      matches: [],
      currentMatchIndex: 0,
      totalMatches: 0,
      isSearching: false,
      searchStatus: 'idle'
    })
  }, [clearHighlights])

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      clearHighlights()
    }
  }, [clearHighlights])

  return {
    searchState,
    searchInPDF,
    nextMatch,
    prevMatch,
    clearSearch,
    clearHighlights
  }
}

// Export para uso directo sin hook
export const toast = {
  // Este export es para compatibilidad, el toast real está en useToast.ts
}
