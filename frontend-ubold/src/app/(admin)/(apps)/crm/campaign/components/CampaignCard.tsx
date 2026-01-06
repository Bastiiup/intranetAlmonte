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

const CampaignCard = () => {
    const [campaigns, setCampaigns] = useState<CampaignType[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadCampaigns()
    }, [])

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
    
    // Calcular duración promedio (simplificado - se puede mejorar con fechas reales)
    const avgDuration = campaigns.length > 0 ? 5.7 : 0

    const cards: CampaignCardProps[] = [
        {
            value: totalCampaigns.toString(),
            change: totalCampaigns > 0 ? '+22.2%' : '0%',
            icon: <TbArrowUp className="text-success" />,
            desc: 'Total campaigns launched',
        },
        {
            value: successfulCampaigns.toString(),
            change: totalCampaigns > 0 ? `+${((successfulCampaigns / totalCampaigns) * 100).toFixed(1)}%` : '0%',
            icon: <TbArrowUp className="text-success" />,
            desc: 'Successful campaigns',
        },
        {
            value: failedCampaigns.toString(),
            change: totalCampaigns > 0 ? `-${((failedCampaigns / totalCampaigns) * 100).toFixed(1)}%` : '0%',
            icon: <TbArrowDown className="text-danger" />,
            desc: 'Failed campaigns',
        },
        {
            value: `$${highestBudget.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
            change: 'Top value',
            icon: <TbCurrencyDollar className="text-success" />,
            desc: 'Highest campaign budget',
        },
        {
            value: (
                <>
                    {avgDuration.toFixed(1)} <small className="fs-6">days</small>
                </>
            ),
            change: '+1.4%',
            icon: <TbClock className="text-warning" />,
            desc: 'Avg. campaign duration',
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
