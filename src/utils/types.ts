// ─── Distribution row (used in d_Binary, d_Counts, d_AgeFirstEvent, d_DaysToFirstEvent) ───
export interface DistributionRow {
  Measure: string
  Cases: number
  Controls: number
}

// ─── Binary ───
export interface BinaryCount {
  nCasesWithCategory: number
  nControlsWithCategory: number
}

export interface BinaryDistribution {
  value: string
  case: number
  control: number
}

export interface Test {
  pValue: number
  effectSize: number
  standarizeMeanDifference: number
  testName: string
}

// ─── Counts / Age / Days ───
export interface SummaryStats {
  meanValueCases: number
  meanValueControls: number
  sdValueCases: number
  sdValueControls: number
}

export interface ContinuousCount {
  nControlsYesWithValue: number
  nCasesYesWithValue: number
}

// ─── Top-level Concept row ───
export interface ConceptRow {
  conceptId: number
  conceptName: string
  domainId: string

  // Binary
  n_Binary: BinaryCount
  d_Binary: BinaryDistribution[]
  t_Binary: Test[]

  // Counts
  s_Counts: SummaryStats
  d_Counts: DistributionRow[][]
  t_Counts: Test[]

  // Age at first event
  s_AgeFirstEvent: SummaryStats
  d_AgeFirstEvent: DistributionRow[][]
  t_AgeFirstEvent: Test[]

  // Days to first event
  s_DaysToFirstEvent: SummaryStats
  d_DaysToFirstEvent: DistributionRow[][]
  t_DaysToFirstEvent: Test[]

  // Continuous / Categorical (may be empty objects)
  n_Continuous: ContinuousCount
  s_Continuous: SummaryStats
  d_Continuous: DistributionRow[][]
  t_Continuous: Test[]

  // Categorical (is Binary)
  n_Categorical: BinaryCount
  d_Categorical: BinaryDistribution[]
  t_Categorical: Test[]
}

export interface ConceptTableProps {
  data: ConceptRow[]
}
