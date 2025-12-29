'use client'
import { Card, CardBody, CardHeader, FormControl, FormGroup, FormLabel, FormSelect, InputGroup } from 'react-bootstrap'
import InputGroupText from 'react-bootstrap/esm/InputGroupText'
import { LuDollarSign, LuPercent, LuTag } from 'react-icons/lu'

const Pricing = () => {
  return (
    <Card>
      <CardHeader className="d-block p-3">
        <h4 className="card-title mb-1">Precios</h4>
        <p className="text-muted mb-0">Establecer el precio base y el descuento aplicable para el producto usando las opciones a continuación.</p>
      </CardHeader>
      <CardBody>
        <FormGroup className="mb-3">
          <FormLabel htmlFor="basePrice">
            Precio Base <span className="text-danger">*</span>
          </FormLabel>
          <InputGroup>
            <FormControl type="number" id="basePrice" placeholder="Ingrese el precio base (por ejemplo, 199.99)" />
            <InputGroupText>
              <LuDollarSign className="text-muted" />
            </InputGroupText>
          </InputGroup>
        </FormGroup>
        <FormGroup className="mb-3">
          <FormLabel htmlFor="discount">
            Tipo de Descuento <span className="text-muted">(Opcional)</span>
          </FormLabel>
          <InputGroup>
            <FormSelect id="discount">
              <option>Elegir Descuento</option>
              <option value="No Discount">Sin Descuento</option>
              <option value="Flat Discount">Descuento Fijo</option>
              <option value="Percentage Discount">Descuento Porcentual</option>
            </FormSelect>
            <InputGroupText>
              <LuPercent className="text-muted" />
            </InputGroupText>
          </InputGroup>
        </FormGroup>
        <FormGroup>
          <FormLabel htmlFor="discountValue">
            Valor del Descuento <span className="text-muted">(Opcional)</span>
          </FormLabel>
          <InputGroup>
            <FormControl type="number" id="discountValue" placeholder="Ingrese el valor del descuento o porcentaje" />
            <InputGroupText>
              <LuTag className="text-muted" />
            </InputGroupText>
          </InputGroup>
        </FormGroup>
      </CardBody>
    </Card>
  )
}

export default Pricing
