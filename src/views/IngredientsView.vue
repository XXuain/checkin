<template>
    <div class="p-0">
        <template v-if="loading">載入中…</template>
        <template v-else-if="error">
            <p class="text-red-600">{{ error }}</p>
        </template>
        <template v-else>
            <!-- 大類卡片 -->
            <section v-if="!selectedCategoryId && !selectedItemId" class="mb-6">
                <h2 class="mb-4 text-xl sm:text-2xl font-semibold">選擇大類</h2>
                <div
                    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
                >
                    <router-link
                        v-for="cat in categories"
                        :key="cat.id"
                        :to="`/ingredients/category/${cat.id}`"
                        class="flex flex-col p-4 sm:p-5 bg-white border border-gray-200 rounded-xl no-underline text-inherit transition-all hover:border-[#2d5a27] hover:shadow-md hover:shadow-[#2d5a27]/10"
                    >
                        <span class="font-semibold text-base sm:text-lg mb-1">
                            {{ cat.name }}
                        </span>
                        <span
                            v-if="cat.subtitle"
                            class="text-gray-500 text-sm leading-snug"
                        >
                            {{ cat.subtitle }}
                        </span>
                    </router-link>
                </div>
            </section>

            <!-- 品項卡片（已選大類） -->
            <section
                v-else-if="selectedCategoryId && !selectedItemId"
                class="mb-6"
            >
                <button
                    type="button"
                    class="mb-2 p-0 border-0 bg-transparent text-[#2d5a27] text-sm hover:underline"
                    @click="router.push('/ingredients')"
                >
                    ← 返回大類
                </button>
                <h2 class="mb-1 text-xl sm:text-2xl font-semibold">
                    {{ selectedCategory?.name }}
                </h2>
                <p
                    v-if="selectedCategory?.subtitle"
                    class="text-gray-500 text-sm mt-1"
                >
                    {{ selectedCategory.subtitle }}
                </p>
                <div
                    class="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
                >
                    <router-link
                        v-for="item in categoryItems"
                        :key="item.id"
                        :to="`/ingredients/item/${item.id}`"
                        class="flex flex-col p-4 sm:p-5 bg-white border border-gray-200 rounded-xl no-underline text-inherit transition-all hover:border-[#2d5a27] hover:shadow-md hover:shadow-[#2d5a27]/10"
                    >
                        <span class="font-semibold text-base sm:text-lg mb-1">
                            {{ item.name }}
                        </span>
                        <span class="text-gray-500 text-sm mt-auto">
                            NT$ {{ item.price }}
                        </span>
                    </router-link>
                </div>
            </section>

            <!-- 品項成分詳情 -->
            <section
                v-else-if="selectedItemId && selectedItem && recipe"
                class="mb-6"
            >
                <button
                    type="button"
                    class="mb-2 p-0 border-0 bg-transparent text-[#2d5a27] text-sm hover:underline"
                    @click="
                        router.push(
                            `/ingredients/category/${selectedItem.categoryId}`,
                        )
                    "
                >
                    ← 返回品項
                </button>
                <h2 class="mb-1 text-xl sm:text-2xl font-semibold">
                    {{ selectedItem.name }}
                </h2>
                <p class="text-gray-600 mb-4">NT$ {{ selectedItem.price }}</p>

                <div class="mt-5">
                    <h3 class="mb-2 text-base font-semibold">糖量對照</h3>
                    <div class="overflow-x-auto">
                        <table
                            v-if="Object.keys(recipe.sugarLevels || {}).length"
                            class="w-full min-w-[200px] border-collapse border border-gray-300"
                        >
                            <thead>
                                <tr>
                                    <th
                                        class="border border-gray-300 px-3 py-2 text-left"
                                    >
                                        甜度
                                    </th>
                                    <th
                                        class="border border-gray-300 px-3 py-2 text-left"
                                    >
                                        數值
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="(val, key) in recipe.sugarLevels"
                                    :key="key"
                                >
                                    <td
                                        class="border border-gray-300 px-3 py-2"
                                    >
                                        {{ key }}
                                    </td>
                                    <td
                                        class="border border-gray-300 px-3 py-2"
                                    >
                                        {{ val }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <p v-else class="text-gray-500">無糖量對照表</p>
                    </div>
                </div>

                <div class="mt-5">
                    <h3 class="mb-2 text-base font-semibold">冰塊量</h3>
                    <div class="overflow-x-auto">
                        <table
                            v-if="Object.keys(recipe.iceAmounts || {}).length"
                            class="w-full min-w-[200px] border-collapse border border-gray-300"
                        >
                            <thead>
                                <tr>
                                    <th
                                        class="border border-gray-300 px-3 py-2 text-left"
                                    >
                                        冰量
                                    </th>
                                    <th
                                        class="border border-gray-300 px-3 py-2 text-left"
                                    >
                                        說明
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="(val, key) in recipe.iceAmounts"
                                    :key="key"
                                >
                                    <td
                                        class="border border-gray-300 px-3 py-2"
                                    >
                                        {{ key }}
                                    </td>
                                    <td
                                        class="border border-gray-300 px-3 py-2"
                                    >
                                        {{ val }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <p v-else class="text-gray-500">無冰塊對照表</p>
                    </div>
                </div>

                <div
                    v-if="
                        recipe.teaAmounts &&
                        Object.keys(recipe.teaAmounts).length
                    "
                    class="mt-5"
                >
                    <h3 class="mb-2 text-base font-semibold">
                        茶量／原汁／牛奶
                    </h3>
                    <div class="overflow-x-auto">
                        <table
                            class="w-full min-w-[200px] border-collapse border border-gray-300"
                        >
                            <tbody>
                                <tr
                                    v-for="(val, key) in recipe.teaAmounts"
                                    :key="key"
                                >
                                    <td
                                        class="border border-gray-300 px-3 py-2"
                                    >
                                        {{ key }}
                                    </td>
                                    <td
                                        class="border border-gray-300 px-3 py-2"
                                    >
                                        {{ val }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="mt-5">
                    <h3 class="mb-2 text-base font-semibold">冰的步驟</h3>
                    <ol class="list-decimal pl-6 mt-1 space-y-1">
                        <li v-for="(step, i) in recipe.iceSteps || []" :key="i">
                            {{ step }}
                        </li>
                    </ol>
                </div>

                <div v-if="recipe.hotSteps?.length" class="mt-5">
                    <h3 class="mb-2 text-base font-semibold">溫熱步驟</h3>
                    <ol class="list-decimal pl-6 mt-1 space-y-1">
                        <li v-for="(step, i) in recipe.hotSteps" :key="i">
                            {{ step }}
                        </li>
                    </ol>
                </div>

                <div v-if="recipe.toppingSteps?.length" class="mt-5">
                    <h3 class="mb-2 text-base font-semibold">加料版步驟</h3>
                    <ol class="list-decimal pl-6 mt-1 space-y-1">
                        <li v-for="(step, i) in recipe.toppingSteps" :key="i">
                            {{ step }}
                        </li>
                    </ol>
                </div>

                <div v-if="recipe.notes?.length" class="mt-5">
                    <h3 class="mb-2 text-base font-semibold">備註</h3>
                    <ul
                        class="list-disc pl-6 mt-1 text-gray-600 text-sm space-y-0.5"
                    >
                        <li v-for="(note, i) in recipe.notes" :key="i">
                            {{ note }}
                        </li>
                    </ul>
                </div>
            </section>
        </template>
    </div>
</template>

<script setup>
    import { ref, computed, watch, onMounted } from 'vue'
    import { useRoute, useRouter } from 'vue-router'
    import {
        loadMenu,
        getCategories,
        getCategory,
        getItemsByCategory,
        getItem,
        getRecipe,
    } from '../data/menu'

    const route = useRoute()
    const router = useRouter()
    const loading = ref(true)
    const error = ref('')
    const data = ref(null)

    const categories = computed(() =>
        data.value ? getCategories(data.value) : [],
    )
    const selectedCategoryId = computed(() => route.params.categoryId || null)
    const selectedItemId = computed(() => route.params.itemId || null)
    const selectedCategory = computed(() =>
        data.value && selectedCategoryId.value
            ? getCategory(data.value, selectedCategoryId.value)
            : null,
    )
    const categoryItems = computed(() =>
        data.value && selectedCategoryId.value
            ? getItemsByCategory(data.value, selectedCategoryId.value)
            : [],
    )
    const selectedItem = computed(() =>
        data.value && selectedItemId.value
            ? getItem(data.value, selectedItemId.value)
            : null,
    )
    const recipe = computed(() =>
        data.value && selectedItemId.value
            ? getRecipe(data.value, selectedItemId.value)
            : null,
    )

    onMounted(async () => {
        try {
            data.value = await loadMenu()
            const itemId = route.hash.replace('#item=', '')
            if (itemId && getItem(data.value, itemId))
                router.replace({ path: `/ingredients/item/${itemId}` })
        } catch (e) {
            error.value = e.message || '載入失敗'
        } finally {
            loading.value = false
        }
    })
</script>
