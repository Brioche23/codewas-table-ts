import type { ColumnsOption } from "./types"

export const COLUMNS_COLORS = { color1: "#ffffff", color2: "#e3e3e3" }

export const COLUMNS: ColumnsOption[] = [
  { key: "Binary", label: "Binary" },
  { key: "Count", label: "Count" },
  { key: "Age", label: "Age at First Event" },
  { key: "Days", label: "Days to First Event" },
  { key: "Continuous", label: "Continuous" },
  { key: "Categorical", label: "Categorical" },
] satisfies ColumnsOption[]
