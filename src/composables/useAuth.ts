import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

export function useAuth() {
  const authStore = useAuthStore()

  onMounted(() => {
    if (!authStore.user && authStore.loading) {
      authStore.fetchUserProfile()
    }
  })

  return {
    user: authStore.user,
    isAuthenticated: authStore.isAuthenticated,
    loading: authStore.loading,
    error: authStore.error,
    login: authStore.login,
    loginWithGoogle: authStore.loginWithGoogle,
    signup: authStore.signup,
    logout: authStore.logout,
    resetPassword: authStore.resetPassword,
  }
}
