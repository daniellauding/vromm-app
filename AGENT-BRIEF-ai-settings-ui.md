# Agent Brief: AI Settings UI

**Agent ID:** ai-settings-ui-vromm  
**Phase:** Phase 1 - MVP  
**Duration:** 2 days  
**Branch:** feature/ai-assistant-implementation

---

## Mission

Build the AI Assistant settings screen where users can manage their tier, add API keys (BYOK), view usage, and configure preferences.

---

## Scope

### In Scope ✅
1. **AISettingsScreen.tsx** - Main settings screen
2. **Tier Display** - Show current tier (Free/BYOK/Premium)
3. **API Key Management** - Add/edit/delete user API keys (BYOK only)
4. **Usage Dashboard** - Daily/monthly usage display
5. **Upgrade Prompts** - CTAs for Premium or BYOK
6. **Provider Selection** - Choose preferred AI provider

### Out of Scope ❌
- Subscription payment flow (use existing IAP system)
- Chat UI (handled by ai-chat-ui-vromm agent)
- Backend logic (handled by ai-backend-vromm agent)

---

## Technical Requirements

### Stack
- **Framework:** React Native (Expo)
- **UI Library:** Tamagui
- **Navigation:** React Navigation (Settings stack)
- **State:** React Context (sync with backend)
- **Secure Storage:** expo-secure-store (API keys)

### File Structure
```
src/
  screens/
    AISettingsScreen.tsx          # Main settings screen
  components/
    ai-settings/
      TierBadge.tsx                # Visual tier indicator
      APIKeyInput.tsx              # Secure API key input
      UsageMeter.tsx               # Progress bar for usage
      UpgradePrompt.tsx            # CTA for Premium/BYOK
      ProviderSelector.tsx         # Radio buttons for provider
  services/
    aiSettingsService.ts          # API calls to backend
```

---

## UI Design

### Screen Layout

```
┌─────────────────────────────────────┐
│  ← AI Assistant Settings            │
├─────────────────────────────────────┤
│  Current Tier                       │
│  ┌───────────────────────────────┐  │
│  │  🟢 Free Tier                 │  │
│  │  10 queries per day           │  │
│  └───────────────────────────────┘  │
│                                     │
│  Usage This Month                   │
│  ┌───────────────────────────────┐  │
│  │  ████████░░░░░░░░ 120/300     │  │
│  │  You've used 120 queries      │  │
│  └───────────────────────────────┘  │
│                                     │
│  Upgrade Options                    │
│  ┌───────────────────────────────┐  │
│  │  Premium - $4.99/month        │  │
│  │  100 queries/day              │  │
│  │  [Upgrade Now]                │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  Add Your API Key             │  │
│  │  Unlimited queries            │  │
│  │  [Setup BYOK]                 │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### BYOK Setup Flow

```
┌─────────────────────────────────────┐
│  ← BYOK Setup                       │
├─────────────────────────────────────┤
│  Step 1: Choose Provider            │
│  ○ OpenAI (GPT-4o)                  │
│  ◉ Anthropic (Claude Sonnet 4) ✓   │
│  ○ Google (Gemini 2.5 Pro)          │
│                                     │
│  Step 2: Enter API Key              │
│  ┌───────────────────────────────┐  │
│  │ sk-ant-api03-... [👁]         │  │
│  └───────────────────────────────┘  │
│  💡 Your key is encrypted         │
│                                     │
│  [Test Connection]  [Save]          │
└─────────────────────────────────────┘
```

---

## Component Details

### TierBadge.tsx
```typescript
interface TierBadgeProps {
  tier: 'free' | 'byok' | 'premium';
  dailyUsage: number;
  limit: number;
}

export function TierBadge({ tier, dailyUsage, limit }: TierBadgeProps) {
  const colors = {
    free: '$gray10',
    byok: '$blue10',
    premium: '$gold10',
  };

  const labels = {
    free: 'Free Tier',
    byok: 'BYOK (Unlimited)',
    premium: 'Premium',
  };

  return (
    <YStack backgroundColor={colors[tier]} borderRadius="$4" padding="$4">
      <XStack alignItems="center" gap="$2">
        <Text fontSize="$5" fontWeight="bold">
          {labels[tier]}
        </Text>
        <Badge>{`${dailyUsage}/${limit === Infinity ? '∞' : limit}`}</Badge>
      </XStack>
      <Text fontSize="$2" opacity={0.7}>
        {tier === 'free' && 'Upgrade for more queries'}
        {tier === 'byok' && 'Using your API key'}
        {tier === 'premium' && '100 queries per day'}
      </Text>
    </YStack>
  );
}
```

### APIKeyInput.tsx
```typescript
interface APIKeyInputProps {
  provider: 'openai' | 'anthropic' | 'google';
  value: string;
  onChange: (value: string) => void;
  onTest: () => Promise<boolean>;
}

export function APIKeyInput({ provider, value, onChange, onTest }: APIKeyInputProps) {
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);

  const placeholders = {
    openai: 'sk-proj-...',
    anthropic: 'sk-ant-api03-...',
    google: 'AIza...',
  };

  const handleTest = async () => {
    setTesting(true);
    const result = await onTest();
    setTestResult(result);
    setTesting(false);
  };

  return (
    <YStack gap="$2">
      <Label>
        {provider === 'openai' && 'OpenAI API Key'}
        {provider === 'anthropic' && 'Anthropic API Key'}
        {provider === 'google' && 'Google API Key'}
      </Label>
      <XStack gap="$2">
        <Input
          flex={1}
          value={value}
          onChangeText={onChange}
          placeholder={placeholders[provider]}
          secureTextEntry={!showKey}
        />
        <Button
          icon={showKey ? EyeOff : Eye}
          onPress={() => setShowKey(!showKey)}
          variant="outlined"
        />
      </XStack>
      <XStack gap="$2">
        <Button onPress={handleTest} disabled={!value || testing} size="small">
          {testing ? 'Testing...' : 'Test Connection'}
        </Button>
        {testResult !== null && (
          <Text color={testResult ? '$green10' : '$red10'}>
            {testResult ? '✓ Valid' : '✗ Invalid'}
          </Text>
        )}
      </XStack>
    </YStack>
  );
}
```

### UsageMeter.tsx
```typescript
interface UsageMeterProps {
  current: number;
  limit: number;
  period: 'daily' | 'monthly';
}

export function UsageMeter({ current, limit, period }: UsageMeterProps) {
  const percentage = limit === Infinity ? 0 : (current / limit) * 100;
  const color = percentage > 80 ? '$red10' : percentage > 50 ? '$orange10' : '$green10';

  return (
    <YStack gap="$2">
      <XStack justifyContent="space-between">
        <Text fontSize="$3" fontWeight="500">
          {period === 'daily' ? 'Today' : 'This Month'}
        </Text>
        <Text fontSize="$3" color="$gray10">
          {current}/{limit === Infinity ? '∞' : limit} queries
        </Text>
      </XStack>
      <Progress value={percentage} backgroundColor={color}>
        <Progress.Indicator animation="bouncy" backgroundColor={color} />
      </Progress>
    </YStack>
  );
}
```

### UpgradePrompt.tsx
```typescript
interface UpgradePromptProps {
  currentTier: 'free' | 'byok' | 'premium';
  onUpgradePremium: () => void;
  onSetupBYOK: () => void;
}

export function UpgradePrompt({ currentTier, onUpgradePremium, onSetupBYOK }: UpgradePromptProps) {
  if (currentTier !== 'free') return null;

  return (
    <YStack gap="$3">
      <Text fontSize="$5" fontWeight="bold">
        Upgrade Options
      </Text>

      {/* Premium Option */}
      <Card padding="$4" backgroundColor="$blue2" borderColor="$blue7" borderWidth={1}>
        <YStack gap="$2">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$4" fontWeight="600">
              Premium
            </Text>
            <Text fontSize="$5" fontWeight="bold" color="$blue10">
              $4.99/month
            </Text>
          </XStack>
          <Text fontSize="$2" color="$gray11">
            • 100 queries per day
          </Text>
          <Text fontSize="$2" color="$gray11">
            • Priority processing
          </Text>
          <Text fontSize="$2" color="$gray11">
            • Support email
          </Text>
          <Button onPress={onUpgradePremium} backgroundColor="$blue10" marginTop="$2">
            Upgrade Now
          </Button>
        </YStack>
      </Card>

      {/* BYOK Option */}
      <Card padding="$4" backgroundColor="$gray2" borderColor="$gray7" borderWidth={1}>
        <YStack gap="$2">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$4" fontWeight="600">
              Bring Your Own Key
            </Text>
            <Text fontSize="$5" fontWeight="bold" color="$green10">
              Free
            </Text>
          </XStack>
          <Text fontSize="$2" color="$gray11">
            • Unlimited queries
          </Text>
          <Text fontSize="$2" color="$gray11">
            • Use your own OpenAI/Claude/Gemini key
          </Text>
          <Text fontSize="$2" color="$gray11">
            • Full privacy control
          </Text>
          <Button onPress={onSetupBYOK} variant="outlined" marginTop="$2">
            Setup BYOK
          </Button>
        </YStack>
      </Card>
    </YStack>
  );
}
```

---

## Integration Points

### Navigation
Add route to Settings stack:
```typescript
// src/navigation/SettingsNavigator.tsx
<Stack.Screen name="AISettings" component={AISettingsScreen} />
```

### Settings Menu Entry
Add button in main Settings screen:
```typescript
<ListItem
  title="AI Assistant"
  icon={<Bot />}
  onPress={() => navigation.navigate('AISettings')}
/>
```

---

## API Integration

### Service Layer (`aiSettingsService.ts`)
```typescript
export async function getUserAISettings() {
  const { data, error } = await supabase
    .from('user_ai_settings')
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateTier(tier: 'free' | 'byok' | 'premium') {
  const { data, error } = await supabase
    .from('user_ai_settings')
    .update({ tier })
    .eq('user_id', supabase.auth.user()?.id);

  if (error) throw error;
  return data;
}

export async function saveAPIKey(provider: string, encryptedKey: string) {
  const { data: settings } = await getUserAISettings();
  
  const updatedKeys = {
    ...settings.encrypted_api_keys,
    [provider]: encryptedKey,
  };

  const { data, error } = await supabase
    .from('user_ai_settings')
    .update({ encrypted_api_keys: updatedKeys, tier: 'byok' })
    .eq('user_id', supabase.auth.user()?.id);

  if (error) throw error;
  return data;
}

export async function testAPIKey(provider: string, apiKey: string): Promise<boolean> {
  // Call Edge Function to test key
  const { data, error } = await supabase.functions.invoke('test-api-key', {
    body: { provider, apiKey },
  });

  return data?.valid === true;
}
```

---

## Testing Checklist

- [ ] Settings screen renders correctly
- [ ] Tier badge shows current tier
- [ ] Usage meter updates in real-time
- [ ] API key input shows/hides correctly
- [ ] Test connection button validates keys
- [ ] Upgrade buttons navigate correctly
- [ ] BYOK setup flow works end-to-end
- [ ] Provider selection saves correctly

---

## Acceptance Criteria

1. ✅ Settings screen accessible from main Settings menu
2. ✅ Tier badge displays current tier (Free/BYOK/Premium)
3. ✅ Usage meter shows daily/monthly usage
4. ✅ API key inputs work securely (encrypted storage)
5. ✅ Test connection validates API keys
6. ✅ Upgrade prompts link to subscription flow
7. ✅ BYOK setup flow completes successfully
8. ✅ Provider selection persists to database

---

## Dependencies

**Needs:** ai-database-vromm (schema), ai-backend-vromm (test-api-key function)  
**Blocks:** None (can be tested independently)

---

## Deliverables

1. `src/screens/AISettingsScreen.tsx` - Main screen
2. `src/components/ai-settings/TierBadge.tsx` - Tier indicator
3. `src/components/ai-settings/APIKeyInput.tsx` - Key input
4. `src/components/ai-settings/UsageMeter.tsx` - Usage display
5. `src/components/ai-settings/UpgradePrompt.tsx` - Upgrade CTAs
6. `src/components/ai-settings/ProviderSelector.tsx` - Provider picker
7. `src/services/aiSettingsService.ts` - API wrapper

**Total estimated:** ~600 lines of code

---

**Status:** 🟢 Ready to start  
**Priority:** P1 (important but not blocking)  
**Estimated Time:** 2 days
