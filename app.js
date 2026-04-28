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

function sugarRowsHtml(
    sugarData,
    presetKey,
    sugarFilter = 'all',
    sugarAddOnMap = {},
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
        addonVals = parseAddOnPreset(sugarAddOnMap?.[presetKey], tiers)
    }

    const showBase = sugarFilter === 'all' || sugarFilter === 'base'
    const showAddon = sugarFilter === 'all' || sugarFilter === 'addon'

    const blocks = []
    if (baseVals && showBase) {
        blocks.push(`
      <p class="section-label subsection">標準糖分</p>
      <ul class="sugar-rows">${buildTierRows(tiers, baseVals)}</ul>
    `)
    }
    if (addonVals && showAddon) {
        blocks.push(`
      <p class="section-label subsection" style="margin-top:0.85rem">加料減糖</p>
      <ul class="sugar-rows">${buildTierRows(tiers, addonVals)}</ul>
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
      <p class="section-label">${escapeHtml(presetKey)}</p>
      ${blocks.join('')}
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

function renderCard(
    cat,
    sharedSteps,
    sugarData,
    sugarFilter = 'all',
    sugarAddOnMap = {},
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

    const presetKey = cat.sugar_preset_ref ?? ''
    const sugarBlock = sugarRowsHtml(
        sugarData,
        presetKey,
        sugarFilter,
        sugarAddOnMap,
    )

    return `
    <li class="item-card" data-id="${escapeHtml(cat.id ?? '')}">
      <div class="item-card__head">
        <h2 class="item-card__name">${escapeHtml(cat.name ?? '')}</h2>
        <div class="item-card__sugar">
          糖分表 <code>${escapeHtml(presetKey)}</code>
        </div>
      </div>
      <div class="item-card__body">
        <p class="section-label">原汁／配料</p>
        <ul class="ingredient-list">${ingredients}</ul>
        ${sugarBlock}
        <p class="section-label" style="margin-top:1rem">步驟</p>
        <ol class="steps-list">${stepsItems}</ol>
        ${itemNotes}
      </div>
    </li>
  `
}

async function main() {
    const titleEl = document.getElementById('page-title')
    const subEl = document.getElementById('page-subtitle')
    const grid = document.getElementById('item-grid')
    const footer = document.getElementById('footer-notes')
    const sugarFilterWrap = document.getElementById('sugar-filter')
    const sugarFilterButtons = sugarFilterWrap?.querySelector(
        '.sugar-filter__buttons',
    )

    try {
        const [mojito, sugar] = await Promise.all([
            loadJson('data/mojito.json'),
            loadJson('data/sugar.json'),
        ])

        let currentPresetFilter = SUGAR_PRESET_FILTER_OPTIONS[0]
        const sharedSteps = mojito.shared_steps ?? {}
        const sugarAddOnMap = mojito.sugar_with_add_on ?? {}
        const categories = mojito.categories ?? []
        const totalCount = categories.length
        titleEl.textContent = mojito.meta?.title ?? '品項一覽'
        function renderList() {
            const filtered = categories.filter(
                (c) => c.sugar_preset_ref === currentPresetFilter,
            )
            const html = filtered.map((c) =>
                renderCard(c, sharedSteps, sugar, 'all', sugarAddOnMap),
            )
            grid.innerHTML = html.join('')
            subEl.textContent = `${filtered.length} / ${totalCount} 項飲品 · 糖分篩選 ${currentPresetFilter}`
        }

        if (sugarFilterWrap && sugarFilterButtons) {
            sugarFilterWrap.hidden = false
            sugarFilterButtons.innerHTML = SUGAR_PRESET_FILTER_OPTIONS.map(
                (preset) => {
                    const pressed = preset === currentPresetFilter
                    return `<button type="button" data-filter="${escapeHtml(preset)}" aria-pressed="${pressed ? 'true' : 'false'}" class="${pressed ? 'is-active' : ''}">${escapeHtml(preset)}</button>`
                },
            ).join('')

            sugarFilterButtons.addEventListener('click', (event) => {
                const target = event.target
                if (!(target instanceof HTMLButtonElement)) return
                const selected = target.dataset.filter
                if (
                    !selected ||
                    !SUGAR_PRESET_FILTER_OPTIONS.includes(selected)
                )
                    return
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
        }

        renderList()

        const globalNotes = normalizeNotes(mojito.meta?.note)
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
