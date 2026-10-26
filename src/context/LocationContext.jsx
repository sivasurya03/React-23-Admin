import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { readStorage, writeStorage, STORAGE_KEYS } from '../utils/storage.js'
import { LOCATIONS } from '../data/index.js'

const LocationContext = createContext(null)

export function LocationProvider({ children }) {
  const [location, setLocationState] = useState(() => {
    const saved = readStorage(STORAGE_KEYS.location, null)
    return typeof saved === 'string' && LOCATIONS.includes(saved) ? saved : LOCATIONS[0]
  })

  useEffect(() => {
    writeStorage(STORAGE_KEYS.location, location)
  }, [location])

  const setLocation = useCallback((next) => {
    if (LOCATIONS.includes(next)) setLocationState(next)
  }, [])

  const value = useMemo(() => ({ location, setLocation, locations: LOCATIONS }), [location, setLocation])
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export function useLocationPref() {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('useLocationPref must be used inside <LocationProvider>')
  return ctx
}
