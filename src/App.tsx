// App.tsx — wire up the table with your JSON data
import { ThemeProvider, createTheme, CssBaseline, Alert, Box } from "@mui/material"

import { Footer } from "./components/Footer"
import InputFileUpload from "./components/FileUpload"
import DuckDbExplorer from "./components/duckdb-explorer"

import MainTable from "./table/MainTable"
import { ClipboardProvider } from "./components/duckdb-explorer/context/ClipboardContext"
import { useDataSource } from "./hooks/useDataSource"
import { useState } from "react"
import type { PageViewOptions } from "./utils/types"

// Shared base config so both themes are built by a single createTheme() call.
// (createTheme's 2nd-arg merge form does NOT re-process keys like `spacing`,
//  which is why putting `spacing: 6` there broke theme.spacing().)
const baseThemeOptions = {
  colorSchemes: {
    light: true,
    dark: true,
  },
  typography: {
    fontFamily: [
      "Hack",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(","),
    fontSize: 11,
  },
} as const

// Global input ergonomics: drop an icon directly inside any Select/MenuItem and it stays aligned in
// BOTH states. MenuItem is already flex+center by default, so it only needs the icon↔text gap; the
// CLOSED Select renders the selected value into `.MuiSelect-select`, which isn't flex by default — so
// that slot needs the same flex/center/gap. Merged via createTheme's 2nd arg so it isn't reprocessed.
const inputThemeOverrides = {
  components: {
    MuiSelect: {
      styleOverrides: { select: { display: "flex", alignItems: "center", gap: 8 } },
    },
    MuiMenuItem: {
      styleOverrides: { root: { gap: 8 } },
    },
  },
}

export default function App() {
  const { dataSource, setDataSource, loading, error, filePath } = useDataSource()
  const [pageView, setPageView] = useState<PageViewOptions>("table")
  const [conceptStats, setConceptStats] = useState<{ filtered: number; total: number } | null>(null)

  return (
    <ThemeProvider theme={createTheme(baseThemeOptions, inputThemeOverrides)}>
      <CssBaseline />
      <ClipboardProvider>
        <Box
          id="main"
          component={"main"}
          sx={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            minHeight: 0,
            overflow: "hidden",
            px: 0,
          }}
        >
          {loading && <Alert severity="info">Loading data from URL...</Alert>}
          {error && <Alert severity="error">Error: {error}</Alert>}
          {!dataSource ? (
            <InputFileUpload setDataSource={setDataSource} />
          ) : dataSource.kind === "duckdb" ? (
            <DuckDbExplorer
              dataSource={dataSource}
              pageView={pageView}
              onConceptStats={setConceptStats}
            />
          ) : (
            <MainTable
              data={dataSource.rows}
              setData={(updater) => {
                setDataSource((current) => {
                  if (!current || current.kind !== "json") {
                    return current
                  }

                  const nextRows = typeof updater === "function" ? updater(current.rows) : updater
                  return nextRows ? { kind: "json", rows: nextRows } : null
                })
              }}
              pageView={pageView}
            />
          )}
        </Box>
        <Footer
          text={filePath}
          dataSource={dataSource}
          conceptStats={conceptStats}
          pageView={pageView}
          setPageView={setPageView}
        />
      </ClipboardProvider>
    </ThemeProvider>
  )
}
