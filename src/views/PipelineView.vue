<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
      <h2 class="text-xl sm:text-2xl font-semibold text-text">Pipeline</h2>
      <div class="flex items-center gap-2 sm:gap-2">
        <button
          class="flex-1 sm:flex-none btn-secondary"
          @click="handleExportProducts"
        >
          Export Products
        </button>
        <button
          class="flex-1 sm:flex-none btn-secondary"
          @click="showBulkImport = true"
        >
          Bulk Import
        </button>
        <button
          class="flex-1 sm:flex-none btn-accent"
          @click="showBulkEdit = true"
        >
          Bulk Edit
        </button>
        <button
          class="flex-1 sm:flex-none btn-primary"
          @click="showAddProduct = true"
        >
          Add Product
        </button>
      </div>
    </div>

    <StatsBar 
      :products="filteredProducts" 
      :cleanup-count="productsLaunchingToday.length"
      :on-cleanup-click="() => showCleanupModal = true"
    />

    <!-- Mobile: Combined Tabs, Search, and Column Container with lighter green background -->
    <div v-if="!loading && (filteredProducts.length > 0 || hasActiveFilters)" class="sm:hidden -mx-6 py-2 bg-bg">
      <div class="bg-bg overflow-hidden">
        <!-- Tabs -->
        <div class="flex gap-px overflow-x-auto scrollbar-hide border-b border-border mb-1 bg-border">
          <button
            v-for="columnId in PIPELINE_BOARD_COLUMNS"
            :key="columnId"
            type="button"
            class="flex-shrink-0 px-2.5 py-2.5 text-xs font-medium transition-colors relative min-w-[4.5rem]"
            :class="
              selectedColumn === columnId
                ? 'text-text'
                : 'bg-white text-muted hover:text-text'
            "
            :style="selectedColumn === columnId ? { backgroundColor: hexToRgba(columnColor(columnId), 0.25) } : {}"
            @click="selectedColumn = columnId"
          >
            <div class="flex items-center justify-center gap-1">
              <span class="text-center leading-tight whitespace-nowrap text-xs font-medium">{{ PIPELINE_COLUMN_LABELS[columnId] }}</span>
              <span
                class="px-1 py-0.5 text-[10px] rounded flex-shrink-0"
                :class="selectedColumn === columnId ? 'bg-indigo-100 text-indigo-700' : 'bg-bg text-muted'"
              >
                {{ getColumnProductCount(columnId) }}
              </span>
            </div>
            <div
              class="absolute bottom-0 left-0 right-0 h-1 transition-colors"
              :style="{ backgroundColor: selectedColumn === columnId ? columnColor(columnId) : 'transparent' }"
            ></div>
          </button>
        </div>
        
        <!-- Search Bar -->
        <div class="p-2 border-b border-border mb-3 bg-bg">
          <div class="flex items-center gap-3">
            <div class="relative flex-1 min-w-0">
              <input
                v-model="searchQuery"
                type="text"
                :placeholder="searchType === 'name' ? 'Search by product name...' : 'Search by SKU...'"
                class="w-full px-3 py-2 pl-9 pr-24 bg-card border border-border rounded-md text-text text-sm placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <svg
                class="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <!-- Name/SKU Toggle inside search field -->
              <div class="absolute right-1 top-1/2 -translate-y-1/2 flex items-center border border-border rounded p-0.5 bg-card">
                <button
                  type="button"
                  class="px-2 py-0.5 text-xs font-medium rounded transition-colors"
                  :class="
                    searchType === 'name'
                      ? 'bg-indigo-600 text-white'
                      : 'text-muted hover:text-text'
                  "
                  @click.stop="searchType = 'name'"
                >
                  Name
                </button>
                <button
                  type="button"
                  class="px-2 py-0.5 text-xs font-medium rounded transition-colors"
                  :class="
                    searchType === 'sku'
                      ? 'bg-indigo-600 text-white'
                      : 'text-muted hover:text-text'
                  "
                  @click.stop="searchType = 'sku'"
                >
                  SKU
                </button>
              </div>
            </div>
            <!-- Gender Filter Toggle -->
            <div class="flex items-center gap-1 px-2 py-2 border border-border rounded-md bg-card flex-shrink-0">
              <button
                v-for="option in genderFilterOptions"
                :key="option.value"
                type="button"
                class="px-2 py-1 text-xs font-medium rounded transition-colors"
                :class="
                  filterGender === option.value
                    ? 'bg-indigo-600 text-white'
                    : 'text-muted hover:text-text hover:bg-bg'
                "
                @click="filterGender = option.value as 'all' | 'mens' | 'womens'"
              >
                {{ option.label }}
              </button>
            </div>
            <button
              v-if="noGoLiveDateCount > 0"
              type="button"
              class="flex items-center gap-1 px-2 py-2 text-xs font-medium border rounded-md transition-colors flex-shrink-0"
              :class="
                showOnlyNoGoLiveDate
                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                  : 'text-muted border-border bg-card hover:bg-bg'
              "
              :aria-pressed="showOnlyNoGoLiveDate"
              @click="toggleNoGoLiveDateFilter"
            >
              No date
              <span class="tabular-nums">{{ noGoLiveDateCount }}</span>
            </button>
            <button
              v-if="pastExFactoryCount > 0"
              type="button"
              class="flex items-center gap-1 px-2 py-2 text-xs font-medium border rounded-md transition-colors flex-shrink-0"
              :class="
                showOnlyPastExFactory
                  ? 'bg-orange-100 border-orange-300 text-orange-900'
                  : 'text-muted border-border bg-card hover:bg-bg'
              "
              :aria-pressed="showOnlyPastExFactory"
              @click="togglePastExFactoryFilter"
            >
              Past ex-factory
              <span class="tabular-nums">{{ pastExFactoryCount }}</span>
            </button>
            <button
              class="flex items-center gap-2 px-3 py-2 text-sm text-muted hover:text-text border border-border rounded-md bg-card hover:bg-bg transition-colors flex-shrink-0"
              @click="filtersExpanded = true"
              aria-label="Show filters"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span v-if="getActiveFilterCount > 0" class="px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded">
                {{ getActiveFilterCount }}
              </span>
            </button>
            <button
              class="flex items-center gap-1.5 px-2.5 py-2 text-sm text-muted hover:text-text border border-border rounded-md bg-card hover:bg-bg transition-colors flex-shrink-0"
              @click="condensed = !condensed"
              :aria-pressed="condensed"
              aria-label="Toggle condensed view"
              title="Condensed View"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Column Content -->
        <div class="px-0 pb-4">
          <PipelineColumn
            :column-id="selectedColumn"
            :condensed="condensed"
            :products="getProductsByColumn(selectedColumn)"
            :color="columnColor(selectedColumn)"
            :show-images="showImages"
            @drop="handleColumnDrop"
            @product-click="handleProductClick"
            @archive="handleArchiveProduct"
          />
        </div>
      </div>
    </div>

    <!-- Desktop: Separate Search/Filters -->
    <div class="hidden sm:block bg-bg rounded-lg mb-4">
      <!-- Collapsed View: Just Product Name Search -->
      <div v-if="!filtersExpanded" class="py-3">
        <div class="flex items-center gap-3">
          <div class="relative flex-1 min-w-0">
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="searchType === 'name' ? 'Search by product name...' : 'Search by SKU...'"
              class="w-full px-3 py-2 pl-9 pr-24 bg-card border border-border rounded-md text-text text-sm placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <svg
              class="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <!-- Name/SKU Toggle inside search field -->
            <div class="absolute right-1 top-1/2 -translate-y-1/2 flex items-center border border-border rounded p-0.5 bg-card">
              <button
                type="button"
                class="px-2 py-0.5 text-xs font-medium rounded transition-colors"
                :class="
                  searchType === 'name'
                    ? 'bg-indigo-600 text-white'
                    : 'text-muted hover:text-text'
                "
                @click.stop="searchType = 'name'"
              >
                Name
              </button>
              <button
                type="button"
                class="px-2 py-0.5 text-xs font-medium rounded transition-colors"
                :class="
                  searchType === 'sku'
                    ? 'bg-indigo-600 text-white'
                    : 'text-muted hover:text-text'
                "
                @click.stop="searchType = 'sku'"
              >
                SKU
              </button>
            </div>
          </div>
          <!-- Gender Filter Toggle -->
          <div class="flex items-center gap-1 px-2 py-1.5 border border-border rounded-md bg-card flex-shrink-0">
            <button
              v-for="option in genderFilterOptions"
              :key="option.value"
              type="button"
              class="px-2 py-0.5 text-xs font-medium rounded transition-colors"
              :class="
                filterGender === option.value
                  ? 'bg-indigo-600 text-white'
                  : 'text-muted hover:text-text hover:bg-bg'
              "
              @click="filterGender = option.value as 'all' | 'mens' | 'womens'"
            >
              {{ option.label }}
            </button>
          </div>
          <button
            v-if="noGoLiveDateCount > 0"
            type="button"
            class="flex items-center gap-1.5 px-2.5 py-2 text-sm border rounded-md transition-colors flex-shrink-0"
            :class="
              showOnlyNoGoLiveDate
                ? 'bg-amber-100 border-amber-300 text-amber-900'
                : 'text-muted border-border bg-card hover:bg-bg hover:text-text'
            "
            :aria-pressed="showOnlyNoGoLiveDate"
            @click="toggleNoGoLiveDateFilter"
          >
            No live date
            <span
              class="px-1.5 py-0.5 text-xs font-semibold rounded tabular-nums"
              :class="showOnlyNoGoLiveDate ? 'bg-amber-200 text-amber-900' : 'bg-bg text-muted'"
            >
              {{ noGoLiveDateCount }}
            </span>
          </button>
          <button
            v-if="pastExFactoryCount > 0"
            type="button"
            class="flex items-center gap-1.5 px-2.5 py-2 text-sm border rounded-md transition-colors flex-shrink-0"
            :class="
              showOnlyPastExFactory
                ? 'bg-orange-100 border-orange-300 text-orange-900'
                : 'text-muted border-border bg-card hover:bg-bg hover:text-text'
            "
            :aria-pressed="showOnlyPastExFactory"
            @click="togglePastExFactoryFilter"
          >
            Past ex-factory
            <span
              class="px-1.5 py-0.5 text-xs font-semibold rounded tabular-nums"
              :class="showOnlyPastExFactory ? 'bg-orange-200 text-orange-900' : 'bg-bg text-muted'"
            >
              {{ pastExFactoryCount }}
            </span>
          </button>
          <button
            class="flex items-center gap-2 px-3 py-2 text-sm text-muted hover:text-text border border-border rounded-md hover:bg-bg transition-colors"
            @click="filtersExpanded = true"
            aria-label="Show filters"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span class="hidden sm:inline">Filters</span>
            <span v-if="hasActiveFilters" class="px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded">
              {{ getActiveFilterCount }}
            </span>
          </button>
          <button
            class="flex items-center gap-1.5 px-2.5 py-2 text-sm text-muted hover:text-text border border-border rounded-md hover:bg-bg transition-colors"
            :class="{ 'bg-indigo-50 border-indigo-300 text-indigo-700': condensed }"
            @click="condensed = !condensed"
            :aria-pressed="condensed"
            aria-label="Toggle condensed view"
            title="Condensed View"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Expanded View -->
      <div v-else class="py-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-text">Filters & View Options</h3>
          <div class="flex items-center space-x-2">
            <button
              v-if="hasActiveFilters"
              class="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              @click="clearFilters"
            >
              Clear All
            </button>
            <button
              class="p-1.5 text-muted hover:text-text transition-colors"
              @click="filtersExpanded = false"
              aria-label="Collapse filters"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Search Bar in Expanded View -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-text mb-2">Search Products</label>
          <div class="flex items-center gap-2">
            <div class="relative flex-1">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search by product name..."
                class="w-full px-3 py-2 pl-9 bg-card border border-border rounded-md text-text text-sm placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <svg
                class="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div class="flex items-center border border-border rounded-md p-0.5 bg-card flex-shrink-0">
              <button
                type="button"
                class="px-3 py-1.5 text-xs font-medium rounded transition-colors"
                :class="
                  searchType === 'name'
                    ? 'bg-indigo-600 text-white'
                    : 'text-muted hover:text-text'
                "
                @click="searchType = 'name'"
              >
                Name
              </button>
              <button
                type="button"
                class="px-3 py-1.5 text-xs font-medium rounded transition-colors"
                :class="
                  searchType === 'sku'
                    ? 'bg-indigo-600 text-white'
                    : 'text-muted hover:text-text'
                "
                @click="searchType = 'sku'"
              >
                SKU
              </button>
            </div>
          </div>
        </div>

        <!-- Show Archived Toggle -->
        <div class="mb-4 flex items-center justify-between p-3 bg-card border border-border rounded-md">
          <div>
            <label class="block text-sm font-medium text-text mb-0.5">Show Archived Products</label>
            <p class="text-xs text-muted">Display products that have been archived</p>
          </div>
          <button
            type="button"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            :class="showArchived ? 'bg-indigo-600' : 'bg-gray-300'"
            @click="showArchived = !showArchived"
            :aria-pressed="showArchived"
            role="switch"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
              :class="showArchived ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label class="block text-xs font-medium text-muted mb-1.5">Product Name</label>
            <select
              v-model="filterProductName"
              class="w-full px-3 py-2 bg-card border border-border rounded-md text-text text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Products</option>
              <option v-for="name in uniqueProductNames" :key="name" :value="name">
                {{ name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-muted mb-1.5">Collection</label>
            <select
              v-model="filterProjectId"
              class="w-full px-3 py-2 bg-card border border-border rounded-md text-text text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Collections</option>
              <option v-for="project in projects" :key="project.id" :value="project.id">
                {{ project.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-muted mb-1.5">Season</label>
            <select
              v-model="filterSeason"
              class="w-full px-3 py-2 bg-card border border-border rounded-md text-text text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Seasons</option>
              <option value="pre-spring">Pre-Spring</option>
              <option value="spring">Spring</option>
              <option value="summer">Summer</option>
              <option value="fall">Fall</option>
              <option value="winter">Winter</option>
              <option value="holiday">Holiday</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-muted mb-1.5">Gender</label>
            <select
              v-model="filterGender"
              class="w-full px-3 py-2 bg-card border border-border rounded-md text-text text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Genders</option>
              <option value="mens">Mens</option>
              <option value="womens">Womens</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-muted mb-1.5">Priority</label>
            <select
              v-model="filterPriority"
              class="w-full px-3 py-2 bg-card border border-border rounded-md text-text text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-muted mb-1.5">Status</label>
            <select
              v-model="filterStatus"
              class="w-full px-3 py-2 bg-card border border-border rounded-md text-text text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="on-time">On Time</option>
              <option value="delayed">Delayed</option>
              <option value="complete">Complete</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-muted mb-1.5">Shoot Status</label>
            <select
              v-model="filterShootStatus"
              class="w-full px-3 py-2 bg-card border border-border rounded-md text-text text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="rescheduled">Rescheduled</option>
              <option value="cancelled">Cancelled</option>
              <option value="no-date">No Date Set</option>
            </select>
          </div>

          <div class="col-span-2">
            <label class="block text-xs font-medium text-muted mb-1.5">Stage</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="stage in PIPELINE_STAGES"
                :key="stage"
                type="button"
                class="px-2.5 py-1.5 text-xs font-medium rounded border transition-colors"
                :class="filterStages.includes(stage)
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-card text-text border-border hover:bg-bg'"
                @click="toggleStageFilter(stage)"
              >
                {{ STAGE_LABELS[stage] }}
              </button>
            </div>
          </div>

          <div class="col-span-2">
            <label class="block text-xs font-medium text-muted mb-1.5">Go Live Date</label>
            <div class="flex items-center gap-2 mb-2">
              <div class="flex-1">
                <label class="block text-xs text-muted mb-1">From</label>
                <input
                  v-model="filterDateFrom"
                  type="date"
                  class="w-full px-3 py-2 bg-card border border-border rounded-md text-text text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div class="flex-1">
                <label class="block text-xs text-muted mb-1">To</label>
                <input
                  v-model="filterDateTo"
                  type="date"
                  class="w-full px-3 py-2 bg-card border border-border rounded-md text-text text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium text-muted hover:text-text border border-border rounded-md hover:bg-bg transition-colors"
                @click="setQuickDateFilter('today')"
              >
                Today
              </button>
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium text-muted hover:text-text border border-border rounded-md hover:bg-bg transition-colors"
                @click="setQuickDateFilter('tomorrow')"
              >
                Tomorrow
              </button>
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium text-muted hover:text-text border border-border rounded-md hover:bg-bg transition-colors"
                @click="setQuickDateFilter('nextWeek')"
              >
                Next Week
              </button>
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium text-muted hover:text-text border border-border rounded-md hover:bg-bg transition-colors"
                @click="setQuickDateFilter('thisMonth')"
              >
                This Month
              </button>
              <button
                v-if="noGoLiveDateCount > 0"
                type="button"
                class="px-2.5 py-1 text-xs font-medium border rounded-md transition-colors"
                :class="
                  showOnlyNoGoLiveDate
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'text-muted border-border hover:bg-bg hover:text-text'
                "
                :aria-pressed="showOnlyNoGoLiveDate"
                @click="toggleNoGoLiveDateFilter"
              >
                No live date ({{ noGoLiveDateCount }})
              </button>
              <button
                v-if="pastExFactoryCount > 0"
                type="button"
                class="px-2.5 py-1 text-xs font-medium border rounded-md transition-colors"
                :class="
                  showOnlyPastExFactory
                    ? 'bg-orange-100 text-orange-900 border-orange-300'
                    : 'text-muted border-border hover:bg-bg hover:text-text'
                "
                :aria-pressed="showOnlyPastExFactory"
                @click="togglePastExFactoryFilter"
              >
                Past ex-factory ({{ pastExFactoryCount }})
              </button>
            </div>
          </div>

          <div class="col-span-2">
            <label class="block text-xs font-medium text-muted mb-1.5">Factory</label>
            <p class="text-xs text-muted mb-2">
              <strong class="text-text">Past ex-factory</strong> = still in In Production, date passed, not in Factory shipped.
              Drag to <strong class="text-text">Factory shipped</strong> to set the ship date (today).
            </p>
          </div>
        </div>

        <div class="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <div class="flex items-center space-x-6">
            <div class="flex items-center space-x-3">
              <span class="text-sm font-medium text-text">Show Images</span>
              <button
                type="button"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                :class="showImages ? 'bg-indigo-600' : 'bg-gray-300'"
                @click="showImages = !showImages"
                :aria-pressed="showImages"
                role="switch"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  :class="showImages ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>
            <div class="flex items-center space-x-3">
              <span class="text-sm font-medium text-text">Condensed View</span>
              <button
                type="button"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                :class="condensed ? 'bg-indigo-600' : 'bg-gray-300'"
                @click="condensed = !condensed"
                :aria-pressed="condensed"
                role="switch"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  :class="condensed ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <label class="text-sm font-medium text-text">Sort by:</label>
            <select
              v-model="sortBy"
              class="px-3 py-1.5 bg-card border border-border rounded-md text-text text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="priority">Priority</option>
              <option value="goLiveDate">Go Live Date</option>
              <option value="name">Name</option>
              <option value="createdAt">Created Date</option>
            </select>
            <button
              type="button"
              class="p-1.5 text-muted hover:text-text transition-colors"
              @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
              :aria-label="`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`"
            >
              <svg
                class="w-4 h-4 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                :class="{ 'rotate-180': sortOrder === 'desc' }"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="py-12">
      <LoadingSpinner />
    </div>

    <!-- Show empty state only if no filters are active and no products -->
    <div v-else-if="filteredProducts.length === 0 && !hasActiveFilters" class="py-12">
      <EmptyState
        title="No products in pipeline"
        description="Add your first product to get started with tracking your merchandising pipeline."
      >
        <template #action>
          <button
            class="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
            @click="showAddProduct = true"
          >
            Add Product
          </button>
        </template>
      </EmptyState>
    </div>

    <!-- Desktop: Full Board View (show even if empty when filters are active) -->
    <div v-else-if="!loading" class="hidden sm:block">
      <PipelineBoard
        :products="filteredProducts"
        :show-images="showImages"
        :condensed="condensed"
        @column-drop="handleColumnDrop"
        @product-click="handleProductClick"
        @archive="handleArchiveProduct"
        @combine-skus="handleCombineSKUs"
      />
    </div>


    <Modal :is-open="showAddProduct" title="Add Product" size="3xl" @close="showAddProduct = false">
      <ProductForm
        ref="productFormRef"
        :brand-id="brandId"
        @save="handleCreateProduct"
        @cancel="showAddProduct = false"
      />
      <template #footer>
        <button
          class="w-full sm:w-auto px-4 py-2.5 border border-border rounded-md text-sm font-medium text-text hover:bg-bg transition-colors"
          @click="showAddProduct = false"
        >
          Cancel
        </button>
        <button
          class="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
          @click="productFormRef?.submit()"
        >
          Create Product
        </button>
      </template>
    </Modal>

    <Modal :is-open="showEditProduct" title="Edit Product" size="3xl" @close="showEditProduct = false">
      <ProductForm
        v-if="selectedProduct"
        ref="editProductFormRef"
        :product="selectedProduct"
        :brand-id="brandId"
        @save="handleUpdateProduct"
        @cancel="showEditProduct = false"
        @delete="handleDeleteProduct"
      />
      <template #footer>
        <button
          v-if="selectedProduct"
          class="w-full sm:w-auto px-4 py-2.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
          @click="editProductFormRef?.handleDelete()"
        >
          Delete
        </button>
        <div class="flex gap-2 ml-auto">
          <button
            class="w-full sm:w-auto px-4 py-2.5 border border-border rounded-md text-sm font-medium text-text hover:bg-bg transition-colors"
            @click="showEditProduct = false"
          >
            Cancel
          </button>
          <button
            class="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
            @click="editProductFormRef?.submit()"
          >
            Save Changes
          </button>
        </div>
      </template>
    </Modal>

    <ProductDetail
      :product="selectedProduct"
      :is-open="showProductDetail"
      :all-products="products"
      @close="showProductDetail = false"
      @edit="handleEditProduct"
      @delete="handleDeleteProduct"
      @stage-changed="handleStageChanged"
      @product-created="handleProductCreated"
      @open-product="handleOpenProduct"
    />

    <!-- Cleanup Modal -->
    <CleanupModal
      :is-open="showCleanupModal"
      :products="productsLaunchingToday"
      @update:is-open="showCleanupModal = $event"
      @save="handleCleanupSave"
    />

    <!-- Combine SKUs Modal -->
    <Modal
      :is-open="showCombineSKUsModal"
      title="Combine Products by SKU"
      size="lg"
      @close="showCombineSKUsModal = false"
    >
      <div class="space-y-6">
        <p class="text-sm text-text">
          The following products can be combined by SKU. Select a go live date for each group and confirm individually.
        </p>
        
        <div
          v-for="(group, groupIndex) in combineSKUGroups"
          :key="group.sku"
          class="border border-border rounded-lg p-4 space-y-3"
        >
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-sm font-semibold text-text">SKU: {{ group.sku }}</h4>
              <p class="text-xs text-muted mt-0.5">
                {{ getIncludedProductsCount(group) }} of {{ group.products.length }} product{{ group.products.length !== 1 ? 's' : '' }} to combine
              </p>
            </div>
            <span
              v-if="group.combined"
              class="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded"
            >
              Combined
            </span>
          </div>

          <!-- Product List -->
          <div class="space-y-1.5">
            <div
              v-for="product in group.products"
              :key="product.id"
              class="text-xs text-text bg-bg p-2 rounded border border-border flex items-start justify-between gap-2"
              :class="{ 'opacity-50 line-through': group.excludedProductIds.has(product.id) }"
            >
              <div class="flex-1">
                <div class="font-medium">{{ product.name }}</div>
                <div class="text-muted mt-0.5">
                  Go Live: {{ productHasGoLiveDate(product) ? formatDate(product.goLiveDate!) : '—' }}
                  <span v-if="product.colors && product.colors.length > 0" class="ml-2">
                    ({{ product.colors.length }} color{{ product.colors.length !== 1 ? 's' : '' }})
                  </span>
                </div>
              </div>
              <button
                v-if="!group.combined"
                type="button"
                class="flex-shrink-0 text-muted hover:text-red-600 transition-colors"
                @click="toggleExcludeProduct(groupIndex, product.id)"
                :title="group.excludedProductIds.has(product.id) ? 'Include product' : 'Exclude product'"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <!-- Date Selection (if multiple dates) -->
          <div v-if="group.hasDateConflict && !group.combined && getIncludedProductsCount(group) >= 2">
            <label class="block text-xs font-medium text-muted mb-2">
              Select Go Live Date (products have different dates):
            </label>
            <div class="space-y-1.5">
              <label
                v-for="(date, dateIndex) in group.uniqueDates"
                :key="dateIndex"
                class="flex items-center gap-2 p-2 border border-border rounded cursor-pointer hover:bg-bg transition-colors text-xs"
                :class="{ 'bg-indigo-50 border-indigo-300': group.selectedDate && group.selectedDate.toMillis() === date.toMillis() }"
              >
                <input
                  type="radio"
                  :checked="!!(group.selectedDate && group.selectedDate.toMillis() === date.toMillis())"
                  class="text-indigo-600"
                  @change="group.selectedDate = date"
                />
                <span class="text-text">{{ formatDate(date) }}</span>
              </label>
            </div>
          </div>
          <div v-else-if="!group.combined && getIncludedProductsCount(group) >= 2 && getIncludedProducts(group)[0]?.goLiveDate" class="text-xs text-muted">
            Go Live Date: {{ formatDate(getIncludedProducts(group)[0]!.goLiveDate!) }}
          </div>

          <!-- Combined Colors Preview -->
          <div v-if="group.mergedColors.length > 0" class="text-xs">
            <span class="font-medium text-muted">Combined colors:</span>
            <span class="text-text ml-1">
              {{ group.mergedColors.map((c: ProductColor) => c.name).join(', ') }}
            </span>
          </div>

          <!-- Confirm Button -->
          <button
            v-if="!group.combined"
            type="button"
            class="w-full px-3 py-2 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="(group.hasDateConflict && !group.selectedDate) || getIncludedProductsCount(group) < 2"
            @click="confirmCombineSKUGroup(groupIndex)"
          >
            Combine {{ group.sku }} ({{ getIncludedProductsCount(group) }} product{{ getIncludedProductsCount(group) !== 1 ? 's' : '' }})
          </button>
        </div>
      </div>
      <template #footer>
        <button
          class="w-full sm:w-auto px-4 py-2.5 border border-border rounded-md text-sm font-medium text-text hover:bg-bg transition-colors"
          @click="showCombineSKUsModal = false"
        >
          Close
        </button>
      </template>
    </Modal>

    <BulkImportModal
      :is-open="showBulkImport"
      :brand-id="brandId"
      @close="showBulkImport = false"
      @imported="handleBulkImported"
    />

    <BulkEditModal
      :is-open="showBulkEdit"
      :products="filteredProducts"
      @close="showBulkEdit = false"
      @save="handleBulkEdit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useBrandStore } from '@/stores/brand'
import { useAuthStore } from '@/stores/auth'
import { useProducts } from '@/composables/useProducts'
import { useProject } from '@/composables/useProject'
import { useToast } from '@/composables/useToast'
import { awardBulkEditPoints } from '@/services/rewardsService'
import PipelineBoard from '@/components/pipeline/PipelineBoard.vue'
import PipelineColumn from '@/components/pipeline/PipelineColumn.vue'
import ProductForm from '@/components/product/ProductForm.vue'
import ProductDetail from '@/components/product/ProductDetail.vue'
import BulkImportModal from '@/components/product/BulkImportModal.vue'
import BulkEditModal from '@/components/product/BulkEditModal.vue'
import CleanupModal from '@/components/product/CleanupModal.vue'
import StatsBar from '@/components/dashboard/StatsBar.vue'
import Modal from '@/components/common/Modal.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { Product, Project, ProductColor } from '@/types'
import { PIPELINE_STAGES, STAGE_LABELS } from '@/types'
import {
  formatDate,
  productHasGoLiveDate,
  isPastExFactoryAwaitingShip,
  dateInputValueToTimestamp,
  timestampToDateInputValue,
} from '@/utils/dates'
import {
  FACTORY_SHIPPED_COLUMN,
  PIPELINE_BOARD_COLUMNS,
  PIPELINE_COLUMN_LABELS,
  columnColor,
  productBelongsInColumn,
  productBelongsInShippedColumn,
  type PipelineColumnId,
} from '@/constants/pipeline'
import { Timestamp } from 'firebase/firestore'
import { deleteDoc } from '@/firebase/firestore'
import { exportProductsToCSV } from '@/utils/csv'

const brandStore = useBrandStore()
const authStore = useAuthStore()
const { products, loading, fetchProducts, createProduct, updateProduct, updateStage, archiveProduct, unarchiveProduct } = useProducts()
const { projects, fetchProjects } = useProject()
const toast = useToast()

const brandId = computed(() => brandStore.brandId || '')
const filtersExpanded = ref(false)
const filterProductName = ref('')
const filterProjectId = ref('')
const filterSeason = ref('')
const filterGender = ref<'all' | 'mens' | 'womens'>('all')
const genderFilterOptions: Array<{ value: 'all' | 'mens' | 'womens'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'mens', label: 'Men' },
  { value: 'womens', label: 'Women' },
]
const filterPriority = ref('')
const filterStatus = ref('')
const filterShootStatus = ref('')
const filterStages = ref<Product['stage'][]>([])
const filterDateFrom = ref('')
const filterDateTo = ref('')
const searchQuery = ref('')
const searchType = ref<'name' | 'sku'>('name')
const showArchived = ref(false)
const showOnlyNoGoLiveDate = ref(false)
const showOnlyPastExFactory = ref(false)
const sortBy = ref<'priority' | 'goLiveDate' | 'name' | 'createdAt'>('priority')
const sortOrder = ref<'asc' | 'desc'>('desc')
const showImages = ref(false)
const condensed = ref(true)
const showAddProduct = ref(false)
const showBulkImport = ref(false)
const showBulkEdit = ref(false)
const showEditProduct = ref(false)
const showProductDetail = ref(false)
const selectedProduct = ref<Product | null>(null)
const showCombineSKUsModal = ref(false)
const combineSKUGroups = ref<Array<{
  sku: string
  products: Product[]
  excludedProductIds: Set<string>
  hasDateConflict: boolean
  uniqueDates: Timestamp[]
  selectedDate: Timestamp | null
  mergedColors: ProductColor[]
  combined: boolean
}>>([])
const selectedColumn = ref<PipelineColumnId>('samples')
const showCleanupModal = ref(false)
const productFormRef = ref<InstanceType<typeof ProductForm> | null>(null)
const editProductFormRef = ref<InstanceType<typeof ProductForm> | null>(null)

const projectMap = ref<Record<string, Project>>({})

// Products with launch dates in the past that aren't live
const noGoLiveDateCount = computed(() => {
  return products.value.filter((p: Product) => !p.archived && !productHasGoLiveDate(p)).length
})

const pastExFactoryCount = computed(() => {
  return products.value.filter((p: Product) => !p.archived && isPastExFactoryAwaitingShip(p)).length
})

const productsLaunchingToday = computed(() => {
  const today = new Date()
  const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  
  return products.value.filter((p: Product) => {
    if (!p.goLiveDate || p.archived) return false
    if (p.stage === 'live') return false
    
    // Check if launch date is in the past (before today)
    const goLiveDate = p.goLiveDate.toDate()
    const productUTCDate = new Date(Date.UTC(goLiveDate.getUTCFullYear(), goLiveDate.getUTCMonth(), goLiveDate.getUTCDate()))
    
    return productUTCDate < todayUTC
  })
})

const uniqueProductNames = computed(() => {
  const names = new Set<string>()
  products.value.forEach((p: Product) => {
    if (p.name && !p.archived) {
      names.add(p.name)
    }
  })
  return Array.from(names).sort()
})

const hasActiveFilters = computed(() => {
  return !!(
    filterProductName.value ||
    filterProjectId.value ||
    filterSeason.value ||
    (filterGender.value && filterGender.value !== 'all') ||
    filterPriority.value ||
    filterStatus.value ||
    filterShootStatus.value ||
    filterStages.value.length > 0 ||
    filterDateFrom.value ||
    filterDateTo.value ||
    searchQuery.value.trim() ||
    showOnlyNoGoLiveDate.value
  )
})

const getActiveFilterCount = computed(() => {
  let count = 0
  if (filterProductName.value) count++
  if (filterProjectId.value) count++
  if (filterSeason.value) count++
  if (filterGender.value && filterGender.value !== 'all') count++
  if (filterPriority.value) count++
  if (filterStatus.value) count++
  if (filterShootStatus.value) count++
  if (filterStages.value.length > 0) count++
  if (filterDateFrom.value) count++
  if (filterDateTo.value) count++
  if (showOnlyNoGoLiveDate.value) count++
  if (showOnlyPastExFactory.value) count++
  return count
})

const filteredProducts = computed(() => {
  let filtered = products.value

  // Filter by archived status (exclude archived by default unless showArchived is true)
  if (!showArchived.value) {
    filtered = filtered.filter((p: Product) => !p.archived)
  }

  // Filter by product name
  if (filterProductName.value) {
    filtered = filtered.filter((p: Product) => p.name === filterProductName.value)
  }

  // Filter by collection
  if (filterProjectId.value) {
    filtered = filtered.filter((p: Product) => p.projectId === filterProjectId.value)
  }

  // Filter by gender (from toggle)
  if (filterGender.value !== 'all') {
    filtered = filtered.filter((p: Product) => p.gender === filterGender.value)
  }

  // Filter by season
  if (filterSeason.value) {
    filtered = filtered.filter((p: Product) => {
      const project = p.projectId ? projectMap.value[p.projectId] : undefined
      return project?.season === filterSeason.value
    })
  }

  // Filter by gender
  if (filterGender.value && filterGender.value !== 'all') {
    filtered = filtered.filter((p: Product) => p.gender === filterGender.value)
  }

  // Filter by priority
  if (filterPriority.value) {
    filtered = filtered.filter((p: Product) => p.priority === filterPriority.value)
  }

  // Filter by status
  if (filterStatus.value) {
    filtered = filtered.filter((p: Product) => p.status === filterStatus.value)
  }

  // Filter by shoot status
  if (filterShootStatus.value) {
    if (filterShootStatus.value === 'no-date') {
      filtered = filtered.filter((p: Product) => !p.scheduledShootDate)
    } else {
      filtered = filtered.filter((p: Product) => p.shootStatus === filterShootStatus.value)
    }
  }

  // Filter by stage (multi-select)
  if (filterStages.value.length > 0) {
    filtered = filtered.filter((p: Product) => filterStages.value.includes(p.stage))
  }

  // Filter by date range (using UTC components for consistent comparison)
  if (filterDateFrom.value) {
    // Parse date string directly (format: YYYY-MM-DD) to avoid timezone issues
    const parts = filterDateFrom.value.split('-').map(Number)
    if (parts.length === 3 && parts[0] && parts[1] !== undefined && parts[2] !== undefined) {
      const [year, month, day] = parts
      const fromDateUTC = new Date(Date.UTC(year, month - 1, day))
      
      filtered = filtered.filter((p: Product) => {
        if (!productHasGoLiveDate(p)) return false
        const goLiveDate = p.goLiveDate!.toDate()
        const productUTCDate = new Date(Date.UTC(goLiveDate.getUTCFullYear(), goLiveDate.getUTCMonth(), goLiveDate.getUTCDate()))
        return productUTCDate >= fromDateUTC
      })
    }
  }

  if (filterDateTo.value) {
    // Parse date string directly (format: YYYY-MM-DD) to avoid timezone issues
    const parts = filterDateTo.value.split('-').map(Number)
    if (parts.length === 3 && parts[0] && parts[1] !== undefined && parts[2] !== undefined) {
      const [year, month, day] = parts
      const toDateUTC = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
      
      filtered = filtered.filter((p: Product) => {
        if (!productHasGoLiveDate(p)) return false
        const goLiveDate = p.goLiveDate!.toDate()
        const productUTCDate = new Date(Date.UTC(goLiveDate.getUTCFullYear(), goLiveDate.getUTCMonth(), goLiveDate.getUTCDate()))
        return productUTCDate <= toDateUTC
      })
    }
  }

  if (showOnlyNoGoLiveDate.value) {
    filtered = filtered.filter((p: Product) => !productHasGoLiveDate(p))
  }

  if (showOnlyPastExFactory.value) {
    filtered = filtered.filter((p: Product) => isPastExFactoryAwaitingShip(p))
  }

  // Filter by search query (name by default, or SKU if searchType is 'sku')
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.trim().toLowerCase()
    filtered = filtered.filter((p: Product) => {
      if (searchType.value === 'sku') {
        return p.sku.toLowerCase().includes(query)
      } else {
        // Default to name search
        return p.name.toLowerCase().includes(query)
      }
    })
  }

  // Sort products
  const sorted = [...filtered].sort((a: Product, b: Product) => {
    let comparison = 0

    switch (sortBy.value) {
      case 'priority':
        const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 }
        comparison = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
        break
      case 'goLiveDate': {
        const noDateA = productHasGoLiveDate(a) ? 0 : 1
        const noDateB = productHasGoLiveDate(b) ? 0 : 1
        if (noDateA !== noDateB) {
          comparison = noDateA - noDateB
        } else {
          comparison = (productHasGoLiveDate(a) ? a.goLiveDate!.toMillis() : 0)
            - (productHasGoLiveDate(b) ? b.goLiveDate!.toMillis() : 0)
        }
        break
      }
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'createdAt':
        comparison = a.createdAt.toMillis() - b.createdAt.toMillis()
        break
    }

    return sortOrder.value === 'asc' ? comparison : -comparison
  })

  return sorted
})

function toggleStageFilter(stage: Product['stage']) {
  const index = filterStages.value.indexOf(stage)
  if (index > -1) {
    filterStages.value.splice(index, 1)
  } else {
    filterStages.value.push(stage)
  }
}

function clearFilters() {
  filterProductName.value = ''
  filterProjectId.value = ''
  filterSeason.value = ''
  filterGender.value = 'all'
  filterPriority.value = ''
  filterStatus.value = ''
  filterShootStatus.value = ''
  filterStages.value = []
  filterDateFrom.value = ''
  filterDateTo.value = ''
  searchQuery.value = ''
  showOnlyNoGoLiveDate.value = false
  showOnlyPastExFactory.value = false
}

function toggleNoGoLiveDateFilter() {
  showOnlyNoGoLiveDate.value = !showOnlyNoGoLiveDate.value
  if (showOnlyNoGoLiveDate.value) {
    filterDateFrom.value = ''
    filterDateTo.value = ''
    showOnlyPastExFactory.value = false
  }
}

function togglePastExFactoryFilter() {
  showOnlyPastExFactory.value = !showOnlyPastExFactory.value
  if (showOnlyPastExFactory.value) {
    showOnlyNoGoLiveDate.value = false
  }
}

watch([filterDateFrom, filterDateTo], ([from, to]) => {
  if (from || to) {
    showOnlyNoGoLiveDate.value = false
  }
})

function setQuickDateFilter(type: 'today' | 'tomorrow' | 'nextWeek' | 'thisMonth') {
  showOnlyNoGoLiveDate.value = false
  // Get today's date in UTC (matching how dates are stored in database)
  const now = new Date()
  const todayYear = now.getUTCFullYear()
  const todayMonth = now.getUTCMonth()
  const todayDay = now.getUTCDate()
  
  let fromYear: number
  let fromMonth: number
  let fromDay: number
  let toYear: number
  let toMonth: number
  let toDay: number
  
  switch (type) {
    case 'today':
      fromYear = toYear = todayYear
      fromMonth = toMonth = todayMonth
      fromDay = toDay = todayDay
      break
    case 'tomorrow':
      const tomorrowDate = new Date(Date.UTC(todayYear, todayMonth, todayDay + 1))
      fromYear = toYear = tomorrowDate.getUTCFullYear()
      fromMonth = toMonth = tomorrowDate.getUTCMonth()
      fromDay = toDay = tomorrowDate.getUTCDate()
      break
    case 'nextWeek':
      // Start of next week (Monday) - calculate using UTC
      const currentDayOfWeek = new Date(Date.UTC(todayYear, todayMonth, todayDay)).getUTCDay() // 0 = Sunday, 1 = Monday, etc.
      const daysUntilMonday = currentDayOfWeek === 0 ? 1 : (8 - currentDayOfWeek) % 7 || 7
      const nextMonday = new Date(Date.UTC(todayYear, todayMonth, todayDay + daysUntilMonday))
      fromYear = nextMonday.getUTCFullYear()
      fromMonth = nextMonday.getUTCMonth()
      fromDay = nextMonday.getUTCDate()
      // End of next week (Sunday)
      const nextSunday = new Date(Date.UTC(fromYear, fromMonth, fromDay + 6))
      toYear = nextSunday.getUTCFullYear()
      toMonth = nextSunday.getUTCMonth()
      toDay = nextSunday.getUTCDate()
      break
    case 'thisMonth':
      fromYear = toYear = todayYear
      fromMonth = toMonth = todayMonth
      fromDay = 1
      const lastDayOfMonth = new Date(Date.UTC(todayYear, todayMonth + 1, 0))
      toDay = lastDayOfMonth.getUTCDate()
      break
  }
  
  // Format dates as YYYY-MM-DD for date inputs (using UTC components directly)
  filterDateFrom.value = `${fromYear}-${String(fromMonth + 1).padStart(2, '0')}-${String(fromDay).padStart(2, '0')}`
  filterDateTo.value = `${toYear}-${String(toMonth + 1).padStart(2, '0')}-${String(toDay).padStart(2, '0')}`
}


function getProductsByColumn(columnId: PipelineColumnId): Product[] {
  return filteredProducts.value.filter((p) => productBelongsInColumn(p, columnId))
}

function getColumnProductCount(columnId: PipelineColumnId): number {
  return getProductsByColumn(columnId).length
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

async function markProductFactoryShipped(productId: string) {
  const product = products.value.find((p: Product) => p.id === productId)
  if (!product) return

  const now = new Date()
  const todayValue = timestampToDateInputValue(
    Timestamp.fromDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())))
  )
  const timestamp = dateInputValueToTimestamp(todayValue)
  if (!timestamp) return

  try {
    await updateProduct(productId, { factoryShipDate: timestamp })
    product.factoryShipDate = timestamp
    toast.success('Marked as shipped from factory')
  } catch (error: any) {
    toast.error(error.message || 'Failed to mark as shipped')
  }
}

async function handleColumnDrop(productId: string, columnId: PipelineColumnId) {
  const product = products.value.find((p: Product) => p.id === productId)
  if (!product) return

  if (columnId === FACTORY_SHIPPED_COLUMN) {
    await markProductFactoryShipped(productId)
    return
  }

  if (productBelongsInShippedColumn(product)) {
    try {
      await updateProduct(productId, { factoryShipDate: undefined })
      product.factoryShipDate = undefined
    } catch (error: any) {
      toast.error(error.message || 'Failed to clear ship date')
      return
    }
  }

  if (product.stage !== columnId) {
    await handleMoveProduct(productId, columnId)
  }
}

async function loadData() {
  if (brandId.value) {
    await Promise.all([
      fetchProducts(brandId.value),
      fetchProjects(brandId.value),
    ])
    await loadProjectMap()
  }
}

watch(brandId, async (newBrandId) => {
  if (newBrandId) {
    await loadData()
  } else {
    products.value = []
    projects.value = []
    projectMap.value = {}
  }
}, { immediate: true })

onMounted(async () => {
  if (brandId.value) {
    await loadData()
  }
})

async function loadProjectMap() {
  for (const project of projects.value) {
    projectMap.value[project.id] = project
  }
}

async function handleMoveProduct(productId: string, newStage: Product['stage']) {
  const authStore = useAuthStore()
  if (!authStore.userId) return

  const productIndex = products.value.findIndex((p: Product) => p.id === productId)
  if (productIndex === -1) return

  const product = products.value[productIndex]
  if (!product) return
  
  const originalStage = product.stage

  // Don't update if stage hasn't changed
  if (originalStage === newStage) return

  // Optimistic update - immediately update the UI
  product.stage = newStage

  try {
    // Update in Firestore - pass originalStage so updateStage knows the correct from stage
    await updateStage(productId, newStage, authStore.userId, originalStage)
  } catch (error) {
    // Rollback on error
    if (product) {
      product.stage = originalStage
    }
    toast.error('Failed to move product. Please try again.')
    console.error('Failed to update product stage:', error)
  }
}

async function handleCreateProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'stageHistory'>) {
  try {
    if (!brandId.value) {
      toast.error('Please select a brand first')
      return
    }
    console.log('handleCreateProduct called with:', productData)
    console.log('Current products before create:', products.value.length)
    
    // Ensure brandId is set
    const productDataWithBrand = {
      ...productData,
      brandId: brandId.value,
    }
    
    const productId = await createProduct(productDataWithBrand)
    console.log('Product created, ID:', productId)
    console.log('Current products after create:', products.value.length, products.value)
    
    // createProduct already calls fetchProducts internally, but ensure we have latest data
    await fetchProducts(brandId.value)
    await loadProjectMap() // Reload project map in case projects changed
    
    showAddProduct.value = false
    toast.success('Product created successfully')
  } catch (error: any) {
    console.error('Failed to create product:', error)
    toast.error(error.message || 'Failed to create product')
  }
}

function handleProductClick(productId: string) {
  const product = products.value.find((p: Product) => p.id === productId)
  if (product) {
    selectedProduct.value = product
    showProductDetail.value = true
  }
}

function handleEditProduct() {
  showProductDetail.value = false
  showEditProduct.value = true
}

async function handleUpdateProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'stageHistory'>) {
  try {
    if (!selectedProduct.value || !brandId.value) {
      toast.error('Product not selected')
      return
    }
    
    await updateProduct(selectedProduct.value.id, productData)
    await fetchProducts(brandId.value)
    await loadProjectMap()
    
    showEditProduct.value = false
    toast.success('Product updated successfully')
  } catch (error: any) {
    console.error('Failed to update product:', error)
    toast.error(error.message || 'Failed to update product')
  }
}

async function handleDeleteProduct() {
  if (!selectedProduct.value) return
  
  try {
    await deleteDoc('products', selectedProduct.value.id)
    await fetchProducts(brandId.value)
    showEditProduct.value = false
    showProductDetail.value = false
    selectedProduct.value = null
    toast.success('Product deleted successfully')
  } catch (error: any) {
    console.error('Failed to delete product:', error)
    toast.error(error.message || 'Failed to delete product')
  }
}

async function handleStageChanged() {
  await fetchProducts(brandId.value)
  if (selectedProduct.value) {
    const updated = products.value.find((p: Product) => p.id === selectedProduct.value!.id)
    if (updated) {
      // Assign the updated product directly - Vue will detect the reference change
      // and the deep watch in ProductDetail will pick up nested property changes
      selectedProduct.value = updated
    }
  }
}

async function handleCleanupSave(updates: Record<string, Partial<Product>>) {
  try {
    const updatePromises = Object.entries(updates).map(async ([productId, updateData]) => {
      await updateProduct(productId, updateData)
    })
    
    await Promise.all(updatePromises)
    await fetchProducts(brandId.value)
    
    toast.success(`Updated ${Object.keys(updates).length} product${Object.keys(updates).length !== 1 ? 's' : ''}`)
  } catch (error: any) {
    console.error('Failed to save cleanup changes:', error)
    toast.error(error.message || 'Failed to save changes')
  }
}

async function handleProductCreated(productId: string) {
  await fetchProducts(brandId.value)
  // Optionally open the new product detail
  const newProduct = products.value.find((p: Product) => p.id === productId)
  if (newProduct) {
    selectedProduct.value = newProduct
    showProductDetail.value = true
  }
}

function handleOpenProduct(productId: string) {
  const product = products.value.find((p: Product) => p.id === productId)
  if (product) {
    selectedProduct.value = product
    showProductDetail.value = true
  }
}

async function handleCombineSKUs(stage: Product['stage']) {
  // Get all products in this stage
  const stageProducts = filteredProducts.value.filter((p: Product) => p.stage === stage)
  
  // Group by SKU
  const skuGroups = new Map<string, Product[]>()
  stageProducts.forEach(product => {
    const sku = product.sku
    if (!skuGroups.has(sku)) {
      skuGroups.set(sku, [])
    }
    skuGroups.get(sku)!.push(product)
  })
  
  // Find SKUs with 2+ products and prepare groups
  const groups: Array<{
    sku: string
    products: Product[]
    excludedProductIds: Set<string>
    hasDateConflict: boolean
    uniqueDates: Timestamp[]
    selectedDate: Timestamp | null
    mergedColors: ProductColor[]
    combined: boolean
  }> = []
  
  skuGroups.forEach((products, sku) => {
    if (products.length >= 2) {
      // Check for date conflicts
      const dateSet = new Set<string>()
      const uniqueDates: Timestamp[] = []
      products.forEach(p => {
        if (!productHasGoLiveDate(p)) return
        const dateKey = p.goLiveDate!.toMillis().toString()
        if (!dateSet.has(dateKey)) {
          dateSet.add(dateKey)
          uniqueDates.push(p.goLiveDate!)
        }
      })
      
      // Calculate merged colors
      const allColorsMap = new Map<string, ProductColor>()
      products.forEach(product => {
        if (product.colors) {
          product.colors.forEach((color: ProductColor) => {
            if (!allColorsMap.has(color.name)) {
              allColorsMap.set(color.name, { ...color })
            } else {
              const existing = allColorsMap.get(color.name)!
              if (color.complete && !existing.complete) {
                allColorsMap.set(color.name, { ...color })
              }
            }
          })
        }
      })
      
      groups.push({
        sku,
        products,
        excludedProductIds: new Set<string>(),
        hasDateConflict: uniqueDates.length > 1,
        uniqueDates,
        selectedDate: uniqueDates.length > 1 ? null : (uniqueDates[0] || null),
        mergedColors: Array.from(allColorsMap.values()),
        combined: false
      })
    }
  })
  
  if (groups.length === 0) {
    toast.error('No products with duplicate SKUs found in this stage')
    return
  }
  
  combineSKUGroups.value = groups
  showCombineSKUsModal.value = true
}

function toggleExcludeProduct(groupIndex: number, productId: string) {
  const group = combineSKUGroups.value[groupIndex]
  if (!group || group.combined) return
  
  if (group.excludedProductIds.has(productId)) {
    group.excludedProductIds.delete(productId)
  } else {
    group.excludedProductIds.add(productId)
  }
  
  // Recalculate date conflict and merged colors when products are excluded
  updateGroupAfterExclusion(groupIndex)
}

function getIncludedProductsCount(group: typeof combineSKUGroups.value[0]): number {
  return group.products.filter(p => !group.excludedProductIds.has(p.id)).length
}

function getIncludedProducts(group: typeof combineSKUGroups.value[0]): Product[] {
  return group.products.filter(p => !group.excludedProductIds.has(p.id))
}

function updateGroupAfterExclusion(groupIndex: number) {
  const group = combineSKUGroups.value[groupIndex]
  if (!group) return
  
  const includedProducts = getIncludedProducts(group)
  
  if (includedProducts.length < 2) {
    // Not enough products to combine
    return
  }
  
  // Recalculate date conflict
  const dates = includedProducts
    .map(p => p.goLiveDate)
    .filter((d): d is Timestamp => !!d)
    .map(d => d.toMillis())
  
  const uniqueDates = Array.from(new Set(dates))
    .map(ms => Timestamp.fromMillis(ms))
  
  group.hasDateConflict = uniqueDates.length > 1
  group.uniqueDates = uniqueDates
  
  // Reset selected date if it's no longer valid
  if (group.selectedDate && !uniqueDates.some(d => d.toMillis() === group.selectedDate?.toMillis())) {
    group.selectedDate = null
  }
  
  // Recalculate merged colors
  const allColorsMap = new Map<string, ProductColor>()
  includedProducts.forEach((product: Product) => {
    if (product.colors) {
      product.colors.forEach((color: ProductColor) => {
        if (!allColorsMap.has(color.name)) {
          allColorsMap.set(color.name, color)
        } else {
          const existing = allColorsMap.get(color.name)
          if (existing && color.complete && !existing.complete) {
            allColorsMap.set(color.name, color)
          }
        }
      })
    }
  })
  group.mergedColors = Array.from(allColorsMap.values())
}

async function confirmCombineSKUGroup(groupIndex: number) {
  const group = combineSKUGroups.value[groupIndex]
  if (!group || group.combined) return
  
  const includedProducts = getIncludedProducts(group)
  
  if (includedProducts.length < 2) {
    toast.error('Need at least 2 products to combine')
    return
  }
  
  // Determine which date to use
  const selectedDate = group.hasDateConflict 
    ? group.selectedDate 
    : (includedProducts[0]?.goLiveDate || null)
  
  if (!selectedDate) {
    toast.error('Please select a go live date')
    return
  }
  
  try {
    await performCombineSKUs(includedProducts, selectedDate, group.mergedColors)
    
    // Mark as combined
    group.combined = true
    
    // Refresh products
    await fetchProducts(brandId.value)
    
    toast.success(`Combined ${includedProducts.length} products for SKU ${group.sku}`)
  } catch (error: any) {
    console.error('Error combining products:', error)
    toast.error(error.message || 'Failed to combine products')
  }
}

async function performCombineSKUs(productsToCombine: Product[], selectedDate: Timestamp, mergedColors?: ProductColor[]) {
  if (productsToCombine.length < 2) return
  
  try {
    // Use the first product as the base
    const baseProduct = productsToCombine[0]
    if (!baseProduct) return
    
    // Use provided merged colors or calculate them
    let finalMergedColors: ProductColor[]
    if (mergedColors) {
      finalMergedColors = mergedColors
    } else {
      // Collect all unique colors from all products
      const allColorsMap = new Map<string, ProductColor>()
      productsToCombine.forEach((product: Product) => {
        if (product.colors) {
          product.colors.forEach((color: ProductColor) => {
            // If color already exists, keep the one with complete=true if either is complete
            if (!allColorsMap.has(color.name)) {
              allColorsMap.set(color.name, { ...color })
            } else {
              const existing = allColorsMap.get(color.name)!
              if (color.complete && !existing.complete) {
                allColorsMap.set(color.name, { ...color })
              }
            }
          })
        }
      })
      finalMergedColors = Array.from(allColorsMap.values())
    }
    
    // Update the base product with merged colors and selected date
    await updateProduct(baseProduct.id, {
      colors: finalMergedColors,
      goLiveDate: selectedDate
    })
    
    // Delete the other products
    const productsToDelete = productsToCombine.slice(1)
    await Promise.all(productsToDelete.map((p: Product) => deleteDoc('products', p.id)))
  } catch (error: any) {
    console.error('Error combining products:', error)
    throw error
  }
}

async function handleArchiveProduct(productId: string) {
  try {
    const product = products.value.find((p: Product) => p.id === productId)
    if (product?.archived) {
      await unarchiveProduct(productId)
      toast.success('Product unarchived')
    } else {
      await archiveProduct(productId)
      toast.success('Product archived')
    }
    await fetchProducts(brandId.value)
  } catch (error: any) {
    toast.error(error.message || 'Failed to archive product')
  }
}

async function handleBulkImported() {
  await fetchProducts(brandId.value)
}

function handleExportProducts() {
  exportProductsToCSV(filteredProducts.value, projectMap.value)
  toast.success(`Exported ${filteredProducts.value.length} products`)
}

async function handleBulkEdit(updates: Array<{ productId: string; updates: Partial<Product> }>) {
  try {
    if (!authStore.userId) {
      toast.error('You must be logged in to edit products')
      return
    }

    let successCount = 0
    let errorCount = 0

    for (const { productId, updates: productUpdates } of updates) {
      try {
        // If stage is being updated, use updateStage to handle stage history
        if (productUpdates.stage) {
          await updateStage(productId, productUpdates.stage, authStore.userId)
          // Remove stage from updates since it's already handled
          const { stage, ...restUpdates } = productUpdates
          if (Object.keys(restUpdates).length > 0) {
            await updateProduct(productId, restUpdates)
          }
        } else {
          await updateProduct(productId, productUpdates)
        }
        successCount++
      } catch (error: any) {
        console.error(`Failed to update product ${productId}:`, error)
        errorCount++
      }
    }

    await fetchProducts(brandId.value)

    // Award points for bulk edit
    if (successCount > 0 && authStore.userId) {
      try {
        await awardBulkEditPoints(authStore.userId, brandId.value, successCount)
      } catch (error) {
        console.error('Error awarding bulk edit points:', error)
        // Don't fail bulk edit if rewards fail
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully updated ${successCount} product${successCount !== 1 ? 's' : ''}`)
    }
    if (errorCount > 0) {
      toast.error(`Failed to update ${errorCount} product${errorCount !== 1 ? 's' : ''}`)
    }

    showBulkEdit.value = false
  } catch (error: any) {
    console.error('Failed to bulk edit products:', error)
    toast.error(error.message || 'Failed to bulk edit products')
  }
}
</script>
