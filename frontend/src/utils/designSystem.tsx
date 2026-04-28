import { createContext, useContext, useState, type ReactNode } from 'react'

export type DesignSystem = 'classic' | 'liquid'

interface DesignSystemContextValue {
  designSystem: DesignSystem
  setDesignSystem: (ds: DesignSystem) => void
}

const DesignSystemContext = createContext<DesignSystemContextValue>({
  designSystem: 'liquid',
  setDesignSystem: () => {},
})

const STORAGE_KEY = 'calendar-design-system'

export function DesignSystemProvider({ children }: { children: ReactNode }) {
  const [designSystem, setDesignSystemState] = useState<DesignSystem>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'classic' || stored === 'liquid') return stored
    } catch {}
    return 'liquid'
  })

  const setDesignSystem = (ds: DesignSystem) => {
    setDesignSystemState(ds)
    try { localStorage.setItem(STORAGE_KEY, ds) } catch {}
  }

  return (
    <DesignSystemContext.Provider value={{ designSystem, setDesignSystem }}>
      {children}
    </DesignSystemContext.Provider>
  )
}

export function useDesignSystem() {
  return useContext(DesignSystemContext)
}
