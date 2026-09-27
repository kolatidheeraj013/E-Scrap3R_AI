# hardware-ai-agent.ts

> 55 nodes · cohesion 0.10

## Key Concepts

- **telegram-service.ts** (25 connections) — `src/lib/telegram-service.ts`
- **run-telegram-bots.ts** (21 connections) — `scripts/run-telegram-bots.ts`
- **verify-backup-telegram-bot.ts** (17 connections) — `scripts/verify-backup-telegram-bot.ts`
- **self-learning-agent.ts** (17 connections) — `src/lib/self-learning-agent.ts`
- **understandAndDiagnoseWithAi()** (16 connections) — `src/lib/hardware-ai-agent.ts`
- **recordLearnedResolution()** (16 connections) — `src/lib/self-learning-agent.ts`
- **assistant/route.ts** (14 connections) — `src/app/api/assistant/route.ts`
- **webhook/route.ts** (13 connections) — `src/app/api/telegram/webhook/route.ts`
- **telegram/route.ts** (12 connections) — `src/app/api/telegram/route.ts`
- **verify-vision-and-telegram-learning.ts** (11 connections) — `scripts/verify-vision-and-telegram-learning.ts`
- **findLearnedKnowledgeMatch()** (11 connections) — `src/lib/self-learning-agent.ts`
- **sendTelegramMessage()** (11 connections) — `src/lib/telegram-service.ts`
- **dispatchEscalationToTelegram()** (10 connections) — `src/lib/telegram-service.ts`
- **parseTelegramAdminCommand()** (9 connections) — `src/lib/telegram-service.ts`
- **analyzeScreenshotOrPhoto()** (9 connections) — `src/lib/vision-diagnostic-engine.ts`
- **pollBackupBot()** (8 connections) — `scripts/run-telegram-bots.ts`
- **runVerification()** (8 connections) — `scripts/verify-backup-telegram-bot.ts`
- **POST()** (8 connections) — `src/app/api/assistant/route.ts`
- **runVerification()** (7 connections) — `scripts/verify-vision-and-telegram-learning.ts`
- **status/route.ts** (7 connections) — `src/app/api/escalations/status/route.ts`
- **POST()** (7 connections) — `src/app/api/telegram/webhook/route.ts`
- **pollAdminBot()** (6 connections) — `scripts/run-telegram-bots.ts`
- **escalations/route.ts** (6 connections) — `src/app/api/escalations/route.ts`
- **deliverResolutionToUserChat()** (6 connections) — `src/lib/telegram-service.ts`
- **POST()** (5 connections) — `src/app/api/telegram/route.ts`
- *... and 30 more nodes in this community*

## Relationships

- [telegram-service.ts](telegram-service.ts.md) (20 shared connections)
- [compilerOptions](compilerOptions.md) (18 shared connections)

## Source Files

- `scripts/run-telegram-bots.ts`
- `scripts/verify-backup-telegram-bot.ts`
- `scripts/verify-vision-and-telegram-learning.ts`
- `src/app/api/assistant/route.ts`
- `src/app/api/escalations/route.ts`
- `src/app/api/escalations/status/route.ts`
- `src/app/api/telegram/route.ts`
- `src/app/api/telegram/webhook/route.ts`
- `src/lib/hardware-ai-agent.ts`
- `src/lib/self-learning-agent.ts`
- `src/lib/telegram-service.ts`
- `src/lib/vision-diagnostic-engine.ts`

## Audit Trail

- EXTRACTED: 189 (100%)
- INFERRED: 0 (0%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*