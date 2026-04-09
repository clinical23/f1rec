import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0f',
          borderRadius: '6px',
        }}
      >
        <span style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'Arial, sans-serif', letterSpacing: '-1px' }}>
          <span style={{ color: '#ffffff' }}>F1</span>
          <span style={{ color: '#e8002d' }}>R</span>
        </span>
      </div>
    ),
    { ...size }
  )
}
