import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/ingredients' },
  { path: '/ingredients', name: 'ingredients', component: () => import('../views/IngredientsView.vue'), meta: { title: '成分表查詢' } },
  { path: '/ingredients/category/:categoryId', name: 'category', component: () => import('../views/IngredientsView.vue') },
  { path: '/ingredients/item/:itemId', name: 'item', component: () => import('../views/IngredientsView.vue') },
  { path: '/review', name: 'review', component: () => import('../views/ReviewView.vue'), meta: { title: '背誦／複習' } },
  { path: '/order', name: 'order', component: () => import('../views/OrderView.vue'), meta: { title: '模擬點餐' } },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · 飲料成分表` : '飲料成分表'
})

export default router
