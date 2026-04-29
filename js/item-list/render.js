export async function loadJson(path) {
    const res = await fetch(path)
    if (!res.ok) throw new Error(`無法載入 ${path}（${res.status}）`)
    return res.json()
}

export function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

export function formatIngredient(row) {
    if (row.amount != null && row.unit) {
        return `${row.label} · ${row.amount}${row.unit}`
    }
    if (row.amount_display != null) {
        const u = row.unit ? row.unit : ''
        return `${row.label} · ${row.amount_display}${u}`
    }
    return row.label ?? ''
}

export function resolveStep(step, shared) {
    if (step.ref && shared && shared[step.ref]) {
        return shared[step.ref]
    }
    return step.text ?? step.ref ?? ''
}

export function normalizeNotes(metaNote) {
    if (!metaNote) return []
    return Array.isArray(metaNote) ? metaNote : [metaNote]
}

export function buildTierRows(tiers, tierValues) {
    if (!tierValues) return ''
    return tiers
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((t) => {
            const val = tierValues[t.id]
            return `<li><span class="tier">${escapeHtml(
                t.label,
            )}</span><span class="val">${escapeHtml(String(val ?? '—'))}</span></li>`
        })
        .join('')
}

export function parseAddOnPreset(addOnPreset, tiers) {
    if (!addOnPreset || typeof addOnPreset !== 'string') return null
    const match = /^add-(.+)$/.exec(addOnPreset.trim())
    if (!match) return null
    const nums = match[1].split('-').map((n) => Number(n))
    if (!nums.length || nums.some((n) => Number.isNaN(n))) return null

    const sortedTiers = tiers
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    if (nums.length !== sortedTiers.length) return null

    const parsed = {}
    for (let i = 0; i < sortedTiers.length; i += 1) {
        parsed[sortedTiers[i].id] = nums[i]
    }
    return parsed
}

export function getSugarPresetRef(cat) {
    return cat?.sugar_amount?.preset_ref ?? cat?.sugar_preset_ref ?? ''
}

export function getSugarAdjustmentRef(cat) {
    if (cat?.sugar_amount) {
        const ref = cat.sugar_amount.with_no_ice_and_material_ref
        return typeof ref === 'string' && ref.trim().length ? ref : null
    }
    return cat?.sugar_amount?.with_no_ice_ref ?? getSugarPresetRef(cat)
}

export function teaRowsHtml(cat, teaPresets = {}, iceTiers = []) {
    const teaPresetRef = cat?.tea_with_ice_ref
    if (!teaPresetRef) return ''
    const teaPreset = teaPresets?.[teaPresetRef]
    if (!teaPreset) return ''

    const sortedIceTiers = (iceTiers ?? [])
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    if (!sortedIceTiers.length) return ''

    const rows = sortedIceTiers
        .map((tier) => {
            const amount = teaPreset?.[tier.id]
            return `<li><span class="tier">${escapeHtml(tier.label ?? tier.id ?? '')}</span><span class="val">${escapeHtml(String(amount ?? '—'))}</span></li>`
        })
        .join('')

    return `
    <div class="tea-detail">
      <p class="section-label">茶量（依冰量）</p>
      <div class="tea-pane-card">
        <ul class="tea-rows">${rows}</ul>
      </div>
    </div>
  `
}

export function iceAmountHtml(cat, icePresets = {}, iceTiers = []) {
    const iceAmount = cat?.ice_amount
    if (!iceAmount) return ''

    const presetRef = (iceAmount.preset_ref ?? '').trim()
    if (presetRef) {
        const preset = icePresets?.[presetRef]
        if (!preset) return ''

        const sortedIceTiers = (iceTiers ?? [])
            .slice()
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

        if (!sortedIceTiers.length) return ''

        const rows = sortedIceTiers
            .map((tier) => {
                const amount = preset?.[tier.id]
                return `<li><span class="tier">${escapeHtml(tier.label ?? tier.id ?? '')}</span><span class="val">${escapeHtml(String(amount ?? '—'))}</span></li>`
            })
            .join('')

        return `
    <div class="ice-detail">
      <p class="section-label">冰量</p>
      <div class="ice-pane-card">
        <ul class="ice-rows">${rows}</ul>
      </div>
    </div>
  `
    }

    const text = (iceAmount.text ?? '').trim()
    if (!text) return ''

    return `
    <div class="ice-detail">
      <p class="section-label">冰量</p>
      <p class="ice-text">${escapeHtml(text)}</p>
    </div>
  `
}

/** 糖分表主體（標題＋格狀），不含外層 `.sugar-detail`；供卡片區塊或步驟風琴共用 */
export function sugarDetailContentHtml(
    sugarData,
    presetKey,
    adjustmentRef,
    sugarFilter = 'all',
    sugarAddOnMap = {},
    sugarAdjustmentLabel = '加料減糖',
) {
    const preset = sugarData?.sugar_presets?.[presetKey] ?? null
    const tiers = sugarData?.sugar_tiers ?? []
    if (!preset) {
        return `<p class="section-label">糖分表</p><p>（找不到預設 <code>${escapeHtml(
            presetKey,
        )}</code>）</p>`
    }

    let baseVals = preset.base ?? null
    let addonVals = preset.with_add_on ?? null
    const looksFlat =
        !baseVals &&
        (preset['1fen'] !== undefined ||
            preset['golden'] !== undefined ||
            preset['less_sweet'] !== undefined)
    if (looksFlat) {
        baseVals = preset
        addonVals = null
    }
    if (!addonVals) {
        addonVals = parseAddOnPreset(
            sugarAddOnMap?.[adjustmentRef ?? presetKey],
            tiers,
        )
    }

    const showBase = sugarFilter === 'all' || sugarFilter === 'base'
    const showAddon = sugarFilter === 'all' || sugarFilter === 'addon'

    const blocks = []
    if (baseVals && showBase) {
        blocks.push(`
      <section class="sugar-pane">
        <p class="section-label subsection">標準糖分</p>
        <div class="sugar-pane-card">
          <ul class="sugar-rows">${buildTierRows(tiers, baseVals)}</ul>
        </div>
      </section>
    `)
    }
    if (addonVals && showAddon) {
        blocks.push(`
      <section class="sugar-pane">
        <p class="section-label subsection">${escapeHtml(sugarAdjustmentLabel)}</p>
        <div class="sugar-pane-card">
          <ul class="sugar-rows">${buildTierRows(tiers, addonVals)}</ul>
        </div>
      </section>
    `)
    }

    if (!blocks.length) {
        const addonOnlyNoTable =
            sugarFilter === 'addon' && addonVals == null && baseVals != null
        const baseOnlyInvalid =
            sugarFilter === 'base' && baseVals == null && addonVals != null
        const msg = addonOnlyNoTable
            ? '（此 preset 僅有標準糖分，無加料減糖對照表）'
            : baseOnlyInvalid
              ? '（無標準糖分欄位）'
              : '（此預設缺少 base／with_add_on）'
        return `<p class="section-label">糖分表</p><p>${escapeHtml(msg)}</p>`
    }

    return `
      <p class="section-label subsection">白蔗糖量</p>
      <div class="sugar-pane-grid">${blocks.join('')}</div>
    `
}

export function sugarRowsHtml(
    sugarData,
    presetKey,
    adjustmentRef,
    sugarFilter = 'all',
    sugarAddOnMap = {},
    sugarAdjustmentLabel = '加料減糖',
) {
    const inner = sugarDetailContentHtml(
        sugarData,
        presetKey,
        adjustmentRef,
        sugarFilter,
        sugarAddOnMap,
        sugarAdjustmentLabel,
    )
    if (!inner.includes('sugar-pane-grid')) {
        return inner
    }
    return `<div class="sugar-detail">${inner}</div>`
}

const STEPS_FLOW_VARIANT_CLASS = {
    lemon: 'steps-flow--lemon',
}

function flowAccordionPanelId(cat, stepIndex, kind) {
    const raw = String(cat?.id ?? 'item').replace(/[^a-zA-Z0-9_-]/g, '-')
    return `${raw}-step-${kind}-${stepIndex}`
}

/** 風琴內：原汁／配料清單（與卡片區塊相同內容） */
function ingredientsDetailContentHtml(cat) {
    const items = (cat.ingredients_base ?? [])
        .map((row) => `<li>${escapeHtml(formatIngredient(row))}</li>`)
        .join('')
    return `
      <p class="section-label subsection">原汁／配料</p>
      <ul class="ingredient-list ingredient-list--in-step">${items}</ul>
    `
}

function renderStepsBody(cat, sharedSteps, sugarStepOptions = null) {
    const stepsSorted = (cat.steps ?? [])
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    if (cat.steps_layout === 'flow') {
        const variantKey = cat.steps_flow_variant
        const variantClass =
            variantKey &&
            Object.prototype.hasOwnProperty.call(
                STEPS_FLOW_VARIANT_CLASS,
                variantKey,
            )
                ? ` ${STEPS_FLOW_VARIANT_CLASS[variantKey]}`
                : ''
        const parts = []
        stepsSorted.forEach((s, i) => {
            const text = escapeHtml(resolveStep(s, sharedSteps))
            const useSugarAccordion =
                sugarStepOptions?.sugarData &&
                s.ref === 'sugar' &&
                cat.steps_layout === 'flow'
            const useMaterialAccordion =
                s.ref === 'material' && cat.steps_layout === 'flow'

            if (useSugarAccordion) {
                const panelId = flowAccordionPanelId(cat, i, 'sugar')
                const triggerId = `${panelId}-trigger`
                const inner = sugarDetailContentHtml(
                    sugarStepOptions.sugarData,
                    getSugarPresetRef(cat),
                    getSugarAdjustmentRef(cat),
                    sugarStepOptions.sugarFilter,
                    sugarStepOptions.sugarAddOnMap,
                    sugarStepOptions.sugarAdjustmentLabel,
                )
                parts.push(`
        <div class="steps-flow__node steps-flow__node--accordion" role="listitem">
          <span class="steps-flow__badge">${i + 1}</span>
          <button type="button" class="steps-flow__accordion-trigger" id="${escapeHtml(triggerId)}" aria-expanded="false" aria-controls="${escapeHtml(panelId)}">
            <span class="steps-flow__text">${text}</span>
            <span class="steps-flow__chevron" aria-hidden="true">▼</span>
          </button>
        </div>
        <div class="steps-flow__accordion-panel steps-flow__accordion-panel--sugar sugar-detail" id="${escapeHtml(panelId)}" role="region" aria-labelledby="${escapeHtml(triggerId)}" hidden>${inner}</div>`)
            } else if (useMaterialAccordion) {
                const panelId = flowAccordionPanelId(cat, i, 'material')
                const triggerId = `${panelId}-trigger`
                const inner = ingredientsDetailContentHtml(cat)
                parts.push(`
        <div class="steps-flow__node steps-flow__node--accordion" role="listitem">
          <span class="steps-flow__badge">${i + 1}</span>
          <button type="button" class="steps-flow__accordion-trigger" id="${escapeHtml(triggerId)}" aria-expanded="false" aria-controls="${escapeHtml(panelId)}">
            <span class="steps-flow__text">${text}</span>
            <span class="steps-flow__chevron" aria-hidden="true">▼</span>
          </button>
        </div>
        <div class="steps-flow__accordion-panel steps-flow__accordion-panel--ingredients" id="${escapeHtml(panelId)}" role="region" aria-labelledby="${escapeHtml(triggerId)}" hidden>${inner}</div>`)
            } else {
                parts.push(`
        <div class="steps-flow__node" role="listitem">
          <span class="steps-flow__badge">${i + 1}</span>
          <span class="steps-flow__text">${text}</span>
        </div>`)
            }
            if (i < stepsSorted.length - 1) {
                parts.push(`
        <div class="steps-flow__link" aria-hidden="true">
          <span class="steps-flow__stem"></span>
          <span class="steps-flow__arrow">↓</span>
        </div>`)
            }
        })
        return `<div class="steps-flow${variantClass}" role="list" aria-label="製作步驟">${parts.join('')}</div>`
    }
    const stepsItems = stepsSorted
        .map((s) => `<li>${escapeHtml(resolveStep(s, sharedSteps))}</li>`)
        .join('')
    return `<ol class="steps-list">${stepsItems}</ol>`
}

export function renderCard(
    cat,
    sharedSteps,
    sugarData,
    sugarFilter = 'all',
    sugarAddOnMap = {},
    sugarAdjustmentLabel = '加料減糖',
    teaPresets = {},
    iceTiers = [],
    icePresets = {},
) {
    const ingredients = (cat.ingredients_base ?? [])
        .map((row) => `<li>${escapeHtml(formatIngredient(row))}</li>`)
        .join('')

    const hasSugarStepAccordion =
        cat.steps_layout === 'flow' &&
        (cat.steps ?? []).some((s) => s.ref === 'sugar')
    const hasMaterialStepAccordion =
        cat.steps_layout === 'flow' &&
        (cat.steps ?? []).some((s) => s.ref === 'material')

    const stepsHtml = renderStepsBody(cat, sharedSteps, {
        sugarData,
        sugarFilter,
        sugarAddOnMap,
        sugarAdjustmentLabel,
    })

    const itemNotes = cat.notes?.length
        ? `<div class="notes-block"><strong>備註</strong><ul>${cat.notes
              .map((n) => `<li>${escapeHtml(n)}</li>`)
              .join('')}</ul></div>`
        : ''

    const presetKey = getSugarPresetRef(cat)
    const adjustmentRef = getSugarAdjustmentRef(cat)
    const sugarBlock =
        hasSugarStepAccordion && sugarData
            ? ''
            : sugarRowsHtml(
                  sugarData,
                  presetKey,
                  adjustmentRef,
                  sugarFilter,
                  sugarAddOnMap,
                  sugarAdjustmentLabel,
              )
    const teaBlock = teaRowsHtml(cat, teaPresets, iceTiers)
    const iceBlock = iceAmountHtml(cat, icePresets, iceTiers)

    const ingredientsBlock =
        hasMaterialStepAccordion
            ? ''
            : `<p class="section-label" style="margin-top:1rem">原汁／配料</p>
        <ul class="ingredient-list">${ingredients}</ul>`

    return `
    <li class="item-card" data-id="${escapeHtml(cat.id ?? '')}">
      <div class="item-card__head">
        <h2 class="item-card__name">${escapeHtml(cat.name ?? '')}</h2>
      </div>
      <div class="item-card__body">
        <p class="section-label">步驟</p>
        ${stepsHtml}
        ${ingredientsBlock}
        ${teaBlock}
        ${iceBlock}
        ${sugarBlock}
        ${itemNotes}
      </div>
    </li>
  `
}
