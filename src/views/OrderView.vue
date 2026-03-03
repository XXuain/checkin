<template>
  <div class="p-0">
    <template v-if="loading">載入中…</template>
    <template v-else-if="error"><p class="text-red-600">{{ error }}</p></template>
    <template v-else>
      <!-- 步驟一：選飲料與選項 -->
      <section v-if="!orderResult">
        <h2 class="mb-4 text-xl sm:text-2xl font-semibold">模擬點餐</h2>
        <div class="space-y-4 max-w-md">
          <div>
            <label class="block font-medium mb-1.5">大類</label>
            <select v-model="selectedCategoryId" class="w-full rounded border border-gray-300 px-3 py-2 text-sm sm:text-base">
              <option value="">請選擇</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div>
            <label class="block font-medium mb-1.5">飲料</label>
            <select v-model="selectedItemId" class="w-full rounded border border-gray-300 px-3 py-2 text-sm sm:text-base">
              <option value="">請選擇</option>
              <option v-for="i in orderableItems" :key="i.id" :value="i.id">{{ i.name }} NT$ {{ i.price }}</option>
            </select>
          </div>
          <template v-if="selectedItem">
            <div v-if="showSweetness">
              <label class="block font-medium mb-1.5">甜度</label>
              <select v-model="orderOptions.sweetness" class="w-full rounded border border-gray-300 px-3 py-2 text-sm sm:text-base">
                <option value="1分糖">1分糖</option>
                <option value="2分糖">2分糖</option>
                <option value="微糖">微糖</option>
                <option value="半糖">半糖</option>
                <option value="少糖">少糖</option>
                <option value="正常">正常</option>
                <option value="黃金比例">黃金比例</option>
                <option value="不要太甜">不要太甜</option>
                <option value="無糖">無糖</option>
              </select>
            </div>
            <div v-if="showIce">
              <label class="block font-medium mb-1.5">冰量</label>
              <select v-model="orderOptions.ice" class="w-full rounded border border-gray-300 px-3 py-2 text-sm sm:text-base">
                <option value="正常">正常</option>
                <option value="少冰">少冰</option>
                <option value="微冰">微冰</option>
                <option value="去冰">去冰</option>
                <option value="完去">完去</option>
              </select>
            </div>
            <div v-if="showTemp">
              <label class="block font-medium mb-1.5">溫度</label>
              <select v-model="orderOptions.hot" class="w-full rounded border border-gray-300 px-3 py-2 text-sm sm:text-base">
                <option :value="false">冰</option>
                <option :value="true">溫／熱</option>
              </select>
            </div>
            <div v-if="selectedItem.canAddTopping !== false">
              <label class="block font-medium mb-1.5">加料</label>
              <select v-model="orderOptions.withTopping" class="w-full rounded border border-gray-300 px-3 py-2 text-sm sm:text-base">
                <option value="">不加料</option>
                <option v-for="t in toppings" :key="t.id" :value="t.id">{{ t.name }} +NT$ {{ t.addPrice }}</option>
              </select>
            </div>
          </template>
        </div>
        <div class="flex flex-wrap gap-3 mt-6">
          <button type="button" class="px-4 py-2 rounded border border-[#2d5a27] bg-[#2d5a27] text-white text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed" :disabled="!canSubmit" @click="submitOrder(false)">送出（練習模式）</button>
          <button type="button" class="px-4 py-2 rounded border border-[#2d5a27] bg-white text-[#2d5a27] text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed" :disabled="!canSubmit" @click="submitOrder(true)">送出（測驗模式）</button>
        </div>
      </section>

      <!-- 步驟二：顯示配方與步驟 -->
      <section v-else>
        <button type="button" class="mb-2 p-0 border-0 bg-transparent text-[#2d5a27] hover:underline" @click="orderResult = null">← 再點一單</button>
        <h2 class="mb-1 text-xl sm:text-2xl font-semibold">{{ orderResult.item.name }}</h2>
        <p class="text-gray-500 text-sm sm:text-base mb-4">甜度 {{ orderResult.options.sweetness }} · 冰量 {{ orderResult.options.ice }} · {{ orderResult.options.hot ? '溫熱' : '冰' }} {{ orderResult.options.withTopping ? '· 加料' : '' }}</p>
        <div v-if="orderResult.testMode && !orderResult.revealed" class="mb-4">
          <button type="button" class="px-4 py-2 rounded bg-[#2d5a27] text-white" @click="orderResult.revealed = true">看答案</button>
        </div>
        <template v-if="!orderResult.testMode || orderResult.revealed">
          <div class="mt-4">
            <h3 class="mb-2 font-semibold">本杯數值</h3>
            <p class="mb-1"><strong>糖量：</strong> {{ orderResult.values.sugar }}</p>
            <p class="mb-1"><strong>冰塊：</strong> {{ orderResult.values.ice }}</p>
            <p class="mb-1"><strong>茶／原汁：</strong> {{ orderResult.values.tea }}</p>
          </div>
          <div class="mt-4">
            <h3 class="mb-2 font-semibold">步驟</h3>
            <ol class="list-decimal pl-6 space-y-1">
              <li v-for="(step, i) in orderResult.steps" :key="i">{{ step }}</li>
            </ol>
          </div>
          <router-link :to="`/ingredients/item/${orderResult.item.id}`" class="inline-block mt-4 text-[#2d5a27]">查看完整成分表 →</router-link>
        </template>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { loadMenu, getCategories, getItemsByCategory, getItem, getToppings, getStepsAndValues } from '../data/menu'

const loading = ref(true)
const error = ref('')
const data = ref(null)
const selectedCategoryId = ref('')
const selectedItemId = ref('')
const orderOptions = ref({
  sweetness: '黃金比例',
  ice: '正常',
  hot: false,
  withTopping: false,
})
const orderResult = ref(null)

const categories = computed(() => (data.value ? getCategories(data.value) : []))
const orderableItems = computed(() => {
  if (!selectedCategoryId.value || !data.value) return []
  return getItemsByCategory(data.value, selectedCategoryId.value)
})
const selectedItem = computed(() => (data.value && selectedItemId.value ? getItem(data.value, selectedItemId.value) : null))
const toppings = computed(() => (data.value ? getToppings(data.value) : []))
const showSweetness = computed(() => selectedItem.value && !selectedItem.value.icons?.fixedSweet)
const showIce = computed(() => selectedItem.value && !selectedItem.value.icons?.fixedIce)
const showTemp = computed(() => selectedItem.value?.icons?.hot === true)
const canSubmit = computed(() => !!selectedItemId.value)

function submitOrder(testMode) {
  if (!data.value || !selectedItem.value) return
  const item = selectedItem.value
  const withTopping = orderOptions.value.withTopping === true || (typeof orderOptions.value.withTopping === 'string' && orderOptions.value.withTopping.length > 0)
  const options = {
    sweetness: orderOptions.value.sweetness,
    ice: orderOptions.value.ice,
    hot: orderOptions.value.hot,
    withTopping,
  }
  const { steps, values } = getStepsAndValues(data.value, item, {
    sweetness: options.sweetness,
    ice: options.ice,
    hot: options.hot,
    withTopping: options.withTopping,
  })
  orderResult.value = {
    item,
    options,
    steps,
    values,
    testMode,
    revealed: !testMode,
  }
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

