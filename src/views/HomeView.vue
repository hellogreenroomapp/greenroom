<template>
  <div class="min-h-screen flex flex-col" style="background-color: #1B7F56;">
    <!-- Header -->
    <header class="bg-[#1B7F56]/20 backdrop-blur-sm border-b border-white/20 flex-shrink-0">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <img src="/src/assets/greenroom_icon white.svg" alt="GreenRoom" class="h-8 w-8 flex-shrink-0" />
            <img src="/src/assets/greenroom.svg" alt="GreenRoom" class="h-4 sm:h-5 flex-shrink-0" style="filter: brightness(0) invert(1) opacity(0.9);" />
          </div>
          <router-link
            to="/login"
            class="px-3 sm:px-4 py-1.5 sm:py-2 bg-white text-[#1B7F56] rounded-md text-xs sm:text-sm font-medium hover:bg-white/90 transition-colors whitespace-nowrap shadow-md"
          >
            Sign In
          </router-link>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <main class="flex-1 flex flex-col justify-center max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div class="text-center mb-12 sm:mb-16">
        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 px-2">
          Organize Your Products from Warehouse to Website Launch
        </h1>
        <p class="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto px-4">
          GreenRoom helps brands streamline their merchandising pipeline, plan photoshoots, and manage campaigns—all in one place.
        </p>
      </div>

      <!-- Features -->
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
        <div class="bg-white rounded-lg shadow-lg p-5 sm:p-6">
          <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#c9d5c4] flex items-center justify-center mb-4 flex-shrink-0">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-[#6b7b6a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 class="text-base sm:text-lg font-semibold text-text mb-2">Track Your Pipeline</h3>
          <p class="text-xs sm:text-sm text-muted">
            Move products through stages from warehouse arrival to going live on your website.
          </p>
        </div>

        <div class="bg-white rounded-lg shadow-lg p-5 sm:p-6">
          <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#e8d4b8] flex items-center justify-center mb-4 flex-shrink-0">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-[#8b6b4a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 class="text-base sm:text-lg font-semibold text-text mb-2">Plan Photoshoots</h3>
          <p class="text-xs sm:text-sm text-muted">
            Schedule and organize your photography sessions with priority-based queues.
          </p>
        </div>

        <div class="bg-white rounded-lg shadow-lg p-5 sm:p-6 sm:col-span-2 lg:col-span-1">
          <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#a8cfb4] flex items-center justify-center mb-4 flex-shrink-0">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-[#5a8b6a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 class="text-base sm:text-lg font-semibold text-text mb-2">Manage Campaigns</h3>
          <p class="text-xs sm:text-sm text-muted">
            Organize products by collections and track go-live dates for seamless launches.
          </p>
        </div>
      </div>

      <!-- CTA -->
      <div class="text-center px-4">
        <router-link
          to="/login"
          class="inline-block px-6 sm:px-8 py-2.5 sm:py-3 bg-white text-[#1B7F56] rounded-md text-sm sm:text-base font-medium hover:bg-white/90 transition-colors shadow-lg"
        >
          Get Started
        </router-link>
      </div>
    </main>

    <!-- Footer -->
    <footer class="bg-[#1B7F56]/20 backdrop-blur-sm border-t border-white/20 mt-auto flex-shrink-0 w-full">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <p class="text-center text-xs sm:text-sm text-white/80">
          © 2026 GreenRoom. Streamline your merchandising pipeline.
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
// Simple landing page - no script needed
</script>
