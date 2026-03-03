<template>
    <div class="min-h-screen flex flex-col lg:flex-row">
        <!-- 手機：選單按鈕 -->
        <button
            type="button"
            class="lg:hidden fixed top-4 left-4 z-20 p-2 rounded-lg bg-[#2d5a27] text-white shadow-md"
            aria-label="開啟選單"
            @click="navOpen = !navOpen"
        >
            <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    v-if="!navOpen"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 6h16M4 12h16M4 18h16"
                />
                <path
                    v-else
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                />
            </svg>
        </button>

        <!-- 遮罩：手機上點擊關閉側欄 -->
        <div
            v-show="navOpen"
            class="lg:hidden fixed inset-0 z-10 bg-black/40 transition-opacity"
            aria-hidden="true"
            @click="navOpen = false"
        />

        <!-- 側欄 -->
        <aside
            class="w-52 min-w-[200px] flex-shrink-0 bg-[#2d5a27] text-white flex flex-col gap-6 py-5 px-0 transition-transform duration-200 ease-out lg:translate-x-0 lg:static lg:!shadow-none fixed top-0 left-0 bottom-0 z-20 shadow-xl"
            :class="navOpen ? 'translate-x-0' : '-translate-x-full'"
        >
            <h1
                class="px-5 text-lg font-semibold whitespace-nowrap pt-12 lg:pt-5"
            >
                飲料成分表
            </h1>
            <nav class="flex flex-col gap-0.5">
                <div class="flex flex-col gap-0">
                    <router-link
                        to="/ingredients"
                        class="px-5 py-2 font-medium block transition-colors"
                        :class="
                            isIngredientsActive
                                ? 'bg-white/15 text-white'
                                : 'text-white/90 hover:bg-white/10 hover:text-white'
                        "
                        @click="navOpen = false"
                    >
                        成分表查詢
                    </router-link>
                    <div
                        v-if="categories.length"
                        class="pl-5 ml-5 border-l-2 border-white/25 mb-1"
                    >
                        <router-link
                            v-for="cat in categories"
                            :key="cat.id"
                            :to="`/ingredients/category/${cat.id}`"
                            active-class="!bg-white/10 !text-white"
                            class="block py-1.5 px-3 text-sm text-white/85 hover:bg-white/10 hover:text-white transition-colors"
                            @click="navOpen = false"
                        >
                            {{ cat.name }}
                        </router-link>
                    </div>
                </div>
                <router-link
                    to="/review"
                    active-class="!bg-white/15 !text-white"
                    class="px-5 py-2 font-medium text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                    @click="navOpen = false"
                >
                    背誦／複習
                </router-link>
                <router-link
                    to="/order"
                    active-class="!bg-white/15 !text-white"
                    class="px-5 py-2 font-medium text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                    @click="navOpen = false"
                >
                    模擬點餐
                </router-link>
            </nav>
        </aside>

        <!-- 主內容 -->
        <main
            class="flex-1 p-4 sm:p-6 lg:p-6 w-full max-w-4xl min-w-0 overflow-auto lg:ml-0 mt-14 lg:mt-0"
        >
            <router-view />
        </main>
    </div>
</template>

<script setup>
    import { ref, computed, onMounted } from 'vue'
    import { useRoute } from 'vue-router'
    import { loadMenu, getCategories } from './data/menu'

    const route = useRoute()
    const categories = ref([])
    const navOpen = ref(false)

    const isIngredientsActive = computed(() =>
        route.path.startsWith('/ingredients'),
    )

    onMounted(async () => {
        try {
            const data = await loadMenu()
            categories.value = getCategories(data)
        } catch (_) {}
    })
</script>
