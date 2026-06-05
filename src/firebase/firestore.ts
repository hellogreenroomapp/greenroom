import {
  collection,
  doc,
  getDoc as getDocFirestore,
  getDocs as getDocsFirestore,
  addDoc as addDocFirestore,
  setDoc as setDocFirestore,
  updateDoc as updateDocFirestore,
  deleteDoc as deleteDocFirestore,
  query,
  where,
  orderBy,
  Timestamp,
  type DocumentData,
  type Query,
} from 'firebase/firestore'
import { auth, db } from './config'
import type { Brand, Project, Product, BrandMember, StageChange, BrandInvite, UserProfile } from '@/types'
import type { MarketingEventRecord } from '@/types/marketingEvents'
import type { MarketingKlaviyoInsights } from '@/types/klaviyoInsights'

export async function getDoc<T extends DocumentData>(
  collectionPath: string,
  docId: string
): Promise<T | null> {
  try {
    const docRef = doc(db, collectionPath, docId)
    const docSnap = await getDocFirestore(docRef)
    if (!docSnap.exists()) return null
    return { id: docSnap.id, ...docSnap.data() } as unknown as T
  } catch (error: any) {
    throw new Error(`Failed to get document: ${error.message}`)
  }
}

export async function getDocs<T extends DocumentData>(
  collectionPath: string,
  queryConstraints?: any[]
): Promise<T[]> {
  try {
    const collectionRef = collection(db, collectionPath)
    let q: Query<DocumentData> = collectionRef

    if (queryConstraints && queryConstraints.length > 0) {
      q = query(collectionRef, ...queryConstraints)
    }

    const querySnapshot = await getDocsFirestore(q)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as unknown as T[]
  } catch (error: any) {
    throw new Error(`Failed to get documents: ${error.message}`)
  }
}

export async function addDoc<T extends DocumentData>(
  collectionPath: string,
  data: Omit<T, 'id'>
): Promise<string> {
  try {
    const collectionRef = collection(db, collectionPath)
    const docRef = await addDocFirestore(collectionRef, data as DocumentData)
    return docRef.id
  } catch (error: any) {
    throw new Error(`Failed to add document: ${error.message}`)
  }
}

export async function updateDoc<T extends DocumentData>(
  collectionPath: string,
  docId: string,
  data: Partial<T>
): Promise<void> {
  try {
    const docRef = doc(db, collectionPath, docId)
    await updateDocFirestore(docRef, data as DocumentData)
  } catch (error: any) {
    throw new Error(`Failed to update document: ${error.message}`)
  }
}

export async function deleteDoc(
  collectionPath: string,
  docId: string
): Promise<void> {
  try {
    const docRef = doc(db, collectionPath, docId)
    await deleteDocFirestore(docRef)
  } catch (error: any) {
    throw new Error(`Failed to delete document: ${error.message}`)
  }
}

export function brandMemberDocId(brandId: string, userId: string): string {
  return `${brandId}_${userId}`
}

/** Wait for Firebase Auth token before Firestore reads (avoids permission-denied races). */
export async function ensureFirestoreAuthReady(): Promise<void> {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  await user.getIdToken()
}

/** Copy membership to canonical {brandId}_{userId} so security rules can resolve brand access. */
export async function ensureCanonicalBrandMemberDoc(
  member: BrandMember,
  userId: string
): Promise<void> {
  if (!member.brandId) return
  const canonicalId = brandMemberDocId(member.brandId, userId)
  if (member.id === canonicalId) return

  await setDoc<BrandMember>(
    'brandMembers',
    canonicalId,
    {
      userId: member.userId,
      brandId: member.brandId,
      email: member.email ?? '',
      displayName: member.displayName ?? '',
      role: member.role,
      status: member.status,
      invitedAt: member.invitedAt,
      joinedAt: member.joinedAt ?? Timestamp.now(),
    } as Omit<BrandMember, 'id'>,
    true
  )
}

export async function setDoc<T extends DocumentData>(
  collectionPath: string,
  docId: string,
  data: Omit<T, 'id'>,
  merge = false
): Promise<void> {
  try {
    const docRef = doc(db, collectionPath, docId)
    await setDocFirestore(docRef, data as DocumentData, { merge })
  } catch (error: any) {
    throw new Error(`Failed to set document: ${error.message}`)
  }
}

export async function upsertActiveBrandMember(
  brandId: string,
  member: Omit<BrandMember, 'id' | 'brandId'> & { brandId?: string }
): Promise<string> {
  const docId = brandMemberDocId(brandId, member.userId)
  await setDoc<BrandMember>(
    'brandMembers',
    docId,
    {
      ...member,
      brandId,
      status: 'active',
      joinedAt: member.joinedAt ?? Timestamp.now(),
    } as Omit<BrandMember, 'id'>,
    true
  )
  return docId
}

export async function createBrand(
  data: Omit<Brand, 'id' | 'createdAt'>
): Promise<string> {
  // Remove undefined values - Firestore doesn't accept them
  const cleanData: Record<string, any> = {
    createdAt: Timestamp.now(),
  }
  
  Object.keys(data).forEach((key) => {
    const value = data[key as keyof typeof data]
    if (value !== undefined) {
      cleanData[key] = value
    }
  })
  
  const brandId = await addDoc<Brand>('brands', cleanData as unknown as Omit<Brand, 'id'>)

  // Owner must be an active member for security rules (products, projects, etc.)
  await upsertActiveBrandMember(brandId, {
    userId: data.ownerId,
    email: '',
    displayName: '',
    role: 'owner',
    invitedAt: Timestamp.now(),
    status: 'active',
    joinedAt: Timestamp.now(),
  })

  return brandId
}

export async function getBrandsByUser(userId: string): Promise<{ owned: Brand[]; invited: Brand[] }> {
  await ensureFirestoreAuthReady()

  let ownedBrands: Brand[] = []
  try {
    ownedBrands = await getDocs<Brand>('brands', [where('ownerId', '==', userId)])
  } catch (error) {
    console.error('[firestore] Failed to query owned brands', error)
  }

  let memberships: BrandMember[] = []
  try {
    memberships = await getDocs<BrandMember>('brandMembers', [
      where('userId', '==', userId),
      where('status', '==', 'active'),
    ])
  } catch (error) {
    console.error('[firestore] Failed to query brand memberships', error)
  }

  const invitedBrands: Brand[] = []
  for (const membership of memberships) {
    if (!membership.brandId || ownedBrands.some((b) => b.id === membership.brandId)) continue

    try {
      await ensureCanonicalBrandMemberDoc(membership, userId)
      const brand = await getDoc<Brand>('brands', membership.brandId)
      if (brand) invitedBrands.push(brand)
    } catch (error) {
      console.warn(
        `[firestore] Skipping brand ${membership.brandId} — read denied or missing`,
        error
      )
    }
  }

  return { owned: ownedBrands, invited: invitedBrands }
}

export async function updateBrand(brandId: string, updates: Partial<Brand>): Promise<void> {
  await updateDoc<Brand>('brands', brandId, updates)
}

export async function getProjectsByBrand(brandId: string): Promise<Project[]> {
  try {
    // Try with orderBy first (requires index)
    return await getDocs<Project>('projects', [
      where('brandId', '==', brandId),
      orderBy('createdAt', 'desc'),
    ])
  } catch (error: any) {
    // If orderBy fails (missing index), fall back to just filtering
    if (error.message?.includes('index') || error.code === 'failed-precondition') {
      console.warn('Firestore index missing for projects query, using fallback')
      const projects = await getDocs<Project>('projects', [
        where('brandId', '==', brandId),
      ])
      // Sort manually
      return projects.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0
        const bTime = b.createdAt?.toMillis?.() || 0
        return bTime - aTime
      })
    }
    throw error
  }
}

export async function getProductsByProject(
  projectId: string
): Promise<Product[]> {
  return await getDocs<Product>('products', [
    where('projectId', '==', projectId),
    orderBy('createdAt', 'desc'),
  ])
}

export async function getProductsByBrand(brandId: string): Promise<Product[]> {
  try {
    // Try with orderBy first (requires index)
    return await getDocs<Product>('products', [
      where('brandId', '==', brandId),
      orderBy('createdAt', 'desc'),
    ])
  } catch (error: any) {
    // If orderBy fails (missing index), fall back to just filtering
    if (error.message?.includes('index') || error.code === 'failed-precondition') {
      console.warn('Firestore index missing for products query, using fallback')
      const products = await getDocs<Product>('products', [
        where('brandId', '==', brandId),
      ])
      // Sort manually
      return products.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0
        const bTime = b.createdAt?.toMillis?.() || 0
        return bTime - aTime
      })
    }
    throw error
  }
}

export async function updateProductStage(
  productId: string,
  newStage: Product['stage'],
  userId: string
): Promise<void> {
  try {
    const product = await getDoc<Product>('products', productId)
    if (!product) {
      throw new Error('Product not found')
    }

    const stageChange: StageChange = {
      from: product.stage,
      to: newStage,
      changedAt: Timestamp.now(),
      changedBy: userId,
    }

    await updateDoc<Product>('products', productId, {
      stage: newStage,
      stageHistory: [...product.stageHistory, stageChange],
      updatedAt: Timestamp.now(),
    } as Partial<Product>)
  } catch (error: any) {
    throw new Error(`Failed to update product stage: ${error.message}`)
  }
}

export async function getBrandMembers(brandId: string): Promise<BrandMember[]> {
  return await getDocs<BrandMember>('brandMembers', [
    where('brandId', '==', brandId),
  ])
}

export async function createInvite(
  brandId: string,
  email: string,
  role: BrandMember['role'],
  invitedBy: string
): Promise<string> {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  return await addDoc<BrandInvite>('brandInvites', {
    brandId,
    email: email.toLowerCase(),
    role,
    invitedBy,
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromDate(expiresAt),
    status: 'pending',
  } as Omit<BrandInvite, 'id'>)
}

export async function getInviteByToken(token: string): Promise<BrandInvite | null> {
  try {
    const invite = await getDoc<BrandInvite>('brandInvites', token)
    if (!invite) return null

    if (invite.status !== 'pending') {
      return invite
    }

    const now = Timestamp.now()
    if (invite.expiresAt < now) {
      await updateDoc<BrandInvite>('brandInvites', token, { status: 'expired' })
      return { ...invite, status: 'expired' }
    }

    return invite
  } catch (error: any) {
    throw new Error(`Failed to get invite: ${error.message}`)
  }
}

export async function acceptInvite(token: string, userId: string): Promise<void> {
  try {
    const invite = await getInviteByToken(token)
    if (!invite) {
      throw new Error('Invite not found')
    }

    if (invite.status !== 'pending') {
      throw new Error(`Invite is ${invite.status}`)
    }

    const now = Timestamp.now()
    if (invite.expiresAt < now) {
      await updateDoc<BrandInvite>('brandInvites', token, { status: 'expired' })
      throw new Error('Invite has expired')
    }

    const userProfile = await getDoc<UserProfile>('userProfiles', userId)
    if (!userProfile) {
      throw new Error('User profile not found')
    }

    // Verify that the logged-in user's email matches the invite email
    if (userProfile.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new Error('This invitation was sent to a different email address')
    }

    const existingMember = await getDocs<BrandMember>('brandMembers', [
      where('brandId', '==', invite.brandId),
      where('userId', '==', userId),
    ])

    if (existingMember.length > 0) {
      await updateDoc<BrandInvite>('brandInvites', token, { status: 'accepted' })
      return
    }

    await upsertActiveBrandMember(invite.brandId, {
      userId,
      email: invite.email,
      displayName: userProfile.displayName,
      role: invite.role,
      invitedAt: invite.createdAt,
      joinedAt: Timestamp.now(),
      status: 'active',
    })

    await updateDoc<BrandInvite>('brandInvites', token, { status: 'accepted' })
  } catch (error: any) {
    throw new Error(`Failed to accept invite: ${error.message}`)
  }
}

export async function removeMember(_brandId: string, memberId: string): Promise<void> {
  await deleteDoc('brandMembers', memberId)
}

export async function getPendingInvitesByEmail(email: string): Promise<BrandInvite[]> {
  try {
    const invites = await getDocs<BrandInvite>('brandInvites', [
      where('email', '==', email.toLowerCase()),
      where('status', '==', 'pending'),
    ])
    
    // Filter out expired invites
    const now = Timestamp.now()
    const validInvites = invites.filter((invite) => invite.expiresAt >= now)
    
    // Update expired invites
    const expiredInvites = invites.filter((invite) => invite.expiresAt < now)
    for (const invite of expiredInvites) {
      await updateDoc<BrandInvite>('brandInvites', invite.id, { status: 'expired' })
    }
    
    return validInvites
  } catch (error: any) {
    throw new Error(`Failed to get pending invites: ${error.message}`)
  }
}

/** Remove undefined values at all depths — Firestore rejects undefined anywhere in a document */
export function stripUndefinedDeep<T>(value: T): T {
  if (value === undefined) {
    return value
  }
  if (value === null || typeof value !== 'object') {
    return value
  }
  if (value instanceof Timestamp) {
    return value
  }
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedDeep(item)) as T
  }
  const out: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (entry !== undefined) {
      out[key] = stripUndefinedDeep(entry)
    }
  }
  return out as T
}

export async function getKlaviyoInsights(
  brandId: string
): Promise<MarketingKlaviyoInsights | null> {
  return getDoc<MarketingKlaviyoInsights>('marketingKlaviyoInsights', brandId)
}

export async function getMarketingEventsByBrand(brandId: string): Promise<MarketingEventRecord[]> {
  try {
    return await getDocs<MarketingEventRecord>('marketingEvents', [
      where('brandId', '==', brandId),
      orderBy('scheduledAt', 'asc'),
    ])
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string }
    if (err.message?.includes('index') || err.code === 'failed-precondition') {
      const events = await getDocs<MarketingEventRecord>('marketingEvents', [
        where('brandId', '==', brandId),
      ])
      return events.sort(
        (a, b) => (a.scheduledAt?.toMillis?.() || 0) - (b.scheduledAt?.toMillis?.() || 0)
      )
    }
    throw error
  }
}
