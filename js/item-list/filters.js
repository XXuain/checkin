import { getSugarPresetRef } from './render.js'

export const SUGAR_PRESET_FILTER_OPTIONS = [
    'std-1-2-5-10',
    'std-5-10-15-20',
    'std-10-20-30-40',
    'std-13-26-40-50',
]

export function collectPresetFilters(categories = []) {
    const inUse = Array.from(
        new Set(
            categories
                .map((c) => getSugarPresetRef(c))
                .filter(
                    (preset) => typeof preset === 'string' && preset.length,
                ),
        ),
    )
    const orderedKnown = SUGAR_PRESET_FILTER_OPTIONS.filter((preset) =>
        inUse.includes(preset),
    )
    const customPresets = inUse.filter(
        (preset) => !SUGAR_PRESET_FILTER_OPTIONS.includes(preset),
    )
    return [...orderedKnown, ...customPresets]
}

export function collectTeaFilters(categories = []) {
    const refs = Array.from(
        new Set(
            categories
                .map((c) => c?.tea_with_ice_ref)
                .filter((ref) => typeof ref === 'string' && ref.length),
        ),
    )
    const hasNoTea = categories.some(
        (c) =>
            typeof c?.tea_with_ice_ref === 'string' &&
            !c.tea_with_ice_ref.trim(),
    )
    return hasNoTea ? [...refs, '__no_tea__'] : refs
}

export function parseIngredientFilterOptions(raw = '') {
    if (!raw || typeof raw !== 'string') return []
    return raw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
}

export function formatPresetLabel(preset) {
    if (typeof preset !== 'string') return String(preset ?? '')
    return preset.replace(/^std-/, '')
}
