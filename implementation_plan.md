# Platform Revenue & Payment Milestones

This document outlines the plan to implement a new feature for tracking revenue and payment milestones per platform on the album detail page, and to fix the existing revenue split persistence issue.

## User Review Required

> [!IMPORTANT]
> - A new database migration will be required to create the `PlatformRevenue` and `PlatformPayment` tables.
> - The new "Platform Revenue" tab will show how much revenue has been generated per platform, how much has been paid out, and calculate the unpaid balance.
> - It will also calculate exactly how much of the unpaid balance is owed to each artist based on the current Revenue Split settings.

## Proposed Changes

---

### Backend Schema Updates

#### [MODIFY] prisma/schema.prisma
Add two new models to track revenue and payments separately for each platform:
```prisma
model PlatformRevenue {
  id           String   @id @default(cuid())
  albumId      String
  platform     String   // "spotify", "youtube_music", "apple_music", "tiktok"
  totalRevenue Float    @default(0)
  updatedAt    DateTime @updatedAt

  album Album @relation(fields: [albumId], references: [id], onDelete: Cascade)

  @@unique([albumId, platform])
  @@map("platform_revenues")
}

model PlatformPayment {
  id        String   @id @default(cuid())
  albumId   String
  platform  String   // "spotify", "youtube_music", "apple_music", "tiktok"
  amount    Float
  note      String?
  paidAt    DateTime @default(now())

  album Album @relation(fields: [albumId], references: [id], onDelete: Cascade)

  @@map("platform_payments")
}
```
*I will also add the relations to the `Album` model.*

---

### Backend API Updates

#### [MODIFY] src/models/prisma.ts
- Add `upsertPlatformRevenue(albumId, platform, totalRevenue)`
- Add `addPlatformPayment(albumId, platform, amount, note)`
- Update `getAlbumDetail` to include `platformRevenues` and `platformPayments`.
- Identify and fix why `setRevenueSplits` is silently failing or why data is not persisting.

#### [MODIFY] src/controllers/albumController.ts
- Create `updatePlatformRevenue` endpoint logic.
- Create `addPlatformPayment` endpoint logic.

#### [MODIFY] src/routes/albumRoutes.ts
- Expose `PUT /:id/revenue/:platform`
- Expose `POST /:id/payments/:platform`

---

### Frontend Updates

#### [MODIFY] lib/api.ts
- Add client methods: `updatePlatformRevenue`, `addPlatformPayment`.

#### [MODIFY] components/admin/album-detail-client.tsx
- Add a new tab `Platform Revenue` next to the `Revenue Split` tab.
- Render 4 cards for each platform (Spotify, YouTube Music, Apple Music, TikTok).
- Inside each platform card:
  - Input field to update **Total Revenue** generated to date.
  - Display **Total Paid** (sum of all `PlatformPayment` amounts for that platform).
  - Display **Unpaid Balance** (Total Revenue - Total Paid).
  - Breakdown the Unpaid Balance by artist (using the Revenue Split percentages).
  - A button to **Log New Payment** (opens a dialog to input amount and note).
  - A section showing the **Payment History** (list of past payments with dates and amounts).

## Verification Plan

### Automated Tests
1. Generate the Prisma client and run the database migration.
2. Start the backend server and ensure no compilation errors.

### Manual Verification
1. Navigate to an Album Detail page.
2. Go to the Revenue Split tab, change the split to 50/50, save, and reload the page. Verify the split persists (Bug Fix).
3. Go to the Platform Revenue tab.
4. Input $1000 Total Revenue for Spotify.
5. Verify Unpaid Balance shows $1000, and $500 is owed to each artist (based on 50/50 split).
6. Log a payment of $400 for Spotify.
7. Verify Total Paid is $400, Unpaid Balance is $600, and it shows $300 owed to each artist.
8. Verify the payment appears in the history list.
