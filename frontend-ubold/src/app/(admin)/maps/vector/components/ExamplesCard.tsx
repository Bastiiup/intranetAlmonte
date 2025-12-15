'use client'
import { Col, Row } from 'react-bootstrap'

import CanadaVectorMap from '@/app/(admin)/maps/vector/components/CanadaVectorMap'
import IraqVectorMap from '@/app/(admin)/maps/vector/components/IraqVectorMap'
import RussiaVectorMap from '@/app/(admin)/maps/vector/components/RussiaVectorMap'
import SpainVectorMap from '@/app/(admin)/maps/vector/components/SpainVectorMap'
import USAVectorMap from '@/app/(admin)/maps/vector/components/USAVectorMap'
import WorldMapMarkerLine from '@/app/(admin)/maps/vector/components/WorldMapMarkerLine'
import { getWorldMapOptions } from '@/app/(admin)/maps/vector/data'
import ComponentCard from '@/components/cards/ComponentCard'
import BaseVectorMap from '@/components/maps/BaseVectorMap'

const ExamplesCard = () => {
  return (
    <>
      <Row>
        <Col xl={6}>
          <ComponentCard title="World Vector Map">
              <BaseVectorMap id="world-map" options={getWorldMapOptions()} style={{ height: 360 }} />
          </ComponentCard>
        </Col>

        <Col xl={6}>
          <ComponentCard title="World Vector Live Map">
              <WorldMapMarkerLine />
          </ComponentCard>
        </Col>
        <Col xl={6}>
          <ComponentCard title="US Vector Map">
              <USAVectorMap />
          </ComponentCard>
        </Col>
        <Col xl={6}>
          <ComponentCard title="Canada Vector Map">
              <CanadaVectorMap />
          </ComponentCard>
        </Col>
        <Col xl={6}>
          <ComponentCard title="Russia Vector Map">
              <RussiaVectorMap />
          </ComponentCard>
        </Col>

        <Col xl={6}>
          <ComponentCard title="Iraq Vector Map">
              <IraqVectorMap />
          </ComponentCard>
        </Col>

        <Col xl={6}>
          <ComponentCard title="Spain Vector Map">
              <SpainVectorMap />
          </ComponentCard>
        </Col>
      </Row>
    </>
  )
}

export default ExamplesCard
