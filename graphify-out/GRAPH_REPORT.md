# Graph Report - src  (2026-11-05)

## Corpus Check
- 439 files · ~217,762 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 69 file(s) not represented in the graph (top: .scss 39, .ico 15, .ttf 6)

## Summary
- 2690 nodes · 6581 edges · 160 communities (95 shown, 65 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 109 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Sidebar and Environment
- Server API Client
- App Loader UI
- Download Manager Dashboard
- Account and Server Screens
- Login and Error Boundary
- Todos Feature
- App API Actions
- Workspaces Feature
- Internal Server Models
- Services Store
- Config and IPC API
- App Store
- Deep Linking and Window
- Service Components and Models
- App Update Info
- Setup Assistant
- Todo Config
- User Model
- Appearance Config
- Download Controller
- User Store
- Server API Services
- API Endpoint Config
- Local HTTP Server
- Settings Form
- Release Notes Dashboard
- Main Process Utilities
- Theme Colors
- Shortcut Config
- models group 30
- settings group 31
- ui group 32
- workspaces group 33
- electron group 34
- notificationCenter group 35
- lib group 36
- actions group 37
- stores group 38
- stores group 39
- webview group 40
- settings group 41
- stores group 42
- components group 43
- content group 44
- containers group 45
- dbus group 46
- stores group 48
- settings group 49
- communityRecipes group 50
- select group 51
- stores group 52
- stores group 53
- content group 54
- Http group 55
- electron group 56
- webview group 57
- imageUpload group 58
- helpers group 59
- lib group 60
- Http group 61
- ui group 62
- settings group 63
- auth group 64
- lib group 65
- config group 66
- auth group 67
- models group 68
- webview group 69
- Http group 70
- quickSwitch group 71
- components group 72
- lib group 73
- auth group 74
- electron group 75
- start group 76
- basicAuth group 77
- layout group 78
- content group 79
- content group 80
- tabs group 81
- tabs group 82
- tabs group 83
- ui group 84
- stores group 85
- auth group 86
- stores group 87
- webview group 88
- api group 89
- api group 90
- auth group 91
- services group 92
- helpers group 93
- Http group 94
- webview group 95
- lib group 96
- auth group 97
- AppLoader group 98
- components group 99
- electron group 100
- i18n group 101
- webview group 102
- server group 103
- api group 104
- settings group 105
- stores group 106
- components group 107
- content group 108
- ui group 109
- publishDebugInfo group 110
- api group 111
- auth group 112
- download-manager group 113
- settings group 114
- notificationCenter group 115
- api group 116
- api group 117
- auth group 118
- supportFerdium group 119
- publishDebugInfo group 120
- quickSwitch group 121
- containers group 122
- webview group 124
- api group 125
- navigation group 126
- infobox group 127
- input group 128
- Tabs group 129
- helpers group 130
- basicAuth group 131
- components group 132
- Http group 133
- Exceptions group 134
- start group 135
- button group 136
- ui group 137
- textarea group 138
- misc group 139
- adBlocker group 140
- serviceProxy group 141
- stores group 142
- Http group 143
- js group 144
- @types group 146
- webview group 147
- loader group 148
- Middleware group 149
- Traits group 150
- config group 151
- config group 152
- internal-server group 153
- misc group 155

## God Nodes (most connected - your core abstractions)
1. `Service` - 82 edges
2. `ServicesStore` - 79 edges
3. `StoresProps` - 56 edges
4. `H1` - 49 edges
5. `AppStore` - 48 edges
6. `Actions` - 47 edges
7. `WorkspacesStore` - 40 edges
8. `UserStore` - 37 edges
9. `TodoStore` - 35 edges
10. `RealStores` - 35 edges

## Surprising Connections (you probably didn't know these)
- `IProps` --inherits--> `StoresProps`  [EXTRACTED]
  components/settings/SandboxServiceTabs.tsx → @types/ferdium-components.types.ts
- `ISandboxTransferListProps` --inherits--> `StoresProps`  [EXTRACTED]
  components/settings/SandboxTransferList.tsx → @types/ferdium-components.types.ts
- `IProps` --inherits--> `StoresProps`  [EXTRACTED]
  containers/auth/SetupAssistantScreen.tsx → @types/ferdium-components.types.ts
- `IProps` --inherits--> `StoresProps`  [EXTRACTED]
  containers/settings/EditServiceScreen.tsx → @types/ferdium-components.types.ts
- `EditSettingsScreenProps` --inherits--> `StoresProps`  [EXTRACTED]
  containers/settings/EditSettingsScreen.tsx → @types/ferdium-components.types.ts

## Import Cycles
- 3-file cycle: `electron/ipc-api/autoUpdate.ts -> index.ts -> electron/ipc-api/index.ts -> electron/ipc-api/autoUpdate.ts`

## Communities (160 total, 65 thin omitted)

### Community 0 - "Sidebar and Environment"
Cohesion: 0.05
Nodes (40): IProps, IState, messages, Sidebar, addNewServiceShortcutKey(), altKey(), chromeVersion, cmdOrCtrlShortcutKey() (+32 more)

### Community 1 - "Server API Client"
Cohesion: 0.04
Nodes (39): serverBase(), IProps, IState, messages, Login, IProps, messages, Password (+31 more)

### Community 2 - "App Loader UI"
Cohesion: 0.05
Nodes (43): IProps, IState, messages, BadgeComponent, badgeStyles(), IProps, styles(), IProps (+35 more)

### Community 3 - "Download Manager Dashboard"
Cohesion: 0.04
Nodes (32): DownloadManagerDashboard, IState, messages, IProps, IState, messages, messages, messages (+24 more)

### Community 4 - "Account and Server Screens"
Cohesion: 0.05
Nodes (38): IProps, messages, IProps, messages, messages, IProps, messages, IProps (+30 more)

### Community 5 - "Login and Error Boundary"
Cohesion: 0.10
Nodes (25): IProps, messages, messages, messages, IProps, messages, IProps, ErrorBoundaryProps (+17 more)

### Community 6 - "Todos Feature"
Cohesion: 0.06
Nodes (7): initTodos(), debug, TodoStore, retrieveSettingValue(), ifUndefined(), debug, UserAgent

### Community 7 - "App API Actions"
Cohesion: 0.11
Nodes (8): Actions, AppApi, ApiInterface, IProps, IProps, Hook, TypedStore, Stores

### Community 8 - "Workspaces Feature"
Cohesion: 0.10
Nodes (4): initWorkspaces(), debug, getDrawerAnimationDuration(), WorkspacesStore

### Community 9 - "Internal Server Models"
Cohesion: 0.07
Nodes (18): Model, Recipe, Model, Service, Model, Token, Model, User (+10 more)

### Community 11 - "Config and IPC API"
Cohesion: 0.06
Nodes (25): CDN_URL, configMessages, DEBUG_API, FERDIUM_SERVICE_REQUEST, FILE_SYSTEM_SETTINGS_TYPES, HIBERNATION_STRATEGIES, ICON_SIZES, LOCAL_TODOS_FRONTEND_URL (+17 more)

### Community 13 - "Deep Linking and Window"
Cohesion: 0.08
Nodes (19): DEFAULT_WINDOW_OPTIONS, getDeepLinkFromArgs(), handleDeepLink(), parseCoordinate(), parseWindowFeatures(), popupWindowOptions(), isPositionValid(), protocolClient (+11 more)

### Community 14 - "Service Components and Models"
Cohesion: 0.12
Nodes (5): IProps, IProps, IProps, debug, Service

### Community 15 - "App Update Info"
Cohesion: 0.10
Nodes (15): serverName(), AppUpdateInfoBar(), IProps, messages, AuthLayout, IProps, IState, IState (+7 more)

### Community 16 - "Setup Assistant"
Cohesion: 0.08
Nodes (15): IProps, IState, messages, AccountDashboard, IState, messages, styles, Appear() (+7 more)

### Community 17 - "Todo Config"
Cohesion: 0.09
Nodes (15): CUSTOM_TODO_SERVICE, DEFAULT_IS_TODO_FEATURE_ENABLED_BY_USER, DEFAULT_TODOS_VISIBLE, DEFAULT_TODOS_WIDTH, TODO_SERVICE_RECIPE_IDS, IPC, TODOS_ROUTES, debug (+7 more)

### Community 18 - "User Model"
Cohesion: 0.11
Nodes (21): IProp, IUser, User, CachedRequest, Actions, Api, AppStore, CommunityRecipesStore (+13 more)

### Community 19 - "Appearance Config"
Cohesion: 0.11
Nodes (29): iconSizeBias, SERVICE_WEBVIEW_BORDER_RADIUS_DEFAULT, SERVICE_WEBVIEW_BORDER_RADIUS_MAX, SERVICE_WEBVIEW_BORDER_RADIUS_MIN, SIDEBAR_SERVICES_LOCATION_BOTTOMRIGHT, SIDEBAR_SERVICES_LOCATION_CENTER, SIDEBAR_SERVICES_LOCATION_TOPLEFT, WEBVIEW_PADDING_SIZE_DEFAULT (+21 more)

### Community 20 - "Download Controller"
Cohesion: 0.10
Nodes (12): debug, DownloadActionPayload, DownloadActions, DownloadController, downloadController, DownloadControllerOptions, DownloadIpc, DownloadIpcData (+4 more)

### Community 22 - "Server API Services"
Cohesion: 0.24
Nodes (4): apiBase(), debug, ServerApi, sendAuthRequest()

### Community 23 - "API Endpoint Config"
Cohesion: 0.09
Nodes (21): DEV_FRANZ_API, DEV_WS_API, LIVE_WS_API, LOCAL_API, LOCAL_API_WEBSITE, LOCAL_WS_API, debug, api (+13 more)

### Community 24 - "Local HTTP Server"
Cohesion: 0.10
Nodes (14): LOCAL_HOSTNAME, LOCAL_PORT, debug, isLinux, isMac, isWindows, Env, fs (+6 more)

### Community 25 - "Settings Form"
Cohesion: 0.11
Nodes (14): debug, EditSettingsForm, Hr(), HrSections(), IProps, IState, messages, ExtensionInfo (+6 more)

### Community 26 - "Release Notes Dashboard"
Cohesion: 0.10
Nodes (13): IProps, IState, messages, ReleaseNotesDashboard, AuthReleaseNotesScreen, IProps, IState, messages (+5 more)

### Community 27 - "Main Process Utilities"
Cohesion: 0.10
Nodes (7): debug, debug, DownloadSettings, debug, debug, mainIpcHandler(), appEvents

### Community 28 - "Theme Colors"
Cohesion: 0.09
Nodes (20): DEFAULT_ACCENT_COLOR, IStyleTypes, darkThemeBlack, darkThemeGray, darkThemeGrayDark, darkThemeGrayDarker, darkThemeGrayDarkest, darkThemeGrayLight (+12 more)

### Community 29 - "Shortcut Config"
Cohesion: 0.10
Nodes (15): DEFAULT_SHORTCUTS, getI18nConfigObjects(), SERVICE_WEBVIEW_BORDER_RADII, SPLIT_COLUMNS_MAX, SPLIT_COLUMNS_MIN, TODO_APPS, TRANSLATOR_ENGINE_NAMES, WEBVIEW_PADDING_SIZES (+7 more)

### Community 30 - "models group 30"
Cohesion: 0.14
Nodes (8): userDataRecipesPath(), getDevRecipeDirectory(), getRecipeDirectory(), loadRecipeConfig(), IRecipe, Recipe, RecipeData, RecipeStore

### Community 31 - "settings group 31"
Cohesion: 0.12
Nodes (9): RecipesDashboard, withParams(), FERDIUM_DEV_DOCS, IProps, IState, RecipesScreen, asarPath(), asarRecipesPath() (+1 more)

### Community 32 - "ui group 32"
Cohesion: 0.10
Nodes (14): IProps, messages, IProps, messages, styles, icons, IProps, IState (+6 more)

### Community 33 - "workspaces group 33"
Cohesion: 0.17
Nodes (14): KEEP_WS_LOADED_USID, createWorkspaceRequest, debug, deleteWorkspaceRequest, getUserWorkspacesRequest, updateWorkspaceRequest, workspaceApi, IProps (+6 more)

### Community 34 - "electron group 34"
Cohesion: 0.14
Nodes (20): AUTH_PAGE_HOSTS, blockingSessions, CACHE_PATH, debug, disableInSession(), enableInSession(), EXCEPTION_RULES, loadBlocker() (+12 more)

### Community 35 - "notificationCenter group 35"
Cohesion: 0.14
Nodes (6): debug, IPendingNotification, MAX_STORED_NOTIFICATIONS, NOTIFICATION_CENTER_STORAGE_KEY, NotificationCenterStore, notificationCenterStore

### Community 37 - "actions group 37"
Cohesion: 0.21
Nodes (9): actions, ActionDefinitions, createActionsFromDefinitions(), todoActions, TodoActionsType, WorkspaceActions, WorkspaceArg, globalError (+1 more)

### Community 38 - "stores group 38"
Cohesion: 0.11
Nodes (7): IProps, IProps, RecipeItem, IProps, IRecipePreview, RecipePreview, RecipePreviewsStore

### Community 39 - "stores group 39"
Cohesion: 0.13
Nodes (4): matchRoute(), isInTimeframe(), debug, RecipesStore

### Community 40 - "webview group 40"
Cohesion: 0.13
Nodes (14): safeParseInt(), BadgeHandler, debug, badgeHandler, dialogTitleHandler, notificationsHandler, sessionHandler, debug (+6 more)

### Community 41 - "settings group 41"
Cohesion: 0.09
Nodes (4): DownloadManagerLayout, ReleaseNotesLayout, SettingsLayout, isEscapeKeyPress()

### Community 42 - "stores group 42"
Cohesion: 0.11
Nodes (10): IProps, TODOS_MIN_WIDTH, IProps, IProps, IProps, todosStore, IProps, FeaturesStore (+2 more)

### Community 43 - "components group 43"
Cohesion: 0.11
Nodes (5): ServiceIcon, Toggle, EditWorkspaceForm, WorkspaceServiceListItem, EditWorkspaceScreen

### Community 44 - "content group 44"
Cohesion: 0.14
Nodes (4): debug, IProps, ServiceWebview, WebviewElement

### Community 46 - "dbus group 46"
Cohesion: 0.17
Nodes (3): DBus, Ferdium, UnreadServices

### Community 48 - "stores group 48"
Cohesion: 0.18
Nodes (3): IProps, debug, SettingsStore

### Community 49 - "settings group 49"
Cohesion: 0.15
Nodes (14): a11yProps(), debug, IProps, messages, SandboxServiceTabs(), TabPanel(), TabPanelProps, intersection() (+6 more)

### Community 50 - "communityRecipes group 50"
Cohesion: 0.15
Nodes (5): communityRecipesStore, initCommunityRecipes(), CommunityRecipesStore, debug, FeatureStore

### Community 51 - "select group 51"
Cohesion: 0.16
Nodes (5): SelectComponent, IAcceleratorString, isArrowDownKeyPress(), isArrowUpKeyPress(), isEnterKeyPress()

### Community 54 - "content group 54"
Cohesion: 0.12
Nodes (5): ServiceDisabled, WebviewCrashHandler, WebviewErrorHandler, StatusBarTargetUrl, WebviewLoader

### Community 55 - "Http group 55"
Cohesion: 0.15
Nodes (8): DEFAULT_SERVICE_ORDER, DEFAULT_SERVICE_SETTINGS, Service, ServiceController, { v4: uuid }, { validateAll }, deduceIconUrl(), moveIcon()

### Community 56 - "electron group 56"
Cohesion: 0.24
Nodes (16): restoreAdBlockListener(), addExtension(), attachExtensions(), debug, describeFolder(), ExtensionInfo, loadFolderInto(), loadStarted (+8 more)

### Community 57 - "webview group 57"
Cohesion: 0.17
Nodes (4): FindInPage, webContentsShim, debug, RecipeController

### Community 58 - "imageUpload group 58"
Cohesion: 0.14
Nodes (4): EditServiceForm, ImageUpload, Slider, normalizedUrl()

### Community 59 - "helpers group 59"
Cohesion: 0.28
Nodes (12): userDataPath(), cleanupPendingServicePartitionDirectories(), debug, deferPartitionRemoval(), FileSystemError, getPendingPartitionRemovalsFile(), getServiceIdsFromPartitions(), getServicePartitionsDirectory() (+4 more)

### Community 61 - "Http group 61"
Cohesion: 0.15
Nodes (9): DEFAULT_APP_SETTINGS, hash(), crypto, DEFAULT_USER_DATA, Service, User, { v4: uuid }, { validateAll } (+1 more)

### Community 62 - "ui group 62"
Cohesion: 0.15
Nodes (4): ServiceError, TeamDashboard, Infobox, TeamScreen

### Community 63 - "settings group 63"
Cohesion: 0.13
Nodes (3): ErrorBoundary, SettingsContainer, TodosScreen

### Community 64 - "auth group 64"
Cohesion: 0.16
Nodes (4): AuthLayoutContainer, LoginScreen, SignupScreen, AccountScreen

### Community 66 - "config group 66"
Cohesion: 0.14
Nodes (8): Env, Env, Env, Env, globalMiddleware, namedMiddleware, Server, serverMiddleware

### Community 67 - "auth group 67"
Cohesion: 0.14
Nodes (3): InfoBar, LockedScreen, WorkspaceSwitchingIndicator

### Community 68 - "models group 68"
Cohesion: 0.15
Nodes (6): IProps, getFaviconUrl(), DarkReaderInterface, initializedWebContents, LOAD_RETRY_DELAYS, RETRYABLE_LOAD_ERRORS

### Community 69 - "webview group 69"
Cohesion: 0.15
Nodes (10): GOOGLE_TRANSLATOR_LANGUAGES, LIBRETRANSLATE_TRANSLATOR_LANGUAGES, SEARCH_ENGINE_NAMES, TRANSLATOR_ENGINE_GOOGLE, TRANSLATOR_ENGINE_LIBRETRANSLATE, childOf(), ContextMenuStringTable, contextMenuStringTable (+2 more)

### Community 70 - "Http group 70"
Cohesion: 0.19
Nodes (8): LIVE_FERDIUM_API, debug, Drive, Env, Recipe, RecipeController, { validateAll }, convertToJSON()

### Community 73 - "lib group 73"
Cohesion: 0.17
Nodes (4): render(), I18N, FranzTouchBar, FerdiumRoutes

### Community 74 - "auth group 74"
Cohesion: 0.18
Nodes (3): SetupAssistant, Input, Modal

### Community 76 - "start group 76"
Cohesion: 0.19
Nodes (11): API_VERSION, Env, fs, path, { v4: uuid }, OnlyAllowFerdium(), RequireAuthenticatedBrowser(), RequireTokenInQS() (+3 more)

### Community 77 - "basicAuth group 77"
Cohesion: 0.23
Nodes (8): BasicAuthModal, cancelLogin(), debug, defaultState, IAuthInfo, IDefaultState, resetState(), sendCredentials()

### Community 78 - "layout group 78"
Cohesion: 0.17
Nodes (3): AppLayout, AppLayoutContainer, WorkspaceDrawer

### Community 79 - "content group 79"
Cohesion: 0.17
Nodes (8): IProps, IState, messages, styles, IProps, IState, messages, CUSTOM_WEBSITE_RECIPE_ID

### Community 82 - "tabs group 82"
Cohesion: 0.18
Nodes (7): IProps, TabBarSortableList, IProps, IS_SERVICE_DEBUGGING_ENABLED, IState, messages, styles

### Community 84 - "ui group 84"
Cohesion: 0.21
Nodes (3): EditUserForm, Radio, EditUserScreen

### Community 85 - "stores group 85"
Cohesion: 0.18
Nodes (7): CHECK_INTERVAL, sleep(), autoLauncher, Download, locales, mainWindow, SandboxServices

### Community 86 - "auth group 86"
Cohesion: 0.21
Nodes (4): IProps, IState, SetupAssistantScreen, ILegacyServices

### Community 88 - "webview group 88"
Cohesion: 0.20
Nodes (3): AutomaticLanguageDetection, AutomaticLanguageDetectionOptions, DebouncedKeyupHandler

### Community 89 - "api group 89"
Cohesion: 0.33
Nodes (8): importExportURL(), localServerToken(), needsToken(), prepareAuthRequest(), prepareLocalToken(), DEV_API_FRANZ_WEBSITE, SERVER_NOT_LOADED, ferdiumLocale

### Community 92 - "services group 92"
Cohesion: 0.18
Nodes (3): ServiceItem, ServicesDashboard, ServicesScreen

### Community 93 - "helpers group 93"
Cohesion: 0.25
Nodes (5): ALLOWED_PROTOCOLS, debug, fixUrl(), isValidExternalURL(), openExternalUrl()

### Community 95 - "webview group 95"
Cohesion: 0.22
Nodes (6): { v4: uuid }, { validateAll }, Workspace, debug, notificationsClassDefinition, NotificationsHandler

### Community 97 - "auth group 97"
Cohesion: 0.22
Nodes (3): Invite, InviteScreen, InviteScreen

### Community 98 - "AppLoader group 98"
Cohesion: 0.22
Nodes (3): AppLoader, FullscreenLoader, shuffleArray()

### Community 99 - "components group 99"
Cohesion: 0.22
Nodes (6): SEARCH_ENGINE_URLS, TodoClientMessage, IProps, IState, IProps, URL_EVENTS

### Community 100 - "electron group 100"
Cohesion: 0.33
Nodes (7): askFormacOSPermissions(), createStatusFile(), debug, filePath, hasPromptedForScreenCapturePermission(), hasScreenCapturePermissionAlreadyBeenGranted(), isExplicitScreenCapturePermissionReqd

### Community 101 - "i18n group 101"
Cohesion: 0.27
Nodes (6): locales, APP_LOCALES, SPELLCHECKER_LOCALES, Props, generatedTranslations(), translations

### Community 102 - "webview group 102"
Cohesion: 0.38
Nodes (8): chars, darkModeFilePath(), darkModeStyleExists(), debug, ID, injectDarkModeStyle(), isDarkModeStyleInjected(), removeDarkModeStyle()

### Community 107 - "components group 107"
Cohesion: 0.29
Nodes (7): CancelButton, ICancelButtonProps, IProps, MediaSource(), messages, SCREENSHARE_CANCELLED_BY_USER, isWayland

### Community 108 - "content group 108"
Cohesion: 0.25
Nodes (4): ConnectionLostBanner, IProps, messages, LIVE_API_FERDIUM_WEBSITE

### Community 119 - "supportFerdium group 119"
Cohesion: 0.40
Nodes (4): messages, SupportFerdiumDashboard(), FERDIUM_TRANSLATION, SupportScreen()

### Community 120 - "publishDebugInfo group 120"
Cohesion: 0.47
Nodes (4): debug, initialize(), defaultState, state

### Community 121 - "quickSwitch group 121"
Cohesion: 0.47
Nodes (4): debug, initialize(), defaultState, state

### Community 128 - "input group 128"
Cohesion: 0.40
Nodes (3): ILetters, IVariations, scorePasswordFunc()

### Community 131 - "basicAuth group 131"
Cohesion: 0.60
Nodes (4): debug, initialize(), mainIpcHandler(), state

### Community 135 - "start group 135"
Cohesion: 0.40
Nodes (4): aceProviders, aliases, commands, providers

### Community 139 - "misc group 139"
Cohesion: 0.50
Nodes (3): owner, provider, repo

### Community 140 - "adBlocker group 140"
Cohesion: 0.67
Nodes (3): AdBlockerService, debug, init()

### Community 141 - "serviceProxy group 141"
Cohesion: 0.67
Nodes (3): config, debug, init()

### Community 144 - "js group 144"
Cohesion: 0.50
Nodes (3): fileInput, fileOutput, submitBtn

### Community 146 - "@types group 146"
Cohesion: 0.50
Nodes (3): NodeJS, ProcessEnv, Window

## Knowledge Gaps
- **3 isolated node(s):** `default`, `dark`, `{ app }`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 963 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **65 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ServicesStore` connect `Services Store` to `stores group 39`, `App API Actions`, `stores group 42`, `stores group 106`, `stores group 47`, `User Model`, `stores group 52`, `stores group 123`, `lib group 60`, `models group 30`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **What connects `default`, `dark`, `{ app }` to the rest of the system?**
  _3 weakly-connected nodes found - possible missing edges._
- **Should `Sidebar and Environment` be split into smaller, more focused modules?**
  _Cohesion score 0.05272438723329219 - nodes in this community are weakly interconnected._
- **Why does `Service` connect `Service Components and Models` to `Sidebar and Environment`, `Server API Client`, `App Loader UI`, `Download Manager Dashboard`, `Account and Server Screens`, `Todos Feature`, `Services Store`, `User Model`, `models group 30`, `workspaces group 33`, `actions group 37`, `stores group 39`, `webview group 40`, `components group 43`, `content group 44`, `stores group 47`, `stores group 52`, `webview group 57`, `models group 68`, `quickSwitch group 71`, `content group 79`, `tabs group 81`, `tabs group 82`, `components group 99`, `settings group 105`, `stores group 106`, `components group 107`, `stores group 123`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Should `Server API Client` be split into smaller, more focused modules?**
  _Cohesion score 0.04131326949384405 - nodes in this community are weakly interconnected._
- **Why does `StoresProps` connect `Login and Error Boundary` to `Sidebar and Environment`, `Server API Client`, `workspaces group 33`, `auth group 67`, `Account and Server Screens`, `components group 99`, `Download Manager Dashboard`, `App API Actions`, `stores group 42`, `settings group 49`, `download-manager group 113`, `settings group 63`, `auth group 86`, `auth group 91`, `Shortcut Config`, `settings group 31`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Should `App Loader UI` be split into smaller, more focused modules?**
  _Cohesion score 0.050200803212851405 - nodes in this community are weakly interconnected._