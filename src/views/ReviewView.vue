<template>
  <div class="p-0">
    <template v-if="loading">載入中…</template>
    <template v-else-if="error"><p class="text-red-600">{{ error }}</p></template>
    <template v-else>
      <div class="flex flex-wrap items-center gap-3 sm:gap-4 mb-4">
        <label class="font-medium">大類篩選：</label>
        <select v-model="filterCategoryId" class="rounded border border-gray-300 px-3 py-2 text-sm min-w-[140px] max-w-full">
          <option value="">全部</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <label class="flex items-center gap-2 cursor-pointer text-sm sm:text-base">
          <input v-model="onlyRecommended" type="checkbox" class="rounded border-gray-300" />
          僅人氣推薦
        </label>
      </div>

      <div class="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          class="px-3 py-2 rounded border text-sm sm:text-base transition-colors"
          :class="mode === 'flashcard' ? 'bg-[#2d5a27] text-white border-[#2d5a27]' : 'bg-white text-[#2d5a27] border-[#2d5a27] hover:bg-gray-50'"
          @click="mode = 'flashcard'"
        >
          閃卡
        </button>
        <button
          type="button"
          class="px-3 py-2 rounded border text-sm sm:text-base transition-colors"
          :class="mode === 'mask' ? 'bg-[#2d5a27] text-white border-[#2d5a27]' : 'bg-white text-[#2d5a27] border-[#2d5a27] hover:bg-gray-50'"
          @click="mode = 'mask'"
        >
          遮罩複習
        </button>
      </div>

      <!-- 閃卡模式 -->
      <section v-if="mode === 'flashcard'" class="mt-4">
        <p v-if="!filteredItems.length" class="text-gray-500">沒有符合條件的品項</p>
        <template v-else>
          <div class="flex items-center gap-4 mb-4 flex-wrap">
            <button type="button" class="px-3 py-1.5 rounded border border-gray-300 bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed" :disabled="cardIndex <= 0" @click="cardIndex = Math.max(0, cardIndex - 1)">上一張</button>
            <span class="text-sm text-gray-600">{{ cardIndex + 1 }} / {{ filteredItems.length }}</span>
            <button type="button" class="px-3 py-1.5 rounded border border-gray-300 bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed" :disabled="cardIndex >= filteredItems.length - 1" @click="cardIndex = Math.min(filteredItems.length - 1, cardIndex + 1)">下一張</button>
          </div>
          <div class="flashcard-wrap cursor-pointer" @click="flipped = !flipped">
            <div class="flashcard-inner" :class="{ 'flashcard-flipped': flipped }">
              <div class="flashcard-front">
                <div class="font-semibold text-lg mb-2">{{ currentItem?.name }}</div>
                <div class="text-gray-500 text-sm">點擊翻面</div>
              </div>
              <div class="flashcard-back">
                <div class="font-semibold text-lg mb-2">{{ currentItem?.name }}</div>
                <div class="text-sm space-y-1 overflow-auto">
                  <p v-if="recipe"><strong>糖量範例：</strong> {{ sugarPreview }}</p>
                  <p v-if="recipe?.teaAmounts && Object.keys(recipe.teaAmounts).length"><strong>茶/原汁：</strong> {{ teaPreview }}</p>
                  <p v-if="recipe?.iceSteps?.length"><strong>步驟摘要：</strong> {{ recipe.iceSteps[0] }}</p>
                </div>
              </div>
            </div>
          </div>
        </template>
      </section>

      <!-- 遮罩複習 -->
      <section v-else class="mt-4">
        <p v-if="!filteredItems.length" class="text-gray-500">沒有符合條件的品項</p>
        <ul v-else class="list-none p-0 m-0 space-y-2">
          <li v-for="item in filteredItems" :key="item.id" class="border border-gray-200 rounded-lg overflow-hidden">
            <div class="flex justify-between items-center px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100" @click="toggledId = toggledId === item.id ? null : item.id">
              <span class="font-medium">{{ item.name }}</span>
              <span class="text-gray-500 text-sm">{{ toggledId === item.id ? '收起' : '展開' }}</span>
            </div>
            <div v-show="toggledId === item.id" class="p-4 border-t border-gray-100">
              <router-link :to="`/ingredients/item/${item.id}`" class="text-[#2d5a27] text-sm">查看完整成分表 →</router-link>
              <div v-if="getRecipeForItem(item)" class="mt-2 text-sm space-y-1">
                <p><strong>糖量：</strong><span v-if="maskReveal[item.id]">{{ sugarPreviewFor(item) }}</span><span v-else class="text-gray-500 cursor-pointer underline" @click="maskReveal[item.id] = true">點擊顯示</span></p>
                <p><strong>步驟：</strong><span v-if="maskReveal[item.id]">{{ (getRecipeForItem(item).iceSteps || [])[0] }}</span><span v-else class="text-gray-500 cursor-pointer underline" @click="maskReveal[item.id] = true">點擊顯示</span></p>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { loadMenu, getCategories, getItemsByCategory, getItem, getRecipeForItem } from '../data/menu'

const loading = ref(true)
const error = ref('')
const data = ref(null)
const filterCategoryId = ref('')
const onlyRecommended = ref(false)
const mode = ref('flashcard')
const cardIndex = ref(0)
const flipped = ref(false)
const toggledId = ref(null)
const maskReveal = ref({})

const categories = computed(() => (data.value ? getCategories(data.value) : []))
const filteredItems = computed(() => {
  if (!data.value) return []
  let items = data.value.items ?? []
  if (filterCategoryId.value) items = items.filter((i) => i.categoryId === filterCategoryId.value)
  if (onlyRecommended.value) items = items.filter((i) => i.icons?.recommend)
  return items
})
const currentItem = computed(() => filteredItems.value[cardIndex.value] ?? null)
const recipe = computed(() => (data.value && currentItem.value ? getRecipeForItem(data.value, currentItem.value) : null))
const sugarPreview = computed(() => {
  const r = recipe.value
  if (!r?.sugarLevels) return '-'
  const entries = Object.entries(r.sugarLevels).slice(0, 3)
  return entries.map(([k, v]) => `${k}: ${v}`).join('、')
})
const teaPreview = computed(() => {
  const r = recipe.value
  if (!r?.teaAmounts) return '-'
  return Object.entries(r.teaAmounts).map(([k, v]) => `${k} ${v}`).join('、')
})

function sugarPreviewFor(item) {
  const r = getRecipeForItem(data.value, item)
  if (!r?.sugarLevels) return '-'
  return Object.entries(r.sugarLevels).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join('、')
}

onMounted(async () => {
  try {
    data.value = await loadMenu()
  } catch (e) {
    error.value = e.message || '載入失敗'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.flashcard-wrap { perspective: 800px; max-width: 360px; }
.flashcard-inner { position: relative; width: 100%; height: 200px; transition: transform 0.5s; transform-style: preserve-3d; }
.flashcard-inner.flashcard-flipped { transform: rotateY(180deg); }
.flashcard-front,
.flashcard-back { position: absolute; inset: 0; backface-visibility: hidden; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.25rem; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.flashcard-back { transform: rotateY(180deg); }
</style>
