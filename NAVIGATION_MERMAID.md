# VROMM App Navigation Architecture

## 1. Main Navigation Flow (Mermaid)

```mermaid
graph TB
    %% Styling
    classDef tabItem fill:#3D4140,stroke:#69e3c4,color:#fff
    classDef createTab fill:#1A3D3D,stroke:#69e3c4,stroke-width:3px,color:#69e3c4
    classDef modal fill:#FF9500,stroke:#fff,color:#fff
    classDef screen fill:#4CAF50,stroke:#fff,color:#fff
    classDef hiddenTab fill:#2196F3,stroke:#fff,stroke-width:2px,color:#fff
    classDef draft fill:#FF9500,stroke:#fff,color:#fff
    classDef wizard fill:#9C27B0,stroke:#fff,stroke-width:3px,color:#fff
    classDef recording fill:#FF5722,stroke:#fff,color:#fff

    %% Tab Navigator
    TabNav[TabNavigator - Bottom Tabs]
    TabNav --> HomeTab[🏠 HomeTab]:::tabItem
    TabNav --> ExploreTab[🗺️ ExploreTab]:::tabItem
    TabNav --> CreateTab[➕ CreateTab]:::createTab
    TabNav --> SchoolTab[🎓 SchoolTab]:::tabItem
    TabNav --> MenuTab[☰ MenuTab]:::tabItem

    %% Home Stack
    HomeTab --> HomeScreen[HomeScreen]:::screen
    HomeScreen --> DraftRoutes[DraftRoutes Section<br/>is_draft=true]:::draft
    HomeScreen --> CreatedRoutes[CreatedRoutes Section]:::screen
    
    HomeScreen --> CreateRoute[CreateRouteScreen<br/>Tab Hidden]:::hiddenTab
    HomeScreen --> RouteDetail[RouteDetailScreen<br/>Tab Hidden]:::hiddenTab
    HomeScreen --> RouteList[RouteListScreen]:::screen
    HomeScreen --> Conversation[ConversationScreen<br/>Tab Hidden]:::hiddenTab

    %% Explore Stack
    ExploreTab --> MapScreen[MapScreen]:::screen
    MapScreen --> RoutesDrawer[RoutesDrawer]:::screen
    
    %% Create Modal Flow
    CreateTab -.->|Opens Modal| ActionSheet[ActionSheetModal]:::modal
    ActionSheet --> RouteWizard[RouteWizardSheet<br/>NEW Multi-step]:::wizard
    ActionSheet --> RecordDriving[RecordDrivingSheet<br/>Emergency Draft Save]:::recording
    ActionSheet --> CreateEvent[Create Event]:::modal
    
    %% Draft Flow
    DraftRoutes -->|View/Edit| RouteDetail
    CreateRoute -->|Save as Draft| DraftSave[Draft Saved<br/>is_draft=true]:::draft
    RecordDriving -->|Auto-save| EmergencyDraft[Emergency Draft<br/>AsyncStorage]:::draft
```

## 2. Tab Visibility State Machine

```mermaid
stateDiagram-v2
    [*] --> TabsVisible: App Start
    
    TabsVisible --> TabsHidden: Navigate to Hidden Screen
    TabsHidden --> TabsVisible: Navigate Back
    
    state TabsVisible {
        HomeScreen
        MapScreen
        SchoolScreen
        ProfileScreen
        --
        RouteListScreen
        EventsScreen
    }
    
    state TabsHidden {
        CreateRouteScreen
        RouteDetailScreen
        ConversationScreen
        PublicProfile
        EventDetail
    }
    
    note right of TabsHidden
        isTabBarVisible = false
        tabBarStyle: { display: 'none' }
    end note
    
    note left of TabsVisible
        isTabBarVisible = true
        tabBarStyle: normal
    end note
```

## 3. RouteWizardSheet Flow

```mermaid
flowchart LR
    Start([User Taps Create]) --> ActionSheet[ActionSheetModal]
    ActionSheet --> WizardChoice{Choose Action}
    
    WizardChoice -->|Quick Route| Wizard[RouteWizardSheet]
    WizardChoice -->|Full Create| CreateRoute[CreateRouteScreen]
    WizardChoice -->|Record| RecordSheet[RecordDrivingSheet]
    
    Wizard --> Step1[1. MapInteractionStep<br/>Draw/Pin/Waypoint/Record]
    Step1 --> Step2[2. BasicInfoStep<br/>Name & Description]
    Step2 --> Step3[3. ExercisesStep<br/>Add Exercises]
    Step3 --> Step4[4. MediaStep<br/>Photos/Videos]
    Step4 --> Step5[5. ReviewStep<br/>Final Review]
    
    Step5 --> Save{Save Options}
    Save -->|Publish| Published[Route Published<br/>is_draft=false]
    Save -->|Draft| Draft[Route Draft<br/>is_draft=true]
    Save -->|Maximize| CreateRoute
```

## 4. Draft Mode Lifecycle

```mermaid
sequenceDiagram
    participant User
    participant CreateRoute
    participant Supabase
    participant HomeScreen
    participant AsyncStorage

    %% Create Draft Flow
    User->>CreateRoute: Start creating route
    User->>CreateRoute: Click "Save as Draft"
    CreateRoute->>Supabase: INSERT route with is_draft=true
    Supabase-->>CreateRoute: Return draft ID
    CreateRoute-->>User: Show success toast
    CreateRoute->>HomeScreen: Navigate back

    %ערן Load Drafts
    User->>HomeScreen: View home
    HomeScreen->>Supabase: SELECT WHERE is_draft=true
    Supabase-->>HomeScreen: Return drafts
    HomeScreen-->>User: Display DraftRoutes section

    %% Emergency Save
    User->>CreateRoute: Creating route...
    CreateRoute->>CreateRoute: App goes to background
    CreateRoute->>AsyncStorage: Save emergency draft
    CreateRoute->>CreateRoute: App crashes
    User->>CreateRoute: Reopen app
    CreateRoute->>AsyncStorage: Check for recovery
    AsyncStorage-->>CreateRoute: Return draft data
    CreateRoute-->>User: Prompt to recover
```

## 5. Navigation Stack Hierarchy

```mermaid
graph TD
    Root[Root Navigator]
    Root --> Main[Main Tab Navigator]
    Root --> Modals[Modal Stack]
    
    Main --> Home[Home Stack]
    Main --> Explore[Explore Stack]
    Main --> School[School Stack]
    Main --> Menu[Menu Stack]
    
    Home --> HS1[HomeScreen]
    Home --> HS2[CreateRouteScreen]
    Home --> HS3[RouteDetailScreen]
    Home --> HS4[RouteListScreen]
    Home --> HS5[ConversationScreen]
    
    Explore --> ES1[MapScreen]
    Explore --> ES2[RoutesDrawer]
    
    Modals --> M1[ActionSheetModal]
    Modals --> M2[RouteWizardSheet]
    Modals --> M3[RecordDrivingSheet]
    Modals --> M4[OnboardingModal]
    Modals --> M5[ExitConfirmModal]
    
    style Root fill:#1e1e1e,stroke:#fff,color:#fff
    style Main fill:#2D3130,stroke:#69e3c4,color:#69e3c4
    style Modals fill:#1A1A1A,stroke:#FF9500,color:#FF9500
```

## 6. Component Communication Flow

```mermaid
graph LR
    subgraph Contexts
        Auth[AuthContext]
        Location[LocationContext]
        Modal[ModalContext]
        Toast[ToastContext]
        Translation[TranslationContext]
    end
    
    subgraph Screens
        Create[CreateRouteScreen]
        Home[HomeScreen]
        Detail[RouteDetailScreen]
    end
    
    subgraph Components
        Tab[TabNavigator]
        Draft[DraftRoutes]
        Wizard[RouteWizardSheet]
    end
    
    subgraph Storage
        Supa[Supabase]
        Async[AsyncStorage]
    end
    
    Auth --> Create
    Auth --> Home
    Auth --> Draft
    
    Location --> Create
    Location --> Wizard
    
    Modal --> Tab
    Modal --> Create
    
    Toast --> Create
    Toast --> Wizard
    
    Create --> Supa
    Draft --> Supa
    Wizard --> Async
    
    Tab -.-> Modal
    Home --> Draft
```

## 7. DrawIO Text Format (Copy-Paste Ready)

```
App Structure:
├── TabNavigator (Bottom Navigation)
│   ├── HomeTab (🏠)
│   │   ├── HomeScreen
│   │   │   ├── DraftRoutes (is_draft=true) [NEW]
│   │   │   └── CreatedRoutes
│   │   ├── CreateRouteScreen (Tab Hidden)
│   │   ├── RouteDetailScreen (Tab Hidden)
│   │   └── RouteListScreen
│   ├── ExploreTab (🗺️)
│   │   ├── MapScreen
│   │   └── RoutesDrawer
│   ├── CreateTab (➕) [Central Button]
│   │   └── Opens ActionSheetModal
│   │       ├── RouteWizardSheet [NEW]
│   │       │   ├── MapInteractionStep
│   │       │   ├── BasicInfoStep
│   │       │   ├── ExercisesStep
│   │       │   ├── MediaStep
│   │       │   └── ReviewStep
│   │       ├── RecordDrivingSheet
│   │       └── Create Event
│   ├── SchoolTab (🎓)
│   └── MenuTab (☰)
│       ├── Profile
│       ├── Messages
│       └── Settings

Modal System:
├── ActionSheetModal (Create Options)
├── RouteWizardSheet (Multi-step) [NEW]
├── RecordDrivingSheet (With Emergency Save)
├── OnboardingModalInteractive [NEW]
└── Exit Confirmation (With Draft Option)

Tab Visibility Rules:
├── Hidden: CreateRoute, RouteDetail, Conversation, PublicProfile
└── Visible: Home, Map, School, Profile, RouteList

Draft Features:
├── Database: is_draft column
├── UI: DraftRoutes section on HomeScreen
├── Actions: Save as Draft button
└── Recovery: Emergency draft save on crash
```

## Usage Instructions

1. **For DrawIO XML**: Copy the entire XML file content and:
   - Go to https://app.diagrams.net/
   - File > Open from > Device > Select the XML file
   - Or paste directly into a new diagram

2. **For Mermaid Diagrams**: 
   - Use in GitHub README.md files
   - Paste into mermaid.live editor
   - Use in Notion, Obsidian, or other Markdown tools

3. **For Quick Reference**: Use the text hierarchy in any documentation

The diagrams show:
- Navigation flow and stack hierarchy
- Tab visibility state management
- Draft mode implementation
- Modal system architecture
- Component communication patterns