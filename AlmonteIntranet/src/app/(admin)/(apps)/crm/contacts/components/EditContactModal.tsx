'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Form, FormGroup, FormLabel, FormControl, Alert, Row, Col } from 'react-bootstrap'
import { LuCheck } from 'react-icons/lu'
import Select from 'react-select'
import { debounce } from 'lodash'
import type { ContactType } from '@/app/(admin)/(apps)/crm/types'
import ChileRegionComuna from '@/components/common/ChileRegionsComunas'

interface ColegioOption {
  id: number
  documentId?: string
  nombre: string
  rbd?: number | null
}

interface EmpresaOption {
  id: number
  documentId?: string
  empresa_nombre?: string
  nombre?: string
}

const DEPENDENCIAS = [
  'Municipal',
  'Particular Subvencionado',
  'Particular Pagado',
]

interface EditContactModalProps {
  show: boolean
  onHide: () => void
  contact: ContactType | null
  onSuccess?: () => void
}

const EditContactModal = ({ show, onHide, contact, onSuccess }: EditContactModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [colegios, setColegios] = useState<ColegioOption[]>([])
  const [loadingColegios, setLoadingColegios] = useState(false)
  const [colegioSearchTerm, setColegioSearchTerm] = useState('')
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([])
  const [loadingEmpresas, setLoadingEmpresas] = useState(false)
  
  // Tipo para las opciones de react-select
  type ColegioSelectOption = { value: number; label: string }
  type EmpresaSelectOption = { value: number; label: string }
  const [selectedColegio, setSelectedColegio] = useState<ColegioSelectOption | null>(null)
  const [selectedEmpresa, setSelectedEmpresa] = useState<EmpresaSelectOption | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true) // Bandera para evitar resetear selección del usuario
  const [formData, setFormData] = useState({
    nombres: '',
    email: '',
    cargo: '',
    telefono: '',
    colegioId: '',
    empresaId: '',
    cargoEmpresa: '',
    region: '',
    comuna: '',
    dependencia: '',
  })

  // Cargar lista de colegios y empresas cuando se abre el modal
  useEffect(() => {
    if (show) {
      loadColegios('') // Cargar todos los colegios inicialmente
      loadEmpresas() // Cargar todas las empresas inicialmente
    }
  }, [show])

  const loadColegios = async (search: string = '') => {
    setLoadingColegios(true)
    try {
      const url = search 
        ? `/api/crm/colegios/list?search=${encodeURIComponent(search)}`
        : '/api/crm/colegios/list' // Sin búsqueda para cargar todos
      const response = await fetch(url)
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setColegios(result.data)
        console.log(`✅ [EditContactModal] ${result.data.length} colegios cargados`)
      }
    } catch (err) {
      console.error('❌ [EditContactModal] Error al cargar colegios:', err)
    } finally {
      setLoadingColegios(false)
    }
  }

  const loadEmpresas = async () => {
    setLoadingEmpresas(true)
    try {
      const response = await fetch('/api/crm/empresas?pageSize=1000')
      const result = await response.json()
      console.log('[EditContactModal] 📥 Respuesta de empresas:', result)
      
      if (result.success && Array.isArray(result.data)) {
        const empresasData = result.data
          .map((e: any) => {
            // Extraer atributos según formato Strapi v4
            const attrs = e.attributes || e
            const empresaId = e.id || e.documentId
            const documentId = e.documentId || e.id
            
            // Obtener nombre de la empresa
            const empresaNombre = attrs?.empresa_nombre || attrs?.nombre || e.empresa_nombre || e.nombre || 'Sin nombre'
            
            return {
              id: typeof empresaId === 'number' ? empresaId : (typeof empresaId === 'string' && /^\d+$/.test(empresaId) ? parseInt(empresaId) : empresaId),
              documentId: documentId,
              empresa_nombre: empresaNombre,
              nombre: empresaNombre,
            }
          })
          .filter((e: any) => e.id && (typeof e.id === 'number' || (typeof e.id === 'string' && e.id.length > 0)))
        
        console.log(`✅ [EditContactModal] ${empresasData.length} empresas procesadas:`, empresasData)
        setEmpresas(empresasData)
      } else {
        console.warn('[EditContactModal] ⚠️ Respuesta de empresas no válida:', result)
      }
    } catch (err) {
      console.error('❌ [EditContactModal] Error al cargar empresas:', err)
    } finally {
      setLoadingEmpresas(false)
    }
  }

  // Debounce para búsqueda de colegios mientras el usuario escribe
  const debouncedSearch = useMemo(
    () => debounce((searchTerm: string) => {
      if (searchTerm.trim().length >= 2 || searchTerm.trim().length === 0) {
        loadColegios(searchTerm.trim())
      }
    }, 300),
    []
  )

  // Limpiar debounce al desmontar
  useEffect(() => {
    return () => {
      debouncedSearch.cancel()
    }
  }, [debouncedSearch])

  // Opciones para react-select (solo value y label, sin colegio)
  const colegioOptions = useMemo<ColegioSelectOption[]>(() => {
    return colegios
      .filter((c) => c.id && c.id > 0)
      .map((colegio) => ({
        value: colegio.id,
        label: `${colegio.nombre}${colegio.rbd ? ` (RBD: ${colegio.rbd})` : ''}`,
      }))
  }, [colegios])

  // Opciones para react-select de empresas
  const empresaOptions = useMemo<EmpresaSelectOption[]>(() => {
    const options = empresas
      .filter((e) => {
        // Aceptar tanto números como strings válidos
        if (!e.id) return false
        if (typeof e.id === 'number') return e.id > 0
        if (typeof e.id === 'string') return e.id.length > 0
        return false
      })
      .map((empresa) => {
        // Convertir a número si es posible, sino usar el valor original
        const value = typeof empresa.id === 'number' 
          ? empresa.id 
          : (typeof empresa.id === 'string' && /^\d+$/.test(empresa.id) 
            ? parseInt(empresa.id) 
            : empresa.id)
        
        return {
          value: value as number,
          label: empresa.empresa_nombre || empresa.nombre || 'Empresa',
        }
      })
    
    console.log('[EditContactModal] 📋 Opciones de empresas generadas:', options.length, options)
    return options
  }, [empresas])

  // Manejar cambio en el input de búsqueda
  const handleColegioInputChange = (inputValue: string) => {
    setColegioSearchTerm(inputValue)
    debouncedSearch(inputValue)
  }

  // Manejar selección de colegio
  const handleColegioChange = async (option: ColegioSelectOption | null) => {
    console.log('[EditContactModal] 🔄 handleColegioChange llamado con:', option)
    
    // Marcar que ya no es carga inicial (el usuario está interactuando)
    setIsInitialLoad(false)
    
    // Establecer la selección inmediatamente
    setSelectedColegio(option)
    
    if (option) {
      // Actualizar formData con el colegioId
      const colegioIdStr = String(option.value)
      handleFieldChange('colegioId', colegioIdStr)
      
      console.log('[EditContactModal] ✅ Colegio seleccionado:', {
        value: option.value,
        label: option.label,
        colegioId: colegioIdStr,
      })
      
      // Buscar el colegio completo en la lista para obtener documentId si es necesario
      const colegioCompleto = colegios.find((c) => c.id === option.value)
      
      if (!colegioCompleto) {
        console.warn('[EditContactModal] ⚠️ Colegio no encontrado en lista, recargando...')
        // Recargar colegios si no está en la lista
        await loadColegios('')
        const colegioRecargado = colegios.find((c) => c.id === option.value)
        if (!colegioRecargado) {
          console.error('[EditContactModal] ❌ Colegio no encontrado después de recargar')
          return
        }
      }
      
      // Auto-completar datos del colegio obteniendo información completa
      try {
        const colegioId = colegioCompleto?.documentId || String(option.value)
        console.log('[EditContactModal] 📤 Obteniendo datos completos del colegio:', colegioId)
        
        const response = await fetch(`/api/crm/colegios/${colegioId}?populate[comuna]=true`)
        const result = await response.json()
        
        if (result.success && result.data) {
          const colegioData = result.data
          const attrs = colegioData.attributes || colegioData
          
          // Extraer comuna
          const comunaData = attrs.comuna?.data || attrs.comuna
          const comunaAttrs = comunaData?.attributes || comunaData
          
          // Auto-completar campos del formulario
          setFormData((prev) => ({
            ...prev,
            colegioId: colegioIdStr, // Asegurar que se mantiene el ID numérico
            region: attrs.region || comunaAttrs?.region_nombre || prev.region,
            comuna: comunaAttrs?.nombre || comunaAttrs?.comuna_nombre || prev.comuna,
            dependencia: attrs.dependencia || prev.dependencia,
          }))
          
          console.log('[EditContactModal] ✅ Datos del colegio auto-completados:', {
            colegioId: colegioIdStr,
            region: attrs.region || comunaAttrs?.region_nombre,
            comuna: comunaAttrs?.nombre || comunaAttrs?.comuna_nombre,
            dependencia: attrs.dependencia,
          })
        } else {
          console.warn('[EditContactModal] ⚠️ No se pudieron obtener datos completos del colegio')
        }
      } catch (err) {
        console.error('[EditContactModal] ❌ Error obteniendo datos del colegio:', err)
        // No fallar, solo loguear - el usuario puede completar manualmente
      }
    } else {
      // Si se deselecciona, limpiar campos
      console.log('[EditContactModal] 🗑️ Colegio deseleccionado, limpiando campos')
      handleFieldChange('colegioId', '')
      setFormData((prev) => ({
        ...prev,
        region: '',
        comuna: '',
        dependencia: '',
      }))
    }
  }

  // Manejar selección de empresa
  const handleEmpresaChange = (option: EmpresaSelectOption | null) => {
    console.log('[EditContactModal] 🔄 handleEmpresaChange llamado con:', option)
    
    // Marcar que ya no es carga inicial (el usuario está interactuando)
    setIsInitialLoad(false)
    
    // Establecer la selección inmediatamente
    setSelectedEmpresa(option)
    
    if (option) {
      // Actualizar formData con el empresaId
      const empresaIdStr = String(option.value)
      handleFieldChange('empresaId', empresaIdStr)
      
      console.log('[EditContactModal] ✅ Empresa seleccionada:', {
        value: option.value,
        label: option.label,
        empresaId: empresaIdStr,
      })
    } else {
      handleFieldChange('empresaId', '')
      handleFieldChange('cargoEmpresa', '')
    }
  }

  // Cargar datos del contacto cuando se abre el modal
  // IMPORTANTE: Esperar a que los colegios y empresas se carguen primero
  // IMPORTANTE: Solo ejecutar en carga inicial, no cuando el usuario está interactuando
  useEffect(() => {
    if (contact && show && colegios.length > 0 && empresas.length > 0 && isInitialLoad) {
      console.log('[EditContactModal] Cargando datos del contacto (carga inicial):', contact)
      console.log('[EditContactModal] Colegios disponibles:', colegios.length)
      console.log('[EditContactModal] Empresas disponibles:', empresas.length)
      
      // Cargar datos completos del contacto incluyendo trayectorias
      const loadContactData = async () => {
        try {
          const contactId = (contact as any).documentId || contact.id
          if (!contactId) {
            console.warn('[EditContactModal] ⚠️ No hay contactId disponible')
            return
          }

          console.log('[EditContactModal] 📤 Fetching contact data for ID:', contactId)
          const response = await fetch(`/api/crm/contacts/${contactId}`)
          const result = await response.json()
          
          if (!response.ok || !result.success) {
            throw new Error(result.error || 'Error al cargar contacto')
          }

          if (result.success && result.data) {
            const persona = result.data
            const attrs = persona.attributes || persona
            
            console.log('[EditContactModal] 📥 Persona recibida:', {
              id: persona.id,
              documentId: persona.documentId,
              nombres: attrs.nombres,
            })
            
            // Obtener la trayectoria actual
            const trayectorias = attrs.trayectorias?.data || attrs.trayectorias || []
            console.log('[EditContactModal] Trayectorias encontradas:', trayectorias.length)
            
            const trayectoriaActual = trayectorias.find((t: any) => {
              const tAttrs = t.attributes || t
              return tAttrs.is_current === true
            }) || trayectorias[0] // Si no hay actual, tomar la primera

            let colegioId = ''
            let cargo = ''
            let region = ''
            let comuna = ''
            let dependencia = ''

            if (trayectoriaActual) {
              const tAttrs = trayectoriaActual.attributes || trayectoriaActual
              cargo = tAttrs.cargo || ''
              
              console.log('[EditContactModal] Trayectoria actual encontrada:', {
                cargo,
                colegio: tAttrs.colegio,
              })
              
              // Extraer datos del colegio
              const colegioData = tAttrs.colegio?.data || tAttrs.colegio
              const colegioAttrs = colegioData?.attributes || colegioData
              
              // IMPORTANTE: Obtener el ID numérico del colegio
              const colegioIdRaw = colegioData?.id
              const colegioDocumentId = colegioData?.documentId
              
              console.log('[EditContactModal] Datos del colegio en trayectoria:', {
                colegioIdRaw,
                colegioDocumentId,
                colegioNombre: colegioAttrs?.colegio_nombre,
              })
              
              // Si tenemos documentId pero no id numérico, buscar en la lista de colegios
              if (colegioDocumentId && !colegioIdRaw) {
                const colegioEncontrado = colegios.find(
                  (c) => c.documentId === colegioDocumentId || String(c.id) === String(colegioDocumentId)
                )
                if (colegioEncontrado) {
                  colegioId = String(colegioEncontrado.id)
                  console.log('[EditContactModal] ✅ Colegio encontrado por documentId, usando id numérico:', colegioId)
                } else {
                  // Intentar obtener el ID numérico desde Strapi
                  try {
                    const colegioResponse = await fetch(`/api/crm/colegios/${colegioDocumentId}?fields=id`)
                    const colegioResult = await colegioResponse.json()
                    if (colegioResult.success && colegioResult.data) {
                      const colegioIdNum = colegioResult.data.id || colegioResult.data.documentId
                      colegioId = String(colegioIdNum)
                      console.log('[EditContactModal] ✅ ID numérico obtenido desde API:', colegioId)
                    }
                  } catch (err) {
                    console.error('[EditContactModal] ❌ Error obteniendo ID numérico del colegio:', err)
                  }
                }
              } else if (colegioIdRaw) {
                colegioId = String(colegioIdRaw)
                console.log('[EditContactModal] ✅ Usando ID numérico directo:', colegioId)
              } else {
                colegioId = String(colegioDocumentId || '')
                console.warn('[EditContactModal] ⚠️ Solo documentId disponible, intentando usar:', colegioId)
              }
              
              region = colegioAttrs?.region || ''
              dependencia = colegioAttrs?.dependencia || ''
              
              // Extraer comuna
              const comunaData = colegioAttrs?.comuna?.data || colegioAttrs?.comuna
              const comunaAttrs = comunaData?.attributes || comunaData
              comuna = comunaAttrs?.nombre || comunaAttrs?.comuna_nombre || ''
            } else {
              console.log('[EditContactModal] ⚠️ No hay trayectoria actual')
            }

            // Obtener email principal
            const emails = attrs.emails || []
            const emailPrincipal = emails.find((e: any) => e.principal) || emails[0]
            
            // Obtener teléfono principal
            const telefonos = attrs.telefonos || []
            const telefonoPrincipal = telefonos.find((t: any) => t.principal) || telefonos[0]

            // Obtener empresa del contacto (buscar en empresa-contactos)
            let empresaId = ''
            let cargoEmpresa = ''
            const personaIdNum = persona.id || persona.documentId
            if (personaIdNum) {
              try {
                const empresaContactosResponse = await fetch(
                  `/api/empresa-contactos?filters[persona][id][$eq]=${personaIdNum}`
                )
                const empresaContactosResult = await empresaContactosResponse.json()
                if (empresaContactosResult.success && empresaContactosResult.data) {
                  const empresaContactos = Array.isArray(empresaContactosResult.data) 
                    ? empresaContactosResult.data 
                    : [empresaContactosResult.data]
                  
                  if (empresaContactos.length > 0) {
                    const empresaContacto = empresaContactos[0]
                    const ecAttrs = empresaContacto.attributes || empresaContacto
                    const empresaData = ecAttrs.empresa?.data || ecAttrs.empresa
                    const empresaIdRaw = empresaData?.id
                    cargoEmpresa = ecAttrs.cargo || ''
                    
                    if (empresaIdRaw) {
                      empresaId = String(empresaIdRaw)
                      console.log('[EditContactModal] ✅ Empresa encontrada:', empresaId)
                    }
                  }
                }
              } catch (err) {
                console.warn('[EditContactModal] ⚠️ Error al cargar empresa del contacto:', err)
              }
            }

            // Establecer selectedColegio para el Select
            let selectedColegioValue: ColegioSelectOption | null = null
            if (colegioId) {
              const colegioEncontrado = colegios.find((c) => String(c.id) === String(colegioId))
              if (colegioEncontrado) {
                selectedColegioValue = {
                  value: colegioEncontrado.id,
                  label: `${colegioEncontrado.nombre}${colegioEncontrado.rbd ? ` (RBD: ${colegioEncontrado.rbd})` : ''}`,
                }
                console.log('[EditContactModal] ✅ Colegio seleccionado encontrado:', selectedColegioValue)
              } else {
                console.warn('[EditContactModal] ⚠️ Colegio con ID', colegioId, 'no encontrado en la lista de colegios')
              }
            }

            // Establecer selectedEmpresa para el Select
            let selectedEmpresaValue: EmpresaSelectOption | null = null
            if (empresaId && empresas.length > 0) {
              // Buscar empresa por ID numérico o documentId
              const empresaEncontrada = empresas.find((e) => {
                const eId = typeof e.id === 'number' ? e.id : (typeof e.id === 'string' && /^\d+$/.test(e.id) ? parseInt(e.id) : e.id)
                const empresaIdNum = typeof empresaId === 'number' ? empresaId : (typeof empresaId === 'string' && /^\d+$/.test(empresaId) ? parseInt(empresaId) : empresaId)
                return String(eId) === String(empresaIdNum) || String(e.documentId) === String(empresaId) || String(e.id) === String(empresaId)
              })
              
              if (empresaEncontrada) {
                // Convertir a número si es posible
                const value = typeof empresaEncontrada.id === 'number' 
                  ? empresaEncontrada.id 
                  : (typeof empresaEncontrada.id === 'string' && /^\d+$/.test(empresaEncontrada.id) 
                    ? parseInt(empresaEncontrada.id) 
                    : empresaEncontrada.id)
                
                selectedEmpresaValue = {
                  value: value as number,
                  label: empresaEncontrada.empresa_nombre || empresaEncontrada.nombre || 'Empresa',
                }
                console.log('[EditContactModal] ✅ Empresa seleccionada encontrada:', selectedEmpresaValue)
              } else {
                console.warn('[EditContactModal] ⚠️ Empresa con ID', empresaId, 'no encontrada en la lista. Empresas disponibles:', empresas.map(e => ({ id: e.id, nombre: e.empresa_nombre })))
              }
            }

            const formDataToSet = {
              nombres: attrs.nombres || contact.name || '',
              email: emailPrincipal?.email || contact.email || '',
              cargo: cargo,
              telefono: telefonoPrincipal?.telefono_norm || telefonoPrincipal?.telefono_raw || contact.phone || '',
              colegioId: colegioId || '',
              empresaId: empresaId || '',
              cargoEmpresa: cargoEmpresa || '',
              region: region,
              comuna: comuna,
              dependencia: dependencia,
            }

            console.log('✅ [EditContactModal] Datos del contacto cargados:', formDataToSet)
            
            setFormData(formDataToSet)
            
            // Establecer el colegio seleccionado en el Select si hay un colegioId válido
            if (colegioId && colegioId !== '' && colegioId !== '0') {
              // Buscar el colegio en la lista cargada
              const colegioEncontrado = colegios.find((c) => String(c.id) === String(colegioId))
              if (colegioEncontrado) {
                setSelectedColegio({
                  value: colegioEncontrado.id,
                  label: `${colegioEncontrado.nombre}${colegioEncontrado.rbd ? ` (RBD: ${colegioEncontrado.rbd})` : ''}`,
                })
                console.log('[EditContactModal] ✅ Colegio seleccionado establecido:', colegioEncontrado.nombre)
              } else {
                // Si no está en la lista, intentar obtenerlo
                console.log('[EditContactModal] ⚠️ Colegio no encontrado en lista, intentando obtener...')
              }
            } else {
              setSelectedColegio(null)
            }

            // Establecer la empresa seleccionada en el Select si hay una empresaId válida
            if (selectedEmpresaValue) {
              setSelectedEmpresa(selectedEmpresaValue)
            } else {
              setSelectedEmpresa(null)
            }
            
            // Marcar que la carga inicial terminó
            setIsInitialLoad(false)
          } else {
            console.warn('[EditContactModal] ⚠️ No se encontraron datos del contacto')
            setIsInitialLoad(false)
          }
        } catch (err: any) {
          console.error('❌ [EditContactModal] Error cargando datos completos del contacto:', {
            message: err.message,
            stack: err.stack,
          })
          // Fallback a datos básicos
          setFormData({
            nombres: contact.name || '',
            email: contact.email || '',
            cargo: contact.cargo || '',
            telefono: contact.phone || '',
            colegioId: (contact as any).colegioId || '',
            empresa: contact.empresa || '',
            region: contact.region || '',
            comuna: contact.comuna || '',
            dependencia: contact.dependencia || '',
          })
        }
      }

      loadContactData()
      setError(null) // Limpiar errores previos
    }
  }, [contact, show, colegios, empresas, isInitialLoad]) // ⚠️ Incluir isInitialLoad para evitar resetear selección del usuario
  
  // Resetear isInitialLoad cuando se cierra el modal
  useEffect(() => {
    if (!show) {
      setIsInitialLoad(true)
      setSelectedColegio(null)
    }
  }, [show])

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contact) return

    setLoading(true)
    setError(null)

    try {
      // Validaciones
      if (!formData.nombres.trim()) {
        throw new Error('El nombre es obligatorio')
      }
      if (!formData.email.trim()) {
        throw new Error('El email es obligatorio')
      }

      // Preparar datos para Strapi
      const contactData: any = {
        nombres: formData.nombres.trim(),
        emails: [{
          email: formData.email.trim(),
          principal: true,
        }],
        ...(formData.telefono && {
          telefonos: [{
            telefono_raw: formData.telefono.trim(),
            principal: true,
          }],
        }),
      }

      // Agregar/actualizar trayectoria solo si se seleccionó un colegio válido
      // NOTA: Los campos region, comuna, dependencia son del colegio, no de la trayectoria
      if (formData.colegioId && formData.colegioId !== '' && formData.colegioId !== '0') {
        // Asegurar que sea un número válido
        const colegioIdNum = parseInt(String(formData.colegioId))
        if (colegioIdNum && colegioIdNum > 0 && !isNaN(colegioIdNum)) {
          console.log('[EditContactModal] 📤 Preparando trayectoria:', {
            colegioId: formData.colegioId,
            colegioIdNum,
            cargo: formData.cargo,
          })
          
          // Usar formato { connect: [id] } para relaciones manyToOne (igual que en AddContactModal)
          contactData.trayectoria = {
            colegio: { connect: [colegioIdNum] },
            cargo: formData.cargo || null,
            is_current: true,
          }
          
          console.log('[EditContactModal] ✅ Trayectoria agregada al payload:', contactData.trayectoria)
        } else {
          console.error('[EditContactModal] ⚠️ ID de colegio inválido:', formData.colegioId)
        }
      } else {
        console.log('[EditContactModal] ℹ️ No se seleccionó colegio, omitiendo trayectoria')
      }
      
      console.log('[EditContactModal] 📤 Payload completo a enviar:', JSON.stringify(contactData, null, 2))

      // Obtener el ID correcto (usar la misma lógica que en data.ts)
      console.log('[EditContactModal] Contacto recibido:', contact)
      console.log('[EditContactModal] contact.id:', contact.id)
      console.log('[EditContactModal] contact.documentId:', (contact as any).documentId)
      
      let contactId: number | string | undefined = undefined
      
      // Intentar obtener documentId primero (identificador principal en Strapi)
      const documentId = (contact as any).documentId
      if (documentId) {
        contactId = typeof documentId === 'number' ? documentId.toString() : String(documentId)
      } else if (contact.id !== undefined && contact.id !== null) {
        // Si no hay documentId, usar id
        if (typeof contact.id === 'number') {
          contactId = contact.id.toString()
        } else if (typeof contact.id === 'string') {
          contactId = contact.id
        } else {
          contactId = String(contact.id)
        }
      }
      
      console.log('[EditContactModal] contactId final:', contactId)
      
      if (!contactId || contactId === '0' || contactId === 'undefined' || contactId === 'null') {
        console.error('[EditContactModal] Error: No se pudo obtener un ID válido del contacto', {
          contact,
          documentId,
          id: contact.id,
        })
        throw new Error('No se pudo obtener el ID del contacto. Por favor, recarga la página e intenta nuevamente.')
      }
      
      // Asegurar que sea string para la URL
      const contactIdStr = String(contactId)

      // Actualizar el contacto
      const response = await fetch(`/api/crm/contacts/${contactIdStr}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        const errorMessage = result.details?.errors?.[0]?.message || result.error || 'Error al actualizar contacto'
        console.error('[EditContactModal] ❌ Error en respuesta:', {
          status: response.status,
          error: errorMessage,
          details: result.details,
        })
        throw new Error(errorMessage)
      }

      console.log('[EditContactModal] ✅ Contacto actualizado exitosamente:', result)

      // Actualizar/crear trayectoria si se seleccionó un colegio (igual que en AddContactModal)
      if (contactData.trayectoria && contactData.trayectoria.colegio) {
        try {
          // Obtener el ID numérico de la persona desde la respuesta del PUT
          let personaIdNum: number | null = null
          
          // Intentar obtener desde la respuesta
          if (result.data) {
            const personaData = Array.isArray(result.data) ? result.data[0] : result.data
            const attrs = personaData.attributes || personaData
            if (attrs && typeof attrs === 'object' && 'id' in attrs) {
              personaIdNum = attrs.id as number
              console.log('[EditContactModal] ✅ ID numérico obtenido de respuesta:', personaIdNum)
            }
          }
          
          // Si no se obtuvo de la respuesta, intentar desde contactId
          if (!personaIdNum) {
            const isDocumentId = typeof contactId === 'string' && !/^\d+$/.test(contactId)
            if (!isDocumentId) {
              personaIdNum = parseInt(String(contactId))
              console.log('[EditContactModal] ✅ ID numérico obtenido de contactId:', personaIdNum)
            } else {
              // Si es documentId, hacer una llamada para obtener el ID numérico
              try {
                const personaResponse = await fetch(`/api/crm/contacts/${contactId}`)
                const personaResult = await personaResponse.json()
                if (personaResult.success && personaResult.data) {
                  const personaData = Array.isArray(personaResult.data) ? personaResult.data[0] : personaResult.data
                  const attrs = personaData.attributes || personaData
                  if (attrs && typeof attrs === 'object' && 'id' in attrs) {
                    personaIdNum = attrs.id as number
                    console.log('[EditContactModal] ✅ ID numérico obtenido de API:', personaIdNum)
                  }
                }
              } catch (err) {
                console.error('[EditContactModal] ❌ Error obteniendo ID numérico de persona:', err)
              }
            }
          }

          if (!personaIdNum || isNaN(personaIdNum)) {
            console.error('[EditContactModal] ❌ No se pudo obtener ID numérico de persona:', {
              contactId,
              resultData: result.data,
            })
            throw new Error('No se pudo obtener el ID numérico de la persona para actualizar la trayectoria')
          }

          // Extraer colegioId del formato { connect: [id] }
          const colegioConnect = contactData.trayectoria.colegio.connect
          const colegioIdNum = Array.isArray(colegioConnect) && colegioConnect.length > 0 
            ? parseInt(String(colegioConnect[0])) 
            : null

          if (!colegioIdNum || colegioIdNum === 0 || isNaN(colegioIdNum)) {
            console.error('[EditContactModal] ❌ ID de colegio inválido:', contactData.trayectoria.colegio)
            throw new Error('ID de colegio inválido')
          }

          console.log('[EditContactModal] 🔍 Buscando trayectorias para persona:', personaIdNum)

          // Buscar trayectoria existente - intentar múltiples estrategias
          let trayectoriasExistentes: any[] = []
          
          try {
            // Estrategia 1: Buscar por persona.id e is_current
            const trayectoriasResponse = await fetch(
              `/api/persona-trayectorias?filters[persona][id][$eq]=${personaIdNum}&filters[is_current][$eq]=true`
            )
            const trayectoriasResult = await trayectoriasResponse.json()
            
            if (trayectoriasResult.success && trayectoriasResult.data) {
              trayectoriasExistentes = Array.isArray(trayectoriasResult.data) 
                ? trayectoriasResult.data 
                : (trayectoriasResult.data?.data && Array.isArray(trayectoriasResult.data.data))
                ? trayectoriasResult.data.data
                : []
            }
          } catch (err) {
            console.warn('[EditContactModal] ⚠️ Error en primera búsqueda de trayectorias:', err)
          }

          // Si no se encontraron, intentar sin filtro de is_current
          if (trayectoriasExistentes.length === 0) {
            try {
              const trayectoriasResponse2 = await fetch(
                `/api/persona-trayectorias?filters[persona][id][$eq]=${personaIdNum}`
              )
              const trayectoriasResult2 = await trayectoriasResponse2.json()
              
              if (trayectoriasResult2.success && trayectoriasResult2.data) {
                trayectoriasExistentes = Array.isArray(trayectoriasResult2.data) 
                  ? trayectoriasResult2.data 
                  : (trayectoriasResult2.data?.data && Array.isArray(trayectoriasResult2.data.data))
                  ? trayectoriasResult2.data.data
                  : []
              }
            } catch (err) {
              console.warn('[EditContactModal] ⚠️ Error en segunda búsqueda de trayectorias:', err)
            }
          }

          console.log('[EditContactModal] 📊 Trayectorias existentes encontradas:', trayectoriasExistentes.length)

          if (trayectoriasExistentes.length > 0) {
            // Actualizar trayectoria existente (preferir la que tiene is_current=true, o la primera)
            const trayectoriaActual = trayectoriasExistentes.find((t: any) => {
              const attrs = t.attributes || t
              return attrs.is_current === true
            }) || trayectoriasExistentes[0]
            
            const tAttrs = trayectoriaActual.attributes || trayectoriaActual
            const trayectoriaId = trayectoriaActual.documentId || trayectoriaActual.id || tAttrs.documentId || tAttrs.id
            
            console.log('[EditContactModal] 🔄 Actualizando trayectoria existente:', {
              trayectoriaId,
              tieneDocumentId: !!trayectoriaActual.documentId,
              tieneId: !!trayectoriaActual.id,
            })

            if (!trayectoriaId) {
              throw new Error('No se pudo obtener el ID de la trayectoria para actualizar')
            }

            const updateResponse = await fetch(`/api/persona-trayectorias/${trayectoriaId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                data: {
                  colegio: { connect: [colegioIdNum] },
                  cargo: contactData.trayectoria.cargo || null,
                  is_current: true,
                },
              }),
            })

            const updateResult = await updateResponse.json()

            if (!updateResponse.ok || !updateResult.success) {
              console.error('[EditContactModal] ❌ Error al actualizar trayectoria:', {
                status: updateResponse.status,
                error: updateResult.error,
                details: updateResult.details,
              })
              setError(
                `El contacto se actualizó correctamente, pero hubo un error al actualizar el colegio: ${updateResult.error || 'Error desconocido'}. Puedes intentar editarlo nuevamente.`
              )
            } else {
              console.log('[EditContactModal] ✅ Trayectoria actualizada exitosamente')
            }
          } else {
            // Crear nueva trayectoria
            console.log('[EditContactModal] ➕ No hay trayectoria existente, creando nueva')

            const createResponse = await fetch('/api/persona-trayectorias', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                data: {
                  persona: { connect: [personaIdNum] },
                  colegio: { connect: [colegioIdNum] },
                  cargo: contactData.trayectoria.cargo || null,
                  is_current: true,
                  activo: true,
                },
              }),
            })

            const createResult = await createResponse.json()

            if (!createResponse.ok || !createResult.success) {
              console.error('[EditContactModal] ❌ Error al crear trayectoria:', {
                status: createResponse.status,
                error: createResult.error,
                details: createResult.details,
              })
              setError(
                `El contacto se actualizó correctamente, pero hubo un error al asociarlo al colegio: ${createResult.error || 'Error desconocido'}. Puedes intentar editarlo nuevamente.`
              )
            } else {
              console.log('[EditContactModal] ✅ Trayectoria creada exitosamente')
            }
          }
        } catch (trayectoriaError: any) {
          console.error('[EditContactModal] ❌ Error al actualizar/crear trayectoria:', trayectoriaError)
          setError(
            `El contacto se actualizó correctamente, pero hubo un error al actualizar el colegio: ${trayectoriaError.message || 'Error de conexión'}. Puedes intentar editarlo nuevamente.`
          )
        }
      }

      // Actualizar/crear relación empresa-contacto si se seleccionó una empresa
      if (formData.empresaId && formData.empresaId !== '' && formData.empresaId !== '0') {
        try {
          // Obtener el ID numérico de la persona
          let personaIdNum: number | null = null
          
          if (result.data) {
            const personaData = Array.isArray(result.data) ? result.data[0] : result.data
            const attrs = personaData.attributes || personaData
            if (attrs && typeof attrs === 'object' && 'id' in attrs) {
              personaIdNum = attrs.id as number
            }
          }
          
          if (!personaIdNum) {
            const isDocumentId = typeof contactId === 'string' && !/^\d+$/.test(contactId)
            if (!isDocumentId) {
              personaIdNum = parseInt(String(contactId))
            } else {
              try {
                const personaResponse = await fetch(`/api/crm/contacts/${contactId}`)
                const personaResult = await personaResponse.json()
                if (personaResult.success && personaResult.data) {
                  const personaData = Array.isArray(personaResult.data) ? personaResult.data[0] : personaResult.data
                  const attrs = personaData.attributes || personaData
                  if (attrs && typeof attrs === 'object' && 'id' in attrs) {
                    personaIdNum = attrs.id as number
                  }
                }
              } catch (err) {
                console.error('[EditContactModal] ❌ Error obteniendo ID numérico de persona:', err)
              }
            }
          }

          if (personaIdNum && !isNaN(personaIdNum)) {
            const empresaIdNum = parseInt(String(formData.empresaId))
            if (!isNaN(empresaIdNum)) {
              const empresaContactoResponse = await fetch('/api/empresa-contactos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  persona_id: personaIdNum,
                  empresa_id: empresaIdNum,
                  cargo: formData.cargoEmpresa || null,
                }),
              })

              const empresaContactoResult = await empresaContactoResponse.json()
              if (!empresaContactoResponse.ok || !empresaContactoResult.success) {
                console.error('[EditContactModal] ❌ Error al crear/actualizar relación empresa-contacto:', empresaContactoResult.error)
                setError(
                  `El contacto se actualizó correctamente, pero hubo un error al asociarlo a la empresa: ${empresaContactoResult.error || 'Error desconocido'}. Puedes intentar editarlo nuevamente.`
                )
              } else {
                console.log('[EditContactModal] ✅ Relación empresa-contacto creada/actualizada exitosamente')
              }
            }
          }
        } catch (empresaError: any) {
          console.error('[EditContactModal] ❌ Error al actualizar/crear relación empresa-contacto:', empresaError)
          setError(
            `El contacto se actualizó correctamente, pero hubo un error al asociarlo a la empresa: ${empresaError.message || 'Error de conexión'}. Puedes intentar editarlo nuevamente.`
          )
        }
      }

      // Cerrar modal primero
      onHide()
      
      // Luego ejecutar callback si existe
      if (onSuccess) {
        // Usar setTimeout para evitar problemas con el refresh del router
        setTimeout(() => {
          onSuccess()
        }, 100)
      }
    } catch (err: any) {
      console.error('Error al actualizar contacto:', err)
      setError(err.message || 'Error al actualizar contacto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <ModalHeader closeButton>
          <ModalTitle>Editar Contacto</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Nombre <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="text"
                  placeholder="Nombre completo"
                  value={formData.nombres}
                  onChange={(e) => handleFieldChange('nombres', e.target.value)}
                  required
                  disabled={loading}
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Email <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="email"
                  placeholder="email@ejemplo.cl"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  required
                  disabled={loading}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Cargo</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: Profesor de Matemáticas"
                  value={formData.cargo}
                  onChange={(e) => handleFieldChange('cargo', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Teléfono</FormLabel>
                <FormControl
                  type="text"
                  placeholder="+569 1234 5678"
                  value={formData.telefono}
                  onChange={(e) => handleFieldChange('telefono', e.target.value)}
                  disabled={loading}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Institución (Colegio)</FormLabel>
                <Select
                  value={selectedColegio}
                  onChange={handleColegioChange}
                  onInputChange={handleColegioInputChange}
                  options={colegioOptions}
                  isSearchable
                  isClearable
                  placeholder="Escribe para buscar colegio..."
                  isLoading={loadingColegios}
                  noOptionsMessage={({ inputValue }) => 
                    inputValue.length < 2 
                      ? 'Escribe al menos 2 caracteres para buscar...'
                      : 'No se encontraron colegios'
                  }
                  loadingMessage={() => 'Buscando colegios...'}
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '38px',
                      borderColor: '#ced4da',
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 9999,
                    }),
                  }}
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
                {selectedColegio && (
                  <small className="text-muted mt-1 d-block">
                    Colegio seleccionado: {selectedColegio.label}
                  </small>
                )}
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Empresa</FormLabel>
                <Select
                  value={selectedEmpresa}
                  onChange={handleEmpresaChange}
                  options={empresaOptions}
                  isSearchable
                  isClearable
                  placeholder="Seleccionar empresa..."
                  isLoading={loadingEmpresas}
                  noOptionsMessage={() => 'No se encontraron empresas'}
                  loadingMessage={() => 'Cargando empresas...'}
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '38px',
                      borderColor: '#ced4da',
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 9999,
                    }),
                  }}
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
                {selectedEmpresa && (
                  <small className="text-muted mt-1 d-block">
                    Empresa seleccionada: {selectedEmpresa.label}
                  </small>
                )}
              </FormGroup>
            </Col>
            {selectedEmpresa && (
              <Col md={6}>
                <FormGroup className="mb-3">
                  <FormLabel>Cargo en la Empresa</FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ej: Gerente de Ventas"
                    value={formData.cargoEmpresa}
                    onChange={(e) => handleFieldChange('cargoEmpresa', e.target.value)}
                    disabled={loading}
                  />
                </FormGroup>
              </Col>
            )}
            <Col md={12}>
              <FormGroup className="mb-3">
                <FormLabel>Región y Comuna</FormLabel>
                <ChileRegionComuna
                  regionValue={formData.region}
                  comunaValue={formData.comuna}
                  onRegionChange={(value) => handleFieldChange('region', value)}
                  onComunaChange={(value) => handleFieldChange('comuna', value)}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Dependencia</FormLabel>
                <FormControl
                  as="select"
                  value={formData.dependencia}
                  onChange={(e) => handleFieldChange('dependencia', e.target.value)}
                  disabled={loading}
                >
                  <option value="">Seleccionar...</option>
                  {DEPENDENCIAS.map((dep) => (
                    <option key={dep} value={dep}>
                      {dep}
                    </option>
                  ))}
                </FormControl>
              </FormGroup>
            </Col>
          </Row>

        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            <LuCheck className="me-1" />
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default EditContactModal

