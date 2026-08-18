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
export const baseThemeOptions = {
  colorSchemes: {
    light: true,
    dark: true,
  },
  palette: {
    primary: {
      main: "#3084b5",
    },
    secondary: {
      main: "#a600f5",
    },
    background: {
      default: "#e8f0f9",
      paper: "#edf2f7",
    },
    success: {
      main: "#3a7d2e",
    },
    cases: {
      main: "rgb(172, 71, 195)",
    },
    controls: {
      main: "rgb(93, 144, 238)",
    },
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
//
// Compact sizing lives here too. Every input in the app should be dense by default, which is the
// theme.components case in MUI's customization ladder (sx -> styled -> theme -> global) rather than
// a shared `sx` spread across ~15 call sites. `size="small"` as a defaultProp also catches the chart
// controls that never passed it (DuckDbHeatmap, DuckDbCharts) and were rendering at the 56px medium
// height; the padding/font overrides then take small from MUI's 40px down to ~28px.
const inputThemeOverrides = {
  components: {
    MuiFormControl: { defaultProps: { size: "small" as const } },
    MuiTextField: { defaultProps: { size: "small" as const } },
    MuiSelect: {
      defaultProps: { size: "small" as const },
      styleOverrides: {
        // minHeight: MUI pins .MuiSelect-select to 1.4375em, which would hold the box at ~40px no
        // matter how little padding the input has.
        select: { display: "flex", alignItems: "center", gap: 8, minHeight: "unset" },
      },
    },
    MuiInputBase: { styleOverrides: { root: { fontSize: "0.75rem" } } },
    MuiOutlinedInput: { styleOverrides: { input: { paddingTop: 4, paddingBottom: 4 } } },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: "0.75rem",
          // An outlined label sits inside the box until it shrinks, and MUI's offset assumes the
          // full-height small input, so it has to come up to match the reduced padding. Scoped to
          // outlined + not-shrunk so filled/standard labels and floating labels stay put.
          "&.MuiInputLabel-outlined:not(.MuiInputLabel-shrink)": {
            transform: "translate(10px, 5px) scale(1)",
          },
        },
      },
    },
    // Toggles too, so the scatter's "Regression line" switch matches the selects beside it.
    MuiSwitch: { defaultProps: { size: "small" as const } },
    MuiCheckbox: { defaultProps: { size: "small" as const } },
    // Font only, no minHeight: the open dropdown should match the field's text size, but its rows
    // stay full height so they remain comfortable click targets.
    MuiMenuItem: {
      styleOverrides: { root: { gap: 8, fontSize: "0.75rem" } },
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
