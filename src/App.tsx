// App.tsx — wire up the table with your JSON data
import { ThemeProvider, createTheme, CssBaseline, Alert, Box } from "@mui/material"

import { Footer } from "./components/Footer"
import InputFileUpload from "./components/FileUpload"
import DuckDbExplorer from "./components/duckdb-explorer"

import MainTable from "./table/MainTable"
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

// Denser variant: same base, plus density overrides — all in ONE createTheme call
// so `spacing` is processed into a function.
// TO REVERT to the plain theme: in <ThemeProvider> below, swap
// `theme={denseTheme}` for `theme={createTheme(baseThemeOptions)}`
// (and optionally delete this block).
/* eslint-disable @typescript-eslint/no-unused-vars
const denseTheme = createTheme({
  ...baseThemeOptions,
  spacing: 6, // ↓ from the default 8 — tightens all padding/margins/gaps globally
  shape: { borderRadius: 6 },
  typography: {
    ...baseThemeOptions.typography,
    button: { textTransform: "none" },
    h6: { fontSize: "1rem", fontWeight: 600 },
    body2: { fontSize: "0.78rem" },
  },
  components: {
    // Apply small size everywhere without repeating the prop on each instance.
    MuiTextField: { defaultProps: { size: "small", margin: "dense" } },
    MuiFormControl: { defaultProps: { size: "small", margin: "dense" } },
    MuiSelect: { defaultProps: { size: "small" } },
    MuiButton: { defaultProps: { size: "small" } },
    // Surgically shrink the input box itself when size="small" isn't enough.
    MuiInputBase: {
      styleOverrides: { input: { paddingTop: 4, paddingBottom: 4, fontSize: "0.8rem" } },
    },
    MuiOutlinedInput: {
      defaultProps: { size: "small" },
      styleOverrides: { input: { paddingTop: 5, paddingBottom: 5 } },
    },
    MuiInputLabel: { styleOverrides: { root: { fontSize: "0.8rem" } } },
    MuiMenuItem: { styleOverrides: { root: { fontSize: "0.8rem", minHeight: 28 } } },
  },
})
*/

export default function App() {
  const { dataSource, setDataSource, loading, error, filePath } = useDataSource()
  const [pageView, setPageView] = useState<PageViewOptions>("table")
  const [conceptStats, setConceptStats] = useState<{ filtered: number; total: number } | null>(null)

  return (
    <ThemeProvider theme={createTheme(baseThemeOptions)}>
      <CssBaseline />
      {/* <Header /> */}

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
    </ThemeProvider>
  )
}
