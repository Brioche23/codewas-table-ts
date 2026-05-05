import type { MRT_ColumnDef } from "material-react-table"
import type { ConceptRow, SummaryStats, DistributionRow, Test } from "../utils/types"
import { Box, Tooltip, Typography } from "@mui/material"
import { CategoricalDistributionBar, CategoryBar, MeanComparisonChart } from "../components/Visuals"
import { groupCellProps, valueChip } from "./tableUtils"
import { COLUMNS_COLORS } from "../utils/constants"
import { CasesControlCell } from "./custom-cells/CasesControlsCell"

// ─── Factory config ───────────────────────────────────────────────────────────

type StatGroupPaths = {
  s: (row: ConceptRow) => SummaryStats | null
  d: (row: ConceptRow) => DistributionRow[] | null // unwrapped: [0] applied in path
  t: (row: ConceptRow) => Test | null // unwrapped: [0][0] applied in path
}

type StatGroupConfig = {
  id: string
  header: string
  color: string
  effectSizeHeader: string
  effectSizeThreshold: number
  paths: StatGroupPaths
}

// ─── Factory function ─────────────────────────────────────────────────────────

export function makeStatGroup({
  id,
  header,
  color,
  effectSizeHeader,
  effectSizeThreshold,
  paths,
}: StatGroupConfig): MRT_ColumnDef<ConceptRow> {
  return {
    id,
    header,
    ...groupCellProps(color),
    columns: [
      {
        id: `mean${id}`,
        header: "Mean",
        ...groupCellProps(color),
        accessorFn: (row) => {
          const s = paths.s(row)
          return s ? `${s.meanValueCases} ${s.meanValueControls}` : null
        },
        Cell: ({ row }) => {
          const s = paths.s(row.original)
          if (!s) return <Typography>N/A</Typography>
          return (
            <CasesControlCell
              cases={s.meanValueCases}
              controls={s.meanValueControls}
              casesSD={s.sdValueCases}
              controlsSD={s.sdValueControls}
            />
          )
        },
        filterVariant: "range",
      },
      {
        id: `distribution${id}`,
        header: "Distribution",
        ...groupCellProps(color),
        accessorFn: (row) => {
          const s = paths.s(row)
          return s ? `${s.meanValueCases} ${s.meanValueControls}` : null
        },
        Cell: ({ row }) => {
          const s = paths.s(row.original)
          const d = paths.d(row.original)
          if (!s || !d) return <Typography>N/A</Typography>
          return <MeanComparisonChart stats={s} distributions={d} />
        },
        filterVariant: "range",
      },
      {
        id: `-log10${id}`,
        header: "-log10 (p-Value)",
        ...groupCellProps(color),
        accessorFn: (row) => {
          const t = paths.t(row)
          return t ? -Math.log10(t.pValue) : null
        },
        size: 150,
        Cell: ({ cell }) => valueChip(cell.getValue<number>(), 1.3),
        filterVariant: "range",
        sortUndefined: "last",
      },
      {
        id: `effectSize${id}`,
        header: effectSizeHeader,
        ...groupCellProps(color),
        accessorFn: (row) => paths.t(row)?.effectSize ?? null,
        Cell: ({ cell }) => valueChip(cell.getValue<number>(), effectSizeThreshold),
        filterVariant: "range",
      },
    ],
  }
}

// ─── Stat group configs ───────────────────────────────────────────────────────
// Lives outside the component — no deps on props/state, never triggers re-renders

export const infoColumn: MRT_ColumnDef<ConceptRow> = {
  id: "info",
  header: "Info",
  size: 150,
  minSize: 40,
  maxSize: 300,
  ...groupCellProps(COLUMNS_COLORS.color1),
  accessorFn: (row) => `${row.conceptId} ${row.conceptName} ${row.domainId}`,

  Cell: ({ row }) => (
    <Box sx={{ width: 150 }}>
      <Tooltip title={row.original.conceptName} placement="right">
        <Typography variant="body2" noWrap>
          {row.original.conceptName}
        </Typography>
      </Tooltip>
      <Typography variant="body2" sx={{ color: "text.secondary" }} noWrap>
        {row.original.conceptId}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary" }} noWrap>
        {row.original.domainId}
      </Typography>
    </Box>
  ),
}

export const binaryColumn: MRT_ColumnDef<ConceptRow> = {
  id: "binary",
  header: "Binary",
  ...groupCellProps(COLUMNS_COLORS.color2),
  columns: [
    {
      // Derived column — not a direct key in the data
      id: "casesControl",
      header: "Cases / Control",
      ...groupCellProps(COLUMNS_COLORS.color2),
      accessorFn: (row) =>
        `${row.n_Binary[0].nCasesWithCategory} ${row.n_Binary[0].nControlsWithCategory}`,
      Cell: ({ row }) => (
        <CasesControlCell
          cases={row.original.n_Binary[0].nCasesWithCategory}
          controls={row.original.n_Binary[0].nControlsWithCategory}
          nDecimals={0}
        />
      ),
      filterVariant: "range",
    },
    {
      // Derived column — not a direct key in the data
      id: "proportion",
      header: "Proportion",
      ...groupCellProps(COLUMNS_COLORS.color2),
      accessorFn: (row) =>
        `${row.n_Binary[0].nCasesWithCategory} ${row.n_Binary[0].nControlsWithCategory}`,
      Cell: ({ row }) => {
        if (!row.original.d_Binary[0][0].case) return <p>N/A</p>
        const totalCases = row.original.d_Binary[0][0].case + row.original.d_Binary[0][1].case
        const totalControls =
          row.original.d_Binary[0][0].control + row.original.d_Binary[0][1].control
        return (
          <CategoryBar
            caseCount={row.original.d_Binary[0][0].case}
            controlCount={row.original.d_Binary[0][0].control}
            totalCases={totalCases}
            totalControls={totalControls}
          />
        )
      },
      filterVariant: "range",
    },
    {
      id: "-log10Binary",
      header: "-log10 (p-Value)",
      ...groupCellProps(COLUMNS_COLORS.color2),
      accessorFn: (row) => (row.t_Binary[0] ? -Math.log10(row.t_Binary?.[0]?.[0]?.pValue) : null),
      size: 150,
      Cell: ({ cell }) => valueChip(cell.getValue<number>(), 8),
      filterVariant: "range",
      sortUndefined: "last",
    },

    {
      // Derived column — not a direct key in the data
      id: "oddsRatioBinary",
      header: "Odds Ratio",
      ...groupCellProps(COLUMNS_COLORS.color2),
      accessorFn: (row) => row.t_Binary?.[0]?.[0]?.effectSize ?? null,
      Cell: ({ cell }) => valueChip(cell.getValue<number>(), 1.2),
      filterVariant: "range",
    },
  ],
}

export const STAT_GROUPS: StatGroupConfig[] = [
  {
    id: "Count",
    header: "Count",
    color: COLUMNS_COLORS.color1,
    effectSizeHeader: "Rate Ratio",
    effectSizeThreshold: 1.3,
    paths: {
      s: (row) => row.s_Counts[0] ?? null,
      d: (row) => row.d_Counts[0][0] ?? null, // DistributionRow[][][0][0] = DistributionRow[]
      t: (row) => row.t_Counts[0]?.[0] ?? null,
    },
  },
  {
    id: "Age",
    header: "Age First Event",
    color: COLUMNS_COLORS.color2,
    effectSizeHeader: "Mean Difference",
    effectSizeThreshold: 1.3,
    paths: {
      s: (row) => row.s_AgeFirstEvent[0] ?? null,
      d: (row) => row.d_AgeFirstEvent[0][0] ?? null,
      t: (row) => row.t_AgeFirstEvent[0]?.[0] ?? null,
    },
  },
  {
    id: "Days",
    header: "Days To First Event",
    color: COLUMNS_COLORS.color1,
    effectSizeHeader: "Mean Difference",
    effectSizeThreshold: 1.3,
    paths: {
      s: (row) => row.s_DaysToFirstEvent[0] ?? null,
      d: (row) => row.d_DaysToFirstEvent[0][0] ?? null,
      t: (row) => row.t_DaysToFirstEvent[0]?.[0] ?? null,
    },
  },
  {
    id: "Continuous",
    header: "Continuous",
    color: COLUMNS_COLORS.color2,
    effectSizeHeader: "Variance Ratio",
    effectSizeThreshold: 1.3,
    paths: {
      s: (row) => row.s_Continuous[0] ?? null,
      d: (row) => row.d_Continuous[0]?.[0] ?? null,
      t: (row) => row.t_Continuous[0]?.[0] ?? null,
    },
  },
]

export const categoryColumn: MRT_ColumnDef<ConceptRow> = {
  id: "category",
  header: "Category",
  columns: [
    {
      id: "casesControlCategory",
      header: "Cases / Controls",
      accessorFn: (row) =>
        row.n_Categorical[0]
          ? `${row.n_Categorical[0].nCasesWithCategory} ${row.n_Categorical[0].nControlsWithCategory}`
          : "",
      Cell: ({ row }) =>
        row.original.n_Categorical[0] ? (
          <CasesControlCell
            cases={row.original.n_Categorical[0].nCasesWithCategory}
            controls={row.original.n_Categorical[0].nControlsWithCategory}
            nDecimals={0}
          />
        ) : (
          <Typography>N/A</Typography>
        ),
      filterVariant: "range",
    },
    {
      id: "distributionCategory",
      header: "Distribution",
      accessorFn: (row) =>
        row.n_Categorical[0]
          ? `${row.n_Categorical[0].nCasesWithCategory} ${row.n_Categorical[0].nControlsWithCategory}`
          : "",
      Cell: ({ row }) =>
        row.original.n_Categorical[0] ? (
          <CategoricalDistributionBar
            totalCases={row.original.n_Categorical[0].nCasesWithCategory}
            totalControls={row.original.n_Categorical[0].nControlsWithCategory}
            distributions={row.original.d_Categorical}
          />
        ) : (
          <Typography>N/A</Typography>
        ),
      filterVariant: "range",
    },

    {
      id: "-log10Category",
      header: "-log10 (p-Value)",
      accessorFn: (row) =>
        row.t_Categorical[0] ? -Math.log10(row.t_Categorical[0][0].pValue) : null,
      size: 150,
      Cell: ({ cell }) => valueChip(cell.getValue<number>(), 1.3),
      filterVariant: "range",
      sortUndefined: "last",
    },
    {
      id: "CramersVCategory",
      header: "Cramers'V",
      accessorFn: (row) => (row.t_Categorical[0] ? row.t_Categorical[0][0].effectSize : null),
      Cell: ({ cell }) => valueChip(cell.getValue<number>(), 1.3),
      filterVariant: "range",
    },
  ],
}
