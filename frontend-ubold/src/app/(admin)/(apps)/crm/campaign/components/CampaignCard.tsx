'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardBody, Col, Row, Spinner } from 'react-bootstrap'
import { TbArrowDown, TbArrowUp, TbClock, TbCurrencyDollar } from 'react-icons/tb'
import { getCampaigns, type CampaignType } from '../data'

type CampaignCardProps = {
    value: string | React.ReactNode,
    change: string,
    icon: React.ReactNode,
    desc: string,
}

interface CampaignCardProps {
    refreshTrigger?: number
}

const CampaignCard = ({ refreshTrigger }: CampaignCardProps) => {
    const [campaigns, setCampaigns] = useState<CampaignType[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadCampaigns()
    }, [refreshTrigger])

    const loadCampaigns = async () => {
        try {
            const result = await getCampaigns({ pageSize: 1000 })
            setCampaigns(result.campaigns)
        } catch (err) {
            console.error('Error loading campaigns:', err)
        } finally {
            setLoading(false)
        }
    }

    // Calcular estadísticas
    const totalCampaigns = campaigns.length
    const successfulCampaigns = campaigns.filter(c => c.status === 'Success').length
    const failedCampaigns = campaigns.filter(c => c.status === 'Failed').length
    const highestBudget = campaigns.reduce((max, c) => {
        const budget = parseFloat(c.budget.replace(/[^0-9.]/g, '')) || 0
        return budget > max ? budget : max
    }, 0)
    
    // Calcular duración promedio usando fechas reales
    let avgDuration = 0
    if (campaigns.length > 0) {
        const durations = campaigns
            .map(c => {
                // Si tiene fecha de inicio y fin, calcular la duración real
                if (c.fechaInicio && c.fechaFin) {
                    try {
                        const inicio = new Date(c.fechaInicio)
                        const fin = new Date(c.fechaFin)
                        const diffTime = Math.abs(fin.getTime() - inicio.getTime())
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                        return diffDays
                    } catch (e) {
                        return null
                    }
                }
                // Si solo tiene fecha de inicio, calcular desde entonces hasta ahora
                else if (c.fechaInicio) {
                    try {
                        const inicio = new Date(c.fechaInicio)
                        const now = new Date()
                        const diffTime = Math.abs(now.getTime() - inicio.getTime())
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                        return diffDays
                    } catch (e) {
                        return null
                    }
                }
                // Si no tiene fechas, usar fecha de creación
                else {
                    try {
                        const dateStr = c.dateCreated
                        if (!dateStr) return null
                        // Formato: "Jan 06, 2026"
                        const date = new Date(dateStr)
                        const now = new Date()
                        const diffTime = Math.abs(now.getTime() - date.getTime())
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                        return diffDays
                    } catch (e) {
                        return null
                    }
                }
            })
            .filter((d): d is number => d !== null)
        
        if (durations.length > 0) {
            avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length
        }
    }

    const cards: CampaignCardProps[] = [
        {
            value: totalCampaigns.toString(),
            change: totalCampaigns > 0 ? '+22.2%' : '0%',
            icon: <TbArrowUp className="text-success" />,
            desc: 'Total de campañas lanzadas',
        },
        {
            value: successfulCampaigns.toString(),
            change: totalCampaigns > 0 ? `+${((successfulCampaigns / totalCampaigns) * 100).toFixed(1)}%` : '0%',
            icon: <TbArrowUp className="text-success" />,
            desc: 'Campañas exitosas',
        },
        {
            value: failedCampaigns.toString(),
            change: totalCampaigns > 0 ? `-${((failedCampaigns / totalCampaigns) * 100).toFixed(1)}%` : '0%',
            icon: <TbArrowDown className="text-danger" />,
            desc: 'Campañas fallidas',
        },
        {
            value: `$${highestBudget.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
            change: 'Top value',
            icon: <TbCurrencyDollar className="text-success" />,
            desc: 'Presupuesto más alto',
        },
        {
            value: (
                <>
                    {avgDuration.toFixed(1)} <small className="fs-6">days</small>
                </>
            ),
            change: '+1.4%',
            icon: <TbClock className="text-warning" />,
            desc: 'Duración promedio',
        },
    ]

    if (loading) {
        return (
            <Row className="row-cols-xxl-5 row-cols-md-3 row-cols-1 g-2">
                <Col xs={12} className="text-center py-3">
                    <Spinner animation="border" variant="primary" size="sm" />
                </Col>
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
                                <span>
                                    {card.change} {card.icon}
                                </span>
                            </div>
                            <p className="text-muted mb-0">{card.desc}</p>
                        </CardBody>
                    </Card>
                </Col>
            ))}
        </Row>
    )
}

export default CampaignCard
