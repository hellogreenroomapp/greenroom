# Database Structure: Products, Colors, and Catalogue

## Current Structure

### Product Document (Firestore Collection: `products`)
```typescript
{
  id: string                    // Firestore document ID
  brandId: string              // Reference to brand
  projectId: string            // Reference to collection/project
  sku: string                  // Product SKU (NOT unique - can have duplicates)
  name: string                 // Product name
  colors?: ProductColor[]      // Colors for THIS product variant
  // ... other fields
}
```

### ProductColor
```typescript
{
  name: string                 // Color name (e.g., "Black", "Navy")
  complete: boolean           // Whether this color is complete
}
```

## Design Decisions

### 1. Colors Storage
**Decision**: Colors are stored **at the Product level**, not at the SKU level.

**Rationale**:
- Each product variant can have different colors
- Allows flexibility - some variants might have different color availability
- Colors can be tracked per variant (completion status)
- When grouping by SKU for catalogue, we merge colors from all variants

### 2. SKU Uniqueness
**Decision**: SKU is **NOT unique** - multiple products can share the same SKU.

**Rationale**:
- Different product variants (sizes, colors, etc.) can share a base SKU
- Each variant is tracked separately through the pipeline
- Catalogue view groups by SKU to show unified product

### 3. Catalogue View
**Decision**: Catalogue is a **view/query pattern**, not a separate collection.

**Rationale**:
- No need for duplicate data storage
- Query products by brand, group by SKU
- Merge colors from all products with same SKU
- Display as unified catalogue entry

## Implementation

### Firestore Structure
```
products/
  ├── {productId1}
  │   ├── sku: "ARC-124"
  │   ├── name: "Arc Tee"
  │   ├── colors: [{name: "Black", complete: true}, {name: "Navy", complete: false}]
  │   └── ...
  ├── {productId2}
  │   ├── sku: "ARC-124"      // Same SKU!
  │   ├── name: "Arc Tee"
  │   ├── colors: [{name: "Red", complete: true}]
  │   └── ...
```

### Catalogue Query Pattern
```typescript
// 1. Fetch all products for a brand
const products = await getProductsByBrand(brandId)

// 2. Group by SKU
const groupedBySku = groupProductsBySku(products)

// 3. Merge colors from all variants
const catalogueProducts = Object.values(groupedBySku).map(group => ({
  sku: group.sku,
  name: group.name,
  colors: mergeColors(group.products), // Merge and deduplicate colors
  variants: group.products,             // All product variants
  // ... other merged fields
}))
```

### Color Merging Logic
```typescript
function mergeColors(products: Product[]): ProductColor[] {
  const colorMap = new Map<string, ProductColor>()
  
  products.forEach(product => {
    product.colors?.forEach(color => {
      const existing = colorMap.get(color.name.toLowerCase())
      if (!existing) {
        colorMap.set(color.name.toLowerCase(), { ...color })
      } else {
        // If any variant has this color complete, mark as complete
        existing.complete = existing.complete || color.complete
      }
    })
  })
  
  return Array.from(colorMap.values())
}
```

## Benefits

1. **Flexibility**: Each product variant can have its own colors
2. **No Data Duplication**: Single source of truth
3. **Pipeline Tracking**: Each variant tracked separately
4. **Catalogue View**: Clean grouping by SKU when needed
5. **Scalability**: Easy to add more variants without schema changes

## Future Considerations

If needed later, we could add:
- **Index**: Firestore index on `(brandId, sku)` for faster catalogue queries
- **Cached Catalogue**: Store grouped catalogue in a separate collection if query performance becomes an issue
- **SKU Metadata**: Optional collection for SKU-level metadata (base name, description, etc.)
