import { useMemo } from "react"
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from "material-react-table"
import { Box, Chip, Typography, Divider } from "@mui/material"
import type { ConceptRow, ConceptTableProps } from "../utils/types"
import { MeanComparisonChart, CategoryBar, CategoricalDistributionBar } from "../components/Visuals"

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (v: number | null, decimals = 4): string => (v === null ? "—" : v.toFixed(decimals))

const valueChip = (value: number | null, threshold: number) => {
  console.log(value)
  if (value === null) return <Chip label="n/a" size="small" />

  const color = value >= threshold ? "success" : "error"

  return <Chip label={fmt(value)} size="small" color={color} />
}
interface CasesControlsProps {
  cases: number
  controls: number
  casesSD?: number
  controlsSD?: number
  nDecimals?: number
}

function CasesControlCell({
  cases,
  casesSD,
  controls,
  controlsSD,
  nDecimals = 2,
}: CasesControlsProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {cases.toFixed(nDecimals)} {casesSD && `± ${casesSD.toFixed(nDecimals)}`}
      </Typography>

      <Divider sx={{ my: "4px" }} />

      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {controls.toFixed(nDecimals)} {controlsSD && `± ${controlsSD.toFixed(nDecimals)}`}
      </Typography>
    </Box>
  )
}

// ─── main table ───────────────────────────────────────────────────────────

export default function MainTable({ data }: ConceptTableProps) {
  // MRT_ColumnDef<ConceptRow> types each column to your data shape.
  // `accessorFn` lets you derive a display value from nested fields.
  const columns = useMemo<MRT_ColumnDef<ConceptRow>[]>(
    () => [
      {
        id: "info",
        header: "Info",
        size: 280,
        accessorFn: (row) => `${row.conceptId} ${row.conceptName} ${row.domainId}`,
        Cell: ({ row }) => (
          <Box>
            <Typography>{row.original.conceptName}</Typography>
            <Typography>{row.original.conceptId}</Typography>
            <Typography>{row.original.domainId}</Typography>
          </Box>
        ),
        // columns: [
        //   {
        //     accessorKey: "conceptId",
        //     header: "ID",
        //     size: 80,
        //   },
        //   {
        //     accessorKey: "conceptName",
        //     header: "Concept",
        //     size: 200,
        //   },
        //   {
        //     accessorKey: "domainId",
        //     header: "Domain",
        //     size: 120,
        //     // Filter by domain prefix (e.g. "Source:ATC")
        //     filterVariant: "select",
        //   },
        // ],
      },
      {
        id: "binary",
        header: "Binary",
        columns: [
          {
            // Derived column — not a direct key in the data
            id: "casesControl",
            header: "Cases / Control",
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
            accessorFn: (row) =>
              row.t_Binary[0] ? -Math.log10(row.t_Binary?.[0]?.[0]?.pValue) : null,
            size: 150,
            Cell: ({ cell }) => valueChip(cell.getValue<number>(), 8),
            filterVariant: "range",
            sortUndefined: "last",
          },

          {
            // Derived column — not a direct key in the data
            id: "oddsRatioBinary",
            header: "Odds Ratio",
            accessorFn: (row) => row.t_Binary?.[0]?.[0]?.effectSize ?? null,
            Cell: ({ cell }) => valueChip(cell.getValue<number>(), 1.2),
            filterVariant: "range",
          },
        ],
      },
      {
        id: "count",
        header: "Count",
        columns: [
          {
            // Derived column — not a direct key in the data
            id: "casesControlCount",
            header: "Mean",
            accessorFn: (row) =>
              `${row.s_Counts[0].meanValueCases} ${row.s_Counts[0].meanValueControls}`,
            Cell: ({ row }) => (
              <CasesControlCell
                cases={row.original.s_Counts[0].meanValueCases}
                controls={row.original.s_Counts[0].meanValueControls}
                casesSD={row.original.s_Counts[0].sdValueCases}
                controlsSD={row.original.s_Counts[0].sdValueControls}
              />
            ),
            filterVariant: "range",
          },
          {
            // Derived column — not a direct key in the data
            id: "distributionCount",
            header: "Distribution",
            accessorFn: (row) =>
              `${row.s_Counts[0].meanValueCases} ${row.s_Counts[0].meanValueControls}`,

            Cell: ({ row }) => (
              <MeanComparisonChart
                stats={row.original.s_Counts[0]}
                distributions={row.original.d_Counts[0]}
              />
            ),
            filterVariant: "range",
          },
          {
            id: "-log10Count",
            header: "-log10 (p-Value)",
            accessorFn: (row) =>
              row.t_Counts[0][0] ? -Math.log10(row.t_Counts[0][0].pValue) : null,
            size: 150,
            Cell: ({ cell }) => valueChip(cell.getValue<number>(), 1.3),
            filterVariant: "range",
            sortUndefined: "last",
          },
          {
            // Derived column — not a direct key in the data
            id: "rateRatioCount",
            header: "Rate ratio",
            accessorFn: (row) => row.t_Counts[0][0]?.effectSize ?? null,
            Cell: ({ cell }) => valueChip(cell.getValue<number>(), 1.3),
            filterVariant: "range",
          },
        ],
      },
      {
        id: "age",
        header: "Age First Event",
        columns: [
          {
            // Derived column — not a direct key in the data
            id: "casesControlAge",
            header: "Mean",
            accessorFn: (row) =>
              `${row.s_AgeFirstEvent[0].meanValueCases} ${row.s_AgeFirstEvent[0].meanValueControls}`,
            Cell: ({ row }) => (
              <CasesControlCell
                cases={row.original.s_AgeFirstEvent[0].meanValueCases}
                controls={row.original.s_AgeFirstEvent[0].meanValueControls}
                casesSD={row.original.s_AgeFirstEvent[0].sdValueCases}
                controlsSD={row.original.s_AgeFirstEvent[0].sdValueControls}
              />
            ),
            filterVariant: "range",
          },
          {
            // Derived column — not a direct key in the data
            id: "distributionAge",
            header: "Distribution",
            accessorFn: (row) =>
              `${row.s_AgeFirstEvent[0].meanValueCases} ${row.s_AgeFirstEvent[0].meanValueControls}`,

            Cell: ({ row }) => (
              <MeanComparisonChart
                stats={row.original.s_AgeFirstEvent[0]}
                distributions={row.original.d_AgeFirstEvent[0]}
              />
            ),
            filterVariant: "range",
          },
          {
            id: "-log10Age",
            header: "-log10 (p-Value)",
            accessorFn: (row) =>
              row.t_AgeFirstEvent[0][0] ? -Math.log10(row.t_AgeFirstEvent[0][0].pValue) : null,
            size: 150,
            Cell: ({ cell }) => valueChip(cell.getValue<number>(), 1.3),
            filterVariant: "range",
            sortUndefined: "last",
          },
          {
            // Derived column — not a direct key in the data
            id: "meanDifferenceAge",
            header: "Mean Difference",
            accessorFn: (row) => row.t_AgeFirstEvent[0][0]?.effectSize ?? null,
            Cell: ({ cell }) => valueChip(cell.getValue<number>(), 1.3),
            filterVariant: "range",
          },
        ],
      },
      {
        id: "days",
        header: "Days To First Event",
        columns: [
          {
            // Derived column — not a direct key in the data
            id: "casesControlDays",
            header: "Mean",
            accessorFn: (row) =>
              `${row.s_DaysToFirstEvent[0].meanValueCases} ${row.s_DaysToFirstEvent[0].meanValueControls}`,
            Cell: ({ row }) => (
              <CasesControlCell
                cases={row.original.s_DaysToFirstEvent[0].meanValueCases}
                controls={row.original.s_DaysToFirstEvent[0].meanValueControls}
                casesSD={row.original.s_DaysToFirstEvent[0].sdValueCases}
                controlsSD={row.original.s_DaysToFirstEvent[0].sdValueControls}
              />
            ),
            filterVariant: "range",
          },
          {
            // Derived column — not a direct key in the data
            id: "distributionDays",
            header: "Distribution",
            accessorFn: (row) =>
              `${row.s_DaysToFirstEvent[0].meanValueCases} ${row.s_DaysToFirstEvent[0].meanValueControls}`,

            Cell: ({ row }) => (
              <MeanComparisonChart
                stats={row.original.s_DaysToFirstEvent[0]}
                distributions={row.original.d_DaysToFirstEvent[0]}
              />
            ),
            filterVariant: "range",
          },
          {
            id: "-log10Days",
            header: "-log10 (p-Value)",
            accessorFn: (row) =>
              row.t_DaysToFirstEvent[0][0]
                ? -Math.log10(row.t_DaysToFirstEvent[0][0].pValue)
                : null,
            size: 150,
            Cell: ({ cell }) => valueChip(cell.getValue<number>(), 1.3),
            filterVariant: "range",
            sortUndefined: "last",
          },
          {
            id: "meanDifferenceDays",
            header: "Mean Difference",
            accessorFn: (row) => row.t_DaysToFirstEvent[0][0]?.effectSize ?? null,
            Cell: ({ cell }) => valueChip(cell.getValue<number>(), 1.3),
            filterVariant: "range",
          },
        ],
      },
      {
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
      },
      {
        id: "continuous",
        header: "Continuous",
        columns: [
          {
            id: "casesControlContinuous",
            header: "Cases / Controls",
            accessorFn: (row) =>
              row.n_Continuous[0]
                ? `${row.n_Continuous[0].nCasesYesWithValue} ${row.n_Continuous[0].nControlsYesWithValue}`
                : "",
            Cell: ({ row }) =>
              row.original.n_Continuous[0] ? (
                <CasesControlCell
                  cases={row.original.n_Continuous[0].nCasesYesWithValue}
                  controls={row.original.n_Continuous[0].nControlsYesWithValue}
                  nDecimals={0}
                />
              ) : (
                <Typography>N/A</Typography>
              ),
            filterVariant: "range",
          },
          {
            id: "casesControlMeanContinuous",
            header: "Mean",
            accessorFn: (row) =>
              row.s_Continuous[0]
                ? `${row.s_Continuous[0].meanValueCases} ${row.s_Continuous[0].meanValueControls}`
                : "",
            Cell: ({ row }) =>
              row.original.s_Continuous[0] ? (
                <CasesControlCell
                  cases={row.original.s_Continuous[0].meanValueCases}
                  controls={row.original.s_Continuous[0].meanValueControls}
                  casesSD={row.original.s_Continuous[0].sdValueCases}
                  controlsSD={row.original.s_Continuous[0].sdValueControls}
                />
              ) : (
                <Typography>N/A</Typography>
              ),
            filterVariant: "range",
          },
          {
            id: "distributionContinuous",
            header: "Distribution",
            accessorFn: (row) =>
              row.s_Continuous[0]
                ? `${row.s_Continuous[0].meanValueCases} ${row.s_Continuous[0].meanValueControls}`
                : "",
            Cell: ({ row }) =>
              row.original.s_Continuous[0] ? (
                <MeanComparisonChart
                  stats={row.original.s_Continuous[0]}
                  distributions={row.original.d_Continuous[0]}
                />
              ) : (
                <Typography>N/A</Typography>
              ),
            filterVariant: "range",
          },
          {
            id: "-log10Continuous",
            header: "-log10 (p-Value)",
            accessorFn: (row) =>
              row.t_Continuous[0] ? -Math.log10(row.t_Continuous[0][0].pValue) : null,
            size: 150,
            Cell: ({ cell }) => valueChip(cell.getValue<number>(), 1.3),
            filterVariant: "range",
            sortUndefined: "last",
          },
          {
            id: "varianceRatioContinuous",
            header: "Variance Ratio",
            accessorFn: (row) => row.t_Continuous[0]?.[0]?.effectSize ?? null,
            Cell: ({ cell }) => valueChip(cell.getValue<number>(), 1.3),
            filterVariant: "range",
          },
        ],
      },
    ],
    [],
  )

  const table = useMaterialReactTable({
    columns,
    data,
    // enableGrouping: true,
    // ── expand ──
    // renderDetailPanel: ({ row }) => <ConceptDetailPanel row={row} />,
    // ── pagination ──
    initialState: {
      // grouping: ["conceptId", "conceptName"],
      pagination: { pageSize: 20, pageIndex: 0 },
      density: "compact",
    },
    // ── filtering ──
    enableColumnFilters: true,
    enableGlobalFilter: true,
    // ── sorting ──
    enableSorting: true,
    // ── misc ──
    enableStickyHeader: true,
    muiTableContainerProps: { sx: { maxHeight: "70vh" } },
  })

  return <MaterialReactTable table={table} />
}
