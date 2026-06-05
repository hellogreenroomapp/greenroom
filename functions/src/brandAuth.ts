import * as admin from 'firebase-admin'

const db = () => admin.firestore()

export async function isBrandOwnerOrAdmin(brandId: string, userId: string): Promise<boolean> {
  const brandSnap = await db().collection('brands').doc(brandId).get()
  if (!brandSnap.exists) return false
  const brand = brandSnap.data()
  if (brand?.ownerId === userId) return true

  const members = await db()
    .collection('brandMembers')
    .where('brandId', '==', brandId)
    .where('userId', '==', userId)
    .where('status', '==', 'active')
    .limit(1)
    .get()

  if (members.empty) return false
  const role = members.docs[0].data()?.role
  return role === 'owner' || role === 'admin'
}

export async function updateBrandMarketingKlaviyo(
  brandId: string,
  patch: Record<string, unknown>
): Promise<void> {
  const brandRef = db().collection('brands').doc(brandId)
  const snap = await brandRef.get()
  if (!snap.exists) throw new Error('Brand not found')

  const marketing = (snap.data()?.marketing as Record<string, unknown>) || {}
  const klaviyo = { ...((marketing.klaviyo as Record<string, unknown>) || {}), ...patch }

  for (const key of Object.keys(klaviyo)) {
    if (klaviyo[key] === null || klaviyo[key] === undefined) {
      delete klaviyo[key]
    }
  }

  await brandRef.update({
    marketing: {
      ...marketing,
      klaviyo,
    },
  })
}
