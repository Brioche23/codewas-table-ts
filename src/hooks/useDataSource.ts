import { useEffect, useState } from "react"
import { loadDuckDbDataSource } from "../utils/duckdb"
import type { LoadedDataSource } from "../utils/types"

function normalizeJsonPayload(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (payload && typeof payload === "object" && Array.isArray((payload as { results?: unknown[] }).results)) {
    return (payload as { results: unknown[] }).results
  }

  throw new Error("Unsupported JSON payload shape")
}

export function useDataSource() {
  const [dataSource, setDataSource] = useState<LoadedDataSource | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filePath, setPath] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const path = params.get("path")

    setPath(path)

    if (!path) return

    setLoading(true)
    fetch(path)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        if (path.endsWith(".duckdb")) {
          return loadDuckDbDataSource(path, new Uint8Array(await response.arrayBuffer()))
        }

        const payload = await response.json()
        return {
          kind: "json" as const,
          rows: normalizeJsonPayload(payload) as any,
        }
      })
      .then((source) => setDataSource(source))
      .catch((caughtError) => setError(caughtError instanceof Error ? caughtError.message : String(caughtError)))
      .finally(() => setLoading(false))
  }, [])

  return { dataSource, setDataSource, loading, error, filePath }
}
