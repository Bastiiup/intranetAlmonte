#!/usr/bin/env node

/**
 * Script para verificar matrículas usando nuestra propia API
 * Fecha: 30 de enero de 2026
 */

const API_URL = process.env.API_URL || 'http://localhost:3000'

console.log('🔍 Verificando matrículas desde API interna...')
console.log(`📡 URL: ${API_URL}`)
console.log('')

async function verificarMatriculas() {
  try {
    const response = await fetch(`${API_URL}/api/crm/listas/por-colegio`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }
    
    const { success, data } = await response.json()
    
    if (!success) {
      throw new Error('API devolvió success: false')
    }
    
    console.log('═'.repeat(80))
    console.log('📊 RESULTADOS DE MATRÍCULAS')
    console.log('═'.repeat(80))
    console.log('')
    console.log('Colegio'.padEnd(40), 'RBD'.padEnd(12), 'Matriculados')
    console.log('─'.repeat(80))
    
    let totalEstudiantes = 0
    let colegiosConMatricula = 0
    
    data.forEach((colegio, index) => {
      if (index < 10) { // Mostrar solo los primeros 10
        const nombre = (colegio.nombre || 'Sin nombre').substring(0, 38).padEnd(40)
        const rbd = String(colegio.rbd || 'N/A').padEnd(12)
        const matriculados = colegio.total_matriculados || 0
        
        let indicador = ''
        if (matriculados > 0) {
          indicador = '✅'
          colegiosConMatricula++
        } else {
          indicador = '⚠️ '
        }
        
        console.log(`${indicador} ${nombre} ${rbd} ${matriculados} estudiantes`)
      }
      
      totalEstudiantes += colegio.total_matriculados || 0
    })
    
    console.log('─'.repeat(80))
    
    if (data.length > 10) {
      console.log(`... y ${data.length - 10} colegios más`)
      console.log('─'.repeat(80))
    }
    
    console.log('')
    console.log(`📚 Total de colegios analizados: ${data.length}`)
    console.log(`✅ Colegios con matrícula > 0: ${colegiosConMatricula} (${((colegiosConMatricula/data.length)*100).toFixed(1)}%)`)
    console.log(`🎓 Total de estudiantes matriculados: ${totalEstudiantes}`)
    console.log('')
    
    // Guardar resultados
    const fs = await import('fs/promises')
    const outputPath = 'scripts/resultados-verificacion-matriculas.json'
    await fs.writeFile(
      outputPath,
      JSON.stringify({
        fecha: new Date().toISOString(),
        api_url: API_URL,
        colegios: data.map(c => ({
          nombre: c.nombre,
          rbd: c.rbd,
          total_matriculados: c.total_matriculados,
          cantidad_cursos: c.cantidadCursos,
          cantidad_listas: c.cantidadListas
        })),
        resumen: {
          total_colegios: data.length,
          colegios_con_matricula: colegiosConMatricula,
          total_estudiantes: totalEstudiantes
        }
      }, null, 2)
    )
    
    console.log(`💾 Resultados guardados en: ${outputPath}`)
    console.log('')
    
    // Análisis específico
    console.log('🔍 Análisis de colegios específicos mencionados en documentación:')
    console.log('─'.repeat(80))
    
    const colegiosEsperados = [
      { rbd: 10611, nombre: 'American Academy', esperado: 923 },
      { rbd: 10479, nombre: 'Colegio Estela Segura', esperado: 836 },
      { rbd: 10350, nombre: 'Colegio Elena Bettini', esperado: 731 }
    ]
    
    colegiosEsperados.forEach(({ rbd, nombre, esperado }) => {
      const colegio = data.find(c => c.rbd === rbd)
      if (colegio) {
        const actual = colegio.total_matriculados || 0
        const diferencia = actual - esperado
        const match = actual === esperado ? '✅' : '❌'
        
        console.log(`${match} ${nombre} (RBD: ${rbd})`)
        console.log(`   Esperado: ${esperado} | Actual: ${actual} | Diferencia: ${diferencia}`)
      } else {
        console.log(`⚠️  ${nombre} (RBD: ${rbd}) - No encontrado en la API`)
      }
    })
    
    console.log('')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

verificarMatriculas()
