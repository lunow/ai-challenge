<script setup lang="ts">
import { USERS, ACTIVITIES, CATEGORIES, POINTS, AVAILABLE_YEARS } from '~/composables/useDatabase'

// ─── Filters ───────────────────────────────────────────────────────────────
const selectedYear     = ref<string>('all')
const selectedQuarter  = ref<string>('all')
const selectedCategory = ref<string>('all')
const searchQuery      = ref('')

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

// ─── Computed leaderboard ──────────────────────────────────────────────────
const filteredActivities = computed(() => {
  return ACTIVITIES.filter(a => {
    if (selectedYear.value !== 'all' && a.year !== Number(selectedYear.value)) return false
    if (selectedQuarter.value !== 'all' && a.quarter !== Number(selectedQuarter.value[1])) return false
    if (selectedCategory.value !== 'all' && a.category !== selectedCategory.value) return false
    return true
  })
})

const leaderboard = computed(() => {
  const scores: Record<string, number> = {}
  const counts: Record<string, number> = {}
  for (const a of filteredActivities.value) {
    scores[a.userId] = (scores[a.userId] ?? 0) + a.points
    counts[a.userId] = (counts[a.userId] ?? 0) + 1
  }

  const query = searchQuery.value.toLowerCase()
  return USERS
    .filter(u => !query || u.name.toLowerCase().includes(query))
    .map(u => ({ ...u, score: scores[u.id] ?? 0, count: counts[u.id] ?? 0 }))
    .sort((a, b) => b.score - a.score)
})

// Podium order: left = 2nd, center = 1st, right = 3rd
const podiumSlots = computed(() => {
  const top = leaderboard.value.slice(0, 3)
  if (top.length === 0) return []
  const [first, second, third] = top
  return [
    second ? { user: second, rank: 2 } : null,
    first  ? { user: first,  rank: 1 } : null,
    third  ? { user: third,  rank: 3 } : null,
  ].filter(Boolean)
})

// ─── Expanded rows ─────────────────────────────────────────────────────────
const expandedIds = ref<Set<string>>(new Set())
function toggleRow(id: string) {
  const next = new Set(expandedIds.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expandedIds.value = next
}

function userActivities(userId: string) {
  return filteredActivities.value.filter(a => a.userId === userId)
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase()
}

const PODIUM_CONFIG: Record<number, { baseH: string; baseColor: string; badgeBg: string }> = {
  1: { baseH: '120px', baseColor: '#F59E0B', badgeBg: '#F59E0B' },
  2: { baseH: '80px',  baseColor: '#CBD5E1', badgeBg: '#64748B' },
  3: { baseH: '60px',  baseColor: '#CBD5E1', badgeBg: '#92400E' },
}

const CATEGORY_STYLE: Record<string, { bg: string; text: string }> = {
  'Public Speaking':        { bg: 'bg-blue-100',   text: 'text-blue-700' },
  'Education':              { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  'University Partnership': { bg: 'bg-violet-100',  text: 'text-violet-700' },
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 py-8 px-4">
    <div class="max-w-3xl mx-auto">

      <!-- ── Header ──────────────────────────────────────────────────────── -->
      <div class="mb-4">
        <h1 class="text-2xl font-bold text-gray-900">Leaderboard</h1>
        <p class="text-sm text-gray-500 mt-0.5">Top performers based on contributions and activity</p>
      </div>

      <!-- ── Filters ─────────────────────────────────────────────────────── -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 mb-4">
        <div class="flex flex-wrap gap-2 items-center">
          <div class="relative">
            <select v-model="selectedYear" class="appearance-none pl-3 pr-8 py-1.5 text-sm border border-black text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500" style="font-family: Verdana, sans-serif; border-radius: 1px; background-color: silver;">
              <option value="all">All Years</option>
              <option v-for="y in AVAILABLE_YEARS" :key="y" :value="y">{{ y }}</option>
            </select>
            <span class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
          </div>

          <div class="relative">
            <select v-model="selectedQuarter" class="appearance-none pl-3 pr-8 py-1.5 text-sm border border-black text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500" style="font-family: Verdana, sans-serif; border-radius: 1px; background-color: silver;">
              <option value="all">All Quarters</option>
              <option v-for="q in QUARTERS" :key="q" :value="q">{{ q }}</option>
            </select>
            <span class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
          </div>

          <div class="relative">
            <select v-model="selectedCategory" class="appearance-none pl-3 pr-8 py-1.5 text-sm border border-black text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500" style="font-family: Verdana, sans-serif; border-radius: 1px; background-color: silver;">
              <option value="all">All Categories</option>
              <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
            </select>
            <span class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
          </div>

          <div class="relative flex-1 min-w-40">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </span>
            <input v-model="searchQuery" type="text" placeholder="Search employee..." class="w-full pl-9 pr-3 py-1.5 text-sm border border-black text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" style="font-family: Verdana, sans-serif; border-radius: 1px; background-color: silver;" />
          </div>
        </div>
      </div>

      <!-- ── Podium ──────────────────────────────────────────────────────── -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 px-6 pt-8 pb-0 mb-4 overflow-hidden">
        <div v-if="podiumSlots.length" class="flex items-end justify-center gap-4">
          <div
            v-for="slot in podiumSlots"
            :key="slot!.rank"
            class="flex flex-col items-center"
            :class="slot!.rank === 1 ? 'w-52' : 'w-40'"
          >
            <div class="flex flex-col items-center mb-3">
              <!-- Avatar -->
              <div class="relative mb-2" :class="slot!.rank === 1 ? 'w-20 h-20' : 'w-14 h-14'">
                <img
                  :src="slot!.user.avatar"
                  :alt="slot!.user.name"
                  class="w-full h-full rounded-full object-cover ring-4 ring-white shadow-md"
                  :onerror="`this.style.display='none';this.nextElementSibling.style.display='flex'`"
                />
                <div
                  class="w-full h-full rounded-full items-center justify-center text-white font-bold ring-4 ring-white shadow-md hidden"
                  :class="slot!.rank === 1 ? 'text-2xl' : 'text-base'"
                  :style="{ backgroundColor: slot!.user.color }"
                >{{ initials(slot!.user.name) }}</div>
                <span
                  class="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-white"
                  :style="{ backgroundColor: PODIUM_CONFIG[slot!.rank].badgeBg }"
                >{{ slot!.rank }}</span>
              </div>

              <p class="font-semibold text-gray-900 text-center" :class="slot!.rank === 1 ? 'text-base' : 'text-sm'">
                {{ slot!.user.name }}
              </p>
              <p class="text-xs text-gray-500 text-center leading-tight">
                {{ slot!.user.title }}<br/>
                <span class="text-gray-400">({{ slot!.user.codes }})</span>
              </p>

              <div
                class="flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-sm font-semibold"
                :class="slot!.rank === 1 ? 'bg-amber-100 text-amber-800' : 'text-gray-700'"
              >
                <svg class="w-4 h-4 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span>{{ slot!.user.score }}</span>
              </div>
            </div>

            <div
              class="w-full rounded-t-xl flex items-center justify-center"
              :style="{ height: PODIUM_CONFIG[slot!.rank].baseH, backgroundColor: PODIUM_CONFIG[slot!.rank].baseColor }"
            >
              <span class="text-5xl font-black opacity-30 select-none" :style="{ color: slot!.rank === 1 ? '#78350F' : '#475569' }">
                {{ slot!.rank }}
              </span>
            </div>
          </div>
        </div>
        <div v-else class="py-12 text-center text-gray-400 text-sm">No results match the current filters.</div>
      </div>

      <!-- ── Ranked list ─────────────────────────────────────────────────── -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div v-if="leaderboard.length === 0" class="py-8 text-center text-gray-400 text-sm">No employees found.</div>

        <template v-for="(entry, idx) in leaderboard" :key="entry.id">
          <div v-if="idx > 0" class="h-px bg-gray-100 mx-4" />

          <!-- Row -->
          <div
            class="flex items-center gap-4 px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
            @click="toggleRow(entry.id)"
          >
            <span class="w-5 text-sm font-semibold text-gray-800 shrink-0 text-center">{{ idx + 1 }}</span>

            <!-- Avatar -->
            <div class="relative w-10 h-10 shrink-0">
              <img
                :src="entry.avatar"
                :alt="entry.name"
                class="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow"
                :onerror="`this.style.display='none';this.nextElementSibling.style.display='flex'`"
              />
              <div
                class="w-10 h-10 rounded-full items-center justify-center text-white text-sm font-bold hidden ring-2 ring-white shadow"
                :style="{ backgroundColor: entry.color }"
              >{{ initials(entry.name) }}</div>
            </div>

            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-gray-900 truncate">{{ entry.name }}</p>
              <p class="text-xs text-gray-500 truncate">
                {{ entry.title }}
                <span class="text-gray-400">({{ entry.codes }})</span>
              </p>
            </div>

            <div class="flex items-center gap-1 text-sm text-gray-500 shrink-0">
              <svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
              <span class="font-medium text-gray-600">{{ entry.count }}</span>
            </div>

            <div class="flex flex-col items-end shrink-0 ml-2">
              <span class="text-[10px] uppercase tracking-wider text-gray-400 font-medium leading-none mb-0.5">Total</span>
              <div class="flex items-center gap-1">
                <svg class="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span class="text-base font-bold text-blue-600">{{ entry.score }}</span>
              </div>
            </div>

            <svg
              class="w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200"
              :class="expandedIds.has(entry.id) ? 'rotate-180' : ''"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/>
            </svg>
          </div>

          <!-- Expanded: individual activities with titles -->
          <div v-if="expandedIds.has(entry.id)" class="border-t border-gray-100 bg-gray-50 px-5 py-4">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Activities</p>
            <div v-if="userActivities(entry.id).length" class="space-y-2">
              <div
                v-for="act in userActivities(entry.id)"
                :key="act.id"
                class="flex items-center gap-3"
              >
                <span
                  class="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  :class="[CATEGORY_STYLE[act.category].bg, CATEGORY_STYLE[act.category].text]"
                >{{ act.category }}</span>
                <span class="flex-1 text-sm text-gray-700 truncate">{{ act.title }}</span>
                <span class="shrink-0 text-sm font-semibold text-blue-600">+{{ act.points }}</span>
              </div>
            </div>
            <p v-else class="text-sm text-gray-400">No activities in this period.</p>
          </div>
        </template>
      </div>

    </div>
  </div>
</template>
