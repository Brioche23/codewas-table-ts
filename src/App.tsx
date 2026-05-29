// App.tsx — wire up the table with your JSON data
import { ThemeProvider, createTheme, CssBaseline, Container, Box, Grid, Alert } from "@mui/material"

import { Header } from "./components/Header"
import { Footer } from "./components/Footer"
import InputFileUpload from "./components/FileUpload"

import MainTable from "./table/MainTable"
import { useDataSource } from "./hooks/useDataSource"
import { useState } from "react"
import type { PageViewOptions } from "./utils/types"

const theme = createTheme({
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
})

export default function App() {
  const { data, setData, loading, error, filePath } = useDataSource()
  const [pageView, setPageView] = useState<PageViewOptions>("table")

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Header />

      <Container
        id="main"
        component={"main"}
        maxWidth={false}
        sx={{ display: "flex", flexDirection: "column", gap: 4, flexGrow: 1 }}
      >
        {loading && <Alert severity="info">Loading data from URL...</Alert>}
        {error && <Alert severity="error">Error: {error}</Alert>}
        {!data ? (
          <InputFileUpload setData={setData} />
        ) : (
          <MainTable data={data} setData={setData} pageView={pageView} />
        )}
      </Container>
      <Footer text={filePath} pageView={pageView} setPageView={setPageView} />
    </ThemeProvider>
  )
}
