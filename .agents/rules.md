# 🛡️ Project Rules & Engineering Standards

> **Workspace**: `C:\Users\banks\ReUseChain`  
> **Repository**: [kolatidheeraj013/E-Scrap3R_AI](https://github.com/kolatidheeraj013/E-Scrap3R_AI.git)  
> **Domain**: Circular Computing, Hardware Diagnostics, ONDC Doorstep Logistics, and Verifiable Digital Product Passports.

---

## 1. Exact Tech Stack & Runtime Specifications

### Core Engine & Web Layer
- **Framework**: Next.js 14.2.5 (App Router architecture, React Server Components & Client Components, Route Handlers).
- **Runtime Environment**: Node.js `v18.17.0+` / `v20.x` on Windows 10/11 Pro (x64).
- **Core Languages**: TypeScript 5.5.4 (Strict mode enabled), Windows PowerShell 5.1 / 7.x, Python 3.10+ (Knowledge graph & graphify AST engine).
- **React Runtime**: React 18.3.1 & React DOM 18.3.1.

### Styling & Design System
- **CSS Engine**: Tailwind CSS 3.4.19 with `tailwindcss-animate` 1.0.7, PostCSS 8.5.28, and Autoprefixer 10.5.6.
- **Design Primitives**: Custom dark mode glassmorphism design system; Radix-compatible UI tokens via `class-variance-authority` (0.7.1), `clsx` (2.1.1), `tailwind-merge` (3.6.0).
- **Icons & Visuals**: `lucide-react` 0.428.0, Recharts 2.12.7 (telemetry charts), Mermaid.js (architecture flows).

### Database & Persistence
- **ORM**: Prisma ORM 5.18.0 (`@prisma/client` 5.18.0).
- **Database Engine**: SQLite 3 (`file:./prisma/dev.db` or `file:./dev.db`).
- **Data Execution**: `tsx` 4.17.0 for direct TypeScript seed scripts and CLI bot runners.

### AI Reasoning & Multi-Agent Coordination
- **Frameworks**: `@langchain/core` 1.2.11, `@langchain/langgraph` 1.4.15.
- **Reasoning Providers**:
  - Google Gemini Native (`gemini-2.0-flash-thinking-exp`, `gemini-1.5-flash`).
  - OpenRouter Enterprise (`deepseek/deepseek-r1`, `meta-llama/llama-3.3-70b-instruct`).
  - Groq Ultra-Low Latency (`qwen-2.5-32b`, `llama-3.3-70b-versatile`).
  - Local Autonomous Offline Engine (`src/lib/hardware-ai-agent.ts` deterministic rule heuristics).

### External Integrations & Protocols
- **Telegram Bot API**: Dual bot mesh via HTTPS webhook and long-polling runner:
  - Emergency User Bot: `@backuvro_bot` (Token: `8923070582:...`).
  - Self-Improving Admin Bot: `@AHackBattle013bot` (Token: `8978711876:...`).
- **ONDC / Beckn Protocol**: Standardized data contracts for Buyer App (BAP) and Provider App (BPP) doorstep service dispatch.
- **Windows System APIs**: Direct low-overhead WMI/CIM queries via `Get-CimInstance` and `Get-Process`.

---

## 2. Code Style Constraints & Typing Rules

### 2.1 TypeScript Strictness & Type Hinting
- Every API endpoint request body and response payload MUST have an explicitly declared TypeScript `interface` or `type`.
- Avoid `any` escapes across core libraries (`hardware-ai-agent.ts`, `self-learning-agent.ts`, `policy-engine.ts`, `telegram-service.ts`). Use discriminated unions, strict interfaces, or `unknown` guarded by runtime type assertions.
- All exported functions must specify return types (e.g., `Promise<DiagnosticExecutionResult>` instead of implicit promises).

### 2.2 API Route Architecture (`src/app/api/`)
- All endpoints must be Next.js Route Handlers (`route.ts`) implementing standard HTTP methods (`GET`, `POST`, `DELETE`).
- Every endpoint must wrap execution in a `try/catch` block and return structured JSON:
  ```typescript
  // Standard success envelope
  return NextResponse.json({ success: true, data: result }, { status: 200 });

  // Standard error envelope
  return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  ```
- Always sanitize incoming parameters before database queries or script invocations.

### 2.3 Browser API & Client Safety
- Client-side code (`use client`) using browser-only APIs (`window`, `AudioContext`, `navigator`, `localStorage`) must defensively check:
  ```typescript
  if (typeof window === "undefined") return;
  ```
- Web Audio API instances (e.g., `KeyboardTestGame.tsx`) must gracefully resume from suspended states on user interaction.

### 2.4 Testing & Validation Requirements
- **Compiler Validation**: Every change MUST compile cleanly with zero TypeScript errors (`npx tsc --noEmit`).
- **Graphify Synchrony**: Any structural or functional code change MUST be immediately followed by `python -m graphify update .` to keep the codebase AST knowledge graph synchronized.
- **Deterministic Script Safety**: PowerShell commands must run through the whitelist sandbox (`src/lib/terminal-sandbox.ts`) to avoid shell injection.

---

## 3. Architectural Anti-Patterns (What NOT to Do)

1. **DO NOT Use LLMs to Guess Hardware Specs**:
   - Never prompt an LLM to hallucinate temperatures, clock frequencies, or drive wear.
   - Always query physical silicon via the **14 Native Host Probes** (`Get-CimInstance Win32_Processor`, etc.).
2. **DO NOT Mutate Hardware Lifecycle State Without DPP Audit**:
   - Never update a `Device.lifecycleStatus` or book an ONDC service without appending a SHA-256 Merkle `PassportEvent`. The cryptographic chain must remain contiguous.
3. **DO NOT Allow Circular Telegram Escalation Loops**:
   - Never forward an automated bot response back into the admin alert channel. Check `sourceChannel` and message origin IDs before triggering Telegram notifications.
4. **DO NOT Use Synchronous Blocking Commands on the Web Server**:
   - Hardware diagnostic stress tests (e.g., RAM WorkingSet stress, Direct3D render probes) must run with bounded timeouts (`AbortController` or timeout limits) to prevent freezing Next.js event loops.
5. **DO NOT Hardcode Production Secrets**:
   - Never commit raw API keys, Telegram bot tokens, or private endpoints. Always rely on `.env` with `.env.example` templates.
6. **DO NOT Break the Circular Directive**:
   - Always enforce the priority sequence:
     $$\mathbf{Device \longrightarrow Agent: \ 1)\ Reuse, \ 2)\ Repair, \ 3)\ Restore}$$
   - Never discard a device if salvageable components exist; never recycle before assessing repair and component harvesting.
