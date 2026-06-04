import { ref } from 'vue'
import { Timestamp } from 'firebase/firestore'
import {
  getProjectsByBrand,
  getDoc,
  addDoc,
  updateDoc,
} from '@/firebase/firestore'
import type { Project } from '@/types'

export function useProject() {
  const projects = ref<Project[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchProjects(brandId: string) {
    loading.value = true
    error.value = null
    try {
      console.log('Fetching projects for brandId:', brandId)
      const fetchedProjects = await getProjectsByBrand(brandId)
      console.log('Fetched projects:', fetchedProjects.length, fetchedProjects)
      projects.value = fetchedProjects
    } catch (err: any) {
      console.error('Error fetching projects:', err)
      error.value = err.message || 'Failed to fetch projects'
      projects.value = []
    } finally {
      loading.value = false
    }
  }

  async function createProject(data: Omit<Project, 'id' | 'createdAt'>): Promise<string> {
    loading.value = true
    error.value = null
    try {
      console.log('Creating project with data:', data)
      const projectId = await addDoc<Project>('projects', {
        ...data,
        createdAt: Timestamp.now(),
      })
      console.log('Project created with ID:', projectId)
      // Fetch projects to refresh the list
      await fetchProjects(data.brandId)
      console.log('Projects after fetch:', projects.value.length)
      return projectId
    } catch (err: any) {
      console.error('Error creating project:', err)
      error.value = err.message || 'Failed to create project'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateProject(
    projectId: string,
    updates: Partial<Project>
  ): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await updateDoc<Project>('projects', projectId, updates)
      const project = await getDoc<Project>('projects', projectId)
      if (project) {
        const index = projects.value.findIndex((p) => p.id === projectId)
        if (index !== -1) {
          projects.value[index] = project
        }
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to update project'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function archiveProject(projectId: string): Promise<void> {
    await updateProject(projectId, { status: 'archived' })
  }

  return {
    projects,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    archiveProject,
  }
}
