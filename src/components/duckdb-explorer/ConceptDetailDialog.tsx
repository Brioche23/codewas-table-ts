import { Dialog, DialogContent, DialogTitle, Grid, Paper, Stack, Typography } from "@mui/material"
import { CategoryBar, CategoricalDistributionBar, MeanComparisonChart } from "../Visuals"
import type { ConceptSummaryRow } from "./types"
import {
  buildDistributionRows,
  buildStats,
  formatNumber,
  parseCategoricalDistribution,
} from "./utils"

function renderTestSummary(
  _label: string,
  pValue?: number | null,
  effectSize?: number | null,
  smd?: number | null,
  testName?: string | null,
) {
  if (pValue == null && effectSize == null && smd == null && !testName) return null
  return (
    <Stack spacing={0.25}>
      {/* <Typography variant="subtitle2">{label}</Typography> */}
      <Typography variant="body2" color="text.secondary">
        -log10(p): {pValue && pValue > 0 ? formatNumber(-Math.log10(pValue), 2) : "N/A"}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Effect: {effectSize == null ? "N/A" : formatNumber(effectSize, 2)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        SMD: {smd == null ? "N/A" : formatNumber(smd, 2)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Test: {testName ?? "N/A"}
      </Typography>
    </Stack>
  )
}

export function ConceptDetailDialog({
  row,
  onClose,
}: {
  row: ConceptSummaryRow | null
  onClose: () => void
}) {
  if (!row) return null

  const binaryDistribution =
    row.binaryCaseYes != null &&
    row.binaryControlYes != null &&
    row.binaryTotalCases != null &&
    row.binaryTotalControls != null ? (
      <CategoryBar
        caseCount={row.binaryCaseYes}
        controlCount={row.binaryControlYes}
        totalCases={row.binaryTotalCases}
        totalControls={row.binaryTotalControls}
      />
    ) : null

  const categoricalDistribution = row.categoricalDistribution
    ? parseCategoricalDistribution(row.categoricalDistribution)
    : []

  const continuousSections: Array<{
    title: string
    prefix: "counts" | "age" | "days" | "continuous"
    unit?: string
  }> = [
    { title: "Counts", prefix: "counts" },
    { title: "Age First Event", prefix: "age" },
    { title: "Days To First Event", prefix: "days" },
    { title: "Continuous", prefix: "continuous", unit: row.continuousUnit ?? "" },
  ]

  return (
    <Dialog open={Boolean(row)} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ color: "primary.main" }}>{row.conceptName ?? row.conceptId}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="body2">Source code: {row.conceptCode ?? "N/A"}</Typography>
            <Typography variant="body2">Concept ID: {row.conceptId}</Typography>
            <Typography variant="body2">Domain: {row.domainId}</Typography>
            <Typography variant="body2">Count mode: {row.countMode}</Typography>
            <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
              Ancestors:{" "}
              {row.ancestorConceptIds ? row.ancestorConceptIds.split(",").join(", ") : "N/A"}
            </Typography>
          </Stack>

          <Grid container spacing={1}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={1}>
                  <Typography variant="h6">Binary</Typography>
                  {binaryDistribution ?? (
                    <Typography variant="body2">No binary distribution available.</Typography>
                  )}
                  {renderTestSummary(
                    "Binary statistics",
                    row.binaryPValue,
                    row.binaryEffectSize,
                    row.binarySmd,
                    row.binaryTestName,
                  )}
                </Stack>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
                <Stack spacing={1}>
                  <Typography variant="h6">Categorical</Typography>
                  {categoricalDistribution.length > 0 ? (
                    <CategoricalDistributionBar
                      totalCases={row.categoricalCaseYes ?? 0}
                      totalControls={row.categoricalControlYes ?? 0}
                      distributions={categoricalDistribution}
                    />
                  ) : (
                    <Typography variant="body2">No categorical distribution available.</Typography>
                  )}
                  {renderTestSummary(
                    "Categorical statistics",
                    row.categoricalPValue,
                    row.categoricalEffectSize,
                    row.categoricalSmd,
                    row.categoricalTestName,
                  )}
                </Stack>
              </Paper>
            </Grid>
            {continuousSections.map((section) => {
              const stats = buildStats(
                row[`${section.prefix}CaseMean` as keyof ConceptSummaryRow] as number | null,
                row[`${section.prefix}ControlMean` as keyof ConceptSummaryRow] as number | null,
                row[`${section.prefix}CaseSd` as keyof ConceptSummaryRow] as number | null,
                row[`${section.prefix}ControlSd` as keyof ConceptSummaryRow] as number | null,
              )
              const distributions = buildDistributionRows(
                row[`${section.prefix}P10Case` as keyof ConceptSummaryRow] as number | null,
                row[`${section.prefix}P25Case` as keyof ConceptSummaryRow] as number | null,
                row[`${section.prefix}MedianCase` as keyof ConceptSummaryRow] as number | null,
                row[`${section.prefix}P75Case` as keyof ConceptSummaryRow] as number | null,
                row[`${section.prefix}P90Case` as keyof ConceptSummaryRow] as number | null,
                row[`${section.prefix}P10Control` as keyof ConceptSummaryRow] as number | null,
                row[`${section.prefix}P25Control` as keyof ConceptSummaryRow] as number | null,
                row[`${section.prefix}MedianControl` as keyof ConceptSummaryRow] as number | null,
                row[`${section.prefix}P75Control` as keyof ConceptSummaryRow] as number | null,
                row[`${section.prefix}P90Control` as keyof ConceptSummaryRow] as number | null,
              )
              return (
                <Grid key={section.prefix} size={{ xs: 12, md: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
                    <Stack spacing={1}>
                      <Typography variant="h6">{section.title}</Typography>
                      {stats && distributions ? (
                        <MeanComparisonChart
                          stats={stats}
                          distributions={distributions}
                          unit={section.unit ?? ""}
                        />
                      ) : (
                        <Typography variant="body2">No summary distribution available.</Typography>
                      )}
                      {renderTestSummary(
                        `${section.title} statistics`,
                        row[`${section.prefix}PValue` as keyof ConceptSummaryRow] as number | null,
                        row[`${section.prefix}EffectSize` as keyof ConceptSummaryRow] as
                          | number
                          | null,
                        row[`${section.prefix}Smd` as keyof ConceptSummaryRow] as number | null,
                        row[`${section.prefix}TestName` as keyof ConceptSummaryRow] as
                          | string
                          | null,
                      )}
                    </Stack>
                  </Paper>
                </Grid>
              )
            })}
          </Grid>
        </Stack>
      </DialogContent>
    </Dialog>
  )
}
