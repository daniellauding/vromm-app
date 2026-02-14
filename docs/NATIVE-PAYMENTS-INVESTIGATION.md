# Native Payments Investigation

## Goal
Replace Stripe with native Apple Pay (iOS) and Google Pay (Android) for all in-app purchases.

## Current Stripe Implementation

### Payment Use Cases
1. **Learning Paths Paywall** (`src/screens/HomeScreen/FeaturedContent/PayWall.tsx`)
   - Pay to unlock premium learning paths
   - Current: Stripe Payment Sheet
   - Price: $X USD (from `paywallPath.price_usd`)

2. **Featured Content** (`src/screens/HomeScreen/FeaturedContent2.tsx`)
   - Similar to learning paths
   - Stripe integration

3. **Progress Screen Payments** (`src/screens/ProgressScreen.tsx`)
   - Payment for progress tracking features
   - Stripe Payment Sheet

4. **Buy Me a Coffee** (Tips/Donations)
   - `src/AppContent.tsx`
   - `src/screens/HomeScreen/MyTab.tsx`
   - `src/components/PromotionModal.tsx`
   - **Current**: External link to https://buymeacoffee.com/vromm
   - **Should become**: Native in-app tip/donation

### Current Stripe Flow
```typescript
// Import
import { useStripe } from '@stripe/stripe-react-native';

// Init
const { initPaymentSheet, presentPaymentSheet } = useStripe();

// Setup
await initPaymentSheet({
  merchantDisplayName: 'Vromm Driving School',
  paymentIntentClientSecret: clientSecret, // from backend
  returnURL: 'vromm://stripe-redirect',
});

// Present
const { error } = await presentPaymentSheet();
```

---

## Native Payment Options

### Option A: Apple Pay + Google Pay (via Stripe)
**Keep Stripe backend, use native UI**

**Pros**:
- Minimal backend changes
- Stripe handles compliance
- Works globally
- One codebase

**Cons**:
- Still pays Stripe fees (~3%)
- Requires Stripe account

**Implementation**:
- Use `@stripe/stripe-react-native` with `applePay` and `googlePay` methods
- Native payment sheet UI (not Stripe UI)
- Same backend as now

### Option B: In-App Purchases (IAP)
**Apple: StoreKit, Android: Google Play Billing**

**Pros**:
- Truly native
- Required by app stores for digital goods
- Lower fees for subscriptions (15% first year, then 0% for some)
- Better UX (Face ID/Touch ID)

**Cons**:
- Must use IAP for **digital content** (learning paths, exercises)
- Requires backend changes (receipt validation)
- Different implementation per platform
- 30% fee for one-time purchases (15% for subscriptions)

**Implementation**:
- Use `react-native-iap` library
- Create products in App Store Connect + Google Play Console
- Validate receipts server-side

### Option C: Hybrid Approach
**IAP for digital goods + Stripe for physical/tips**

**Digital goods** (MUST use IAP per App Store guidelines):
- Learning path unlocks
- Exercise unlocks
- Premium features

**Physical/services** (CAN use Stripe):
- Buy Me a Coffee (tips)
- Driving lesson bookings (if implemented)
- Physical goods

---

## App Store Requirements (CRITICAL!)

### Apple App Store Guidelines 3.1.1
> **Apps must use In-App Purchase for:**
> - Unlocking features or functionality within the app
> - Digital content (books, audio, video, etc.)
> - Services used within the app

### Google Play Policy
> **In-app billing must be used for:**
> - Virtual currency
> - Virtual content (e.g., access to levels in a game)
> - Services provided within the app

### What this means for Vromm:
- ❌ **Cannot use Stripe for**: Learning path unlocks, exercise unlocks
- ✅ **Can use Stripe/external for**: Tips, donations, physical driving lessons

---

## Recommended Approach

### Phase 1: In-App Purchases (IAP) for Digital Goods
**Library**: `react-native-iap` (https://github.com/dooboolab/react-native-iap)

**Implementation**:
1. **Create Products** (App Store Connect + Google Play Console):
   - `com.vromm.learningpath.premium` - $4.99 (example)
   - `com.vromm.exercise.advanced` - $2.99 (example)
   - `com.vromm.subscription.monthly` - $9.99/month

2. **Frontend** (`src/services/iapService.ts`):
```typescript
import * as RNIap from 'react-native-iap';

// Available products
const PRODUCTS = {
  LEARNING_PATH: 'com.vromm.learningpath.premium',
  EXERCISE: 'com.vromm.exercise.advanced',
};

// Initialize
await RNIap.initConnection();

// Get available products
const products = await RNIap.getProducts({
  skus: Object.values(PRODUCTS),
});

// Purchase
const purchase = await RNIap.requestPurchase({
  sku: PRODUCTS.LEARNING_PATH,
});

// Finish transaction
await RNIap.finishTransaction({ purchase });
```

3. **Backend** (Supabase Edge Function):
```typescript
// Validate receipt (Apple/Google)
const isValid = await validateReceipt(receipt);

// Unlock content in database
await supabase
  .from('user_purchases')
  .insert({
    user_id,
    product_id,
    receipt,
    platform,
  });
```

### Phase 2: Native Tips (Buy Me a Coffee)
**Replace external link with in-app consumable IAP**

**Products**:
- `com.vromm.tip.small` - $1.99
- `com.vromm.tip.medium` - $4.99
- `com.vromm.tip.large` - $9.99

**Implementation**:
- Same as Phase 1 but with consumable products
- No unlock logic needed (just record tip)

---

## Migration Plan

### Step 1: Audit Current Payments
- [x] Identify all Stripe usage
- [ ] List all payment scenarios
- [ ] Determine which need IAP vs external

### Step 2: Setup IAP Products
- [ ] Create products in App Store Connect
- [ ] Create products in Google Play Console
- [ ] Note product IDs

### Step 3: Implement IAP Service
- [ ] Install `react-native-iap`
- [ ] Create `src/services/iapService.ts`
- [ ] Implement purchase flow
- [ ] Implement restore purchases

### Step 4: Backend Receipt Validation
- [ ] Create Supabase Edge Function
- [ ] Implement Apple receipt validation
- [ ] Implement Google receipt validation
- [ ] Store validated purchases

### Step 5: Replace Stripe UI
- [ ] PayWall.tsx → use IAP
- [ ] FeaturedContent2.tsx → use IAP
- [ ] ProgressScreen.tsx → use IAP
- [ ] Buy Me a Coffee → use IAP tips

### Step 6: Testing
- [ ] Test purchases (sandbox)
- [ ] Test restore purchases
- [ ] Test across platforms
- [ ] Test receipt validation

### Step 7: Cleanup
- [ ] Remove Stripe dependencies
- [ ] Update app.json config
- [ ] Remove Stripe backend code

---

## Technical Requirements

### iOS Setup (app.json)
```json
{
  "ios": {
    "infoPlist": {
      "SKAdNetworkItems": [
        { "SKAdNetworkIdentifier": "..." }
      ]
    },
    "config": {
      "usesNonExemptEncryption": false
    }
  }
}
```

### Android Setup (app.json)
```json
{
  "android": {
    "permissions": [
      "com.android.vending.BILLING"
    ]
  }
}
```

### Dependencies
```json
{
  "react-native-iap": "^12.10.0"
}
```

---

## Cost Comparison

### Stripe (Current)
- Fee: ~3% + $0.30 per transaction
- Example $4.99 purchase: Keep $4.54 (91%)

### Apple IAP
- Fee: 30% for first purchase, 15% for subscriptions after year 1
- Example $4.99 purchase: Keep $3.49 (70%)
- Example $9.99/mo subscription: Keep $8.49 (85% after year 1)

### Google Play Billing
- Fee: 30% for first purchase, 15% for subscriptions
- Same as Apple

### Verdict
- **One-time purchases**: Stripe is cheaper (91% vs 70%)
- **Subscriptions**: IAP better long-term (85% vs 91%)
- **BUT**: IAP is **required** for digital goods (no choice!)

---

## Next Steps

1. **Create sub-agents** to investigate each part:
   - `iap-implementation` - Setup react-native-iap
   - `receipt-validation` - Backend validation
   - `ui-migration` - Replace Stripe UI
   - `testing-qa` - Test purchases

2. **Prototype** with one payment flow (learning paths)

3. **Rollout** gradually (feature flag?)

---

## Questions to Answer

1. **Subscriptions**: Do we want recurring subscriptions?
2. **Free trials**: Offer 7-day free trial?
3. **Pricing tiers**: Different prices per region?
4. **Restore purchases**: How to handle users who change devices?
5. **Family Sharing**: Allow IAP sharing across family?

---

## Resources

- `react-native-iap` docs: https://github.com/dooboolab/react-native-iap
- Apple IAP guide: https://developer.apple.com/in-app-purchase/
- Google Play Billing: https://developer.android.com/google/play/billing
- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/#payments
