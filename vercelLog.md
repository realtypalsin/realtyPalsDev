15:07:53.149 Running build in Washington, D.C., USA (East) – iad1
15:07:53.149 Build machine configuration: 2 cores, 8 GB
15:07:53.541 Cloning github.com/realtypalsin/realtyPalsDev (Branch: main, Commit: 803d94a)
15:07:56.115 Cloning completed: 2.574s
15:07:56.344 Restored build cache from previous deployment (Anp75yWiRVAzu9dVGPN9ruS8NjJr)
15:07:58.053 Running "vercel build"
15:07:58.073 Vercel CLI 58.1.0
15:07:58.097 Detected OpenTelemetry dependency: @opentelemetry/api@1.9.1, which meets the minimum version requirement of 1.7.0
15:07:58.360 Running "install" command: `npm install --legacy-peer-deps`...
15:08:43.566 
15:08:43.567 up to date, audited 1246 packages in 45s
15:08:43.567 
15:08:43.567 342 packages are looking for funding
15:08:43.567   run `npm fund` for details
15:08:43.798 
15:08:43.799 13 vulnerabilities (1 moderate, 11 high, 1 critical)
15:08:43.799 
15:08:43.800 To address issues that do not require attention, run:
15:08:43.800   npm audit fix
15:08:43.800 
15:08:43.800 To address all issues (including breaking changes), run:
15:08:43.801   npm audit fix --force
15:08:43.801 
15:08:43.801 Run `npm audit` for details.
15:08:43.873 Detected Next.js version: 14.2.5
15:08:43.874 Running "npm run db:generate && npm run build"
15:08:44.338 
15:08:44.338 > realtypals@0.1.0 db:generate
15:08:44.338 > prisma generate
15:08:44.338 
15:08:44.783 Prisma schema loaded from prisma/schema.prisma
15:08:46.121 
15:08:46.122 ✔ Generated Prisma Client (v5.22.0) to ./../node_modules/@prisma/client in 731ms
15:08:46.123 
15:08:46.123 Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
15:08:46.123 
15:08:46.124 Tip: Interested in query caching in just a few lines of code? Try Accelerate today! https://pris.ly/tip-3-accelerate
15:08:46.124 
15:08:46.450 
15:08:46.451 > realtypals@0.1.0 build
15:08:46.451 > next build
15:08:46.451 
15:08:47.531   ▲ Next.js 14.2.5
15:08:47.532   - Experiments (use with caution):
15:08:47.532     · instrumentationHook
15:08:47.532 
15:08:47.554    Creating an optimized production build ...
15:08:48.143 [@sentry/nextjs] DEPRECATION WARNING: It is recommended renaming your `sentry.client.config.ts` file, or moving its content to `instrumentation-client.ts`. When using Turbopack `sentry.client.config.ts` will no longer work. Read more about the `instrumentation-client.ts` file: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client
15:09:02.604  ✓ Compiled successfully
15:09:02.606    Linting and checking validity of types ...
15:09:20.516 
15:09:20.518 ./app/admin/analytics/properties/page.tsx
15:09:20.519 5:43  Warning: 'Eye' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.522 5:48  Warning: 'Bookmark' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.523 5:58  Warning: 'Share2' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.523 5:66  Warning: 'MessageSquare' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.523 5:81  Warning: 'ExternalLink' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.523 5:107  Warning: 'Filter' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.525 
15:09:20.525 ./app/admin/analytics/search/page.tsx
15:09:20.525 5:62  Warning: 'AlertCircle' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.526 
15:09:20.526 ./app/admin/leads/page.tsx
15:09:20.526 13:3  Warning: 'MessageSquare' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.526 21:3  Warning: 'Eye' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.526 22:3  Warning: 'Bookmark' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.527 23:3  Warning: 'Calendar' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.527 24:3  Warning: 'Wallet' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.527 25:3  Warning: 'ShieldCheck' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.527 
15:09:20.527 ./app/admin/news/page.tsx
15:09:20.529 10:3  Warning: 'XCircle' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.530 11:3  Warning: 'Eye' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.530 20:3  Warning: 'FileText' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.530 23:10  Warning: 'format' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.530 
15:09:20.530 ./app/admin/page.tsx
15:09:20.530 7:40  Warning: 'Activity' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.531 
15:09:20.531 ./app/admin/projects/[id]/page.tsx
15:09:20.531 6:14  Warning: 'ChevronRight' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.531 33:11  Warning: 'ProjectData' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.532 37:11  Warning: 'ProjectDocument' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.532 45:11  Warning: 'CompletenessData' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.533 
15:09:20.540 ./app/admin/projects/page.tsx
15:09:20.540 4:10  Warning: 'Skeleton' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.540 11:47  Warning: 'Layers' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.540 11:55  Warning: 'Filter' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.540 
15:09:20.540 ./app/builder/[slug]/page.tsx
15:09:20.540 9:33  Warning: 'Calendar' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.545 9:43  Warning: 'Users' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.546 11:3  Warning: 'Star' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.546 
15:09:20.546 ./app/dashboard/leads/page.tsx
15:09:20.546 4:49  Warning: 'CheckCircle' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.546 
15:09:20.546 ./app/property/[slug]/page.tsx
15:09:20.547 51:16  Warning: 'err' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.548 
15:09:20.548 ./app/s/[id]/page.tsx
15:09:20.548 42:16  Warning: 'err' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.550 
15:09:20.550 ./app/saved/page.tsx
15:09:20.550 6:8  Warning: 'Header' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.550 12:20  Warning: 'PanelLeftClose' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.550 12:36  Warning: 'PanelLeftOpen' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.550 12:51  Warning: 'Sun' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.550 12:56  Warning: 'SquarePen' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.550 
15:09:20.550 ./components/BuilderIntelligence/DeliveryRecord.tsx
15:09:20.550 15:3  Warning: 'deliveredUnits' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.550 
15:09:20.550 ./components/BuilderIntelligence/index.tsx
15:09:20.550 6:57  Warning: 'Shield' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.550 13:62  Warning: 'reraNumber' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.550 
15:09:20.550 ./components/BuilderReputationCard.tsx
15:09:20.550 4:73  Warning: 'Loader2' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.550 94:9  Warning: 'positiveSignals' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.550 95:9  Warning: 'negativeSignals' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.550 
15:09:20.550 ./components/ComponentRenderer.test.tsx
15:09:20.550 7:30  Warning: 'ComponentResponse' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.550 
15:09:20.550 ./components/ComponentRenderer.tsx
15:09:20.550 4:10  Warning: 'BarChart' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.550 4:20  Warning: 'Bar' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.550 4:42  Warning: 'PieChart' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.551 4:52  Warning: 'Pie' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.551 4:57  Warning: 'Cell' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.551 4:101  Warning: 'Legend' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.551 5:18  Warning: 'Home' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.551 5:24  Warning: 'Zap' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.551 5:29  Warning: 'TrendingUp' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.551 5:41  Warning: 'Clock' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.551 5:84  Warning: 'DollarSign' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.551 
15:09:20.551 ./components/DiscoveryContent.tsx
15:09:20.551 19:59  Warning: 'Home' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.551 19:65  Warning: 'Key' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.551 19:70  Warning: 'MapPin' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.551 19:106  Warning: 'Palmtree' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.551 19:123  Warning: 'ShieldCheck' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.551 19:144  Warning: 'TrendingUp' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.551 19:156  Warning: 'Wallet' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.551 19:164  Warning: 'Train' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.551 19:171  Warning: 'Trees' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.551 19:178  Warning: 'Crown' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.551 19:185  Warning: 'Building2' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.551 19:196  Warning: 'GraduationCap' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.551 25:7  Warning: 'PHASES' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.556 26:7  Warning: 'STATUS_PHASES' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.556 114:6  Warning: React Hook useEffect has a missing dependency: 'chatHistory'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
15:09:20.556 236:62  Warning: '_properties' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.556 334:16  Warning: '_' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.556 1345:9  Warning: 'handleToggleMap' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.556 
15:09:20.557 ./components/MarketComparison.tsx
15:09:20.557 4:10  Warning: 'TrendingUp' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.557 4:33  Warning: 'Loader2' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.557 4:42  Warning: 'Building2' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.557 4:53  Warning: 'MapPin' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.557 4:61  Warning: 'ArrowUpRight' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.557 5:34  Warning: 'YAxis' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.557 
15:09:20.557 ./components/PlacesAutocomplete.tsx
15:09:20.557 8:29  Warning: 'useState' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.557 
15:09:20.557 ./components/ProjectCard.tsx
15:09:20.557 3:20  Warning: 'useCallback' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.557 13:29  Warning: 'Phone' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.557 43:7  Warning: 'AMENITY_ICONS' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.557 52:7  Warning: 'CONN_ICONS' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.557 65:168  Warning: 'onSetSiteVisit' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.557 65:201  Warning: 'quickActions' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.557 75:11  Warning: 'activeUrl' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.557 
15:09:20.557 ./components/ProjectDetailPanel.tsx
15:09:20.557 4:74  Warning: 'Users' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.557 28:8  Warning: 'PartnersTab' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.557 65:9  Warning: 'router' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.557 77:10  Warning: 'isScrolled' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.557 80:10  Warning: 'aqi' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.557 82:10  Warning: 'isMobile' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.557 269:9  Warning: 'decisionThesis' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.557 271:9  Warning: 'whyAvoid' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.557 275:9  Warning: 'competitors' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.558 515:11  Warning: 'displayScore' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.558 
15:09:20.558 ./components/ShareShortlistModal.tsx
15:09:20.558 21:9  Warning: 'shortlistText' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.558 
15:09:20.558 ./components/Sidebar.tsx
15:09:20.558 8:10  Warning: 'cn' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.558 
15:09:20.558 ./components/admin/ChannelPartnersEditor.tsx
15:09:20.558 4:10  Warning: 'Plus' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.558 4:16  Warning: 'Trash2' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.558 45:16  Warning: 'err' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.558 
15:09:20.558 ./components/admin/ConstructionMilestonesEditor.tsx
15:09:20.558 4:41  Warning: 'CheckCircle2' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.558 4:55  Warning: 'Clock' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.558 4:62  Warning: 'Calendar' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.558 4:72  Warning: 'Eye' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.558 4:87  Warning: 'ShieldCheck' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.558 60:6  Warning: React Hook useEffect has a missing dependency: 'fetchMilestones'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
15:09:20.558 
15:09:20.558 ./components/admin/CostSheetEditor.tsx
15:09:20.558 4:10  Warning: 'Plus' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.558 4:38  Warning: 'Layers' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.558 4:46  Warning: 'ShieldCheck' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.558 4:59  Warning: 'Zap' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.558 4:64  Warning: 'Info' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.558 26:24  Warning: 'setOtherCharges' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.558 
15:09:20.558 ./components/admin/DocumentsEditor.tsx
15:09:20.558 67:13  Warning: 'data' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.558 
15:09:20.558 ./components/admin/ImageUpload.tsx
15:09:20.558 5:10  Warning: 'Upload' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.558 
15:09:20.558 ./components/admin/InvestmentInsightsEditor.tsx
15:09:20.558 70:14  Warning: 'e' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.558 
15:09:20.558 ./components/admin/LifecycleUpdatesEditor.tsx
15:09:20.559 4:36  Warning: 'CheckCircle2' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.559 4:50  Warning: 'Shield' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.559 4:58  Warning: 'Calendar' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.559 4:68  Warning: 'Bell' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.559 55:6  Warning: React Hook useEffect has a missing dependency: 'fetchUpdates'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
15:09:20.559 
15:09:20.559 ./components/admin/LocationIntelligenceEditor.tsx
15:09:20.559 69:14  Warning: 'e' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.559 
15:09:20.559 ./components/admin/PaymentPlanEditor.tsx
15:09:20.559 4:49  Warning: 'Award' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.559 4:56  Warning: 'Zap' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.559 4:61  Warning: 'Percent' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.559 4:70  Warning: 'Clock' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.559 47:6  Warning: React Hook useEffect has a missing dependency: 'fetchPlans'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
15:09:20.559 
15:09:20.559 ./components/admin/PriceHistoryEditor.tsx
15:09:20.559 4:42  Warning: 'Calendar' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.559 4:52  Warning: 'IndianRupee' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.559 43:6  Warning: React Hook useEffect has a missing dependency: 'fetchHistory'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
15:09:20.559 
15:09:20.559 ./components/admin/ProjectPreview.tsx
15:09:20.559 8:39  Warning: 'Eye' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.559 8:54  Warning: 'Layers' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.565 
15:09:20.565 ./components/admin/ProjectUpdatesEditor.tsx
15:09:20.565 4:41  Warning: 'CheckCircle2' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.566 4:55  Warning: 'Clock' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.566 4:62  Warning: 'Calendar' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.566 78:6  Warning: React Hook useEffect has a missing dependency: 'fetchUpdates'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
15:09:20.566 
15:09:20.566 ./components/chat/AIRecommendationCard.tsx
15:09:20.566 5:10  Warning: 'tierLabel' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.566 6:7  Warning: 'tierStyle' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.566 
15:09:20.566 ./components/chat/ChipsSection.tsx
15:09:20.571 38:26  Warning: 'project' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.571 38:35  Warning: 'projectId' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.571 
15:09:20.571 ./components/chat/CompareSelectorOverlay.tsx
15:09:20.572 106:23  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
15:09:20.572 
15:09:20.572 ./components/chat/ContextRibbon.tsx
15:09:20.572 5:15  Warning: 'ConversationState' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.572 
15:09:20.572 ./components/chat/MessageBubble.tsx
15:09:20.572 7:77  Warning: 'Sparkles' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.572 21:15  Warning: 'ChatResponse' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.572 309:52  Warning: 'isLastProperties' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.572 557:52  Warning: 'node' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.572 558:50  Warning: 'node' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.572 559:43  Warning: 'node' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.572 564:43  Warning: 'node' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.573 567:40  Warning: 'node' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.573 570:40  Warning: 'node' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.573 573:40  Warning: 'node' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.573 576:39  Warning: 'node' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.573 
15:09:20.573 ./components/chat/MessageContentRenderer.tsx
15:09:20.573 4:10  Warning: 'ReactNode' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.573 54:30  Warning: 'node' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.573 55:28  Warning: 'node' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.573 56:21  Warning: 'node' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.573 61:21  Warning: 'node' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.573 64:18  Warning: 'node' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.573 67:18  Warning: 'node' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.573 70:18  Warning: 'node' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.573 73:17  Warning: 'node' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.573 
15:09:20.573 ./components/chat/PropertyCardWithRecommendation.tsx
15:09:20.573 3:20  Warning: 'useCallback' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.573 9:47  Warning: 'AmenitySummary' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.573 9:63  Warning: 'ConnSummary' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.573 36:11  Warning: 'activeUrl' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.573 104:9  Warning: 'concerns' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.573 
15:09:20.573 ./components/chat/PropertyCardsDisplay.tsx
15:09:20.573 26:3  Warning: 'carouselIndex' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.573 29:3  Warning: 'lastShortlist' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.573 33:3  Warning: 'onSetCarouselIndex' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.573 35:3  Warning: 'onOpenCalculator' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.573 36:3  Warning: 'onOpenShareSheet' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.574 
15:09:20.574 ./components/chat/ReEngagementBanner.tsx
15:09:20.574 3:29  Warning: 'useState' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.574 
15:09:20.574 ./components/chat/__tests__/ChipStress.test.tsx
15:09:20.574 188:13  Warning: 'rerender' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.574 
15:09:20.574 ./components/property-detail/BuilderTab.tsx
15:09:20.574 3:10  Warning: 'useState' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.574 8:81  Warning: 'Phone' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.574 
15:09:20.574 ./components/property-detail/CompetitorsTab.tsx
15:09:20.574 5:42  Warning: 'project' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.574 
15:09:20.574 ./components/property-detail/ConstructionTimeline.tsx
15:09:20.574 4:17  Warning: 'ShieldCheck' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.574 34:3  Warning: 'projectRiskFlag' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.574 35:3  Warning: 'onTimeDeliveryPct' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.574 40:9  Warning: 'defaultUnderConstructionMilestones' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.574 91:9  Warning: 'defaultReadyToMoveMilestones' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.574 
15:09:20.574 ./components/property-detail/DocumentsTab.tsx
15:09:20.574 4:14  Warning: 'AnimatePresence' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.574 11:10  Warning: 'Card' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.574 
15:09:20.574 ./components/property-detail/IntelligenceTab.tsx
15:09:20.574 10:7  Warning: 'TOKEN' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.574 
15:09:20.574 ./components/property-detail/LocationTab.tsx
15:09:20.574 19:7  Warning: 'ICONS' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.574 41:9  Warning: 'projectLat' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.574 42:9  Warning: 'projectLng' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.574 
15:09:20.574 ./components/property-detail/OverviewTab.tsx
15:09:20.574 7:3  Warning: 'Download' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.574 7:13  Warning: 'CheckCircle2' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.574 7:38  Warning: 'Plane' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.574 7:104  Warning: 'Check' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.574 7:118  Warning: 'Mail' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.574 16:7  Warning: 'TOKEN' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.574 31:10  Warning: 'formatFileSize' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.575 55:23  Warning: 'loading' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.575 
15:09:20.575 ./components/property-detail/PartnersTab.tsx
15:09:20.575 3:43  Warning: 'ExternalLink' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.575 
15:09:20.575 ./components/property-detail/PricingCharts.tsx
15:09:20.575 18:68  Warning: 'otherCharges' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.575 
15:09:20.575 ./components/property-detail/ProjectPricingTab.tsx
15:09:20.575 4:3  Warning: 'FileText' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.575 5:15  Warning: 'Home' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.575 5:21  Warning: 'ArrowUpRight' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.575 6:3  Warning: 'MessageSquare' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.575 6:42  Warning: 'Calculator' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.575 6:77  Warning: 'Clock' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.575 6:84  Warning: 'HelpCircle' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.575 6:103  Warning: 'Info' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.575 34:9  Warning: 'unitMaxCr' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.575 
15:09:20.575 ./components/response/ResponseBlockRenderer.tsx
15:09:20.575 239:30  Warning: 'node' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.575 240:28  Warning: 'node' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.575 241:31  Warning: 'node' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.575 242:21  Warning: 'node' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.575 247:21  Warning: 'node' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.575 250:18  Warning: 'node' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.575 253:18  Warning: 'node' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.575 256:18  Warning: 'node' is defined but never used.  @typescript-eslint/no-unused-vars
15:09:20.575 
15:09:20.575 ./lib/waqi.ts
15:09:20.575 17:3  Warning: '_cityFallback' is assigned a value but never used.  @typescript-eslint/no-unused-vars
15:09:20.575 
15:09:20.575 info  - Need to disable some ESLint rules? Learn more here: https://nextjs.org/docs/basic-features/eslint#disabling-rules
15:09:35.049    Collecting page data ...
15:09:37.285    Generating static pages (0/25) ...
15:09:38.548    Generating static pages (6/25) 
15:09:38.918    Generating static pages (12/25) 
15:09:39.197    Generating static pages (18/25) 
15:09:39.717  ✓ Generating static pages (25/25)
15:09:40.463    Finalizing page optimization ...
15:09:40.464    Collecting build traces ...
15:09:51.128 
15:09:51.139 Route (app)                              Size     First Load JS
15:09:51.140 ┌ ○ /                                    3.35 kB         236 kB
15:09:51.140 ├ ○ /_not-found                          1.04 kB         209 kB
15:09:51.140 ├ ○ /admin                               10.2 kB         363 kB
15:09:51.141 ├ ○ /admin/analytics                     7.05 kB         364 kB
15:09:51.141 ├ ○ /admin/analytics/properties          6 kB            248 kB
15:09:51.141 ├ ○ /admin/analytics/search              6.08 kB         356 kB
15:09:51.141 ├ ○ /admin/analytics/users               6.1 kB          356 kB
15:09:51.141 ├ ○ /admin/builder-applications          10.5 kB         255 kB
15:09:51.143 ├ ○ /admin/builders                      7.89 kB         251 kB
15:09:51.143 ├ ○ /admin/leads                         8.13 kB         253 kB
15:09:51.144 ├ ○ /admin/login                         2.62 kB         211 kB
15:09:51.144 ├ ○ /admin/news                          8.44 kB         248 kB
15:09:51.147 ├ ○ /admin/projects                      6.96 kB         256 kB
15:09:51.148 ├ ƒ /admin/projects/[id]                 34.3 kB         274 kB
15:09:51.148 ├ ○ /admin/projects/new                  1.48 kB         215 kB
15:09:51.148 ├ ○ /admin/promotions                    4.06 kB         225 kB
15:09:51.148 ├ ○ /admin/property-listings             3.15 kB         211 kB
15:09:51.148 ├ ○ /auth                                5.15 kB         294 kB
15:09:51.148 ├ ○ /builder-register                    10.7 kB         246 kB
15:09:51.148 ├ ƒ /builder/[slug]                      5.34 kB         241 kB
15:09:51.148 ├ ○ /compare                             3.63 kB         334 kB
15:09:51.148 ├ ○ /dashboard/leads                     2.59 kB         211 kB
15:09:51.148 ├ ○ /discover                            1.35 kB         501 kB
15:09:51.148 ├ ƒ /discover/[sessionId]                1.23 kB         501 kB
15:09:51.148 ├ ○ /get-listed                          4 kB            231 kB
15:09:51.148 ├ ƒ /property/[slug]                     52.7 kB         372 kB
15:09:51.148 ├ ƒ /property/[slug]/opengraph-image     0 B                0 B
15:09:51.148 ├ ƒ /s/[id]                              3.38 kB         348 kB
15:09:51.148 ├ ƒ /s/[id]/opengraph-image              0 B                0 B
15:09:51.148 └ ○ /saved                               4.36 kB         369 kB
15:09:51.148 + First Load JS shared by all            208 kB
15:09:51.148   ├ chunks/618f8807-e30e95ea96f5985e.js  53.8 kB
15:09:51.148   ├ chunks/6e183205-6a9f6c9338f4592c.js  39.1 kB
15:09:51.148   ├ chunks/958-422bbbd745602ff9.js       111 kB
15:09:51.148   └ other shared chunks (total)          4.39 kB
15:09:51.148 
15:09:51.148 
15:09:51.148 ƒ Middleware                             92.2 kB
15:09:51.149 
15:09:51.149 ○  (Static)   prerendered as static content
15:09:51.149 ƒ  (Dynamic)  server-rendered on demand
15:09:51.149 
15:09:51.792 Traced Next.js server files in: 430.587ms
15:09:52.769 Created all serverless functions in: 977.551ms
15:09:52.943 Collected static files (public/, static/, .next/static): 35.841ms
15:09:53.223 Build Completed in /vercel/output [2m]
15:09:53.252 Deploying outputs...
15:10:06.246 Deployment completed
15:10:06.375 Creating build cache...
15:11:03.938 Created build cache: 58s
15:11:03.938 Uploading build cache [416.02 MB]
15:11:10.532 Build cache uploaded: 6.594s