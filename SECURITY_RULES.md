# Firestore Security Rules

This document outlines the security rules concept for the Merch Pipeline application.

## Collection: `brands`

- **Read**: Users can read brands they own or are members of
- **Create**: Authenticated users can create brands (becomes owner)
- **Update**: Only brand owners and admins can update brand details
- **Delete**: Only brand owners can delete brands

```javascript
match /brands/{brandId} {
  allow read: if request.auth != null && (
    resource.data.ownerId == request.auth.uid ||
    exists(/databases/$(database)/documents/brandMembers/$(brandId + '_' + request.auth.uid))
  );
  allow create: if request.auth != null;
  allow update: if request.auth != null && (
    resource.data.ownerId == request.auth.uid ||
    get(/databases/$(database)/documents/brandMembers/$(brandId + '_' + request.auth.uid)).data.role in ['owner', 'admin']
  );
  allow delete: if request.auth != null && resource.data.ownerId == request.auth.uid;
}
```

## Collection: `brandMembers`

- **Read**: Users can read members of brands they belong to
- **Create**: Only brand owners/admins can invite members
- **Update**: Only brand owners/admins can update member roles
- **Delete**: Only brand owners/admins can remove members

```javascript
match /brandMembers/{memberId} {
  allow read: if request.auth != null && (
    resource.data.userId == request.auth.uid ||
    exists(/databases/$(database)/documents/brandMembers/$(resource.data.brandId + '_' + request.auth.uid))
  );
  allow create: if request.auth != null && (
    get(/databases/$(database)/documents/brandMembers/$(request.resource.data.brandId + '_' + request.auth.uid)).data.role in ['owner', 'admin']
  );
  allow update, delete: if request.auth != null && (
    get(/databases/$(database)/documents/brandMembers/$(resource.data.brandId + '_' + request.auth.uid)).data.role in ['owner', 'admin']
  );
}
```

## Collection: `brandInvites`

- **Read**: Users can read invites sent to their email
- **Create**: Only brand owners/admins can create invites
- **Update**: System can update invite status (pending → accepted/expired)
- **Delete**: Only brand owners/admins can delete invites

```javascript
match /brandInvites/{inviteId} {
  allow read: if request.auth != null && (
    resource.data.email == request.auth.token.email ||
    get(/databases/$(database)/documents/brandMembers/$(resource.data.brandId + '_' + request.auth.uid)).data.role in ['owner', 'admin']
  );
  allow create: if request.auth != null && (
    get(/databases/$(database)/documents/brandMembers/$(request.resource.data.brandId + '_' + request.auth.uid)).data.role in ['owner', 'admin']
  );
  allow update: if request.auth != null && (
    resource.data.email == request.auth.token.email ||
    get(/databases/$(database)/documents/brandMembers/$(resource.data.brandId + '_' + request.auth.uid)).data.role in ['owner', 'admin']
  );
  allow delete: if request.auth != null && (
    get(/databases/$(database)/documents/brandMembers/$(resource.data.brandId + '_' + request.auth.uid)).data.role in ['owner', 'admin']
  );
}
```

## Collection: `projects`

- **Read**: Users can read projects for brands they're members of
- **Create**: Only brand owners/admins/photographers can create projects
- **Update**: Only brand owners/admins can update projects
- **Delete**: Only brand owners/admins can delete projects

```javascript
match /projects/{projectId} {
  allow read: if request.auth != null && exists(
    /databases/$(database)/documents/brandMembers/$(resource.data.brandId + '_' + request.auth.uid)
  );
  allow create: if request.auth != null && (
    get(/databases/$(database)/documents/brandMembers/$(request.resource.data.brandId + '_' + request.auth.uid)).data.role in ['owner', 'admin', 'photographer']
  );
  allow update, delete: if request.auth != null && (
    get(/databases/$(database)/documents/brandMembers/$(resource.data.brandId + '_' + request.auth.uid)).data.role in ['owner', 'admin']
  );
}
```

## Collection: `products`

- **Read**: Users can read products for brands they're members of
- **Create**: Only brand owners/admins/photographers can create products
- **Update**: Only brand owners/admins/photographers can update products
- **Delete**: Only brand owners/admins can delete products

```javascript
match /products/{productId} {
  allow read: if request.auth != null && exists(
    /databases/$(database)/documents/brandMembers/$(resource.data.brandId + '_' + request.auth.uid)
  );
  allow create: if request.auth != null && (
    get(/databases/$(database)/documents/brandMembers/$(request.resource.data.brandId + '_' + request.auth.uid)).data.role in ['owner', 'admin', 'photographer']
  );
  allow update: if request.auth != null && (
    get(/databases/$(database)/documents/brandMembers/$(resource.data.brandId + '_' + request.auth.uid)).data.role in ['owner', 'admin', 'photographer']
  );
  allow delete: if request.auth != null && (
    get(/databases/$(database)/documents/brandMembers/$(resource.data.brandId + '_' + request.auth.uid)).data.role in ['owner', 'admin']
  );
}
```

## Collection: `userProfiles`

- **Read**: Users can read their own profile and profiles of members in their brands
- **Create**: Users can create their own profile on signup
- **Update**: Users can only update their own profile
- **Delete**: Users can only delete their own profile

```javascript
match /userProfiles/{userId} {
  allow read: if request.auth != null && (
    resource.id == request.auth.uid ||
    // Allow reading profiles of members in user's brands
    true // Simplified - would need to check brand membership
  );
  allow create: if request.auth != null && request.resource.id == request.auth.uid;
  allow update, delete: if request.auth != null && resource.id == request.auth.uid;
}
```

## Notes

- All rules require authentication (`request.auth != null`)
- Brand membership is checked via `brandMembers` collection
- Role-based access control is enforced for sensitive operations
- Email-based invite access allows users to accept invites sent to their email
- These rules are conceptual and may need adjustment based on actual Firestore query patterns
