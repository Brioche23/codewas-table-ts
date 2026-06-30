import { Box, Chip, Stack, Typography } from "@mui/material"
import type { MRT_ColumnDef, MRT_FilterFn } from "material-react-table"
import { CasesControlCell } from "../../table/custom-cells/CasesControlsCell"
import { CategoryBar, CategoricalDistributionBar, MeanComparisonChart } from "../Visuals"
import { parseNumericFilter } from "./queryBuilders"
import type { ConceptSummaryRow } from "./types"
import { buildDistributionRows, buildStats, parseCategoricalDistribution } from "./utils/utils"

export const numericExpressionFilter: MRT_FilterFn<ConceptSummaryRow> = (
  row,
  columnId,
  filterValue,
) => {
  const rawValue = row.getValue<number | null>(columnId)
  const value = typeof rawValue === "number" ? rawValue : null
  const filterText = String(filterValue ?? "").trim()
  if (!filterText) return true
  const parsed = parseNumericFilter(filterText)
  if (!parsed || value == null || Number.isNaN(value)) return false
  switch (parsed.operator) {
    case ">":
      return value > parsed.value
    case ">=":
      return value >= parsed.value
    case "<":
      return value < parsed.value
    case "<=":
      return value <= parsed.value
    default:
      return value === parsed.value
  }
}

export function valueChip(value: number | null | undefined, threshold: number, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <Typography variant="body2">N/A</Typography>
  }
  return (
    <Chip
      label={value.toFixed(digits)}
      size="small"
      color={value >= threshold ? "success" : "default"}
      variant={value >= threshold ? "filled" : "outlined"}
    />
  )
}

export function makeContinuousColumns(
  header: string,
  colorThreshold: number,
  prefix: "counts" | "age" | "days" | "continuous",
): MRT_ColumnDef<ConceptSummaryRow> {
  return {
    id: prefix,
    header,
    columns: [
      {
        id: `${prefix}Mean`,
        header: "Mean",
        accessorFn: (row) => row[`${prefix}CaseMean` as keyof ConceptSummaryRow] as number | null,
        filterFn: numericExpressionFilter,
        Cell: ({ row }) => {
          const caseMean = row.original[`${prefix}CaseMean` as keyof ConceptSummaryRow] as
            | number
            | null
          const controlMean = row.original[`${prefix}ControlMean` as keyof ConceptSummaryRow] as
            | number
            | null
          const caseSd = row.original[`${prefix}CaseSd` as keyof ConceptSummaryRow] as number | null
          const controlSd = row.original[`${prefix}ControlSd` as keyof ConceptSummaryRow] as
            | number
            | null
          if (caseMean == null || controlMean == null || caseSd == null || controlSd == null) {
            return <Typography variant="body2">N/A</Typography>
          }
          return (
            <CasesControlCell
              cases={caseMean}
              controls={controlMean}
              casesSD={caseSd}
              controlsSD={controlSd}
            />
          )
        },
        size: 140,
      },
      {
        id: `${prefix}Distribution`,
        header: "Distribution",
        accessorFn: (row) => row[`${prefix}CaseMean` as keyof ConceptSummaryRow] as number | null,
        Cell: ({ row }) => {
          const stats = buildStats(
            row.original[`${prefix}CaseMean` as keyof ConceptSummaryRow] as number | null,
            row.original[`${prefix}ControlMean` as keyof ConceptSummaryRow] as number | null,
            row.original[`${prefix}CaseSd` as keyof ConceptSummaryRow] as number | null,
            row.original[`${prefix}ControlSd` as keyof ConceptSummaryRow] as number | null,
          )
          const distributions = buildDistributionRows(
            row.original[`${prefix}P10Case` as keyof ConceptSummaryRow] as number | null,
            row.original[`${prefix}P25Case` as keyof ConceptSummaryRow] as number | null,
            row.original[`${prefix}MedianCase` as keyof ConceptSummaryRow] as number | null,
            row.original[`${prefix}P75Case` as keyof ConceptSummaryRow] as number | null,
            row.original[`${prefix}P90Case` as keyof ConceptSummaryRow] as number | null,
            row.original[`${prefix}P10Control` as keyof ConceptSummaryRow] as number | null,
            row.original[`${prefix}P25Control` as keyof ConceptSummaryRow] as number | null,
            row.original[`${prefix}MedianControl` as keyof ConceptSummaryRow] as number | null,
            row.original[`${prefix}P75Control` as keyof ConceptSummaryRow] as number | null,
            row.original[`${prefix}P90Control` as keyof ConceptSummaryRow] as number | null,
          )
          if (!stats || !distributions) return <Typography variant="body2">N/A</Typography>
          return (
            <MeanComparisonChart
              stats={stats}
              distributions={distributions}
              unit={
                prefix === "continuous"
                  ? ((row.original.continuousUnit as string | null) ?? "")
                  : ""
              }
            />
          )
        },
        size: 180,
      },
      {
        id: `${prefix}LogP`,
        header: "-log10(p)",
        accessorFn: (row) => {
          const pValue = row[`${prefix}PValue` as keyof ConceptSummaryRow] as number | null
          return pValue && pValue > 0 ? -Math.log10(pValue) : null
        },
        filterFn: numericExpressionFilter,
        Cell: ({ cell }) => valueChip(cell.getValue<number | null>(), 8),
        size: 95,
      },
      {
        id: `${prefix}Effect`,
        header: "Effect",
        accessorFn: (row) => row[`${prefix}EffectSize` as keyof ConceptSummaryRow] as number | null,
        filterFn: numericExpressionFilter,
        Cell: ({ cell }) => valueChip(cell.getValue<number | null>(), colorThreshold),
        size: 90,
      },
    ],
  }
}

export function buildColumns(): MRT_ColumnDef<ConceptSummaryRow>[] {
  return [
    {
      id: "info",
      header: "Info",
      columns: [
        {
          id: "conceptInfo",
          header: "Concept",
          accessorFn: (row) =>
            [
              row.conceptName ?? "",
              row.conceptCode ?? "",
              String(row.conceptId),
              row.domainId,
              row.countMode,
            ].join(" "),
          Cell: ({ row }) => (
            <Stack
              spacing={0.25}
              sx={{
                pl: row.depth * 1.5,
                borderLeft: row.depth > 0 ? "3px solid" : "none",
                borderColor:
                  row.depth > 0
                    ? `rgba(25, 118, 210, ${Math.min(0.18 + row.depth * 0.08, 0.42)})`
                    : "transparent",
              }}
            >
              <Typography variant="body2" sx={{ color: "primary.main" }}>
                {row.original.conceptName ?? row.original.conceptId}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Source code: {row.original.conceptCode ?? "N/A"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Concept ID: {row.original.conceptId}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Domain: {row.original.domainId}
              </Typography>
              <Box>
                <Chip
                  size="small"
                  label={row.original.countMode === "descendant" ? "All descendants" : "Exact code"}
                  variant="outlined"
                />
                {row.depth > 0 && (
                  <Chip
                    size="small"
                    label={`Level ${row.depth + 1}`}
                    variant="outlined"
                    sx={{ ml: 0.5 }}
                  />
                )}
              </Box>
            </Stack>
          ),
          size: 240,
        },
        {
          accessorKey: "ancestorConceptIds",
          header: "Ancestors",
          size: 200,
          Cell: ({ cell }) => {
            const value = cell.getValue<string | null>()
            if (!value) return <Typography variant="body2">N/A</Typography>
            return (
              <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                {value.split(",").join("\n")}
              </Typography>
            )
          },
        },
      ],
    },
    {
      id: "binary",
      header: "Binary",
      columns: [
        {
          id: "binaryCasesControl",
          header: "Cases / Controls",
          accessorFn: (row) => row.binaryCaseYes ?? null,
          filterFn: numericExpressionFilter,
          Cell: ({ row }) =>
            row.original.binaryCaseYes != null && row.original.binaryControlYes != null ? (
              <CasesControlCell
                cases={row.original.binaryCaseYes}
                controls={row.original.binaryControlYes}
                nDecimals={0}
              />
            ) : (
              <Typography variant="body2">N/A</Typography>
            ),
          size: 135,
        },
        {
          id: "binaryDistribution",
          header: "Distribution",
          accessorFn: (row) => row.binaryCaseYes ?? null,
          Cell: ({ row }) => {
            const caseCount = row.original.binaryCaseYes
            const controlCount = row.original.binaryControlYes
            const totalCases = row.original.binaryTotalCases
            const totalControls = row.original.binaryTotalControls
            if (
              caseCount == null ||
              controlCount == null ||
              totalCases == null ||
              totalControls == null
            ) {
              return <Typography variant="body2">N/A</Typography>
            }
            return (
              <CategoryBar
                caseCount={caseCount}
                controlCount={controlCount}
                totalCases={totalCases}
                totalControls={totalControls}
              />
            )
          },
          size: 130,
        },
        {
          id: "binaryLogP",
          header: "-log10(p)",
          accessorFn: (row) =>
            row.binaryPValue && row.binaryPValue > 0 ? -Math.log10(row.binaryPValue) : null,
          filterFn: numericExpressionFilter,
          Cell: ({ cell }) => valueChip(cell.getValue<number | null>(), 8),
          size: 95,
        },
        {
          id: "binaryEffect",
          header: "OR",
          accessorFn: (row) => row.binaryEffectSize ?? null,
          filterFn: numericExpressionFilter,
          Cell: ({ cell }) => valueChip(cell.getValue<number | null>(), 1.2),
          size: 90,
        },
      ],
    },
    makeContinuousColumns("Counts", 1.1, "counts"),
    makeContinuousColumns("Age First Event", 1.1, "age"),
    makeContinuousColumns("Days To First Event", 1.1, "days"),
    makeContinuousColumns("Continuous", 1.1, "continuous"),
    {
      id: "categorical",
      header: "Categorical",
      columns: [
        {
          id: "categoricalCasesControl",
          header: "Cases / Controls",
          accessorFn: (row) => row.categoricalCaseYes ?? null,
          filterFn: numericExpressionFilter,
          Cell: ({ row }) =>
            row.original.categoricalCaseYes != null &&
            row.original.categoricalControlYes != null ? (
              <CasesControlCell
                cases={row.original.categoricalCaseYes}
                controls={row.original.categoricalControlYes}
                nDecimals={0}
              />
            ) : (
              <Typography variant="body2">N/A</Typography>
            ),
          size: 135,
        },
        {
          id: "categoricalDistribution",
          header: "Distribution",
          accessorFn: (row) => row.categoricalDistribution ?? null,
          Cell: ({ row }) => {
            const distributions = parseCategoricalDistribution(row.original.categoricalDistribution)
            if (distributions.length === 0) return <Typography variant="body2">N/A</Typography>
            return (
              <CategoricalDistributionBar
                totalCases={row.original.categoricalCaseYes ?? 0}
                totalControls={row.original.categoricalControlYes ?? 0}
                distributions={distributions}
              />
            )
          },
          size: 180,
        },
        {
          id: "categoricalLogP",
          header: "-log10(p)",
          accessorFn: (row) =>
            row.categoricalPValue && row.categoricalPValue > 0
              ? -Math.log10(row.categoricalPValue)
              : null,
          filterFn: numericExpressionFilter,
          Cell: ({ cell }) => valueChip(cell.getValue<number | null>(), 8),
          size: 95,
        },
        {
          id: "categoricalEffect",
          header: "Effect",
          accessorFn: (row) => row.categoricalEffectSize ?? null,
          filterFn: numericExpressionFilter,
          Cell: ({ cell }) => valueChip(cell.getValue<number | null>(), 1.2),
          size: 90,
        },
      ],
    },
  ]
}
