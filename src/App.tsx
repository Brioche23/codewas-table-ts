// App.tsx — wire up the table with your JSON data
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material"
import ConceptTable from "./table/ConceptTable"

import data from "../public/data/data.json"

// In a real app this comes from an API fetch / prop

const theme = createTheme({
  palette: { mode: "light" },
})

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ConceptTable data={data} />
    </ThemeProvider>
  )
}
