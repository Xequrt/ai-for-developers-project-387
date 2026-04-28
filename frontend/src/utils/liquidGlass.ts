/** Liquid Glass surface styles — Apple HIG 2025 */

export const liquidGlassLight: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.6) 100%)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.18)',
}

export const liquidGlassDark: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(44,44,46,0.8) 0%, rgba(28,28,30,0.6) 100%)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.08)',
}

/** Fallback when no background is behind the surface */
export const liquidGlassFallback: React.CSSProperties = {
  background: '#FFFFFF',
}
