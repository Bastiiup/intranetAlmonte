import React from 'react'
import { Widget4Type } from '../types'
import { TbInfoHexagonFilled, TbPointFilled, TbTrendingUp } from 'react-icons/tb'
import CountUpClient from '@/components/client-wrapper/CountUpClient'
import { Card, CardBody, OverlayTrigger, Tooltip } from 'react-bootstrap'

const Widgets4 = ({ item }: { item: Widget4Type }) => {
    const { label, labelValue, title, trendColor, trendValue, value,info } = item
    return (
        <Card>
            <CardBody >
                <div className="d-flex justify-content-between">
                    <h6 className="mb-0 fs-sm text-uppercase">{title}</h6>
                    <p className="mb-0 fs-lg">
                        <OverlayTrigger overlay={<Tooltip>{info}</Tooltip>} placement='bottom'>
                            <TbInfoHexagonFilled className="text-muted" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Total number of properties listed" />
                        </OverlayTrigger>
                    </p>
                </div>
                <h3 className="my-3 text-primary text-center"> <CountUpClient end={value} duration={1} enableScrollSpy scrollSpyOnce /></h3>
                <p className="mb-0">
                    <span className={`text-${trendColor}`}><TbPointFilled /></span>&nbsp;
                    <span className="text-muted">{label}: {labelValue}</span>
                    <span className="float-end"><TbTrendingUp className={`text-${trendColor}`} /> <b>{trendValue}%</b></span>
                </p>
            </CardBody>
        </Card>
    )
}

export default Widgets4