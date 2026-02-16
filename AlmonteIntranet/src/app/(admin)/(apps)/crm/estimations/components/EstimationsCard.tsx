'use client'
import React, { useState, useEffect } from 'react'
import { Card, CardBody, Col, Row, Spinner } from 'react-bootstrap'
import { TbArrowDown, TbArrowUp, TbClock, TbCurrencyDollar } from 'react-icons/tb'

const EstimationsCard = () => {
    const [stats, setStats] = useState({
        total: 0,
        aprobadas: 0,
        rechazadas: 0,
        valorMaximo: 0,
        tiempoPromedio: 0,
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadStats = async () => {
            try {
                const response = await fetch('/api/crm/cotizaciones?pageSize=1000')
                const result = await response.json()

                if (result.success && result.data) {
                    const cotizaciones = Array.isArray(result.data) ? result.data : [result.data]
                    
                    const total = cotizaciones.length
                    const aprobadas = cotizaciones.filter((c: any) => {
                        const estado = c.attributes?.estado || c.estado
                        return estado === 'Aprobada'
                    }).length
                    const rechazadas = cotizaciones.filter((c: any) => {
                        const estado = c.attributes?.estado || c.estado
                        return estado === 'Rechazada'
                    }).length
                    
                    const montos = cotizaciones
                        .map((c: any) => {
                            const monto = c.attributes?.monto || c.monto
                            return monto ? Number(monto) : 0
                        })
                        .filter((m: number) => m > 0)
                    
                    const valorMaximo = montos.length > 0 ? Math.max(...montos) : 0
                    
                    // Calcular tiempo promedio (simplificado - días desde creación hasta actualización)
                    const tiempos = cotizaciones
                        .map((c: any) => {
                            const createdAt = c.attributes?.createdAt || c.createdAt
                            const updatedAt = c.attributes?.updatedAt || c.updatedAt
                            if (createdAt && updatedAt) {
                                const diff = new Date(updatedAt).getTime() - new Date(createdAt).getTime()
                                return diff / (1000 * 60 * 60 * 24) // Convertir a días
                            }
                            return 0
                        })
                        .filter((t: number) => t > 0)
                    
                    const tiempoPromedio = tiempos.length > 0 
                        ? tiempos.reduce((a: number, b: number) => a + b, 0) / tiempos.length 
                        : 0

                    setStats({
                        total,
                        aprobadas,
                        rechazadas,
                        valorMaximo,
                        tiempoPromedio: Math.round(tiempoPromedio * 10) / 10,
                    })
                }
            } catch (err) {
                console.error('Error al cargar estadísticas:', err)
            } finally {
                setLoading(false)
            }
        }

        loadStats()
    }, [])

    const formatCurrency = (monto: number) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            maximumFractionDigits: 0,
        }).format(monto)
    }

    const cards = [
        {
            value: stats.total,
            change: '',
            icon: <TbArrowUp className="text-success" />,
            desc: 'Total de cotizaciones creadas',
        },
        {
            value: stats.aprobadas,
            change: '',
            icon: <TbArrowUp className="text-success" />,
            desc: 'Cotizaciones aprobadas',
        },
        {
            value: stats.rechazadas,
            change: '',
            icon: <TbArrowDown className="text-danger" />,
            desc: 'Cotizaciones rechazadas',
        },
        {
            value: stats.valorMaximo > 0 ? formatCurrency(stats.valorMaximo) : '-',
            change: 'Valor máximo',
            icon: <TbCurrencyDollar className="text-success" />,
            desc: 'Valor más alto de cotización',
        },
        {
            value: stats.tiempoPromedio > 0 ? (
                <>
                    {stats.tiempoPromedio} <small className="fs-6">días</small>
                </>
            ) : '-',
            change: '',
            icon: <TbClock className="text-warning" />,
            desc: 'Tiempo promedio de revisión',
        },
    ]

    if (loading) {
        return (
            <Row className="row-cols-xxl-5 row-cols-md-3 row-cols-1 g-2">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Col key={i}>
                        <Card className="mb-2">
                            <CardBody>
                                <div className="text-center py-3">
                                    <Spinner animation="border" size="sm" />
                                </div>
                            </CardBody>
                        </Card>
                    </Col>
                ))}
            </Row>
        )
    }

    return (
        <Row className="row-cols-xxl-5 row-cols-md-3 row-cols-1 g-2">
            {cards.map((card, index) => (
                <Col key={index}>
                    <Card className="mb-2">
                        <CardBody>
                            <div className="mb-3 d-flex justify-content-between align-items-center">
                                <h5 className="fs-xl mb-0">{card.value}</h5>
                                {card.change && (
                                    <span>
                                        {card.change} {card.icon}
                                    </span>
                                )}
                            </div>
                            <p className="text-muted mb-0">{card.desc}</p>
                        </CardBody>
                    </Card>
                </Col>
            ))}
        </Row>
    )
}

export default EstimationsCard
