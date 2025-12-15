export default function TestPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Test Page - Railway Deployment</h1>
      <p>Si ves este mensaje, el servidor está funcionando correctamente.</p>
      <p>Timestamp: {new Date().toISOString()}</p>
    </div>
  )
}

