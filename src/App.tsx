// App.tsx — wire up the table with your JSON data
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material"
import ConceptTable from "./table/ConceptTable"
import type { ConceptRow } from "./utils/types"

import data from "../public/data/data.json"

// In a real app this comes from an API fetch / prop
const sampleData: ConceptRow[] = [
  {
    conceptId: 947841,
    conceptName: "Anaplastic lymphoma kinase (ALK) inhibitors",
    domainId: "Source:ATC",
    n_Binary: { nCasesWithCategory: 3, nControlsWithCategory: 6 },
    d_Binary: [
      { value: "Yes", case: 3, control: 6 },
      { value: "No", case: 2751, control: 4994 },
    ],
    t_Binary: [
      {
        pValue: 1,
        effectSize: 0.9077,
        standarizeMeanDifference: -0.0033,
        testName: "Fisher",
      },
    ],
    s_Counts: {
      meanValueCases: 1,
      meanValueControls: 1,
      sdValueCases: 0,
      sdValueControls: 0,
    },
    d_Counts: [
      [
        { Measure: "min", Cases: 1, Controls: 1 },
        { Measure: "p10", Cases: 0, Controls: 0 },
        { Measure: "p25", Cases: 0, Controls: 0 },
        { Measure: "median", Cases: 0, Controls: 0 },
        { Measure: "p75", Cases: 0, Controls: 0 },
        { Measure: "p90", Cases: 0, Controls: 0 },
        { Measure: "max", Cases: 1, Controls: 1 },
      ],
    ],
    t_Counts: [
      {
        pValue: null,
        effectSize: 1,
        standarizeMeanDifference: null,
        testName: "Negative Binomial",
      },
    ],
    s_AgeFirstEvent: {
      meanValueCases: 48.6667,
      meanValueControls: 57.6667,
      sdValueCases: 18.9297,
      sdValueControls: 16.7531,
    },
    d_AgeFirstEvent: [
      [
        { Measure: "min", Cases: 27, Controls: 27 },
        { Measure: "p10", Cases: 57, Controls: 57 },
        { Measure: "p25", Cases: 57, Controls: 59 },
        { Measure: "median", Cases: 57, Controls: 62 },
        { Measure: "p75", Cases: 62, Controls: 63 },
        { Measure: "p90", Cases: 62, Controls: 78 },
        { Measure: "max", Cases: 62, Controls: 78 },
      ],
    ],
    t_AgeFirstEvent: [
      {
        pValue: null,
        effectSize: null,
        standarizeMeanDifference: null,
        testName: "Welch Two Sample t-test (Error: Less than 10 samples)",
      },
    ],
    s_DaysToFirstEvent: {
      meanValueCases: -2025.6667,
      meanValueControls: 19545.3333,
      sdValueCases: 545.0966,
      sdValueControls: 4769.795,
    },
    d_DaysToFirstEvent: [
      [
        { Measure: "min", Cases: -2466, Controls: 9828 },
        { Measure: "p10", Cases: -2195, Controls: 20906 },
        { Measure: "p25", Cases: -2195, Controls: 21552 },
        { Measure: "median", Cases: -2195, Controls: 21589 },
        { Measure: "p75", Cases: -1416, Controls: 21674 },
        { Measure: "p90", Cases: -1416, Controls: 21723 },
        { Measure: "max", Cases: -1416, Controls: 21723 },
      ],
    ],
    t_DaysToFirstEvent: [
      {
        pValue: null,
        effectSize: null,
        standarizeMeanDifference: null,
        testName: "Welch Two Sample t-test (Error: Less than 10 samples)",
      },
    ],
    n_Continuous: {},
    s_Continuous: {},
    d_Continuous: {},
    t_Continuous: {},
    n_Categorical: {},
    d_Categorical: {},
    t_Categorical: {},
  },
]

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
