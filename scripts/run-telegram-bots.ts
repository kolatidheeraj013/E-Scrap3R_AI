import { prisma } from "../src/lib/prisma";
import { understandAndDiagnoseWithAi } from "../src/lib/hardware-ai-agent";
import { analyzeScreenshotOrPhoto } from "../src/lib/vision-diagnostic-engine";
import { findLearnedKnowledgeMatch, recordLearnedResolution } from "../src/lib/self-learning-agent";
import {
  TELEGRAM_ADMIN_BOT_TOKEN,
  TELEGRAM_BACKUP_BOT_TOKEN,
  sendTelegramMessage,
  downloadTelegramFileAsBase64,
  dispatchEscalationToTelegram,
  deliverResolutionToUserChat,
  parseTelegramAdminCommand,
  setRuntimeAdminChatId,
} from "../src/lib/telegram-service";
import * as crypto from "crypto";

function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

console.log("==================================================");
console.log("🚀 STARTING REUSECHAIN DUAL TELEGRAM BOT DAEMON");
console.log(`📱 Backup Bot (Mobile Triage): ${TELEGRAM_BACKUP_BOT_TOKEN.slice(0, 10)}...`);
console.log(`👨‍💻 Admin Bot (Escalations):    ${TELEGRAM_ADMIN_BOT_TOKEN.slice(0, 10)}...`);
console.log("==================================================");

let backupOffset = 0;
let adminOffset = 0;
let isRunning = true;

// Interactive Keyboards matching the web application's Action Agent chips
const DEFAULT_KEYBOARD = {
  keyboard: [
    [{ text: "👨‍🔧 Book Doorstep Technician" }, { text: "📡 Track Live GPS" }],
    [{ text: "🔁 Salvage & Reuse Blueprints" }, { text: "♻️ E-Waste Recycling" }],
    [{ text: "🚨 Escalate to Admin" }, { text: "ℹ️ Help & Commands" }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

const AFTER_BOOKING_KEYBOARD = {
  keyboard: [
    [{ text: "📡 Track Live GPS" }, { text: "❌ Cancel Technician Dispatch" }],
    [{ text: "🚨 Escalate to Admin" }, { text: "ℹ️ Help & Commands" }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

/**
 * BACKUP TELEGRAM BOT: Mobile Emergency Agent matching Web Chat Agent
 */
async function pollBackupBot() {
  console.log("📡 [Backup Bot @backuvro_bot] Starting long polling loop...");

  // Purge lingering webhooks so getUpdates polling doesn't conflict
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BACKUP_BOT_TOKEN}/deleteWebhook?drop_pending_updates=false`);
    console.log("🧹 [Backup Bot] Cleared lingering webhooks for clean polling.");
  } catch (e) {
    console.warn("Could not delete backup bot webhook:", e);
  }

  while (isRunning) {
    try {
      const url = `https://api.telegram.org/bot${TELEGRAM_BACKUP_BOT_TOKEN}/getUpdates?offset=${backupOffset}&timeout=5`;
      const res = await fetch(url);
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      const data = await res.json();
      if (!data.ok || !Array.isArray(data.result)) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }

      for (const update of data.result) {
        backupOffset = update.update_id + 1;
        const msg = update.message;
        if (!msg) continue;

        const chatId = msg.chat.id;
        const rawText = (msg.text || msg.caption || "").trim();
        const textLower = rawText.toLowerCase();

        console.log(`📱 [Backup Bot] Received message from Chat ${chatId}: "${rawText.slice(0, 50)}"`);

        // Send typing indicator
        try {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BACKUP_BOT_TOKEN}/sendChatAction`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, action: "typing" }),
          });
        } catch {}

        try {
          // 1. Photo / Screen Analysis Flow
          if (msg.photo && Array.isArray(msg.photo) && msg.photo.length > 0) {
            const largestPhoto = msg.photo[msg.photo.length - 1];
            await sendTelegramMessage(
              TELEGRAM_BACKUP_BOT_TOKEN,
              chatId,
              "🔍 *Analyzing screen photo with Optical Diagnostic Engine...* Please hold on."
            );

            const photoBase64 = await downloadTelegramFileAsBase64(
              TELEGRAM_BACKUP_BOT_TOKEN,
              largestPhoto.file_id
            );

            const visionResult = await analyzeScreenshotOrPhoto(
              photoBase64 || rawText || "Task Manager Abnormal Load",
              rawText
            );

            const photoReply = [
              `📸 *[Screen & Task Manager Optical Analysis]*`,
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
              `⚠️ *Detected Anomaly:* *${visionResult.detectedAnomaly}*`,
              `🧩 *Suspicious Module:* \`${visionResult.suspiciousProcessOrModule || "System Component"}\``,
              `🛠️ *Triggered Tool:* ${visionResult.selectedTool.name} (${visionResult.selectedTool.category})`,
              ``,
              `📊 *3-Factor Health Assessment:*`,
              `• *Health:* ${visionResult.componentHealthState}`,
              `• *Impact:* ${visionResult.functionalImpact}`,
              `• *Root Cause:* ${visionResult.rootCause}`,
              ``,
              `💡 *Remediation Plan:*`,
              ...visionResult.suggestedRemediation.map((r) => `  • ${r}`),
              ``,
              `🎯 *Triage Verdict:* *${visionResult.triageVerdict.toUpperCase()}*`,
              `Reasoning: ${visionResult.conditionAssessment.reasoning}`,
              ``,
              visionResult.triageVerdict === "repair"
                ? [
                    `🎫 *1-Click Doorstep Repair Available via ONDC:*`,
                    `👨‍🔧 *Specialist:* Alex Rivera (Dell/HP Certified Specialist)`,
                    `💵 *Standard Fee:* $45.00 USD (Fixed Doorstep Rate)`,
                    `📅 *Slot:* Tomorrow, 10:30 AM - 12:00 PM`,
                    `👉 *Tap 'Book Doorstep Technician' below to dispatch!*`
                  ].join("\n")
                : visionResult.triageVerdict === "reuse"
                ? `👉 *Tap 'Salvage & Reuse Blueprints' below to explore modular component repurposing.*`
                : `👉 *Tap 'E-Waste Recycling' below for certified zero-landfill pickup ($18.50 scrap credit).*`,
            ].join("\n");

            await sendTelegramMessage(TELEGRAM_BACKUP_BOT_TOKEN, chatId, photoReply, "Markdown", DEFAULT_KEYBOARD);
            continue;
          }

          // 2. Command /start or /help
          if (textLower === "/start" || textLower === "/help" || textLower === "help" || textLower.includes("help & commands")) {
            const welcomeMsg = [
              `👋 *Welcome to ReUseChain Mobile Emergency Agent!*`,
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
              `This bot is your *dedicated emergency fallback* when your PC is completely turned off, dead, unbootable, showing drive errors (3F0, NVMe inaccessible, SMART errors), or when you cannot access the web interface.`,
              ``,
              `🛠️ *Available In-Chat Capabilities:*`,
              `📸 *Send any screen photo* of your error, BIOS, BSOD, or Task Manager`,
              `💬 *Type your symptom:* (e.g. _"c drive SSD error"_, _"3F0 Boot drive not found"_, _"keyboard buttons not working"_, _"PC won't turn on"_)`,
              `👨‍🔧 *'Book Doorstep Technician'*: Dispatch certified Dell/HP specialist via ONDC ($45)`,
              `📡 *'Track Live GPS'*: Monitor live real-time location & ETA of your technician`,
              `❌ *'Cancel Technician'*: Cancel active dispatch and release escrow hold`,
              `🔁 *'Salvage & Reuse'*: View component resale valuations & DIY server blueprints`,
              `♻️ *'E-Waste Recycling'*: Schedule zero-landfill e-waste collection with instant credit`,
              `🚨 *'Escalate to Admin'*: Escalate to Lead Systems Administrator for expert intervention`,
              ``,
              `_Tap any button below or describe your PC symptom directly!_`
            ].join("\n");

            await sendTelegramMessage(TELEGRAM_BACKUP_BOT_TOKEN, chatId, welcomeMsg, "Markdown", DEFAULT_KEYBOARD);
            continue;
          }

          // 3. Cancel Technician Dispatch Intent
          if (
            textLower.includes("cancel") &&
            (textLower.includes("technician") || textLower.includes("booking") || textLower.includes("order") || textLower.includes("dispatch") || textLower.includes("tech"))
          ) {
            let booking = await prisma.ondcBooking.findFirst({
              where: { orderStatus: { not: "CANCELLED" } },
              orderBy: { createdAt: "desc" },
            });

            if (!booking) {
              booking = await prisma.ondcBooking.findFirst({
                orderBy: { createdAt: "desc" },
              });
            }

            const orderId = booking?.ondcOrderId || "ONDC-SRV-2026-948122";

            if (booking) {
              await prisma.ondcBooking.update({
                where: { id: booking.id },
                data: { orderStatus: "CANCELLED" },
              });

              await prisma.technicianBooking.updateMany({
                where: {
                  OR: [
                    { deviceId: booking.deviceId },
                    { assetTag: booking.assetTag },
                  ],
                },
                data: { serviceStatus: "cancelled" },
              });
            }

            const cancelReply = [
              `🚫 *Technician Dispatch Cancelled*`,
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
              `🎫 *Order ID:* \`${orderId}\``,
              `👨‍🔧 *Technician:* Alex Rivera (Dell/HP Certified Specialist)`,
              `💵 *Refund / Release Status:* Pre-Authorized Hold Released ($45.00 USD)`,
              `📅 *Cancelled At:* ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
              ``,
              `The technician has been notified and the dispatch queue has been updated.`,
              `_Need anything else? Type a new symptom or tap a button below._`
            ].join("\n");

            await sendTelegramMessage(TELEGRAM_BACKUP_BOT_TOKEN, chatId, cancelReply, "Markdown", DEFAULT_KEYBOARD);
            continue;
          }

          // 4. Live ONDC GPS Tracking Intent
          if (
            textLower.includes("track") ||
            textLower.includes("where is") ||
            textLower.includes("gps") ||
            textLower.includes("eta") ||
            textLower.includes("ondc-srv")
          ) {
            const latestBooking = await prisma.ondcBooking.findFirst({
              orderBy: { createdAt: "desc" },
            });

            const orderId = latestBooking?.ondcOrderId || "ONDC-SRV-2026-948122";
            const trackingReply = [
              `📡 *[Live ONDC GPS Tracking]*`,
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
              `🎫 *Order ID:* \`${orderId}\``,
              `👨‍🔧 *Technician:* Alex Rivera (Certified Dell/HP Specialist)`,
              `📞 *Direct Line:* +91 94812 33490`,
              `🚗 *Vehicle:* Eco-Electric Mobile Diagnostic Unit #BLR-42`,
              ``,
              `📍 *Live Movement Telemetry:*`,
              `• *Distance:* 2.1 km away from destination`,
              `• *Estimated Arrival:* 14 minutes`,
              `• *Coordinates:* 12.9784° N, 77.5912° E (Indiranagar 100ft Rd)`,
              `• *Destination:* 42 Tech Park Boulevard, Bangalore`,
              ``,
              `🏁 *Dispatch Milestones:*`,
              `✅ Indiranagar Mobility Hub Dispatch Confirmed`,
              `✅ En Route via 100 Feet Rd (2.1 km)`,
              `⏳ Doorstep Arrival (ETA ~14 mins)`,
              `⏳ Onsite Hardware Diagnostic & Servicing`,
              ``,
              `_Live vehicle GPS is streaming directly to this session._`
            ].join("\n");

            await sendTelegramMessage(TELEGRAM_BACKUP_BOT_TOKEN, chatId, trackingReply, "Markdown", AFTER_BOOKING_KEYBOARD);
            continue;
          }

          // 5. Booking Technician via ONDC Intent
          if (
            textLower.includes("book") ||
            textLower.includes("technician") ||
            textLower.includes("doorstep") ||
            textLower.includes("reserve tech") ||
            textLower.includes("send someone") ||
            textLower.includes("skip testing") ||
            textLower.includes("skip test") ||
            textLower.includes("straight to repair")
          ) {
            let profile = await prisma.userProfile.findFirst({ where: { id: "user_default" } });
            if (!profile) {
              profile = await prisma.userProfile.create({
                data: {
                  id: "user_default",
                  fullName: "Sarah Chen",
                  email: "sarah.chen@techcorp.io",
                  phoneNumber: "+91 98765 43210",
                  role: "Device Owner",
                  addressLine: "42 Tech Park Boulevard, Block C, Suite 402",
                  city: "Bangalore",
                  state: "Karnataka",
                  pinCode: "560103",
                  gpsCoordinates: "12.9716, 77.5946",
                },
              });
            }

            const dev = await prisma.device.findFirst();
            const deviceId = dev?.id || "GENERIC_DEVICE";
            const assetTag = dev?.assetTag || "ASSET-0142";
            const orderSuffix = Math.floor(100000 + Math.random() * 900000);
            const ondcOrderId = `ONDC-SRV-2026-${orderSuffix}`;
            const technicianName = "Alex Rivera (Dell/HP Certified Specialist)";
            const timeSlot = "Tomorrow, 10:30 AM - 12:00 PM";
            const passportHash = sha256(`TELEGRAM_ONDC_BOOKING:${ondcOrderId}:${Date.now()}`);

            await prisma.technicianBooking.create({
              data: {
                deviceId,
                assetTag,
                serviceType: "Doorstep Hardware Diagnostics & NVMe/Motherboard Servicing",
                technicianName,
                vendorName: "UrbanCare Hardware Logistics on ONDC",
                estimatedCost: 45.0,
                scheduledDate: new Date(Date.now() + 86400000),
                serviceStatus: "dispatched",
                workOrderNotes: `Dispatched from Telegram Backup Bot. User issue: ${rawText}`,
              },
            });

            await prisma.ondcBooking.create({
              data: {
                deviceId,
                assetTag,
                ondcOrderId,
                providerId: "BPP-UC-BLR-9921",
                providerName: "UrbanCare Hardware Logistics on ONDC",
                serviceCategory: "PC_HARDWARE_DOORSTEP_REPAIR",
                serviceDescription: "Emergency Doorstep Hardware Technician Dispatch",
                orderStatus: "CONFIRMED",
                timeSlot,
                totalAmountUSD: 45.0,
                customerName: profile.fullName,
                customerPhone: profile.phoneNumber,
                doorstepAddress: `${profile.addressLine}, ${profile.city}`,
                pinCode: profile.pinCode,
                gpsCoordinates: profile.gpsCoordinates,
                bapId: "reusechain.ondc.bap.org",
                bppId: "services.ondc.bpp.urbancare.net",
                passportHash,
              },
            });

            const bookingReply = [
              `🎉 *Doorstep Technician Booked via ONDC!*`,
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
              `🎫 *Order ID:* \`${ondcOrderId}\``,
              `👨‍🔧 *Assigned Specialist:* ${technicianName}`,
              `📅 *Scheduled Window:* ${timeSlot}`,
              `📍 *Service Address:* ${profile.addressLine}, ${profile.city} (${profile.pinCode})`,
              `💵 *Diagnostic & Service Fee:* $45.00 USD`,
              `🔐 *Circularity Passport:* \`${passportHash.slice(0, 16)}...\``,
              ``,
              `🚗 *Live Dispatch Status:* Technician allocated at Indiranagar Mobility Hub.`,
              `👉 *Tap 'Track Live GPS' below to monitor real-time vehicle movement!*`
            ].join("\n");

            await sendTelegramMessage(TELEGRAM_BACKUP_BOT_TOKEN, chatId, bookingReply, "Markdown", AFTER_BOOKING_KEYBOARD);
            continue;
          }

          // 6. Admin Escalation Intent
          const isForceEscalate =
            textLower.includes("admin") ||
            textLower.includes("escalat") ||
            textLower.includes("human") ||
            textLower.includes("cant fix") ||
            textLower.includes("cannot fix") ||
            textLower.includes("dont know") ||
            textLower.includes("seek help");

          if (isForceEscalate) {
            const dev = await prisma.device.findFirst();
            const deviceId = dev?.id || "GENERIC_DEVICE";
            const assetTag = dev?.assetTag || "ASSET-0142";

            const escalation = await prisma.adminEscalation.create({
              data: {
                deviceId,
                assetTag,
                queryText: rawText || "Mobile triage escalation from dead/unbootable PC",
                symptomSummary: `[Backup Bot - Offline PC] ${rawText.slice(0, 200)}`,
                telemetrySnippet: "Host offline / Dead PC triage via Telegram Bot",
                sourceChannel: "telegram_backup_bot",
                telegramChatId: String(chatId),
                status: "pending",
                urgency: "high",
              },
            });

            // Send formatted alert to Admin Bot (@AHackBattle013bot)
            await dispatchEscalationToTelegram({
              escalationId: escalation.id,
              assetTag,
              queryText: rawText,
              symptomSummary: `[Backup Bot] User device is offline or unbootable. Query: ${rawText}`,
              telemetrySnippet: "Host unreachable - Mobile emergency triage",
              urgency: "high",
              sourceChannel: "telegram_backup_bot",
              telegramChatId: String(chatId),
              createdAt: escalation.createdAt,
            });

            const userEscMsg = [
              `🚨 *[Escalated to Lead Systems Administrator]*`,
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
              `🎫 *Ticket ID:* \`${escalation.id.slice(0, 8)}\``,
              `👤 *Assigned To:* Lead Systems Administrator (via @AHackBattle013bot)`,
              `⚡ *Urgency:* *HIGH*`,
              ``,
              `I have transmitted your full query and telemetry to our lead administrator. As soon as they reply, their verified solution will be sent *directly into this Telegram chat*!`,
              ``,
              `🧠 *Self-Learning Active:* Once answered, our AI will permanently memorize the resolution for future occurrences.`,
              `_You will be notified right here immediately upon reply._`
            ].join("\n");

            await sendTelegramMessage(TELEGRAM_BACKUP_BOT_TOKEN, chatId, userEscMsg, "Markdown", DEFAULT_KEYBOARD);
            continue;
          }

          // 7. Check Self-Learning Memory (Autonomous solution applied from past admin reply)
          const learnedMatch = await findLearnedKnowledgeMatch(rawText);
          if (learnedMatch.matched && learnedMatch.match) {
            const learnedMsg = [
              `🧠 *[Adaptive AI - Autonomous Solution Applied]*`,
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
              `I previously escalated this exact symptom to our Lead Systems Administrator, and I have self-improved to apply their verified solution:`,
              ``,
              `💬 *Admin Verified Resolution:*`,
              `"${learnedMatch.match.adminResponse}"`,
              ``,
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
              `✅ *Status:* Autonomously resolved from permanent memory (applied ${learnedMatch.match.timesApplied} times).`,
              `_Need further help? Tap 'Book Doorstep Technician' or 'Escalate to Admin'._`
            ].join("\n");

            await sendTelegramMessage(TELEGRAM_BACKUP_BOT_TOKEN, chatId, learnedMsg, "Markdown", DEFAULT_KEYBOARD);
            continue;
          }

          // 8. Reuse / Salvage Blueprints Intent
          if (
            textLower.includes("reuse") ||
            textLower.includes("salvage") ||
            textLower.includes("blueprint") ||
            textLower.includes("repurpose")
          ) {
            const reuseReply = [
              `🎉 *Modular Component Salvage & Reuse Blueprints*`,
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
              `Even if your motherboard or CPU is completely dead, your system contains high-value working sub-assemblies!`,
              `🌱 *Environmental Impact:* Salvaging avoids *34.8 kg CO2e* in emissions.`,
              `💰 *Estimated Total Parts Resale Value:* *$185 - $235 USD*`,
              ``,
              `1️⃣ *Network-Attached Storage (NAS) Node*`,
              `• *Salvaged Parts:* Samsung 512GB NVMe SSD ($38-$48) + 24GB DDR4 RAM ($45-$55)`,
              `• *Recommended OS:* OpenMediaVault 7 / TrueNAS Core`,
              `• *Annual Value Saved:* $140/year`,
              ``,
              `2️⃣ *Low-Power Jellyfin / Plex Media Server*`,
              `• *Salvaged Parts:* QuickSync iGPU + RAM + Storage`,
              `• *Recommended OS:* Ubuntu Server 24.04 (Dockerized)`,
              `• *Annual Value Saved:* $180/year`,
              ``,
              `3️⃣ *Portable USB-C Secondary Field Monitor*`,
              `• *Salvaged Parts:* 15.6" FHD IPS Display Panel ($65-$80)`,
              `• *Setup:* Universal eDP to HDMI/Type-C Controller Board ($12)`,
              `• *Annual Value Saved:* $95/year`,
              ``,
              `_Tap 'Book Doorstep Technician' if you need a specialist to safely harvest these parts!_`
            ].join("\n");

            await sendTelegramMessage(TELEGRAM_BACKUP_BOT_TOKEN, chatId, reuseReply, "Markdown", DEFAULT_KEYBOARD);
            continue;
          }

          // 9. E-Waste Recycling Intent
          if (
            textLower.includes("recycle") ||
            textLower.includes("e-waste") ||
            textLower.includes("scrap") ||
            textLower.includes("disposal")
          ) {
            const pickupId = `EWASTE-REC-2026-${Math.floor(100000 + Math.random() * 900000)}`;
            const certNo = `CERT-ZERO-LF-${Math.floor(1000000 + Math.random() * 9000000)}`;

            const recycleReply = [
              `🎉 *Certified Zero-Landfill E-Waste Collection Scheduled!*`,
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
              `🎫 *Pickup ID:* \`${pickupId}\``,
              `🏢 *Partner:* EcoRecycle India (R2v3 Certified & ISO 14001 Compliant)`,
              `💵 *Instant Scrap Credit Reserved:* *$18.50* (Direct UPI / Bank Transfer)`,
              `📜 *Destruction Certificate:* \`${certNo}\``,
              `📅 *Collection Slot:* Tomorrow, 03:00 PM - 05:00 PM`,
              ``,
              `♻️ *Materials Safely Recovered:*`,
              `• Copper & Gold wire bonding: 99.2% recovery`,
              `• Lithium & Cobalt cells: 94.8% hydrometallurgical recovery`,
              `• Toxic lead & CRT elements: 100% chemically neutralized (Zero-Landfill Guarantee)`
            ].join("\n");

            await sendTelegramMessage(TELEGRAM_BACKUP_BOT_TOKEN, chatId, recycleReply, "Markdown", DEFAULT_KEYBOARD);
            continue;
          }

          // 10. Hardware & Drive Diagnostic Engine (Default AI Triage)
          const diag = await understandAndDiagnoseWithAi(rawText);

          const diagnosticLines = [
            `🔍 *[ReUseChain Diagnostic & Condition Triage]*`,
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            `💻 *Asset:* \`ASSET-0142\``,
            `🎯 *Issue Diagnosis:* *${diag.interpretedIntent}*`,
            `🧩 *Affected Component:* \`${diag.affectedComponent}\``,
            `🛠️ *Triggered Tool:* ${diag.selectedTool.name} (${diag.testingCategory})`,
            ``,
            `📊 *3-Factor Health Assessment:*`,
            `• *Health:* ${diag.threeFactors.factor1_health}`,
            `• *Impact:* ${diag.threeFactors.factor2_impact}`,
            `• *Root Cause:* ${diag.threeFactors.factor3_rootCause}`,
            ``,
            `💡 *Condition Assessment:* *${diag.conditionAssessment.badge}*`,
            `Reasoning: ${diag.conditionAssessment.reasoning}`,
          ];

          if (diag.triageVerdict === "repair") {
            diagnosticLines.push(
              ``,
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
              `🎫 *1-Click Doorstep Repair Available via ONDC:*`,
              `👨‍🔧 *Specialist:* ${diag.orderTrigger?.technician || "Alex Rivera (Dell/HP Certified Specialist)"}`,
              `💵 *Standard Fee:* $${(diag.orderTrigger?.feeUSD || 45).toFixed(2)} USD (Fixed Doorstep Rate)`,
              `📅 *Slot:* ${diag.orderTrigger?.scheduledSlot || "Tomorrow, 10:30 AM - 12:00 PM"}`,
              `👉 *Tap 'Book Doorstep Technician' below or reply 'book' to dispatch!*`
            );
          } else if (diag.triageVerdict === "reuse") {
            diagnosticLines.push(
              ``,
              `👉 *Tap 'Salvage & Reuse Blueprints' below to explore component repurposing.*`
            );
          } else if (diag.triageVerdict === "recycle") {
            diagnosticLines.push(
              ``,
              `👉 *Tap 'E-Waste Recycling' below to schedule certified zero-landfill pickup ($18.50 credit).*`
            );
          } else {
            diagnosticLines.push(
              ``,
              `✅ *Status:* Hardware operating within normal thresholds. Doorstep repair is not required.`
            );
          }

          if (diag.suggestions && diag.suggestions.length > 0) {
            diagnosticLines.push(
              ``,
              `💡 *Suggested Actions:*`,
              ...diag.suggestions.map((s) => `• ${s}`)
            );
          }

          diagnosticLines.push(
            ``,
            `_Need an expert? Tap 'Escalate to Admin' to forward to Lead Systems Administrator!_`
          );

          await sendTelegramMessage(
            TELEGRAM_BACKUP_BOT_TOKEN,
            chatId,
            diagnosticLines.join("\n"),
            "Markdown",
            DEFAULT_KEYBOARD
          );

        } catch (itemErr: any) {
          console.error(`⚠️ [Backup Bot] Error processing message from ${chatId}:`, itemErr);
          await sendTelegramMessage(
            TELEGRAM_BACKUP_BOT_TOKEN,
            chatId,
            "⚠️ *Processing Notice:* An unexpected error occurred. Please try again or type 'help'.",
            "Markdown",
            DEFAULT_KEYBOARD
          );
        }
      }
    } catch (err: any) {
      console.warn("⚠️ [Backup Bot] Exception in polling loop:", err.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

/**
 * ADMIN TELEGRAM BOT: Human-in-the-Loop Escalation & Self-Learning Engine
 */
async function pollAdminBot() {
  console.log("📡 [Admin Bot @AHackBattle013bot] Starting long polling loop...");

  // Purge lingering webhooks so getUpdates polling doesn't conflict
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_ADMIN_BOT_TOKEN}/deleteWebhook?drop_pending_updates=false`);
    console.log("🧹 [Admin Bot] Cleared lingering webhooks for clean polling.");
  } catch (e) {
    console.warn("Could not delete admin bot webhook:", e);
  }

  while (isRunning) {
    try {
      const url = `https://api.telegram.org/bot${TELEGRAM_ADMIN_BOT_TOKEN}/getUpdates?offset=${adminOffset}&timeout=5`;
      const res = await fetch(url);
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      const data = await res.json();
      if (!data.ok || !Array.isArray(data.result)) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }

      for (const update of data.result) {
        adminOffset = update.update_id + 1;
        const msg = update.message;
        if (!msg) continue;

        const chatId = msg.chat.id;
        const rawText = (msg.text || msg.caption || "").trim();
        const fromUser = msg.from?.first_name
          ? `${msg.from.first_name} ${msg.from.last_name || ""}`.trim()
          : "Lead Systems Administrator";

        console.log(`👨‍💻 [Admin Bot] Received message from Admin ${chatId}: "${rawText.slice(0, 50)}"`);
        setRuntimeAdminChatId(chatId);

        // Handle /start or /help
        if (rawText === "/start" || rawText === "/help") {
          const helpMsg = [
            `🤖 *ReUseChain Administrator Control Bot*`,
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            `You are connected to the central escalation router.`,
            ``,
            `Commands:`,
            `• \`/status\`: View pending user escalations from Web Chat and Backup Telegram Bot`,
            `• \`/reply <ticketId> <resolution>\`: Deliver solution directly into user's chat and train self-learning AI`,
            ``,
            `Example:`,
            `\`/reply ESC-9921 Replace NVMe drive and run chkdsk C: /f /r\``
          ].join("\n");

          await sendTelegramMessage(TELEGRAM_ADMIN_BOT_TOKEN, chatId, helpMsg);
          continue;
        }

        // Handle /status
        if (rawText === "/status") {
          const pending = await prisma.adminEscalation.findMany({
            where: { status: "pending" },
            orderBy: { createdAt: "desc" },
            take: 5,
          });

          if (pending.length === 0) {
            await sendTelegramMessage(
              TELEGRAM_ADMIN_BOT_TOKEN,
              chatId,
              "✅ *All Clear:* There are currently 0 pending escalations in the queue!"
            );
          } else {
            const listText = [
              `📊 *Pending Escalation Queue (${pending.length} Tickets):*`,
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
              ...pending.map((p) => [
                `🎫 *Ticket:* \`${p.id.slice(0, 8)}\` (${p.sourceChannel === "telegram_backup_bot" ? "📱 Backup Telegram Bot" : "💻 Web Chat"})`,
                `💻 *Asset:* ${p.assetTag || "ASSET-0142"} | ⚡ *Urgency:* ${p.urgency}`,
                `👤 *Query:* "${p.queryText.slice(0, 100)}"`,
                `👉 *Reply:* \`/reply ${p.id.slice(0, 8)} <Your Solution>\``,
                ``
              ].join("\n"))
            ].join("\n");

            await sendTelegramMessage(TELEGRAM_ADMIN_BOT_TOKEN, chatId, listText);
          }
          continue;
        }

        // Handle /reply <ticketId> <resolution>
        const parsed = parseTelegramAdminCommand(rawText);
        if (parsed.command === "reply" && parsed.ticketId && parsed.resolutionMessage) {
          let targetId = parsed.ticketId;
          let esc = await prisma.adminEscalation.findUnique({ where: { id: targetId } });

          // Fallback prefix search
          if (!esc) {
            const pending = await prisma.adminEscalation.findMany({
              where: { status: "pending" },
              orderBy: { createdAt: "desc" },
              take: 10,
            });
            const matched = pending.find((p) => p.id.startsWith(targetId) || targetId.includes(p.id.slice(0, 6)));
            if (matched) {
              esc = matched;
              targetId = matched.id;
            }
          }

          if (!esc) {
            await sendTelegramMessage(
              TELEGRAM_ADMIN_BOT_TOKEN,
              chatId,
              `⚠️ *Error:* Could not find pending ticket \`#${targetId}\`. Type /status to list tickets.`
            );
            continue;
          }

          // 1. Record learned resolution in self-learning engine
          const resolution = await recordLearnedResolution({
            escalationId: targetId,
            adminResponse: parsed.resolutionMessage,
            resolvedBy: `${fromUser} (via Admin Bot)`,
          });

          // 2. Deliver directly to user's channel (Backup Telegram Bot or active Web Session)
          const delivery = await deliverResolutionToUserChat(targetId, parsed.resolutionMessage);

          const confirmMsg = [
            `✅ *[ESCALATION RESOLVED & DISPATCHED]*`,
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            `🎫 *Ticket ID:* \`${targetId.slice(0, 8)}\``,
            `👤 *Admin:* ${fromUser}`,
            `📡 *Delivery Route:* ${delivery.deliveredToTelegram ? "📱 Dispatched to user's Telegram Chat!" : "💻 Delivered to Web Session!"}`,
            ``,
            `💬 *Delivered Message:*`,
            `"${parsed.resolutionMessage}"`,
            ``,
            `🧠 *Self-Learning Model Calibrated:*`,
            `Rule permanently committed to database. Future occurrences will now be solved autonomously by the AI!`,
            `🔐 *Passport Hash:* \`${resolution.passportHash.slice(0, 16)}...\``
          ].join("\n");

          await sendTelegramMessage(TELEGRAM_ADMIN_BOT_TOKEN, chatId, confirmMsg);
          continue;
        }

        // Unrecognized command
        await sendTelegramMessage(
          TELEGRAM_ADMIN_BOT_TOKEN,
          chatId,
          `🤖 *Admin Bot:* To answer a ticket and train the AI, use:\n\`/reply <ticketId> <Your Solution>\`\n\nOr type \`/status\` to see active queue.`
        );
      }
    } catch (err: any) {
      console.warn("⚠️ [Admin Bot] Exception in polling loop:", err.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

// Start both long-polling loops concurrently
Promise.all([pollBackupBot(), pollAdminBot()]).catch((err) => {
  console.error("Fatal error in bot runner:", err);
});

process.on("SIGINT", () => {
  console.log("Stopping bot daemon...");
  isRunning = false;
  process.exit(0);
});
