let menuData = null

export async function loadMenu() {
  if (menuData) return menuData
  const res = await fetch('/menu.json')
  if (!res.ok) throw new Error('無法載入菜單資料')
  menuData = await res.json()
  return menuData
}

export function getCategories(data) {
  return data?.categories ?? []
}

export function getCategory(data, categoryId) {
  return (data?.categories ?? []).find((c) => c.id === categoryId)
}

export function getItemsByCategory(data, categoryId) {
  return (data?.items ?? []).filter((i) => i.categoryId === categoryId)
}

export function getItem(data, itemId) {
  return (data?.items ?? []).find((i) => i.id === itemId)
}

export function getRecipe(data, itemId) {
  const item = getItem(data, itemId)
  if (!item?.recipeId) return null
  return (data?.recipes ?? []).find((r) => r.id === item.recipeId) ?? null
}

export function getRecipeForItem(data, item) {
  if (!item?.recipeId) return null
  return (data?.recipes ?? []).find((r) => r.id === item.recipeId) ?? null
}

export function getToppings(data) {
  return data?.toppings ?? []
}

/** 依甜度、冰量、是否溫熱、是否加料取得對應步驟與數值 */
export function getStepsAndValues(data, item, options = {}) {
  const recipe = getRecipeForItem(data, item)
  if (!recipe) return { steps: [], values: {} }
  const { sweetness, ice, hot = false, withTopping = false } = options
  const steps = hot
    ? (recipe.hotSteps ?? [])
    : (withTopping && recipe.toppingSteps ? recipe.toppingSteps : recipe.iceSteps ?? [])
  const values = {
    sugar: resolveSugar(recipe, sweetness, options),
    ice: resolveIce(recipe, ice),
    tea: resolveTea(recipe, ice, hot),
  }
  return { steps: Array.isArray(steps) ? steps : [], values }
}

function resolveSugar(recipe, sweetness, options) {
  const map = recipe.sugarLevels ?? {}
  if (map['黃金比例'] === '固定' || map['正常'] === '固定') return '固定'
  let key = sweetness
  if (options.ice === '去冰' && recipe.sugarStepUpOnNoIce) key = stepUpSweetness(key)
  if (options.withTopping && recipe.toppingOffset && typeof (map[key] ?? map['黃金比例']) === 'number') {
    const base = map[key] ?? map['黃金比例']
    return base - (recipe.toppingOffset ?? 5)
  }
  return map[key] ?? map['黃金比例'] ?? '-'
}

function stepUpSweetness(s) {
  const order = ['1分糖', '2分糖', '微糖', '半糖', '少糖', '正常', '黃金比例', '不要太甜', '無糖']
  const i = order.indexOf(s)
  return i < 0 || i === order.length - 1 ? s : order[i + 1]
}

function resolveIce(recipe, ice) {
  const map = recipe.iceAmounts ?? {}
  return map[ice] ?? map['正常'] ?? '-'
}

function resolveTea(recipe, ice, hot) {
  const tea = recipe.teaAmounts ?? {}
  if (hot) return tea.溫熱 ?? tea.hot ?? '-'
  const key = { 正常: '正少微', 少冰: '正少微', 微冰: '正少微', 去冰: '去冰', 完去: '去冰' }[ice]
  if (key && tea[key] !== undefined) return tea[key]
  const fallback = tea.正少 ?? tea.正少微 ?? tea.微去 ?? tea.去冰
  return fallback ?? '-'
}
