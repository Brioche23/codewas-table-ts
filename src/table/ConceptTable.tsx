import { useMemo } from "react"
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
} from "material-react-table"

import {
  Box,
  Chip,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material"

import type { ConceptRow, DistributionRow, BinaryDistribution, Test } from "../utils/types"

import { MeanComparisonChart, CategoryBar } from "../components/Visuals"

import { isEmpty } from "lodash"

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (v: number | null, decimals = 4): string => (v === null ? "—" : v.toFixed(decimals))

const pValueChip = (p: number | null) => {
  if (p === null) return <Chip label="n/a" size="small" />
  const color = p < 0.05 ? "success" : p < 0.1 ? "warning" : "default"
  return <Chip label={fmt(p)} size="small" color={color} />
}

// ─── sub-table: distribution percentiles ─────────────────────────────────

function DistributionTable({ rows }: { rows: DistributionRow[] }) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor: "action.hover" }}>
          <TableCell>
            <strong>Measure</strong>
          </TableCell>
          <TableCell align="right">
            <strong>Cases</strong>
          </TableCell>
          <TableCell align="right">
            <strong>Controls</strong>
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.Measure} hover>
            <TableCell>{r.Measure}</TableCell>
            <TableCell align="right">{r.Cases}</TableCell>
            <TableCell align="right">{r.Controls}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// ─── sub-table: binary distribution (Yes/No counts) ──────────────────────

function BinaryDistributionTable({ rows }: { rows: BinaryDistribution[] }) {
  // Pre-compute totals once so every CategoryBar uses the same denominator
  const totalCases = rows.reduce((sum, r) => sum + r.case, 0)
  const totalControls = rows.reduce((sum, r) => sum + r.control, 0)

  return (
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor: "action.hover" }}>
          <TableCell>
            <strong>Value</strong>
          </TableCell>
          <TableCell align="right">
            <strong>Cases</strong>
          </TableCell>
          <TableCell align="right">
            <strong>Controls</strong>
          </TableCell>
          <TableCell>
            <strong>Distribution</strong>
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.value} hover>
            <TableCell>{r.value}</TableCell>
            <TableCell align="right">{r.case}</TableCell>
            <TableCell align="right">{r.control}</TableCell>
            <TableCell>
              <CategoryBar
                caseCount={r.case}
                controlCount={r.control}
                totalCases={totalCases}
                totalControls={totalControls}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// ─── test result summary row ──────────────────────────────────────────────

function TestResultRow({ test }: { test: Test }) {
  return (
    <Box display="flex" gap={2} alignItems="center" flexWrap="wrap" mt={1}>
      <Typography variant="caption" color="text.secondary">
        {test.testName}
      </Typography>
      <Box display="flex" gap={1} alignItems="center">
        <Typography variant="caption">p-value:</Typography>
        {pValueChip(test.pValue)}
      </Box>
      <Typography variant="caption">
        Effect size: <strong>{fmt(test.effectSize)}</strong>
      </Typography>
      <Typography variant="caption">
        SMD: <strong>{fmt(test.standarizeMeanDifference)}</strong>
      </Typography>
    </Box>
  )
}

// ─── section block ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box mb={2}>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      {children}
    </Box>
  )
}

// ─── expanded detail panel ────────────────────────────────────────────────

function ConceptDetailPanel({ row }: { row: MRT_Row<ConceptRow> }) {
  const data = row.original

  return (
    <Box
      sx={{
        p: 3,
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        gap: 3,
      }}
    >
      {/* Binary */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Section title="Binary">
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            Exposed: {data.n_Binary.nCasesWithCategory} cases /{" "}
            {data.n_Binary.nControlsWithCategory} controls
          </Typography>
          <BinaryDistributionTable rows={data.d_Binary} />
          {data.t_Binary.map((t, i) => (
            <TestResultRow key={i} test={t} />
          ))}
        </Section>
      </Paper>

      {/* Counts */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Section title="Counts">
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            Mean cases: {data.s_Counts.meanValueCases} (±{data.s_Counts.sdValueCases}) / Mean
            controls: {data.s_Counts.meanValueControls} (±{data.s_Counts.sdValueControls})
          </Typography>
          <MeanComparisonChart stats={data.s_Counts} />
          {data.d_Counts[0] && <DistributionTable rows={data.d_Counts[0]} />}
          {data.t_Counts.map((t, i) => (
            <TestResultRow key={i} test={t} />
          ))}
        </Section>
      </Paper>

      {/* Age at First Event */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Section title="Age at First Event">
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            Mean cases: {fmt(data.s_AgeFirstEvent.meanValueCases, 1)}y (±
            {fmt(data.s_AgeFirstEvent.sdValueCases, 1)}) / Mean controls:{" "}
            {fmt(data.s_AgeFirstEvent.meanValueControls, 1)}y (±
            {fmt(data.s_AgeFirstEvent.sdValueControls, 1)})
          </Typography>
          <MeanComparisonChart stats={data.s_AgeFirstEvent} unit="y" />
          {data.d_AgeFirstEvent[0] && <DistributionTable rows={data.d_AgeFirstEvent[0]} />}
          {data.t_AgeFirstEvent.map((t, i) => (
            <TestResultRow key={i} test={t} />
          ))}
        </Section>
      </Paper>

      {/* Days to First Event */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Section title="Days to First Event">
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            Mean cases: {fmt(data.s_DaysToFirstEvent.meanValueCases, 0)}d (±
            {fmt(data.s_DaysToFirstEvent.sdValueCases, 0)}) / Mean controls:{" "}
            {fmt(data.s_DaysToFirstEvent.meanValueControls, 0)}d (±
            {fmt(data.s_DaysToFirstEvent.sdValueControls, 0)})
          </Typography>
          <MeanComparisonChart stats={data.s_DaysToFirstEvent} unit="d" />

          {data.d_DaysToFirstEvent[0] && <DistributionTable rows={data.d_DaysToFirstEvent[0]} />}
          {data.t_DaysToFirstEvent.map((t, i) => (
            <TestResultRow key={i} test={t} />
          ))}
        </Section>
      </Paper>
      {/* Category */}
      {!isEmpty(data.n_Categorical) && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Section title="Category">
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              Exposed: {data.n_Categorical.nCasesWithCategory} cases /{" "}
              {data.n_Categorical.nControlsWithCategory} controls
            </Typography>
            <BinaryDistributionTable rows={data.d_Categorical} />
            {data.t_Categorical.map((t, i) => (
              <TestResultRow key={i} test={t} />
            ))}
          </Section>
        </Paper>
      )}
    </Box>
  )
}

// ─── main table ───────────────────────────────────────────────────────────

interface ConceptTableProps {
  data: ConceptRow[]
}

export default function ConceptTable({ data }: ConceptTableProps) {
  // MRT_ColumnDef<ConceptRow> types each column to your data shape.
  // `accessorFn` lets you derive a display value from nested fields.
  const columns = useMemo<MRT_ColumnDef<ConceptRow>[]>(
    () => [
      {
        accessorKey: "conceptId",
        header: "ID",
        size: 80,
      },
      {
        accessorKey: "conceptName",
        header: "Concept",
        size: 260,
      },
      {
        accessorKey: "domainId",
        header: "Domain",
        size: 120,
        // Filter by domain prefix (e.g. "Source:ATC")
        filterVariant: "select",
      },
      {
        // Derived column — not a direct key in the data
        id: "cases",
        header: "Cases",
        accessorFn: (row) => row.n_Binary.nCasesWithCategory,
        size: 130,
        filterVariant: "range",
      },
      {
        id: "controls",
        header: "Controls",
        accessorFn: (row) => row.n_Binary.nControlsWithCategory,
        size: 150,
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
        id: "effectSize",
        header: "Effect Size",
        accessorFn: (row) => row.t_Binary[0]?.effectSize ?? null,
        size: 120,
        Cell: ({ cell }) => fmt(cell.getValue<number | null>()),
        filterVariant: "range",
      },
      {
        id: "smd",
        header: "SMD",
        accessorFn: (row) => row.t_Binary[0]?.standarizeMeanDifference ?? null,
        size: 100,
        Cell: ({ cell }) => fmt(cell.getValue<number | null>()),
        filterVariant: "range",
      },
      {
        id: "meanAgeCases",
        header: "Mean Age Cases",
        accessorFn: (row) => row.s_AgeFirstEvent.meanValueCases,
        size: 140,
        Cell: ({ cell }) => `${fmt(cell.getValue<number>(), 1)}y`,
        filterVariant: "range",
      },
    ],
    [],
  )

  const table = useMaterialReactTable({
    columns,
    data,
    // ── expand ──
    renderDetailPanel: ({ row }) => <ConceptDetailPanel row={row} />,
    // ── pagination ──
    initialState: {
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
