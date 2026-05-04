// App.tsx — wire up the table with your JSON data
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Typography,
  Box,
  Grid,
  Alert,
  // Skeleton,
} from "@mui/material"

import { Header } from "./components/Header"
import { Footer } from "./components/Footer"
import InputFileUpload from "./components/FileUpload"
import { CustomBarChart } from "./components/charts/CustomBarChart"
import { Scatter } from "./components/charts/Scatter"
import MainTable from "./table/MainTable"
import { useDataSource } from "./hooks/useDataSource"

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

  const hasCharts = false

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Header />

      <Container component="section">
        <Typography variant="h6">Filters</Typography>
        <Box sx={{ display: "flex", background: "" }}>
          <Box>Filter</Box>
          <Box>Filter</Box>
          <Box>Filter</Box>
        </Box>
      </Container>
      <Container
        id="main"
        component={"main"}
        maxWidth="xl"
        sx={{ display: "flex", flexDirection: "column", gap: 4, flexGrow: 1 }}
      >
        {loading && <Alert severity="info">Loading data from URL...</Alert>}
        {error && <Alert severity="error">Error: {error}</Alert>}
        {!data ? (
          <InputFileUpload setData={setData} />
        ) : (
          <Container>
            <Box>
              <Typography variant="h6">Data Overview</Typography>
              <Typography>{data.length} rows</Typography>
            </Box>
            {hasCharts && (
              <Grid container id="overview-charts-wrapper" spacing={2} sx={{ py: 2 }}>
                <CustomBarChart data={data} />
                <Scatter data={data} />
              </Grid>
            )}
            <Box>
              <MainTable data={data} />
            </Box>
          </Container>
        )}
      </Container>
      <Footer text={filePath} />
    </ThemeProvider>
  )
}
