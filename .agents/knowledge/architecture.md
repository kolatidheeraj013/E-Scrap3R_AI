# 🏛️ System Design & Architecture Blueprint

> **Workspace**: `C:\Users\banks\ReUseChain`  
> **Platform**: E-Scrap3R AI (ReUseChain)  
> **Architectural Reference**: `Simple_Architecture.pdf` & `FULL_PROJECT_MERMAID.md`

---

## 1. Core Objective

E-Scrap3R AI (ReUseChain) is an autonomous circular hardware diagnostics, self-learning escalation, and e-waste orchestration platform designed to combat the global 62M metric ton annual e-waste crisis.

The system ingests hardware telemetry from failing or end-of-life computing devices, diagnoses root causes via 14 native host probes, and routes every asset through the circular decision mandate:

$$\mathbf{Device \longrightarrow Agent: \ 1)\ Reuse, \ 2)\ Repair, \ 3)\ Restore}$$

1. **1) REUSE**: Algorithmic component harvest valuation ($185–$235 unlocked value from 24GB DDR4, 1TB NVMe, 144Hz IPS display) and turnkey DIY server blueprints (Linux NAS, Jellyfin home media hub, Pi-hole network ad-blocker), avoiding 34.8 kg CO2e per unit.
2. **2) REPAIR**: Open Network for Digital Commerce (ONDC) doorstep technician dispatch (Alex Rivera, Dell/HP Certified Specialist, flat $45 fee) with real-time GPS tracking radar (`/track/[id]`) and 1-click escrow release.
3. **3) RESTORE**: Certified zero-landfill e-waste recycling via EcoRecycle India (R2v3 / ISO 14001 compliant, instant +$18.50 scrap credit, cryptographic chemical destruction certificate) and OS kernel health restoration (`DISM /Online /Cleanup-Image /RestoreHealth`).

---

## 2. High-Level System Architecture & Component Interactions

```
                                      [ INGESTION LAYER ]
                         ┌─────────────────────┼─────────────────────┐
                         ▼                     ▼                     ▼
                  Manual Data Entry    Thinking Chat Agent    Emergency Bot
                     (/manual)             (/assistant)       (@backuvro_bot)
                         │                     │                     │
                         └─────────────────────┬─────────────────────┘
                                               ▼
                                   [ DIAGNOSTIC BRAIN CORE ]
                                   (hardware-ai-agent.ts)
                                               │
                        ┌──────────────────────┴──────────────────────┐
                        ▼                                             ▼
             14 Native Host Probes                        Human-in-the-Loop Escalation
        • 7 Direct Telemetry (WMI/CIM)                  • Telegram Admin Bot (@AHackBattle013bot)
        • 7 Stress & Reflex Matrix                      • Mobile /reply Ingestion
                                                        • SQLite Persistent Vector Store
                                               │
                                               ▼
                              [ CIRCULAR WATERFALL DECISION ]
                                               │
               ┌───────────────────────────────┼───────────────────────────────┐
               ▼                               ▼                               ▼
       1) 🔄 REUSE                     2) 🛠️ REPAIR                    3) ♻️ RESTORE
  • Modular Harvest ($185-$235)   • ONDC Doorstep Dispatch        • Zero-Landfill Recycling
  • Linux NAS / Plex Blueprints   • Live GPS Tracking Radar       • Instant +$18.50 Scrap Credit
  • 34.8 kg CO2e Avoidance        • 1-Click Escrow Cancellation   • DISM OS Component Restore
                                               │
                                               ▼
                             [ CRYPTOGRAPHIC TRUST & AUDIT ]
                           Digital Product Passport (DPP Ledger)
                             (SHA-256 Merkle Chain /passport)
```

### Component Breakdown
1. **Multi-Modal Ingestion**:
   - `src/app/manual/page.tsx`: Manual telemetry input and symptom checklist.
   - `src/app/assistant/page.tsx`: Thinking AI chatbot with terminal command sandbox.
   - `src/lib/telegram-service.ts`: Integration with `@backuvro_bot` for offline mobile triage when the host PC is dead or in BSOD.
2. **Deterministic Diagnostic Engine**:
   - `src/lib/hardware-ai-agent.ts`: Orchestrates 14 native probes querying CPU, RAM, GPU, storage SMART status, ACPI battery cycles, and PnP driver errors.
   - `src/components/KeyboardTestGame.tsx`: KeyStrike Reflex Matrix measuring key switch debounce, input latency, and jamming within 5-second reflex windows.
   - `src/lib/terminal-sandbox.ts`: Whitelisted execution sandbox preventing arbitrary shell injection.
3. **Autonomous Self-Learning Hub**:
   - `src/lib/self-learning-agent.ts`: Monitors unresolved hardware anomalies, escalates incidents to `@AHackBattle013bot`, ingests admin replies, and saves learned rules to SQLite.
4. **ONDC Doorstep Logistics**:
   - `src/app/api/ondc/services/route.ts`: Dispatches ONDC BAP/BPP work orders.
   - `src/app/track/[id]/page.tsx`: Real-time GPS tracking radar simulating technician transit geometry.
   - `src/app/api/ondc/cancel/route.ts`: Instant order cancellation and automated escrow hold release.
5. **Digital Product Passport (DPP) Ledger**:
   - `src/app/passport/[id]/page.tsx`: EU Ecodesign compliant ledger with continuous SHA-256 Merkle hashing:
     $$\text{Hash}_{n} = \text{SHA-256}\left(\text{Hash}_{n-1} \parallel \text{Timestamp} \parallel \text{DeviceID} \parallel \text{Payload}\right)$$

---

## 3. Database Schema Overview & Storage Design

The database uses SQLite 3 managed through Prisma ORM (`prisma/schema.prisma`). It comprises 19 tightly coupled models:

### 3.1 Core Asset & Component Models
- `Device`: Hardware lifecycle root entity (`id`, `assetTag`, `serialHash`, `organisation`, `make`, `model`, `ageMonths`, `lifecycleStatus`, `currentRole`).
- `Component`: Individual physical sub-assemblies (`id`, `deviceId`, `type` [battery/ssd/ram/display/motherboard/chassis], `healthPercent`, `currentStatus`, `specsJson`).
- `HealthSample`: High-frequency sensor samples (`componentId`, `metricName`, `metricValue`, `source`, `confidence`).
- `DiagnosticReport`: Ingested raw telemetry payloads (`deviceId`, `source`, `rawPayload`, `checksum`).

### 3.2 Decision, Policy & Human-in-the-Loop Models
- `DecisionCase`: Multi-tool dossiers (`deviceId`, `componentId`, `recommendedPath`, `confidenceScore`, `justification`, `evidenceJson`, `riskTier`, `status`).
- `Approval`: Role-based human sign-off (`caseId`, `requestedAction`, `riskTier`, `requiredRole`, `decision`).
- `Outcome`: Empirical results and life extension tracking (`caseId`, `actualResult`, `actualCost`, `usefulLifeExtensionMonths`).
- `AutonomySetting`: Autonomous execution spending caps and policy limits (`repairAutoLimitUSD`, `requireWipeProof`).
- `AdminEscalation`: Telegram human-in-the-loop escalation tickets (`queryText`, `symptomSummary`, `status`, `adminResponse`, `learnedRule`, `telegramChatId`).

### 3.3 Circular Execution & Logistics Models
- `TechnicianBooking`: Legacy technician records (`serviceType`, `technicianName`, `vendorName`, `estimatedCost`).
- `OndcBooking`: Open Network for Digital Commerce transaction (`ondcOrderId`, `serviceCategory`, `providerName`, `bapId`, `bppId`, `doorstepAddress`, `orderStatus`, `trackingUrl`).
- `ScrapValuation`: Material yield and recycling credit (`estimatedValueUSD`, `preciousMetalsG`, `copperG`, `recyclerPartner`, `pickupStatus`).
- `ManualPart` & `ReuseOption`: Repair catalog and DIY repurposing blueprints.
- `UserProfile`: Customer profile pre-populating ONDC dispatch credentials.

### 3.4 Cryptographic Trust & Vector Storage Models
- `PassportEvent`: Tamper-proof Merkle chain events (`deviceId`, `eventCategory`, `eventType`, `actor`, `description`, `eventHash`, `prevHash`).
- `MediaAsset`: Base64/URI storage of diagnostic images, screenshots, and OCR text with SHA-256 verification.
- `DiagnosticEmbedding`: 1536-dimensional vector embedding table for semantic similarity matching across hardware incidents.

---

## 4. Third-Party APIs, LLMs & External Services

| Service / Provider | Model / API Protocol | Role in System |
| :--- | :--- | :--- |
| **Google Gemini** | `gemini-2.0-flash-thinking-exp` / `gemini-1.5-flash` | Deep Chain-of-Thought reasoning for complex hardware diagnostics and optical Task Manager OCR analysis. |
| **OpenRouter** | `deepseek/deepseek-r1` / `meta-llama/llama-3.3-70b` | Open-weight reasoning models for multi-turn conversational triage and policy compliance. |
| **Groq** | `qwen-2.5-32b` / `llama-3.3-70b-versatile` | Ultra-low-latency real-time response generation (<500ms). |
| **Local Offline Heuristics**| Deterministic Rule Engine | 100% private, zero-API-key fallback ensuring zero downtime when disconnected. |
| **Telegram Bot API** | HTTPS Webhooks & Long Polling | Powers `@backuvro_bot` (offline mobile triage) and `@AHackBattle013bot` (admin self-learning). |
| **ONDC / Beckn Protocol** | BAP / BPP REST Data Contracts | Standardized open protocol for technician booking, live dispatch tracking, and cancellation. |
| **Windows Win32 / CIM** | WMI / PowerShell 5.1/7.x | Deterministic host hardware interrogation for CPU, RAM, GPU, storage SMART, and ACPI battery data. |
