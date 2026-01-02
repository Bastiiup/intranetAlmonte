const AlmonteAbstractLogo = ({ height = 60 }: { height?: number }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      width={height}
      height={height}
      style={{ display: 'block' }}
    >
      {/* Left black shape - parallelogram/trapezoid */}
      <path
        d="M20 20 L80 20 L60 100 L20 100 Z"
        fill="black"
      />
      {/* Right black shape - complex shape with large concave curve and convex curve */}
      <path
        d="M120 20 L180 20 L180 100 L140 100 Q120 80 120 60 Q120 40 140 50 L120 20 Z"
        fill="black"
      />
      {/* Additional elements for the abstract A shape */}
      <path
        d="M40 120 L100 120 L80 200 L40 200 Z"
        fill="black"
      />
      <path
        d="M120 120 L180 120 L180 200 L140 200 Q120 180 120 160 Q120 140 140 150 L120 120 Z"
        fill="black"
      />
    </svg>
  )
}

export default AlmonteAbstractLogo

