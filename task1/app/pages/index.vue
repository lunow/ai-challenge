<script setup lang="ts">
import { USERS, ACTIVITIES, CATEGORIES, POINTS, AVAILABLE_YEARS } from '~/composables/useDatabase'

const vClickOutside = {
  mounted(el: HTMLElement, binding: { value: () => void }) {
    el._clickOutside = (e: Event) => { if (!el.contains(e.target as Node)) binding.value() }
    document.addEventListener('mousedown', el._clickOutside)
  },
  unmounted(el: HTMLElement) {
    document.removeEventListener('mousedown', el._clickOutside)
  },
}

// ─── Filters ───────────────────────────────────────────────────────────────
const selectedYear     = ref<string>('all')
const selectedQuarter  = ref<string>('all')
const selectedCategory = ref<string>('all')
const searchQuery      = ref('')
const searchFocused    = ref(false)

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

// ─── Custom dropdowns ──────────────────────────────────────────────────────
const openDropdown = ref<string | null>(null)
function toggleDropdown(name: string) {
  openDropdown.value = openDropdown.value === name ? null : name
}
function closeDropdowns() { openDropdown.value = null }

const YEAR_LABELS: Record<string, string> = { all: 'All Years' }
const QUARTER_LABELS: Record<string, string> = { all: 'All Quarters', Q1: 'Q1', Q2: 'Q2', Q3: 'Q3', Q4: 'Q4' }
const CATEGORY_LABELS: Record<string, string> = { all: 'All Categories' }

// ─── Computed leaderboard ──────────────────────────────────────────────────
const filteredActivities = computed(() => {
  return ACTIVITIES.filter(a => {
    if (selectedYear.value !== 'all' && a.year !== Number(selectedYear.value)) return false
    if (selectedQuarter.value !== 'all' && a.quarter !== Number(selectedQuarter.value[1])) return false
    if (selectedCategory.value !== 'all' && a.category !== selectedCategory.value) return false
    return true
  })
})

// Global ranking: year/quarter/category filters applied, search ignored.
// Used for podium and rank numbers.
const globalLeaderboard = computed(() => {
  const scores: Record<string, number> = {}
  const counts: Record<string, number> = {}
  const catCounts: Record<string, Record<string, number>> = {}
  for (const a of filteredActivities.value) {
    scores[a.userId] = (scores[a.userId] ?? 0) + a.points
    counts[a.userId] = (counts[a.userId] ?? 0) + 1
    catCounts[a.userId] ??= {}
    catCounts[a.userId][a.category] = (catCounts[a.userId][a.category] ?? 0) + 1
  }
  return USERS
    .map(u => ({ ...u, score: scores[u.id] ?? 0, count: counts[u.id] ?? 0, catCounts: catCounts[u.id] ?? {} }))
    .sort((a, b) => b.score - a.score)
    .map((u, i) => ({ ...u, globalRank: i + 1 }))
})

// Visible list: search filters globalLeaderboard, preserving global rank numbers.
const leaderboard = computed(() => {
  const query = searchQuery.value.toLowerCase()
  if (!query) return globalLeaderboard.value
  return globalLeaderboard.value.filter(u => u.name.toLowerCase().includes(query))
})

// Podium: global top 3, but only show those visible in the current search.
const podiumSlots = computed(() => {
  const visibleIds = new Set(leaderboard.value.map(u => u.id))
  const [t1, t2, t3] = globalLeaderboard.value.slice(0, 3)
  const first  = t1 && visibleIds.has(t1.id) ? t1 : null
  const second = t2 && visibleIds.has(t2.id) ? t2 : null
  const third  = t3 && visibleIds.has(t3.id) ? t3 : null
  // Desktop layout order: 2nd left, 1st center, 3rd right
  return [
    second ? { user: second, rank: 2 } : null,
    first  ? { user: first,  rank: 1 } : null,
    third  ? { user: third,  rank: 3 } : null,
  ].filter(Boolean)
})

// ─── Expanded rows ─────────────────────────────────────────────────────────
const expandedIds = ref<Set<string>>(new Set())
function toggleRow(id: string) {
  expandedIds.value = expandedIds.value.has(id) ? new Set() : new Set([id])
}

function userActivities(userId: string) {
  return filteredActivities.value.filter(a => a.userId === userId)
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase()
}

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d}-${MONTH_ABBR[m - 1]}-${y}`
}

const PODIUM_CONFIG: Record<number, { baseH: string; baseColor: string; badgeBg: string; ringColor: string }> = {
  1: { baseH: '140px', baseColor: '#F6D860', badgeBg: 'rgb(234,179,8)', ringColor: 'rgb(234,179,8)' },
  2: { baseH: '128px', baseColor: '#D1D9E6', badgeBg: '#64748B', ringColor: '#94A3B8' },
  3: { baseH: '96px',  baseColor: '#D1D9E6', badgeBg: '#92400E', ringColor: '#94A3B8' },
}

const CATEGORY_STYLE: Record<string, { bg: string; text: string }> = {
  'Public Speaking':        { bg: 'bg-blue-100',   text: 'text-blue-700' },
  'Education':              { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  'University Partnership': { bg: 'bg-violet-100',  text: 'text-violet-700' },
}

const CATEGORY_ICON: Record<string, string> = {
  'Public Speaking':        `<rect x="2" y="2" width="20" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="7" y1="9" x2="17" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="12" y1="16" x2="12" y2="20" stroke="currentColor" stroke-width="1.5"/><line x1="7" y1="20" x2="17" y2="20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  'Education':              `<path d="M12 2L1 7.5l11 5.5 11-5.5L12 2z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M5 11v5c0 2 3 4 7 4s7-2 7-4v-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="7.5" x2="1" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  'University Partnership': `<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/><path d="M8.5 15a4 4 0 0 0 7 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
}
</script>

<template>
  <div class="min-h-screen" style="background-color:rgb(248,250,252);padding:24px">
    <div style="max-width:1156px;margin:0 auto">

      <!-- ── Header ──────────────────────────────────────────────────────── -->
      <div class="mb-4">
        <h1 style="font-size:30px;font-weight:700;color:#0f172a;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,'Helvetica Neue',sans-serif;margin:0 0 8px">Leaderboard</h1>
        <p style="font-size:14px;font-weight:400;color:#64748b;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,'Helvetica Neue',sans-serif;margin:0">Top performers based on contributions and activity</p>
      </div>

      <!-- ── Filters ─────────────────────────────────────────────────────── -->
      <div v-click-outside="closeDropdowns" style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1);padding:20px 24px;margin:0 auto 24px;color:#0f172a;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,'Helvetica Neue',sans-serif;font-size:14px;font-weight:400;transition:all .2s">
        <div class="filter-row flex flex-wrap items-center" style="gap:12px">

          <!-- Year -->
          <div class="fd-wrap">
            <button class="fd-trigger filter-control" :class="openDropdown === 'year' && 'fd-trigger--active'" @click="toggleDropdown('year')">
              <span>{{ YEAR_LABELS[selectedYear] ?? selectedYear }}</span>
              <svg class="fd-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <div v-if="openDropdown === 'year'" class="fd-panel">
              <div class="fd-item" :class="selectedYear === 'all' ? 'fd-item--active' : ''" @click="selectedYear = 'all'; closeDropdowns()">All Years</div>
              <div v-for="y in AVAILABLE_YEARS" :key="y" class="fd-item" :class="selectedYear === y ? 'fd-item--active' : ''" @click="selectedYear = y; closeDropdowns()">{{ y }}</div>
            </div>
          </div>

          <!-- Quarter -->
          <div class="fd-wrap">
            <button class="fd-trigger filter-control" :class="openDropdown === 'quarter' && 'fd-trigger--active'" @click="toggleDropdown('quarter')">
              <span>{{ QUARTER_LABELS[selectedQuarter] ?? selectedQuarter }}</span>
              <svg class="fd-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <div v-if="openDropdown === 'quarter'" class="fd-panel">
              <div class="fd-item" :class="selectedQuarter === 'all' ? 'fd-item--active' : ''" @click="selectedQuarter = 'all'; closeDropdowns()">All Quarters</div>
              <div v-for="q in QUARTERS" :key="q" class="fd-item" :class="selectedQuarter === q ? 'fd-item--active' : ''" @click="selectedQuarter = q; closeDropdowns()">{{ q }}</div>
            </div>
          </div>

          <!-- Category -->
          <div class="fd-wrap">
            <button class="fd-trigger filter-control" :class="openDropdown === 'category' && 'fd-trigger--active'" @click="toggleDropdown('category')">
              <span>{{ selectedCategory === 'all' ? 'All Categories' : selectedCategory }}</span>
              <svg class="fd-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <div v-if="openDropdown === 'category'" class="fd-panel">
              <div class="fd-item" :class="selectedCategory === 'all' ? 'fd-item--active' : ''" @click="selectedCategory = 'all'; closeDropdowns()">All Categories</div>
              <div v-for="c in CATEGORIES" :key="c" class="fd-item" :class="selectedCategory === c ? 'fd-item--active' : ''" @click="selectedCategory = c; closeDropdowns()">{{ c }}</div>
            </div>
          </div>

          <!-- Search -->
          <div class="search-wrap flex-1 min-w-40" :class="searchFocused && 'search-wrap--focused'">
            <span class="search-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </span>
            <input v-model="searchQuery" type="text" placeholder="Search employee..." class="filter-control search-input w-full"
              @focus="searchFocused = true" @blur="searchFocused = false" />
            <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''" title="Clear search">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

        </div>
      </div>

      <!-- ── Podium ──────────────────────────────────────────────────────── -->
      <div class="podium-wrapper px-6 pb-0 mb-4" :style="podiumSlots.length ? 'height:546px;padding-top:40px' : 'height:0;overflow:hidden'">
        <div v-if="podiumSlots.length" class="podium-grid flex items-end justify-center gap-6">
          <div
            v-for="slot in podiumSlots"
            :key="slot!.rank"
            class="podium-slot flex flex-col items-center" :class="`podium-slot-${slot!.rank}`" style="width: 280px"
          >
            <div class="flex flex-col items-center mb-3">
              <!-- Avatar -->
              <div
                class="relative mb-3 rounded-full"
                :class="slot!.rank !== 1 ? 'p-1' : ''"
                :style="slot!.rank === 1
                  ? { width: '112px', height: '112px', boxShadow: `0 0 0 4px ${PODIUM_CONFIG[1].ringColor}, 0 4px 12px rgba(0,0,0,0.12)` }
                  : { width: '88px',  height: '88px',  boxShadow: '0 0 0 3px #ffffff, 0 4px 12px rgba(0,0,0,0.12)' }"
              >
                <img
                  :src="slot!.user.avatar"
                  :alt="slot!.user.name"
                  class="w-full h-full rounded-full object-cover"
                  :onerror="`this.style.display='none';this.nextElementSibling.style.display='flex'`"
                />
                <div
                  class="w-full h-full rounded-full items-center justify-center text-white font-bold hidden"
                  :class="slot!.rank === 1 ? 'text-2xl' : 'text-base'"
                  :style="{ backgroundColor: slot!.user.color }"
                >{{ initials(slot!.user.name) }}</div>
                <span
                  class="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white ring-2 ring-white"
                  :style="{ backgroundColor: PODIUM_CONFIG[slot!.rank].badgeBg }"
                >{{ slot!.rank }}</span>
              </div>

              <p style="font-size:20px;font-weight:700;color:#0f172a;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,'Helvetica Neue',sans-serif;margin:0 0 4px;text-align:center">
                {{ slot!.user.name }}
              </p>
              <p style="font-size:14px;font-weight:500;color:#64748b;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,'Helvetica Neue',sans-serif;margin:0 0 8px;text-align:center">
                {{ slot!.user.title }} ({{ slot!.user.codes }})
              </p>

              <div
                class="flex items-center mt-2.5"
                :style="slot!.rank === 1
                  ? { background: '#fef9c3', border: '1px solid #fde047', borderRadius: '20px', boxShadow: '0 1px 2px rgba(0,0,0,.05)', color: '#ca8a04', fontSize: '20px', fontWeight: '700', gap: '6px', padding: '8px 20px' }
                  : { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', boxShadow: '0 1px 2px rgba(0,0,0,.05)', color: '#0ea5e9', fontSize: '18px', fontWeight: '700', gap: '6px', padding: '6px 16px' }"
              >
                <svg
                  :style="slot!.rank === 1 ? { width: '20px', height: '20px', color: '#ca8a04' } : { width: '18px', height: '18px', color: '#0ea5e9' }"
                  viewBox="0 0 24 24" fill="currentColor"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span>{{ slot!.user.score }}</span>
              </div>
            </div>

            <div
              class="w-full flex justify-center overflow-hidden relative items-center"
              :style="slot!.rank === 1
                ? { height: '160px', background: 'linear-gradient(180deg,#fef3c7,#fde68a)', borderRadius: '12px 12px 0 0', borderTop: '2px solid #fde047', boxShadow: 'inset 0 2px 4px rgba(0,0,0,.06)' }
                : { height: PODIUM_CONFIG[slot!.rank].baseH, background: 'linear-gradient(180deg,#f1f5f9,#e2e8f0)', borderRadius: '12px 12px 0 0', borderTop: '2px solid #cbd5e1', boxShadow: 'inset 0 2px 4px rgba(0,0,0,.06)' }"
            >
              <span style="font-size:96px;font-weight:900;color:rgba(148,163,184,0.2);font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,'Helvetica Neue',sans-serif;user-select:none;line-height:1">{{ slot!.rank }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Ranked list ─────────────────────────────────────────────────── -->
      <div class="flex flex-col gap-2">
        <div v-if="leaderboard.length === 0" class="empty-state"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>No activities found matching the current filters.</div>

        <template v-for="entry in leaderboard" :key="entry.id">
          <div class="list-row-card" :class="expandedIds.has(entry.id) ? 'list-row-card--open' : ''">
          <!-- Row -->
          <div class="list-row cursor-pointer" @click="toggleRow(entry.id)">
            <!-- Top: rank + avatar + name + (desktop: cats, score, toggle) -->
            <div class="row-identity flex items-center gap-4">
              <span class="rank-badge shrink-0">{{ entry.globalRank }}</span>

              <!-- Avatar -->
              <div class="relative shrink-0" style="width:56px;height:56px">
                <img
                  :src="entry.avatar"
                  :alt="entry.name"
                  class="rounded-full object-cover ring-2 ring-white shadow"
                  style="width:56px;height:56px"
                  :onerror="`this.style.display='none';this.nextElementSibling.style.display='flex'`"
                />
                <div
                  class="rounded-full items-center justify-center text-white text-sm font-bold hidden ring-2 ring-white shadow"
                  style="width:56px;height:56px"
                  :style="{ backgroundColor: entry.color }"
                >{{ initials(entry.name) }}</div>
              </div>

              <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-900 truncate" style="font-size:18px">{{ entry.name }}</p>
                <p class="truncate" style="font-size:14px;color:#64748b">
                  {{ entry.title }}
                  <span style="color:#94a3b8">({{ entry.codes }})</span>
                </p>
              </div>

              <!-- Desktop-only: categories + separator + score + toggle -->
              <div class="row-desktop flex items-center gap-4 shrink-0">
                <div class="flex items-center justify-end gap-4 shrink-0" style="width:116px">
                  <template v-for="cat in CATEGORIES" :key="cat">
                    <div v-if="entry.catCounts[cat]" class="cat-icon-wrap flex flex-col items-center gap-0.5">
                      <span class="cat-tooltip">{{ cat }}</span>
                      <svg class="category-icon" viewBox="0 0 24 24" v-html="CATEGORY_ICON[cat]"></svg>
                      <span style="font-size:12px;font-weight:600;color:#475569;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,'Helvetica Neue',sans-serif">{{ entry.catCounts[cat] }}</span>
                    </div>
                  </template>
                </div>

                <div class="w-px self-stretch bg-gray-200 shrink-0 mx-1"></div>

                <div class="flex flex-col items-end shrink-0 ml-2">
                  <span class="text-[10px] uppercase tracking-wider text-gray-400 font-medium leading-none mb-0.5">Total</span>
                  <div class="flex items-center gap-1">
                    <svg style="width:24px;height:24px;color:#0ea5e9" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    <span class="font-bold" style="font-size:24px;color:#0ea5e9">{{ entry.score }}</span>
                  </div>
                </div>

                <span class="toggle-btn shrink-0">
                  <svg
                    class="w-5 h-5 transition-transform duration-200"
                    :class="expandedIds.has(entry.id) ? 'rotate-180' : ''"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/>
                  </svg>
                </span>
              </div>
            </div>

            <!-- Mobile-only: divider + categories left + toggle right -->
            <div class="row-mobile">
              <div class="row-divider"></div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <template v-for="cat in CATEGORIES" :key="cat">
                    <div v-if="entry.catCounts[cat]" class="cat-icon-wrap flex flex-col items-center gap-0.5">
                      <svg class="category-icon" viewBox="0 0 24 24" v-html="CATEGORY_ICON[cat]"></svg>
                      <span style="font-size:12px;font-weight:600;color:#475569;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,'Helvetica Neue',sans-serif">{{ entry.catCounts[cat] }}</span>
                    </div>
                  </template>
                </div>
                <span class="toggle-btn shrink-0">
                  <svg
                    class="w-5 h-5 transition-transform duration-200"
                    :class="expandedIds.has(entry.id) ? 'rotate-180' : ''"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/>
                  </svg>
                </span>
              </div>
            </div>
          </div>

          <!-- Expanded: activity table -->
          <div v-if="expandedIds.has(entry.id)" class="activity-panel border-t border-gray-100">
            <p class="activity-panel-title">RECENT ACTIVITIES</p>
            <div v-if="!userActivities(entry.id).length" class="empty-state"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>No activities in this period.</div>
            <div v-else class="table-scroll">
              <table class="activity-table" style="min-width:560px;width:100%">
                <thead>
                  <tr>
                    <th class="act-th">Activity</th>
                    <th class="act-th">Category</th>
                    <th class="act-th">Date</th>
                    <th class="act-th text-right">Points</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="act in userActivities(entry.id)" :key="act.id" class="act-row">
                    <td class="act-td act-title">{{ act.title }}</td>
                    <td class="act-td">
                      <span class="act-category-badge">{{ act.category }}</span>
                    </td>
                    <td class="act-td act-date">{{ formatDate(act.date) }}</td>
                    <td class="act-td act-points text-right">+{{ act.points }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          </div>
        </template>
      </div>

    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  background: #f3f4f6 !important;
  border-radius: 4px !important;
  padding: 14px 20px !important;
  font-size: 14px !important;
  color: #595959 !important;
  font-family: 'Segoe UI', -apple-system, sans-serif !important;
}

.list-row {
  min-height: 96px !important;
  padding: 20px 24px !important;
  color: #0f172a !important;
  font-size: 14px !important;
  font-weight: 400 !important;
  text-align: left !important;
  -webkit-font-smoothing: antialiased !important;
  line-height: inherit !important;
}

.list-row-card {
  background: #fff !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 12px !important;
  box-shadow: 0 1px 3px rgba(0,0,0,.1) !important;
  transition: all .2s !important;
}

.rank-badge {
  color: #94a3b8 !important;
  font-size: 24px !important;
  font-weight: 700 !important;
  min-width: 32px !important;
  text-align: center !important;
}

.activity-panel {
  background: #f8fafc !important;
  padding: 24px !important;
}

.activity-panel-title {
  font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  letter-spacing: 0.05em !important;
  color: #64748b !important;
  margin: 0 0 16px !important;
  text-transform: uppercase !important;
  text-align: left !important;
}

.activity-table {
  border-collapse: collapse !important;
}

.act-th {
  padding: 12px 8px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  color: #64748b !important;
  text-align: left !important;
  background: transparent !important;
  border-bottom: 2px solid #e2e8f0 !important;
}

.act-row {
  background: transparent !important;
  border-bottom: 1px solid #f1f5f9 !important;
}

.act-row:last-child {
  border-bottom: none !important;
}

.act-td {
  padding: 16px 8px !important;
  font-size: 14px !important;
  color: #0f172a !important;
  vertical-align: middle !important;
  border-bottom: 1px solid #e2e8f0 !important;
}

.act-title {
  font-weight: 600 !important;
}

.act-category-badge {
  display: inline-block !important;
  background: #e2e8f0 !important;
  color: #475569 !important;
  border-radius: 6px !important;
  padding: 4px 10px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  white-space: nowrap !important;
}

.act-date {
  color: #64748b !important;
  white-space: nowrap !important;
}

.act-points {
  color: #0ea5e9 !important;
  font-weight: 700 !important;
  white-space: nowrap !important;
}

.cat-icon-wrap {
  position: relative !important;
  overflow: visible !important;
}

.cat-tooltip {
  display: block !important;
  position: absolute !important;
  bottom: calc(100% + 8px) !important;
  left: 50% !important;
  top: auto !important;
  right: auto !important;
  transform: translateX(-50%) !important;
  background: #ffffff !important;
  color: #0f172a !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  white-space: nowrap !important;
  width: auto !important;
  height: auto !important;
  min-width: unset !important;
  min-height: unset !important;
  margin: 0 !important;
  padding: 5px 10px !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 6px !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12) !important;
  pointer-events: none !important;
  opacity: 0 !important;
  overflow: visible !important;
  transition: opacity .15s !important;
  z-index: 100 !important;
  clip: auto !important;
  clip-path: none !important;
  line-height: 1.4 !important;
}

.cat-tooltip::after {
  content: '' !important;
  position: absolute !important;
  top: 100% !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  border: 5px solid transparent !important;
  border-top-color: #ffffff !important;
  width: 0 !important;
  height: 0 !important;
}

.cat-icon-wrap:hover .cat-tooltip {
  opacity: 1 !important;
}

.category-icon {
  display: inline-block !important;
  color: #0ea5e9 !important;
  width: 20px !important;
  height: 20px !important;
  flex-shrink: 0 !important;
}

.toggle-btn {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: #f1f5f9 !important;
  border: none !important;
  border-radius: 50% !important;
  color: #0ea5e9 !important;
  cursor: pointer !important;
  padding: 8px !important;
  transition: background .2s !important;
}

.toggle-btn:hover {
  background: #e2e8f0 !important;
}

.list-row-card--open {
  border-color: #0ea5e9 !important;
  box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2), 0 1px 3px rgba(0,0,0,.1) !important;
}

.list-row-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,.12) !important;
}

.search-wrap {
  position: relative !important;
  display: flex !important;
  align-items: center !important;
}

.search-icon {
  position: absolute !important;
  left: 6px !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  color: rgb(100, 100, 100) !important;
  pointer-events: none !important;
  width: 14px !important;
  overflow: hidden !important;
  opacity: 1 !important;
  transition: width 0.25s ease, opacity 0.2s ease !important;
  display: flex !important;
  align-items: center !important;
}

.search-wrap .filter-control {
  padding-left: 26px !important;
  transition: padding-left 0.25s ease !important;
}

.search-wrap--focused .search-icon {
  width: 0 !important;
  opacity: 0 !important;
}

.search-wrap--focused .filter-control {
  padding-left: 4px !important;
  border-color: #000000 !important;
  outline: none !important;
}

.search-clear {
  position: absolute !important;
  right: 1px !important;
  top: 1px !important;
  bottom: 1px !important;
  background: transparent !important;
  border: none !important;
  padding: 0 8px !important;
  cursor: pointer !important;
  color: rgb(100, 100, 100) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 0 !important;
}

.search-clear:hover {
  background: #ffffff !important;
  color: #000 !important;
}

.fd-wrap {
  position: relative !important;
}

.fd-trigger {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 8px !important;
  cursor: pointer !important;
  white-space: nowrap !important;
  padding: 0 8px !important;
  min-width: 120px !important;
}

.fd-trigger--active {
  border: 3px solid #000000 !important;
}

.fd-arrow {
  width: 16px !important;
  height: 16px !important;
  color: rgb(80, 80, 80) !important;
  flex-shrink: 0 !important;
}

.fd-panel {
  position: absolute !important;
  top: calc(100% + 2px) !important;
  left: 0 !important;
  min-width: 100% !important;
  background: #ffffff !important;
  border: 1px solid rgb(210, 210, 210) !important;
  border-radius: 2px !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12) !important;
  z-index: 200 !important;
  overflow: hidden !important;
}

.fd-item {
  padding: 10px 16px !important;
  font-size: 14px !important;
  font-family: 'Segoe UI', -apple-system, sans-serif !important;
  color: #000000 !important;
  background: #f0f0f0 !important;
  cursor: pointer !important;
  user-select: none !important;
}

.fd-item:hover {
  background: #ffffff !important;
}

.fd-item--active {
  background: #f0f0f0 !important;
}

.fd-item--active:hover {
  background: #ffffff !important;
}

.filter-control {
  font-family: 'Segoe UI', 'Segoe UI Web (West European)', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif !important;
  font-size: 14px !important;
  font-weight: 400 !important;
  color: rgb(0, 0, 0) !important;
  background-color: rgb(235, 235, 237) !important;
  border: 1px solid rgb(55, 55, 55) !important;
  border-radius: 2px !important;
  height: 32px !important;
  padding: 1px 0 1px 4px !important;
  box-shadow: none !important;
  margin: 0 !important;
  box-sizing: border-box !important;
  -webkit-font-smoothing: antialiased !important;
}

.table-scroll {
  overflow-x: auto !important;
  -webkit-overflow-scrolling: touch !important;
}

/* Desktop defaults for mobile-only elements */
.row-mobile {
  display: none !important;
}

@media (max-width: 640px) {
  /* Filters: stack vertically */
  .filter-row {
    flex-direction: column !important;
    align-items: flex-start !important;
  }
  .search-wrap {
    width: 100% !important;
    min-width: unset !important;
  }

  /* Podium: stack vertically, order 1-2-3 */
  .podium-wrapper {
    height: auto !important;
    padding: 24px 0 0 !important;
  }
  .podium-grid {
    flex-direction: column !important;
    align-items: center !important;
  }
  .podium-slot {
    width: 100% !important;
    max-width: 320px !important;
  }
  .podium-slot-1 { order: 1 !important; }
  .podium-slot-2 { order: 2 !important; }
  .podium-slot-3 { order: 3 !important; }

  /* List row: column layout */
  .list-row {
    padding: 16px !important;
    min-height: unset !important;
  }
  .row-desktop {
    display: none !important;
  }
  .row-mobile {
    display: block !important;
  }
  .row-divider {
    height: 1px !important;
    background: #e2e8f0 !important;
    margin: 12px 0 !important;
  }
}
</style>
