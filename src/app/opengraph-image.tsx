import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'letsmeet.link - AI-First Scheduling'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: '#0066FF' }} />
        
        {/* Grid icon */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 32 }}>
          {[1, 0.6, 0.3].map((opacity, row) => (
            <div key={row} style={{ display: 'flex', gap: 6 }}>
              {[0, 1, 2].map((col) => (
                <div
                  key={col}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 4,
                    background: '#0066FF',
                    opacity: row === 0 ? 1 : opacity,
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Brand name */}
        <div style={{ fontSize: 64, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>
          letsmeet.link
        </div>

        {/* Tagline */}
        <div style={{ fontSize: 32, color: '#6B7280', marginBottom: 16 }}>
          AI-First Scheduling
        </div>

        {/* Features */}
        <div style={{ fontSize: 20, color: '#9CA3AF' }}>
          MCP Ready · AI Chat Built In · Smart Calendar Sync
        </div>

        {/* Bottom accent */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, background: '#0066FF' }} />
      </div>
    ),
    { ...size }
  )
}
