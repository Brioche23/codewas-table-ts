import * as duckdb from "@duckdb/duckdb-wasm"
import duckdbMvpWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url"
import duckdbEhWasm from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url"
import duckdbMvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url"
import duckdbEhWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url"
import type { DuckDbDataSource, DuckDbPreviewSection, DuckDbTableCount } from "./types"

let runtimePromise: Promise<duckdb.AsyncDuckDB> | null = null

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: duckdbMvpWasm,
    mainWorker: duckdbMvpWorker,
  },
  eh: {
    mainModule: duckdbEhWasm,
    mainWorker: duckdbEhWorker,
  },
}

function getSafeFileName(sourceLabel: string) {
  return sourceLabel.replace(/[^a-zA-Z0-9._-]/g, "_")
}

function rowsFromArrowTable(result: any): Record<string, unknown>[] {
  if (!result?.toArray) {
    return []
  }

  return result.toArray().map((row: any) => {
    if (typeof row?.toJSON === "function") {
      return row.toJSON()
    }

    return { ...row }
  })
}

async function getRuntime() {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      const bundle = await duckdb.selectBundle(MANUAL_BUNDLES)
      const worker = new Worker(bundle.mainWorker!)
      const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker)
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
      return db
    })()
  }

  return runtimePromise
}

async function queryRows(connection: any, sql: string) {
  const result = await connection.query(sql)
  return rowsFromArrowTable(result)
}

async function buildTableCounts(connection: any): Promise<DuckDbTableCount[]> {
  const tableRows = await queryRows(
    connection,
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'main'
      ORDER BY table_name
    `,
  )

  const counts: DuckDbTableCount[] = []

  for (const row of tableRows) {
    const tableName = String(row.table_name)
    const countRows = await queryRows(connection, `SELECT COUNT(*) AS row_count FROM "${tableName}"`)
    counts.push({
      tableName,
      rowCount: Number(countRows[0]?.row_count ?? 0),
    })
  }

  return counts
}

async function buildPreviewSections(connection: any): Promise<DuckDbPreviewSection[]> {
  const covariatesPreview = await queryRows(
    connection,
    `
      SELECT
        c.analysisId,
        c.conceptId,
        r.conceptName,
        c.countMode,
        c.sumValue
      FROM covariates AS c
      LEFT JOIN conceptRef AS r USING (conceptId)
      ORDER BY c.analysisId, c.conceptId
      LIMIT 25
    `,
  )

  const statisticalTestsPreview = await queryRows(
    connection,
    `
      SELECT
        analysisId,
        conceptId,
        countMode,
        pValue,
        effectSize,
        testName
      FROM statisticalTests
      ORDER BY analysisId, conceptId
      LIMIT 25
    `,
  )

  return [
    {
      title: "Covariates Preview",
      rows: covariatesPreview,
    },
    {
      title: "Statistical Tests Preview",
      rows: statisticalTestsPreview,
    },
  ]
}

export async function loadDuckDbDataSource(sourceLabel: string, bytes: Uint8Array): Promise<DuckDbDataSource> {
  const db = await getRuntime()
  const fileName = getSafeFileName(sourceLabel)

  await db.registerFileBuffer(fileName, bytes)
  await (db as any).open({ path: fileName })

  const connection = await db.connect()
  const tableCounts = await buildTableCounts(connection)
  const previewSections = await buildPreviewSections(connection)

  return {
    kind: "duckdb",
    sourceLabel,
    tableCounts,
    previewSections,
    runQuery: async (sql: string) => queryRows(connection, sql),
  }
}
