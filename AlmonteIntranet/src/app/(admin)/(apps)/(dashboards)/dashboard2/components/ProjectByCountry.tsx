import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import { TbBriefcase } from 'react-icons/tb'

import ComponentCard from '@/components/cards/ComponentCard'
import { CountryDataType } from '../data'

interface ProjectByCountryProps {
  countriesData: CountryDataType[]
}

const ProjectByCountry = ({ countriesData }: ProjectByCountryProps) => {
  if (!countriesData || countriesData.length === 0) {
    return (
      <ComponentCard title="Top Projects by Country" isCloseable isCollapsible isRefreshable>
        <div className="text-center py-4">
          <p className="text-muted mb-0">Aún no hay datos de pedidos por país</p>
        </div>
      </ComponentCard>
    )
  }

  return (
    <ComponentCard title="Top Projects by Country" isCloseable isCollapsible isRefreshable>
      {countriesData.map((country, idx) => (
        <div key={country.code} className={clsx('d-flex align-items-center gap-2 mb-3')}>
          <Image src={country.flag} alt={country.name} className="avatar-xxs rounded" height={16} width={16} />
          <h5 className="mb-0 fw-medium">
            <a href="" className="link-reset">
              {country.name}
            </a>
            <small className="text-muted ms-1">{country.activeProjects} Active Projects</small>
          </h5>
          <div className="ms-auto">
            <div className="d-flex align-items-center gap-3">
              <p className="mb-0 fw-medium">{country.projectName}</p>
              <p className={`badge badge-label fs-xxs mb-0 badge-soft-${country.trend.type}`}>
                {country.trend.type === 'danger' ? '-' : country.trend.type === 'success' ? '+' : ''}
                {country.trend.value}%
              </p>
            </div>
          </div>
        </div>
      ))}

      <div className="text-center mt-4">
        <Link href="/chat" className="link-reset text-decoration-underline fw-semibold link-offset-3">
          View all Projects <TbBriefcase size={13} />
        </Link>
      </div>
    </ComponentCard>
  )
}

export default ProjectByCountry
