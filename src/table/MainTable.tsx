import { useMemo } from "react"
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from "material-react-table"
import { Box, Chip, Typography, Divider } from "@mui/material"
import type { ConceptRow, ConceptTableProps } from "../utils/types"
import { MeanComparisonChart, CategoryBar, CategoricalDistributionBar } from "../components/Visuals"

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (v: number | null, decimals = 4): string => (v === null ? "—" : v.toFixed(decimals))

const pValueChip = (p: number | null) => {
  if (p === null) return <Chip label="n/a" size="small" />
  const color = p < 0.05 ? "success" : p < 0.1 ? "warning" : "default"
  return <Chip label={fmt(p)} size="small" color={color} />
}

interface CasesControlsProps {
  cases: number
  controls: number
}

function CasesControlCell({ cases, controls }: CasesControlsProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      {/* <Typography
                  variant="caption"
                  sx={{
                    opacity: 0.6,
                    fontWeight: 500,
                    textTransform: "uppercase",
                    fontSize: "10px",
                  }}
                >
                  Cases
                </Typography> */}
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {cases}
      </Typography>

      <Divider sx={{ my: "4px" }} />

      {/* <Typography
                  variant="caption"
                  sx={{
                    opacity: 0.6,
                    fontWeight: 500,
                    textTransform: "uppercase",
                    fontSize: "10px",
                  }}
                >
                  Control
                </Typography> */}
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {controls}
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
              `${row.n_Binary.nCasesWithCategory} ${row.n_Binary.nControlsWithCategory}`,
            Cell: ({ row }) => (
              <CasesControlCell
                cases={row.original.n_Binary.nCasesWithCategory}
                controls={row.original.n_Binary.nControlsWithCategory}
              />
            ),
            filterVariant: "range",
          },
          {
            // Derived column — not a direct key in the data
            id: "proportion",
            header: "Proportion",
            accessorFn: (row) =>
              `${row.n_Binary.nCasesWithCategory} ${row.n_Binary.nControlsWithCategory}`,
            Cell: ({ row }) => {
              const totalCases = row.original.d_Binary[0].case + row.original.d_Binary[1].case
              const totalControls =
                row.original.d_Binary[0].control + row.original.d_Binary[1].control
              return (
                <CategoryBar
                  caseCount={row.original.d_Binary[0].case}
                  controlCount={row.original.d_Binary[0].control}
                  totalCases={totalCases}
                  totalControls={totalControls}
                />
              )
            },
            filterVariant: "range",
          },
          {
            id: "pValue",
            header: "p-value (Binary)",
            accessorFn: (row) => row.t_Binary[0]?.pValue ?? null,
            size: 150,
            // Custom cell renders the colour-coded chip
            Cell: ({ cell }) => pValueChip(cell.getValue<number | null>()),
            filterVariant: "range",
            sortUndefined: "last",
          },
          {
            // Derived column — not a direct key in the data
            id: "-log10Binary",
            header: "-log10",
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
            accessorFn: (row) => `${row.s_Counts.meanValueCases} ${row.s_Counts.meanValueControls}`,
            Cell: ({ row }) => (
              <CasesControlCell
                cases={row.original.s_Counts.meanValueCases}
                controls={row.original.s_Counts.meanValueControls}
              />
            ),
            filterVariant: "range",
          },
          {
            // Derived column — not a direct key in the data
            id: "distributionCount",
            header: "Distribution",
            accessorFn: (row) => `${row.s_Counts.meanValueCases} ${row.s_Counts.meanValueControls}`,

            Cell: ({ row }) => <MeanComparisonChart stats={row.original.s_Counts} />,
            filterVariant: "range",
          },
          {
            // Derived column — not a direct key in the data
            id: "-log10Count",
            header: "-log10",
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
              `${row.s_AgeFirstEvent.meanValueCases} ${row.s_AgeFirstEvent.meanValueControls}`,
            Cell: ({ row }) => (
              <CasesControlCell
                cases={row.original.s_AgeFirstEvent.meanValueCases}
                controls={row.original.s_AgeFirstEvent.meanValueControls}
              />
            ),
            filterVariant: "range",
          },
          {
            // Derived column — not a direct key in the data
            id: "distributionAge",
            header: "Distribution",
            accessorFn: (row) =>
              `${row.s_AgeFirstEvent.meanValueCases} ${row.s_AgeFirstEvent.meanValueControls}`,

            Cell: ({ row }) => <MeanComparisonChart stats={row.original.s_AgeFirstEvent} />,
            filterVariant: "range",
          },
          {
            // Derived column — not a direct key in the data
            id: "-log10Age",
            header: "-log10",
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
              `${row.s_DaysToFirstEvent.meanValueCases} ${row.s_DaysToFirstEvent.meanValueControls}`,
            Cell: ({ row }) => (
              <CasesControlCell
                cases={row.original.s_DaysToFirstEvent.meanValueCases}
                controls={row.original.s_DaysToFirstEvent.meanValueControls}
              />
            ),
            filterVariant: "range",
          },
          {
            // Derived column — not a direct key in the data
            id: "distributionDays",
            header: "Distribution",
            accessorFn: (row) =>
              `${row.s_DaysToFirstEvent.meanValueCases} ${row.s_DaysToFirstEvent.meanValueControls}`,

            Cell: ({ row }) => <MeanComparisonChart stats={row.original.s_DaysToFirstEvent} />,
            filterVariant: "range",
          },
          {
            // Derived column — not a direct key in the data
            id: "-log10Days",
            header: "-log10",
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
              row.n_Categorical.nCasesWithCategory
                ? `${row.n_Categorical.nCasesWithCategory} ${row.n_Categorical.nControlsWithCategory}`
                : "",
            Cell: ({ row }) =>
              row.original.n_Categorical.nCasesWithCategory ? (
                <CasesControlCell
                  cases={row.original.n_Categorical.nCasesWithCategory}
                  controls={row.original.n_Categorical.nControlsWithCategory}
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
              row.n_Categorical.nCasesWithCategory
                ? `${row.n_Categorical.nCasesWithCategory} ${row.n_Categorical.nControlsWithCategory}`
                : "",
            Cell: ({ row }) =>
              row.original.n_Categorical.nCasesWithCategory ? (
                <CategoricalDistributionBar />
              ) : (
                <Typography>N/A</Typography>
              ),
            filterVariant: "range",
          },

          {
            id: "-log10Category",
            header: "-log10",
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
              row.n_Continuous.nCasesYesWithValue
                ? `${row.n_Continuous.nCasesYesWithValue} ${row.n_Continuous.nControlsYesWithValue}`
                : "",
            Cell: ({ row }) =>
              row.original.n_Continuous.nCasesYesWithValue ? (
                <CasesControlCell
                  cases={row.original.n_Continuous.nCasesYesWithValue}
                  controls={row.original.n_Continuous.nControlsYesWithValue}
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
              row.s_Continuous.meanValueCases
                ? `${row.s_Continuous.meanValueCases} ${row.s_Continuous.meanValueControls}`
                : "",
            Cell: ({ row }) =>
              row.original.s_Continuous.meanValueCases ? (
                <CasesControlCell
                  cases={row.original.s_Continuous.meanValueCases}
                  controls={row.original.s_Continuous.meanValueControls}
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
              row.s_Continuous.meanValueCases
                ? `${row.s_Continuous.meanValueCases} ${row.s_Continuous.meanValueControls}`
                : "",
            Cell: ({ row }) =>
              row.original.s_Continuous.meanValueCases ? (
                <MeanComparisonChart stats={row.original.s_Continuous} />
              ) : (
                <Typography>N/A</Typography>
              ),
            filterVariant: "range",
          },
          {
            id: "-log10Continuous",
            header: "-log10",
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
