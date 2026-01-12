import Image from "next/image"
import dashboardImg from "@/assets/images/dashboard.png"
import { Button, Col, Container, Row } from "react-bootstrap"
import { TbBasket } from "react-icons/tb"


const Hero = () => {
  return (
    <section className="bg-light bg-opacity-50 border-top border-light position-relative" id="home">
      <Container className="pt-5 mt-5 position-relative">
        <Row>
          <Col lg={8} className="mx-auto text-center">
            <h1 className="my-4 fs-36 fw-bold lh-base">
              Moderno, Potente y Flexible <span className="text-primary">Panel de Administración</span> –&nbsp;<span className="text-muted">Construido para Aplicaciones Web Serias</span>
            </h1>
            <p className="mb-4 fs-md text-muted lh-lg">
              Construye aplicaciones web rápidas, modernas y escalables con nuestra plantilla de Panel de Administración más vendida.
              Diseñada para rendimiento, flexibilidad y fácil personalización — ideal para startups, agencias y equipos empresariales.
            </p>
            <div className="d-flex gap-1 gap-sm-2 flex-wrap justify-content-center">
              <Button variant="primary" className="py-2 fw-semibold" href="#">
                <TbBasket className="fs-xl me-2" />Comprar UBold Ahora!
              </Button>
            </div>
          </Col>
        </Row>
        <Container className="position-relative">
          <Row>
            <Col md={10} className="mx-auto position-relative">
              <Image src={dashboardImg} className="rounded-top-4 img-fluid mt-5" alt="saas-img" />
            </Col>
          </Row>
        </Container>
      </Container>
    </section>

  )
}

export default Hero
