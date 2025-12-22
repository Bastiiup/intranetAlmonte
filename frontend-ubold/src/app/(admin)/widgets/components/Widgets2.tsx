import React from 'react'
import { Card, CardBody } from 'react-bootstrap'
import { Widget1Type } from '../types'
import CountUpClient from '@/components/client-wrapper/CountUpClient';

const Widgets2 = ({ item }: { item: Widget1Type }) => {
  const { color, count, icon: Icon, label } = item;
  return (
    <Card>
      <CardBody className="d-flex justify-content-between align-items-center">
        <div>
          <h3 className="mb-2 fw-normal"> <CountUpClient prefix={count.prefix} suffix={count.suffix} end={count.value} duration={1} enableScrollSpy scrollSpyOnce /></h3>
          <p className="mb-0 text-muted">{label}</p>
        </div>
        <div className="avatar fs-60 avatar-img-size">
          <span className={`avatar-title bg-${color}-subtle text-${color} rounded-circle fs-24`}>
            <Icon />
          </span>
        </div>
      </CardBody>
    </Card>
  )
}

export default Widgets2