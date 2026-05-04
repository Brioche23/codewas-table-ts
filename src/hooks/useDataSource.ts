import { useState, useEffect, useMemo } from "react"
import type { ConceptRow } from "../utils/types"

export function useDataSource() {
  const [data, setData] = useState<ConceptRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filePath, setPath] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const path = params.get("path")

    setPath(path)

    if (!path) return // no param → let FileUpload handle it

    setLoading(true)
    fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        return res.json()
      })
      .then((json) => setData(json))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, []) // runs once on mount

  return { data, setData, loading, error, filePath }
}

// const useNormalizedData = (rawData: ConceptRow[] | null) => {
//   const normalize = (value) => {
//     if (!value) return []
//     return Array.isArray(value) ? value : [value]
//   }

//   // When you fetch/transform your data:
//   const normalized = useMemo(() => {
//     return rawData.map((row) => ({
//       ...row,
//       s_Counts: normalize(row.s_Counts),
//       t_Binary: normalize(row.t_Binary),
//     }))
//   }, [rawData])

//   return normalized
// }
