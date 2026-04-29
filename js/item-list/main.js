import {
    loadJson,
    escapeHtml,
    normalizeNotes,
    renderCard,
    getSugarPresetRef,
} from './render.js'
import {
    collectPresetFilters,
    collectTeaFilters,
    parseIngredientFilterOptions,
    formatPresetLabel,
} from './filters.js'

export async function main() {
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
                if (currentTeaFilter === '__no_tea__') {
                    return (
                        typeof c.tea_with_ice_ref === 'string' &&
                        !c.tea_with_ice_ref.trim()
                    )
                }
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
                    : currentTeaFilter === '__no_tea__'
                      ? '無茶'
                      : formatPresetLabel(currentTeaFilter)
            const sugarText = presetFilterOptions.length
                ? currentPresetFilter === 'all'
                    ? '全部'
                    : formatPresetLabel(currentPresetFilter)
                : '無'
            subEl.textContent = `${filtered.length} / ${totalCount} 項飲品 · 糖分篩選 ${sugarText} · 成分篩選 ${ingredientText} · 茶量篩選 ${teaText}`
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
                        option === 'all'
                            ? '全部'
                            : option === '__no_tea__'
                              ? '無茶'
                              : formatPresetLabel(option)
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
        )}<br /><br />終端機執行：<code>cd checkin && python3 -m http.server 8765</code>，再開啟 <code>http://127.0.0.1:8765</code></li>`
    }
}

main()
