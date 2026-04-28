async function loadJson(path) {
    const res = await fetch(path)
    if (!res.ok) throw new Error(`無法載入 ${path}（${res.status}）`)
    return res.json()
}

function formatIngredient(row) {
    if (row.amount != null && row.unit) {
        return `${row.label} · ${row.amount}${row.unit}`
    }
    if (row.amount_display != null) {
        const u = row.unit ? row.unit : ''
        return `${row.label} · ${row.amount_display}${u}`
    }
    return row.label ?? ''
}

function resolveStep(step, shared) {
    if (step.ref && shared && shared[step.ref]) {
        return shared[step.ref]
    }
    return step.text ?? step.ref ?? ''
}

function normalizeNotes(metaNote) {
    if (!metaNote) return []
    return Array.isArray(metaNote) ? metaNote : [metaNote]
}

function buildTierRows(tiers, tierValues) {
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

function parseAddOnPreset(addOnPreset, tiers) {
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

function getSugarPresetRef(cat) {
    return cat?.sugar_amount?.preset_ref ?? cat?.sugar_preset_ref ?? ''
}

function getSugarAdjustmentRef(cat) {
    if (cat?.sugar_amount) {
        const ref = cat.sugar_amount.with_no_ice_and_material_ref
        return typeof ref === 'string' && ref.trim().length ? ref : null
    }
    return (
        cat?.sugar_amount?.with_no_ice_ref ??
        getSugarPresetRef(cat)
    )
}

function teaRowsHtml(cat, teaPresets = {}, iceTiers = []) {
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

function iceAmountHtml(cat, icePresets = {}, iceTiers = []) {
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

function sugarRowsHtml(
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

    /** 相容：
     * 1) 新版：preset 為平面數值，add-on 在 mojito.sugar_with_add_on 以 add-x-x-x-x 表示
     * 2) 舊版：preset 含 base/with_add_on
     * 3) 更舊：preset 只有平面數值（僅標準糖分）
     */
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
    <div class="sugar-detail">
      <p class="section-label subsection">白蔗糖量</p>
      <div class="sugar-pane-grid">${blocks.join('')}</div>
    </div>
  `
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

const SUGAR_PRESET_FILTER_OPTIONS = [
    'std-1-2-5-10',
    'std-5-10-15-20',
    'std-10-20-30-40',
    'std-13-26-40-50',
]

function collectPresetFilters(categories = []) {
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

function collectTeaFilters(categories = []) {
    return Array.from(
        new Set(
            categories
                .map((c) => c?.tea_with_ice_ref)
                .filter((ref) => typeof ref === 'string' && ref.length),
        ),
    )
}

function parseIngredientFilterOptions(raw = '') {
    if (!raw || typeof raw !== 'string') return []
    return raw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
}

function formatPresetLabel(preset) {
    if (typeof preset !== 'string') return String(preset ?? '')
    return preset.replace(/^std-/, '')
}

function renderCard(
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

    const stepsSorted = (cat.steps ?? [])
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    const stepsItems = stepsSorted
        .map((s) => `<li>${escapeHtml(resolveStep(s, sharedSteps))}</li>`)
        .join('')

    const itemNotes = cat.notes?.length
        ? `<div class="notes-block"><strong>備註</strong><ul>${cat.notes
              .map((n) => `<li>${escapeHtml(n)}</li>`)
              .join('')}</ul></div>`
        : ''

    const presetKey = getSugarPresetRef(cat)
    const adjustmentRef = getSugarAdjustmentRef(cat)
    const sugarBlock = sugarRowsHtml(
        sugarData,
        presetKey,
        adjustmentRef,
        sugarFilter,
        sugarAddOnMap,
        sugarAdjustmentLabel,
    )
    const teaBlock = teaRowsHtml(cat, teaPresets, iceTiers)
    const iceBlock = iceAmountHtml(cat, icePresets, iceTiers)

    return `
    <li class="item-card" data-id="${escapeHtml(cat.id ?? '')}">
      <div class="item-card__head">
        <h2 class="item-card__name">${escapeHtml(cat.name ?? '')}</h2>
      </div>
      <div class="item-card__body">
        <p class="section-label">原汁／配料</p>
        <ul class="ingredient-list">${ingredients}</ul>
        ${teaBlock}
        ${iceBlock}
        ${sugarBlock}
        <p class="section-label" style="margin-top:1rem">步驟</p>
        <ol class="steps-list">${stepsItems}</ol>
        ${itemNotes}
      </div>
    </li>
  `
}

async function main() {
    const pageConfig = document.body?.dataset ?? {}
    const menuDataPath = pageConfig.menuDataPath || 'data/mojito.json'
    const sugarDataPath = pageConfig.sugarDataPath || 'data/sugar.json'
    const iceDataPath = pageConfig.iceDataPath || ''
    const sugarAdjustmentMapKey =
        pageConfig.sugarAdjustmentMapKey || 'sugar_with_add_on'
    const sugarAdjustmentLabel = pageConfig.sugarAdjustmentLabel || '加料減糖'
    const ingredientFilterOptions = parseIngredientFilterOptions(
        pageConfig.ingredientFilterOptions || '',
    )
    const titleEl = document.getElementById('page-title')
    const subEl = document.getElementById('page-subtitle')
    const grid = document.getElementById('item-grid')
    const footer = document.getElementById('footer-notes')
    const sugarFilterWrap = document.getElementById('sugar-filter')
    const sugarFilterButtons = sugarFilterWrap?.querySelector(
        '.sugar-filter__buttons',
    )
    const ingredientFilterWrap = document.getElementById('ingredient-filter')
    const ingredientFilterButtons = ingredientFilterWrap?.querySelector(
        '.sugar-filter__buttons',
    )
    const teaFilterWrap = document.getElementById('tea-filter')
    const teaFilterButtons = teaFilterWrap?.querySelector(
        '.sugar-filter__buttons',
    )

    try {
        const [menuData, sugar, iceData] = await Promise.all([
            loadJson(menuDataPath),
            loadJson(sugarDataPath),
            iceDataPath ? loadJson(iceDataPath) : Promise.resolve(null),
        ])

        const sharedSteps = menuData.shared_steps ?? {}
        const sugarAddOnMap =
            menuData[sugarAdjustmentMapKey] ??
            menuData.sugar_with_no_ice_and_material_presets ??
            menuData.sugar_with_add_on ??
            {}
        const teaPresets = menuData.tea_with_ice_presets ?? {}
        const iceTiers = iceData?.ice_tiers ?? []
        const icePresets = iceData?.ice_presets ?? {}
        const categories = menuData.categories ?? []
        const presetFilterOptions = collectPresetFilters(categories)
        const teaFilterOptions = collectTeaFilters(categories)
        let currentPresetFilter = 'all'
        let currentIngredientFilter = 'all'
        let currentTeaFilter = 'all'
        const totalCount = categories.length
        titleEl.textContent = menuData.meta?.title ?? '品項一覽'
        function renderList() {
            const byPreset =
                currentPresetFilter !== 'all'
                    ? categories.filter(
                          (c) => getSugarPresetRef(c) === currentPresetFilter,
                      )
                    : categories
            const byIngredient = byPreset.filter((c) => {
                if (currentIngredientFilter === 'all') return true
                return (c.ingredients_base ?? []).some((row) =>
                    String(row?.label ?? '').includes(currentIngredientFilter),
                )
            })
            const filtered = byIngredient.filter((c) => {
                if (currentTeaFilter === 'all') return true
                return c.tea_with_ice_ref === currentTeaFilter
            })
            const html = filtered.map((c) =>
                renderCard(
                    c,
                    sharedSteps,
                    sugar,
                    'all',
                    sugarAddOnMap,
                    sugarAdjustmentLabel,
                    teaPresets,
                    iceTiers,
                    icePresets,
                ),
            )
            grid.innerHTML = html.join('')
            const ingredientText =
                currentIngredientFilter === 'all'
                    ? '全部'
                    : currentIngredientFilter
            const teaText =
                currentTeaFilter === 'all'
                    ? '全部'
                    : formatPresetLabel(currentTeaFilter)
            const sugarText =
                currentPresetFilter === 'all'
                    ? '全部'
                    : formatPresetLabel(currentPresetFilter)
            if (presetFilterOptions.length) {
                subEl.textContent = `${filtered.length} / ${totalCount} 項飲品 · 糖分篩選 ${sugarText} · 成分篩選 ${ingredientText} · 茶量篩選 ${teaText}`
            } else {
                subEl.textContent = `${filtered.length} / ${totalCount} 項飲品 · 成分篩選 ${ingredientText} · 茶量篩選 ${teaText}`
            }
        }

        if (
            sugarFilterWrap &&
            sugarFilterButtons &&
            presetFilterOptions.length
        ) {
            sugarFilterWrap.hidden = false
            const options = ['all', ...presetFilterOptions]
            sugarFilterButtons.innerHTML = options
                .map((preset) => {
                    const label =
                        preset === 'all' ? '全部' : formatPresetLabel(preset)
                    const pressed = preset === currentPresetFilter
                    return `<button type="button" data-filter="${escapeHtml(preset)}" aria-pressed="${pressed ? 'true' : 'false'}" class="${pressed ? 'is-active' : ''}">${escapeHtml(label)}</button>`
                })
                .join('')

            sugarFilterButtons.addEventListener('click', (event) => {
                const target = event.target
                if (!(target instanceof HTMLButtonElement)) return
                const selected = target.dataset.filter
                if (!selected || !options.includes(selected)) return
                currentPresetFilter = selected

                for (const btn of sugarFilterButtons.querySelectorAll(
                    'button[data-filter]',
                )) {
                    const active = btn.dataset.filter === currentPresetFilter
                    btn.classList.toggle('is-active', active)
                    btn.setAttribute('aria-pressed', active ? 'true' : 'false')
                }
                renderList()
            })
        } else if (sugarFilterWrap) {
            sugarFilterWrap.hidden = true
        }

        if (
            ingredientFilterWrap &&
            ingredientFilterButtons &&
            ingredientFilterOptions.length
        ) {
            ingredientFilterWrap.hidden = false
            const options = ['all', ...ingredientFilterOptions]
            ingredientFilterButtons.innerHTML = options
                .map((option) => {
                    const label = option === 'all' ? '全部' : option
                    const pressed = option === currentIngredientFilter
                    return `<button type="button" data-filter="${escapeHtml(option)}" aria-pressed="${pressed ? 'true' : 'false'}" class="${pressed ? 'is-active' : ''}">${escapeHtml(label)}</button>`
                })
                .join('')

            ingredientFilterButtons.addEventListener('click', (event) => {
                const target = event.target
                if (!(target instanceof HTMLButtonElement)) return
                const selected = target.dataset.filter
                if (!selected || !options.includes(selected)) return
                currentIngredientFilter = selected

                for (const btn of ingredientFilterButtons.querySelectorAll(
                    'button[data-filter]',
                )) {
                    const active =
                        btn.dataset.filter === currentIngredientFilter
                    btn.classList.toggle('is-active', active)
                    btn.setAttribute('aria-pressed', active ? 'true' : 'false')
                }
                renderList()
            })
        } else if (ingredientFilterWrap) {
            ingredientFilterWrap.hidden = true
        }

        if (teaFilterWrap && teaFilterButtons && teaFilterOptions.length) {
            teaFilterWrap.hidden = false
            const options = ['all', ...teaFilterOptions]
            teaFilterButtons.innerHTML = options
                .map((option) => {
                    const label =
                        option === 'all' ? '全部' : formatPresetLabel(option)
                    const pressed = option === currentTeaFilter
                    return `<button type="button" data-filter="${escapeHtml(option)}" aria-pressed="${pressed ? 'true' : 'false'}" class="${pressed ? 'is-active' : ''}">${escapeHtml(label)}</button>`
                })
                .join('')

            teaFilterButtons.addEventListener('click', (event) => {
                const target = event.target
                if (!(target instanceof HTMLButtonElement)) return
                const selected = target.dataset.filter
                if (!selected || !options.includes(selected)) return
                currentTeaFilter = selected

                for (const btn of teaFilterButtons.querySelectorAll(
                    'button[data-filter]',
                )) {
                    const active = btn.dataset.filter === currentTeaFilter
                    btn.classList.toggle('is-active', active)
                    btn.setAttribute('aria-pressed', active ? 'true' : 'false')
                }
                renderList()
            })
        } else if (teaFilterWrap) {
            teaFilterWrap.hidden = true
        }

        renderList()

        const globalNotes = normalizeNotes(menuData.meta?.note)
        if (globalNotes.length) {
            footer.innerHTML = `<h2>共通備註</h2><ul>${globalNotes
                .map((n) => `<li>${escapeHtml(n)}</li>`)
                .join('')}</ul>`
        } else {
            footer.innerHTML = ''
        }
    } catch (e) {
        titleEl.textContent = '無法載入資料'
        subEl.textContent =
            '請以本機伺服器開啟此資料夾（勿用 file:// 直接開檔案）。'
        grid.innerHTML = `<li class="error-banner">${escapeHtml(
            e instanceof Error ? e.message : String(e),
        )}<br /><br />終端機執行：<code>cd checkin2.0 && python3 -m http.server 8765</code>，再開啟 <code>http://127.0.0.1:8765</code></li>`
    }
}

main()
