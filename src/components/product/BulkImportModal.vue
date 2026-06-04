<template>
  <Modal :is-open="isOpen" title="Bulk Import Products" size="xl" @close="$emit('close')">
    <div class="space-y-6">
      <div class="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 text-xs text-indigo-800 space-y-2">
        <div>
          <label class="block text-xs font-semibold text-indigo-900 mb-1">Select Collection</label>
          <select
            v-model="defaultProjectId"
            class="w-full px-3 py-2 bg-white border border-indigo-300 rounded-md text-text text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            :disabled="projectsLoading"
            @change="revalidateAllRows"
          >
            <option value="">Use column in file</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">
              {{ project.name }} ({{ project.season }} {{ project.year }})
            </option>
          </select>
          <p v-if="projectsLoading" class="mt-1 text-[11px] text-indigo-700">Loading collections…</p>
          <p v-else-if="projects.length === 0" class="mt-1 text-[11px] text-indigo-700">
            No collections yet — use the <strong>collection</strong> column in your CSV (e.g. Evergreen), or create
            collections in the app first.
          </p>
        </div>
      </div>

      <!-- Download Template Button -->
      <div class="flex justify-center">
        <button
          class="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 border border-indigo-300 rounded-md hover:bg-indigo-50 transition-colors"
          @click="downloadTemplate"
        >
          Download CSV Template
        </button>
      </div>

      <!-- Upload/Paste Area -->
      <div v-if="!parsedRows.length" class="space-y-4">
        <!-- File Upload -->
        <div
          class="border-2 border-dashed border-border rounded-lg p-8 text-center transition-colors"
          :class="{
            'border-indigo-400 bg-indigo-50': isDragging,
            'bg-bg': !isDragging,
          }"
          @drop="handleDrop"
          @dragover.prevent="handleDragOver"
          @dragleave="handleDragLeave"
        >
          <svg
            class="mx-auto h-12 w-12 text-muted mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <h3 class="text-lg font-medium text-text mb-2">Drop CSV file here</h3>
          <p class="text-sm text-muted mb-4">or</p>
          <label class="inline-block px-4 py-2 bg-indigo-600 text-white rounded-md cursor-pointer hover:bg-indigo-700 transition-colors">
            Browse Files
            <input
              ref="fileInput"
              type="file"
              accept=".csv"
              class="hidden"
              @change="handleFileSelect"
            />
          </label>
        </div>

        <!-- Divider -->
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-border"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-card text-muted">or</span>
          </div>
        </div>

        <!-- Paste CSV -->
        <div>
          <label class="block text-sm font-medium text-text mb-1.5">Paste CSV Data</label>
          <textarea
            v-model="csvPaste"
            class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
            rows="6"
            placeholder="Paste your CSV data here...&#10;&#10;See Download CSV Template for columns including image_url, tentative_ex_factory_date, factory_ship_date, and order_id."
          ></textarea>
          <button
            class="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!csvPaste.trim()"
            @click="handlePaste"
          >
            Parse CSV
          </button>
        </div>
      </div>

      <!-- Preview Table -->
      <div v-else class="space-y-4">
        <div
          v-if="importCollectionSummary.existing > 0 || importCollectionSummary.toCreate > 0"
          class="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2.5 text-sm text-indigo-900 flex flex-wrap gap-x-4 gap-y-1"
        >
          <span v-if="importCollectionSummary.existing > 0">
            <span class="font-medium">{{ importCollectionSummary.existing }}</span>
            existing {{ importCollectionSummary.existing === 1 ? 'collection' : 'collections' }}
          </span>
          <span v-if="importCollectionSummary.toCreate > 0" class="text-violet-800">
            <span class="font-medium">{{ importCollectionSummary.toCreate }}</span>
            to create on import
          </span>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-text font-medium">
              {{ validRows.length }} of {{ parsedRows.length }} rows ready
              <span v-if="rollUpPreview.validRowCount > 0" class="text-muted font-normal">
                → {{ rollUpPreview.newProducts }} new product{{ rollUpPreview.newProducts !== 1 ? 's' : '' }}
                <span v-if="rollUpPreview.updates > 0"> · {{ rollUpPreview.updates }} update{{ rollUpPreview.updates !== 1 ? 's' : '' }}</span>
              </span>
            </p>
            <p v-if="invalidRows.length > 0" class="text-sm text-red-600 mt-1">
              {{ invalidRows.length }} row{{ invalidRows.length !== 1 ? 's' : '' }} need attention
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="px-4 py-2 text-sm font-medium text-text border border-border rounded-md hover:bg-bg transition-colors"
              @click="reset"
            >
              Clear
            </button>
            <button
              class="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              :disabled="validRows.length === 0 || importing"
              @click="handleImport"
            >
              <span v-if="importing">
                {{ validRows.some(r => r.id) ? 'Updating...' : 'Importing...' }}
              </span>
              <span v-else>
                {{ validRows.some(r => r.id) ? 'Update' : 'Import' }}
                {{ rollUpPreview.newProducts || validRows.length }}
                {{ validRows.some(r => r.id) ? 'update' : 'product' }}{{ (rollUpPreview.newProducts || validRows.length) !== 1 ? 's' : '' }}
              </span>
            </button>
          </div>
        </div>

        <div class="bg-card border border-border rounded-lg overflow-hidden max-h-[600px] overflow-y-auto">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[2400px]">
              <thead class="bg-indigo-50 border-b-2 border-indigo-200 sticky top-0 z-10">
                <tr>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap w-12">Row</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[120px]">ID</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[160px]">Collection</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[90px]">Season</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[70px]">Year</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[100px]">SKU</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[72px]">Roll-up</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[200px]">Name</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[130px]">Category</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[120px]">Gender</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[120px]">Priority</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[120px]">Status</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[140px]">Shot Type</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[110px]">Go Live</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[120px]">Ex-Factory</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[120px]">Factory Ship</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[100px]">Order ID</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[130px]">Column</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[90px]">Color</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[80px]">Code</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[100px]">Color SKU</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[180px]">Color image</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[120px]">Colors (wide)</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[100px]">Codes (wide)</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[100px]">SKUs (wide)</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[140px]">Images (wide)</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[140px]">Product image</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[120px]">Tags</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[140px]">Collection status</th>
                  <th class="pl-7 pr-3 py-2 text-left text-[11px] font-semibold text-indigo-700 uppercase whitespace-nowrap min-w-[120px]">Validation</th>
                </tr>
              </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="(row, index) in parsedRows"
                :key="index"
                class="transition-colors"
                :class="[
                  !row.validation.valid ? 'bg-red-50' : rollUpRowClass(row),
                  row.validation.valid ? 'hover:bg-bg' : '',
                ]"
              >
                <td class="pl-5 pr-3 py-2 text-[13px] text-muted text-center">{{ row.rowNumber }}</td>
                <td class="pl-5 pr-3 py-2">
                  <input
                    v-model="row.id"
                    type="text"
                    class="w-full px-2 py-1.5 text-[13px] bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="(for updates)"
                    title="Product ID - leave empty for new products, include to update existing"
                  />
                </td>
                <td class="pl-5 pr-3 py-2">
                  <input
                    v-model="row.collection"
                    type="text"
                    class="w-full px-2 py-1.5 text-[13px] bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Optional if default set"
                    @blur="validateRow(row)"
                  />
                </td>
                <td class="pl-5 pr-3 py-2">
                  <select
                    v-model="row.collection_season"
                    class="no-caret w-full px-2 py-1.5 text-[13px] bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                    @change="validateRow(row)"
                  >
                    <option value="">—</option>
                    <option value="spring">Spring</option>
                    <option value="summer">Summer</option>
                    <option value="fall">Fall</option>
                    <option value="winter">Winter</option>
                    <option value="evergreen">Evergreen</option>
                  </select>
                </td>
                <td class="pl-5 pr-3 py-2">
                  <input
                    v-model="row.collection_year"
                    type="number"
                    class="w-full px-2 py-1.5 text-[13px] bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="2026"
                    @blur="validateRow(row)"
                  />
                </td>
                <td class="pl-5 pr-3 py-2">
                  <input
                    v-model="row.sku"
                    type="text"
                    class="w-full px-2 py-1.5 text-[13px] bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    :class="{
                      'border-red-300 bg-red-100': !row.validation.valid && !row.sku,
                    }"
                    @blur="validateRow(row)"
                  />
                </td>
                <td class="pl-5 pr-3 py-2 text-[11px] font-semibold text-indigo-700 whitespace-nowrap">
                  {{ rollUpByRowNumber.get(row.rowNumber)?.label ?? '—' }}
                </td>
                <td class="pl-5 pr-3 py-2">
                  <input
                    v-model="row.name"
                    type="text"
                    class="w-full px-2 py-1.5 text-[13px] bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    :class="{
                      'border-red-300 bg-red-100': !row.validation.valid && !row.name,
                    }"
                    @blur="validateRow(row)"
                  />
                </td>
                <td class="pl-5 pr-3 py-2">
                  <input
                    v-model="row.category"
                    type="text"
                    class="w-full px-2 py-1.5 text-[13px] bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Category"
                    @blur="validateRow(row)"
                  />
                </td>
                <td class="pl-5 pr-3 py-2">
                  <select
                    v-model="row.gender"
                    class="no-caret w-full px-2 py-1.5 text-[13px] bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                    @change="validateRow(row)"
                  >
                    <option value="">—</option>
                    <option value="mens">Mens</option>
                    <option value="womens">Womens</option>
                    <option value="unisex">Unisex</option>
                  </select>
                </td>
                <td class="pl-5 pr-3 py-2">
                  <select
                    v-model="row.priority"
                    class="no-caret w-full px-2 py-1.5 text-[13px] font-semibold bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                    :class="{
                      'text-red-600': row.priority === 'high',
                      'text-amber-600': row.priority === 'medium',
                      'text-muted': row.priority === 'low',
                    }"
                    @change="validateRow(row)"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </td>
                <td class="pl-5 pr-3 py-2">
                  <select
                    v-model="row.status"
                    class="no-caret w-full px-2 py-1.5 text-[13px] font-semibold bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                    :class="{
                      'text-emerald-600': row.status === 'on-time',
                      'text-amber-600': row.status === 'delayed',
                      'text-indigo-600': row.status === 'complete',
                    }"
                    @change="validateRow(row)"
                  >
                    <option value="on-time">On Time</option>
                    <option value="delayed">Delayed</option>
                    <option value="complete">Complete</option>
                  </select>
                </td>
                <td class="pl-5 pr-3 py-2">
                  <input
                    v-model="row.shot_type"
                    type="text"
                    class="w-full px-2 py-1.5 text-[13px] bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="flat_lay;on_model"
                    @blur="validateRow(row)"
                  />
                </td>
                <td class="pl-5 pr-3 py-2">
                  <input
                    v-model="row.go_live_date"
                    type="date"
                    class="w-full px-2 py-1.5 text-[13px] bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    :class="{
                      'border-red-300 bg-red-100': !row.validation.valid && !row.go_live_date,
                    }"
                    @change="validateRow(row)"
                  />
                </td>
                <td class="pl-5 pr-3 py-2">
                  <input
                    v-model="row.tentative_ex_factory_date"
                    type="date"
                    class="w-full px-2 py-1.5 text-[13px] bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    @change="validateRow(row)"
                  />
                </td>
                <td class="pl-5 pr-3 py-2">
                  <input
                    v-model="row.factory_ship_date"
                    type="date"
                    class="w-full px-2 py-1.5 text-[13px] bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    @change="validateRow(row)"
                  />
                </td>
                <td class="pl-5 pr-3 py-2">
                  <input
                    v-model="row.order_id"
                    type="text"
                    class="w-full px-2 py-1.5 text-[13px] bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="PO-12345"
                    @blur="validateRow(row)"
                  />
                </td>
                <td class="pl-5 pr-3 py-2">
                  <select
                    v-model="row.column"
                    class="no-caret w-full px-2 py-1.5 text-[13px] bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                    @change="validateRow(row)"
                  >
                    <option value="0">0 - Samples</option>
                    <option value="1">1 - Warehouse</option>
                    <option value="2">2 - Photo Queue</option>
                    <option value="3">3 - In Shoot</option>
                    <option value="4">4 - Editing</option>
                    <option value="5">5 - Staged</option>
                    <option value="6">6 - Live</option>
                  </select>
                </td>
                <td class="pl-5 pr-3 py-2">
                  <input
                    v-model="row.color"
                    type="text"
                    class="w-full px-2 py-1.5 text-[13px] bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Black"
                    @blur="validateRow(row)"
                  />
                </td>
                <td class="pl-5 pr-3 py-2">
                  <input
                    v-model="row.color_code"
                    type="text"
                    class="w-full px-2 py-1.5 text-[13px] bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="BLK"
                    @blur="validateRow(row)"
                  />
                </td>
                <td class="pl-5 pr-3 py-2">
                  <input
                    v-model="row.color_sku"
                    type="text"
                    class="w-full px-2 py-1.5 text-[13px] bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    :placeholder="suggestedColorSku(row)"
                    @blur="validateRow(row)"
                  />
                </td>
                <td class="pl-5 pr-3 py-2">
                  <input
                    v-model="row.color_image_url"
                    type="url"
                    class="w-full min-w-[160px] px-2 py-1.5 text-[13px] bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="https://…"
                    :title="row.color_image_url"
                    @blur="validateRow(row)"
                  />
                </td>
                <td class="pl-5 pr-3 py-2">
                  <input
                    v-model="row.colors"
                    type="text"
                    class="w-full px-2 py-1.5 text-[13px] bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Black;Navy;Red"
                    @blur="validateRow(row)"
                  />
                </td>
                <td class="pl-5 pr-3 py-2">
                  <input
                    v-model="row.color_codes"
                    type="text"
                    class="w-full px-2 py-1.5 text-[13px] bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="BLK;NVY"
                    @blur="validateRow(row)"
                  />
                </td>
                <td class="pl-5 pr-3 py-2">
                  <input
                    v-model="row.color_skus"
                    type="text"
                    class="w-full px-2 py-1.5 text-[13px] bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="SKU-BLK;SKU-NVY"
                    @blur="validateRow(row)"
                  />
                </td>
                <td class="pl-5 pr-3 py-2">
                  <input
                    v-model="row.color_image_urls"
                    type="text"
                    class="w-full min-w-[120px] px-2 py-1.5 text-[13px] bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="url1;url2"
                    :title="row.color_image_urls"
                    @blur="validateRow(row)"
                  />
                </td>
                <td class="pl-5 pr-3 py-2">
                  <input
                    v-model="row.image_url"
                    type="url"
                    class="w-full min-w-[120px] px-2 py-1.5 text-[13px] bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="https://…"
                    :title="row.image_url"
                    @blur="validateRow(row)"
                  />
                </td>
                <td class="pl-5 pr-3 py-2">
                  <input
                    v-model="row.tags"
                    type="text"
                    class="w-full px-2 py-1.5 text-[13px] bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="tag1;tag2"
                    @blur="validateRow(row)"
                  />
                </td>
                <td class="pl-5 pr-3 py-2 align-top">
                  <p
                    v-if="row.collectionStatus === 'found'"
                    class="text-[11px] font-medium text-emerald-700"
                  >
                    Found
                  </p>
                  <p
                    v-else-if="row.collectionStatus === 'will_create'"
                    class="text-[11px] font-medium text-violet-700"
                  >
                    Will create
                  </p>
                  <p
                    v-else-if="row.collectionStatus === 'use_default'"
                    class="text-[11px] font-medium text-indigo-700"
                  >
                    Default
                  </p>
                  <p
                    v-else-if="row.collectionStatus === 'unchanged'"
                    class="text-[11px] font-medium text-slate-600"
                  >
                    Unchanged
                  </p>
                  <p
                    v-else-if="row.collectionStatus === 'none' && row.collectionDisplayLabel"
                    class="text-[11px] font-medium text-amber-700"
                  >
                    No collection
                  </p>
                  <p v-else class="text-[11px] text-muted">—</p>
                  <p
                    v-if="row.collectionDisplayLabel"
                    class="text-[10px] text-muted mt-0.5 line-clamp-2"
                    :title="row.collectionDisplayLabel"
                  >
                    {{ row.collectionDisplayLabel }}
                  </p>
                </td>
                <td class="pl-5 pr-3 py-2">
                  <div v-if="!row.validation.valid" class="text-[11px] text-red-600 space-y-0.5">
                    <div v-for="error in row.validation.errors.slice(0, 2)" :key="error">
                      {{ error }}
                    </div>
                    <div v-if="row.validation.errors.length > 2" class="text-muted">
                      +{{ row.validation.errors.length - 2 }} more
                    </div>
                  </div>
                  <div v-else class="text-[11px] text-emerald-600 font-medium">✓</div>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <button
        class="w-full sm:w-auto px-4 py-2.5 border border-border rounded-md text-sm font-medium text-text hover:bg-bg transition-colors"
        @click="$emit('close')"
      >
        {{ parsedRows.length ? 'Cancel' : 'Close' }}
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useProducts } from '@/composables/useProducts'
import { useProject } from '@/composables/useProject'
import type { Product } from '@/types'
import {
  parseCSV,
  parseCSVFromText,
  validateProductRow,
  mapRowsToProduct,
  groupRowsForProductImport,
  downloadCSVTemplate,
  type ParsedRow,
  resolveCollectionForRow,
  formatCollectionLabel,
  rowSpecifiesCollection,
  type CollectionCreatePayload,
  type CollectionResolveStatus,
} from '@/utils/csv'
import Modal from '@/components/common/Modal.vue'
import { useToast } from '@/composables/useToast'
import { addPoints } from '@/services/rewardsService'
import { POINT_VALUES } from '@/constants/badges'
import { useAuthStore } from '@/stores/auth'
import { buildColorSku } from '@/utils/productColors'

const props = defineProps<{
  isOpen: boolean
  brandId: string
}>()

const emit = defineEmits<{
  close: []
  imported: []
}>()

const { projects, loading: projectsLoading, fetchProjects, createProject } = useProject()
const { products: brandProducts, fetchProducts, createProduct, updateProduct } = useProducts()
const toast = useToast()
const authStore = useAuthStore()

const defaultProjectId = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const csvPaste = ref('')
type ImportPreviewRow = ParsedRow & {
  validation: { valid: boolean; errors: string[] }
  resolvedProjectId?: string | null
  collectionStatus?: CollectionResolveStatus
  collectionDisplayLabel?: string
  pendingCreatePayload?: CollectionCreatePayload
  pendingCreateKey?: string
}
const parsedRows = ref<ImportPreviewRow[]>([])
const importing = ref(false)

const validRows = computed(() => {
  return parsedRows.value.filter((row) => row.validation.valid)
})

const invalidRows = computed(() => {
  return parsedRows.value.filter((row) => !row.validation.valid)
})

const rollUpPreview = computed(() => {
  const source = validRows.value.length > 0 ? validRows.value : parsedRows.value
  const groups = groupRowsForProductImport(source)
  return {
    rowCount: parsedRows.value.length,
    validRowCount: validRows.value.length,
    newProducts: groups.filter((g) => !g.isUpdate).length,
    updates: groups.filter((g) => g.isUpdate).length,
  }
})

const rollUpByRowNumber = computed(() => {
  const map = new Map<number, { label: string; groupSize: number }>()
  let productIndex = 0
  for (const group of groupRowsForProductImport(parsedRows.value)) {
    if (group.isUpdate) {
      for (const row of group.rows) {
        map.set(row.rowNumber, { label: 'Update', groupSize: 1 })
      }
      continue
    }
    productIndex++
    const size = group.rows.length
    group.rows.forEach((row, index) => {
      map.set(row.rowNumber, {
        label: size > 1 ? `#${productIndex} (${index + 1}/${size})` : `#${productIndex}`,
        groupSize: size,
      })
    })
  }
  return map
})

function rollUpRowClass(row: ImportPreviewRow): string {
  const info = rollUpByRowNumber.value.get(row.rowNumber)
  if (!info || info.groupSize < 2) return ''
  let hash = 0
  const sku = row.sku.trim().toLowerCase()
  for (let i = 0; i < sku.length; i++) hash = (hash * 31 + sku.charCodeAt(i)) | 0
  return hash % 2 === 0 ? 'bg-indigo-50/50' : 'bg-violet-50/40'
}

function suggestedColorSku(row: ParsedRow): string {
  if (row.color_sku?.trim()) return ''
  if (!row.sku?.trim()) return 'auto if code set'
  return buildColorSku(row.sku, row.color_code) || 'auto if code set'
}

const importCollectionSummary = computed(() => {
  const existingIds = new Set<string>()
  const createKeys = new Set<string>()
  for (const row of parsedRows.value) {
    if (row.collectionStatus === 'found' || row.collectionStatus === 'use_default') {
      if (row.resolvedProjectId) existingIds.add(row.resolvedProjectId)
    } else if (row.collectionStatus === 'will_create' && row.pendingCreateKey) {
      createKeys.add(row.pendingCreateKey)
    }
  }
  return { existing: existingIds.size, toCreate: createKeys.size }
})

function enrichRowValidation(row: ImportPreviewRow): ImportPreviewRow {
  const {
    validation: _v,
    resolvedProjectId: _p,
    collectionStatus: _s,
    collectionDisplayLabel: _l,
    pendingCreatePayload: _c,
    pendingCreateKey: _k,
    ...base
  } = row
  const isUpdate = !!(base.id && base.id.trim())
  const specifiesCollection = rowSpecifiesCollection(base)
  const existing = isUpdate
    ? brandProducts.value.find((p: Product) => p.id === base.id!.trim())
    : undefined

  const validation = validateProductRow(base, {
    projects: projects.value,
    defaultProjectId: defaultProjectId.value || undefined,
  })
  const resolved = resolveCollectionForRow(base, projects.value, {
    defaultProjectId: defaultProjectId.value || undefined,
    allowCreate: true,
    skipDefault: isUpdate && !specifiesCollection,
  })

  let collectionStatus = resolved.status
  let collectionDisplayLabel = resolved.displayLabel
  let resolvedProjectId = resolved.projectId
  let pendingCreatePayload = resolved.createPayload
  let pendingCreateKey = resolved.createKey

  if (isUpdate && !specifiesCollection) {
    pendingCreatePayload = undefined
    pendingCreateKey = undefined
    if (existing?.projectId) {
      const proj = projects.value.find((p) => p.id === existing.projectId)
      collectionStatus = 'unchanged'
      collectionDisplayLabel = proj
        ? formatCollectionLabel(proj)
        : 'Current collection'
      resolvedProjectId = existing.projectId
    } else {
      collectionStatus = 'none'
      collectionDisplayLabel = 'No collection'
      resolvedProjectId = null
    }
  } else if (!isUpdate && !specifiesCollection && collectionStatus === 'none') {
    collectionDisplayLabel = 'No collection'
  }

  return {
    ...base,
    validation,
    resolvedProjectId,
    collectionStatus,
    collectionDisplayLabel,
    pendingCreatePayload,
    pendingCreateKey,
  }
}

function revalidateAllRows() {
  parsedRows.value = parsedRows.value.map((row) => enrichRowValidation(row))
}

watch(
  () => props.isOpen,
  async (isOpen) => {
    if (isOpen && props.brandId) {
      await fetchProjects(props.brandId)
      await fetchProducts(props.brandId)
    } else if (!isOpen) {
      reset()
    }
  }
)

function downloadTemplate() {
  downloadCSVTemplate()
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    processFile(file)
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragging.value = false

  const file = event.dataTransfer?.files[0]
  if (file) {
    processFile(file)
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  isDragging.value = true
}

function handleDragLeave() {
  isDragging.value = false
}

async function processFile(file: File) {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    toast.error('Please upload a CSV file')
    return
  }

  try {
    const rows = await parseCSV(file)
    processRows(rows)
  } catch (error: any) {
    toast.error(`Error parsing CSV: ${error.message}`)
  }
}

function handlePaste() {
  if (!csvPaste.value.trim()) {
    toast.error('Please paste CSV data')
    return
  }

  try {
    const rows = parseCSVFromText(csvPaste.value)
    processRows(rows)
    csvPaste.value = ''
  } catch (error: any) {
    toast.error(`Error parsing CSV: ${error.message}`)
  }
}

function processRows(rows: ParsedRow[]) {
  parsedRows.value = rows.map((row) =>
    enrichRowValidation({
      ...row,
      priority: row.priority || 'medium',
      status: row.status || 'on-time',
      column: row.column || '0',
      validation: { valid: false, errors: [] },
    })
  )
}

function validateRow(row: ImportPreviewRow) {
  const updated = enrichRowValidation({
    ...row,
    sku: row.sku.trim(),
  })
  Object.assign(row, updated)
}

/** null = update row with no collection column — omit projectId from the patch */
function resolveProjectIdForImport(
  row: ImportPreviewRow,
  createdCollectionIds: Map<string, string>
): string | null {
  const isUpdate = !!(row.id && row.id.trim())
  if (isUpdate && !rowSpecifiesCollection(row)) {
    return null
  }
  if (row.collectionStatus === 'will_create' && row.pendingCreateKey) {
    return createdCollectionIds.get(row.pendingCreateKey) || ''
  }
  return row.resolvedProjectId || ''
}

async function ensureCollectionsToCreate(rows: ImportPreviewRow[]): Promise<Map<string, string>> {
  const createdIds = new Map<string, string>()
  const payloads = new Map<string, CollectionCreatePayload>()

  for (const row of rows) {
    if (row.collectionStatus === 'will_create' && row.pendingCreateKey && row.pendingCreatePayload) {
      if (!payloads.has(row.pendingCreateKey)) {
        payloads.set(row.pendingCreateKey, row.pendingCreatePayload)
      }
    }
  }

  for (const [key, payload] of payloads) {
    const id = await createProject({
      brandId: props.brandId,
      name: payload.name,
      season: payload.season,
      year: payload.year,
      status: 'active',
    })
    createdIds.set(key, id)
  }

  if (payloads.size > 0) {
    await fetchProjects(props.brandId)
    revalidateAllRows()
  }

  return createdIds
}

function reset() {
  parsedRows.value = []
  csvPaste.value = ''
  defaultProjectId.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

async function handleImport() {
  const hasIds = validRows.value.some((row) => row.id && row.id.trim())

  importing.value = true
  let success = 0
  let updated = 0
  let created = 0
  let failed = 0
  let collectionsCreated = 0

  let createdCollectionIds = new Map<string, string>()
  try {
    createdCollectionIds = await ensureCollectionsToCreate(validRows.value)
    collectionsCreated = createdCollectionIds.size
  } catch (error: any) {
    importing.value = false
    toast.error(error.message || 'Failed to create collections')
    return
  }

  const importGroups = groupRowsForProductImport(validRows.value)

  for (const group of importGroups) {
    const primary = group.rows[0]
    if (!primary) continue

    try {
      const projectId = resolveProjectIdForImport(primary, createdCollectionIds)
      if (projectId === null && group.isUpdate) {
        const productData = mapRowsToProduct(group.rows, props.brandId)
        await updateProduct(primary.id!.trim(), productData as Partial<Product>)
        updated++
        success++
        continue
      }
      const needsCollection =
        rowSpecifiesCollection(primary) || primary.collectionStatus === 'will_create'
      if (needsCollection && !projectId) {
        failed++
        continue
      }
      const productData = mapRowsToProduct(group.rows, props.brandId, projectId || undefined)

      if (group.isUpdate && primary.id?.trim()) {
        await updateProduct(primary.id.trim(), productData as Partial<Product>)
        updated++
        success++
      } else {
        await createProduct(
          productData as Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'stageHistory'>
        )
        created++
        success++
      }
    } catch (error: unknown) {
      failed++
      const rowLabel = group.isUpdate ? primary.id : primary.sku
      console.error(`Failed to import group ${rowLabel}:`, error)
    }
  }

  // Award bulk upload bonus if 10+ products created (not updated) (non-blocking)
  if (created >= 10 && authStore.user) {
    try {
      await addPoints(
        authStore.user.uid,
        props.brandId,
        'loader',
        POINT_VALUES.bulkUploadBonus,
        'Bulk upload bonus (10+)',
        undefined
      )
    } catch (error) {
      console.error('Error awarding bulk upload bonus:', error)
      // Don't fail import if bonus fails
    }
  }

  importing.value = false

  if (success > 0) {
    const messages = []
    if (collectionsCreated > 0) {
      messages.push(`created ${collectionsCreated} collection${collectionsCreated !== 1 ? 's' : ''}`)
    }
    if (updated > 0) messages.push(`updated ${updated} product${updated !== 1 ? 's' : ''}`)
    if (created > 0) messages.push(`created ${created} product${created !== 1 ? 's' : ''}`)
    toast.success(`Successfully ${messages.join(', ')}`)
    await fetchProducts(props.brandId)
    emit('imported')
    reset()
    emit('close')
  }

  if (failed > 0) {
    toast.error(`Failed to ${hasIds ? 'update' : 'import'} ${failed} product${failed !== 1 ? 's' : ''}`)
  }
}
</script>
