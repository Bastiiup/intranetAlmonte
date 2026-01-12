import ctaImg from '@/assets/images/landing-cta.jpg'
import { Button } from 'react-bootstrap'

const CTA = () => {
  return (
    <section>
      <div className="section-cta position-relative card-side-img overflow-hidden" style={{ backgroundImage: `url(${ctaImg.src})` }}>
        <div className="card-img-overlay d-flex align-items-center flex-column gap-3 justify-content-center auth-overlay text-center">
          <h3 className="text-white fs-24 mb-0 fw-bold">
            Potencia Tu Proyecto con Nuestro Panel de Administración Premium
          </h3>
          <p className="text-white text-opacity-75 fs-md">
            Lanza más rápido con un panel de administración elegante, responsivo y enfocado en desarrolladores. <br /> Comienza hoy — prueba gratuita de 14 días, sin tarjeta de crédito requerida.
          </p>
          <Button variant='light' className="rounded-pill">Comenzar Ahora</Button>
        </div>
      </div>
    </section>

  )
}

export default CTA
