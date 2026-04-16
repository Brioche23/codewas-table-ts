// App.tsx — wire up the table with your JSON data
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Typography,
  Skeleton,
  Box,
} from "@mui/material"
import ConceptTable from "./table/ConceptTable"

import rawData from "./data/data.json"
import { Header } from "./components/Header"
import { Footer } from "./components/Footer"
// import InputFileUpload from "./components/FileUpload"
// import { useState } from "react"
import type { ConceptRow } from "./utils/types"
import { CustomChart } from "./components/charts/CustomChart"
import { Scatter } from "./components/charts/Scatter"

const data = JSON.parse(JSON.stringify(rawData)) as ConceptRow[]

// In a real app this comes from an API fetch / prop

const theme = createTheme({
  colorSchemes: {
    light: true,
    dark: true,
  },
  // palette: { mode: "light" },
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
  // const [data, setData] = useState<ConceptRow[] | null>(null)
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Header />
      <Container
        id="main"
        component={"main"}
        maxWidth="xl"
        sx={{ display: "flex", flexDirection: "column", gap: 4, flexGrow: 1 }}
      >
        <Container>
          <Box>
            <Typography variant="h6">Data Overview</Typography>
            <Typography>{data.length} rows</Typography>
          </Box>

          <Box
            id="overview-charts-wrapper"
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
              py: 2,
            }}
          >
            <CustomChart data={data} />
            <Scatter data={data} />
          </Box>
        </Container>
        {/* {data ? <ConceptTable data={data} /> : <InputFileUpload setData={setData} />} */}
        {data ? (
          <Container>
            <Typography variant="h6">Data Table</Typography>
            <ConceptTable data={data} />
          </Container>
        ) : (
          <Skeleton variant="rectangular" width={200} height={200} />
        )}
      </Container>
      <Footer />
    </ThemeProvider>
  )
}
