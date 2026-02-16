import React from 'react'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { TbArrowDown, TbArrowUp, TbClock, TbCurrencyDollar } from 'react-icons/tb'

type ProposalsCardProps = {
    value: string | React.ReactNode,
    change: string,
    icon: React.ReactNode,
    desc: string,
}

const ProposalsCard = () => {
    const cards: ProposalsCardProps[] = [
        {
            value: '38',
            change: '+12.4%',
            icon: <TbArrowUp className="text-success" />,
            desc: 'Total de propuestas enviadas',
        },
        {
            value: '19',
            change: '+9.8%',
            icon: <TbArrowUp className="text-success" />,
            desc: 'Propuestas aprobadas',
        },
        {
            value: '7',
            change: '-4.2%',
            icon: <TbArrowDown className="text-danger" />,
            desc: 'Propuestas rechazadas',
        },
        {
            value: '$112,000',
            change: 'Valor máximo',
            icon: <TbCurrencyDollar className="text-success" />,
            desc: 'Valor más alto de propuesta',
        },
        {
            value: (
                <>
                    3.2 <small className="fs-6">días</small>
                </>
            ),
            change: '+0.8%',
            icon: <TbClock className="text-warning" />,
            desc: 'Tiempo promedio de revisión',
        },
    ]

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

export default ProposalsCard
