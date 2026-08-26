import type { FilterPreset } from "../../utils/types"

export function loadPresets(key: string): FilterPreset[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]")
  } catch {
    return []
  }
}

export function savePresets(key: string, presets: FilterPreset[]): void {
  localStorage.setItem(key, JSON.stringify(presets))
}
