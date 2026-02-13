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
        el.style.removeProperty('background-color')
        el.style.removeProperty('color')
        el.style.removeProperty('border-radius')
        el.style.removeProperty('padding')
        el.style.removeProperty('margin')
        el.style.removeProperty('box-shadow')
        el.style.removeProperty('outline')
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

  /**
   * REGLAS DE COINCIDENCIA ESTRICTA:
   * 1. La coincidencia debe ser CASI EXACTA.
   * 2. El nombre del producto debe contener las mismas palabras clave principales.
   * 3. El nivel educativo (ej: 8° Básico) debe coincidir exactamente.
   * 4. La asignatura debe coincidir exactamente.
   * 5. NO aceptar coincidencias solo por palabras parecidas.
   * 6. NO inferir ni adivinar.
   * 7. Si no existe coincidencia clara → "SIN COINCIDENCIA" (not-found).
   */
  const performSearch = useCallback((
    query: string,
    textLayer: Element,
    options?: { isbn?: string; marca?: string }
  ) => {
    // Filtrar spans válidos (sin markedContent, con texto)
    const allSpans = textLayer.querySelectorAll('span')
    const textSpans: HTMLElement[] = []
    allSpans.forEach((span) => {
      const el = span as HTMLElement
      if (!el.classList.contains('markedContent') && (el.textContent || '').trim().length > 0) {
        textSpans.push(el)
      }
    })

    const matches: TextMatch[] = []
    const normalizedQuery = normalizeText(query)
    const matchedElements = new Set<HTMLElement>()

    // Stop words en español - se ignoran para la comparación de palabras clave
    const STOP_WORDS = new Set([
      'y', 'de', 'la', 'el', 'para', 'con', 'un', 'una', 'los', 'las',
      'del', 'en', 'al', 'por', 'su', 'se', 'que', 'es', 'no', 'o', 'a'
    ])

    // Extraer palabras significativas del nombre del producto (sin stop words, >= 2 chars)
    const significantWords = normalizedQuery
      .split(' ')
      .filter(w => w.length >= 2 && !STOP_WORDS.has(w))

    // Extraer números de nivel educativo (1, 2, 3, 4, 5, 6, 7, 8, etc.)
    const gradeNumbers = normalizedQuery.match(/\d+/g) || []

    // Umbral mínimo: al menos 70% de palabras significativas deben coincidir
    const MIN_MATCH_RATIO = 0.70

    // Helper: aplicar highlights a los spans encontrados
    const applyHighlightsAndFinish = () => {
      matches.sort((a, b) => {
        const typeOrder = { exact: 0, partial: 1, word: 2 }
        if (typeOrder[a.matchType] !== typeOrder[b.matchType]) {
          return typeOrder[a.matchType] - typeOrder[b.matchType]
        }
        return a.index - b.index
      })

      matches.forEach((match) => {
        const el = match.element
        const isExact = match.matchType === 'exact'
        const bg = isExact ? 'rgba(76, 175, 80, 0.75)' : 'rgba(255, 235, 59, 0.9)'
        el.classList.add('pdf-search-highlight')
        el.style.setProperty('background-color', bg, 'important')
        el.style.setProperty('color', 'transparent', 'important')
        el.style.setProperty('border-radius', '2px', 'important')
        el.style.setProperty('padding', '1px 0', 'important')
        el.style.setProperty('margin', '0 -1px', 'important')
        highlightedElements.current.push(el)
      })

      if (matches.length > 0) {
        const firstMatch = matches[0].element
        firstMatch.classList.add('pdf-search-highlight-active')
        firstMatch.style.setProperty('background-color', 'rgba(255, 152, 0, 0.95)', 'important')
        firstMatch.style.setProperty('outline', '2px solid rgba(255, 152, 0, 0.9)', 'important')
        firstMatch.style.setProperty('box-shadow', '0 0 8px rgba(255, 152, 0, 0.6)', 'important')

        setTimeout(() => {
          try {
            firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
          } catch (e) { /* Ignorar */ }
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
    }

    // === FASE 1: Buscar por ISBN (máxima prioridad, coincidencia exacta) ===
    if (options?.isbn) {
      const cleanIsbn = options.isbn.replace(/[-\s]/g, '')
      for (let i = 0; i < textSpans.length; i++) {
        const el = textSpans[i]
        const spanText = normalizeText(el.textContent || '')
        if (spanText.includes(cleanIsbn) || spanText.includes(normalizeText(options.isbn))) {
          matchedElements.add(el)
          matches.push({ element: el, text: el.textContent || '', index: i, matchType: 'exact' })
        }
      }
      if (matches.length > 0) {
        applyHighlightsAndFinish()
        return
      }
    }

    // === FASE 2: Buscar nombre completo exacto como substring ===
    for (let i = 0; i < textSpans.length; i++) {
      const el = textSpans[i]
      const spanText = normalizeText(el.textContent || '')
      if (spanText.includes(normalizedQuery)) {
        matchedElements.add(el)
        matches.push({ element: el, text: el.textContent || '', index: i, matchType: 'exact' })
      }
    }
    if (matches.length > 0) {
      applyHighlightsAndFinish()
      return
    }

    // === FASE 3: Buscar en ventanas de spans adyacentes con coincidencia ESTRICTA ===
    // Concatena 1, 2 o 3 spans adyacentes y verifica que:
    //   - Al menos 70% de las palabras significativas coincidan
    //   - TODOS los números de nivel educativo coincidan exactamente
    //   - No se aceptan coincidencias parciales por palabras sueltas
    for (let windowSize = 1; windowSize <= Math.min(5, textSpans.length); windowSize++) {
      if (matches.length > 0) break

      for (let i = 0; i <= textSpans.length - windowSize; i++) {
        const windowSpans = textSpans.slice(i, i + windowSize)
        if (windowSpans.some(s => matchedElements.has(s))) continue

        const combinedText = normalizeText(
          windowSpans.map(s => s.textContent || '').join(' ')
        )

        // Contar cuántas palabras significativas del producto aparecen en el texto
        const wordsFound = significantWords.filter(word => combinedText.includes(word))
        const matchRatio = significantWords.length > 0
          ? wordsFound.length / significantWords.length
          : 0

        // REGLA 3: Los números de nivel educativo DEBEN coincidir exactamente
        const numbersOK = gradeNumbers.length === 0 ||
          gradeNumbers.every(num => {
            // Buscar el número como palabra completa (ej: "8" no debe matchear "18")
            const regex = new RegExp(`(?:^|\\s|\\b)${num}(?:\\s|\\b|$)`)
            return regex.test(combinedText)
          })

        if (!numbersOK) continue // Nivel educativo no coincide → descartar

        // REGLA 1 y 2: Coincidencia casi exacta de palabras clave
        const minWordsRequired = Math.min(significantWords.length, Math.max(2, Math.ceil(significantWords.length * MIN_MATCH_RATIO)))
        const isStrictMatch = wordsFound.length >= minWordsRequired && matchRatio >= MIN_MATCH_RATIO

        if (isStrictMatch) {
          const matchType: 'exact' | 'partial' = matchRatio >= 0.90 ? 'exact' : 'partial'
          windowSpans.forEach((span, j) => {
            if (!matchedElements.has(span)) {
              matchedElements.add(span)
              matches.push({
                element: span,
                text: span.textContent || '',
                index: i + j,
                matchType
              })
            }
          })
          break // Encontramos la mejor coincidencia, no seguir buscando
        }
      }
    }

    applyHighlightsAndFinish()
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
      const spanCount = textLayer?.querySelectorAll('span').length ?? 0
      const hasContent = textLayer && spanCount > 0

      if (hasContent && textLayer) {
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

    const currentEl = searchState.matches[searchState.currentMatchIndex]?.element
    if (currentEl) {
      currentEl.classList.remove('pdf-search-highlight-active')
      const isExact = searchState.matches[searchState.currentMatchIndex].matchType === 'exact'
      const bg = isExact ? 'rgba(76, 175, 80, 0.75)' : 'rgba(255, 235, 59, 0.9)'
      currentEl.style.setProperty('background-color', bg, 'important')
      currentEl.style.removeProperty('outline')
      currentEl.style.removeProperty('box-shadow')
    }

    const newEl = searchState.matches[newIndex]?.element
    if (newEl) {
      newEl.classList.add('pdf-search-highlight-active')
      newEl.style.setProperty('background-color', 'rgba(255, 152, 0, 0.95)', 'important')
      newEl.style.setProperty('outline', '2px solid rgba(255, 152, 0, 0.9)', 'important')
      newEl.style.setProperty('box-shadow', '0 0 8px rgba(255, 152, 0, 0.6)', 'important')
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
      const bg = isExact ? 'rgba(76, 175, 80, 0.75)' : 'rgba(255, 235, 59, 0.9)'
      currentEl.style.setProperty('background-color', bg, 'important')
      currentEl.style.removeProperty('outline')
      currentEl.style.removeProperty('box-shadow')
    }

    const newEl = searchState.matches[newIndex]?.element
    if (newEl) {
      newEl.classList.add('pdf-search-highlight-active')
      newEl.style.setProperty('background-color', 'rgba(255, 152, 0, 0.95)', 'important')
      newEl.style.setProperty('outline', '2px solid rgba(255, 152, 0, 0.9)', 'important')
      newEl.style.setProperty('box-shadow', '0 0 8px rgba(255, 152, 0, 0.6)', 'important')
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
