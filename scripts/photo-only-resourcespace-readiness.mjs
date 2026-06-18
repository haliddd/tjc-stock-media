#!/usr/bin/env node
const requiredEnv = [
  ["BETA_AUTH_ENABLED", "Beta gate must stay explicit for hosted beta."],
  ["BETA_SESSION_SECRET", "Beta session signing secret must be configured outside Git."],
  ["BETA_FEEDBACK_ENABLED", "Feedback collection must be intentionally enabled or disabled."],
  ["KV_REST_API_URL", "Durable hosted feedback store endpoint."],
  ["KV_REST_API_TOKEN", "Durable hosted feedback store token."],
  ["RESOURCESPACE_BASE_URL", "ResourceSpace API base URL."],
  ["RESOURCESPACE_API_USER", "ResourceSpace API user."],
  ["RESOURCESPACE_API_KEY", "ResourceSpace API key."],
  ["RESOURCESPACE_ENABLE_WRITEBACK", "Writeback switch; must not be live without human proof."],
  ["RESOURCESPACE_WRITEBACK_MODE", "Writeback mode; queued/dry-run until approved."],
  ["DOWNLOAD_GATE_ALLOW_DEMO_ROLES", "Demo-role download gate switch; production should stay off."]
];

const optionalEnv = [
  ["BLOB_READ_WRITE_TOKEN", "Only if beta feedback attachments are explicitly enabled and policy-approved."],
  ["BRAND_KIT_MVP_2024_COLLECTION_ID", "Only if Brand Hub maps to a real ResourceSpace collection."],
  ["S3_BUCKET", "Future derivative delivery bucket; not required for current photo-only beta."],
  ["S3_REGION", "Future derivative delivery region; not required for current photo-only beta."],
  ["S3_ACCESS_ROLE", "Future signed derivative delivery role; not required for current photo-only beta."],
  ["GOOGLE_SHARED_DRIVE_ID", "Future custody/inventory automation; Google Drive remains master-original custody."]
];

function status(name) {
  return process.env[name] ? "set" : "missing";
}

function row([name, purpose]) {
  return `${name.padEnd(36)} ${status(name).padEnd(8)} ${purpose}`;
}

const liveWriteback = process.env.RESOURCESPACE_ENABLE_WRITEBACK === "1" && process.env.RESOURCESPACE_WRITEBACK_MODE === "live";
const productionDemoDownloads = process.env.NODE_ENV === "production" && process.env.DOWNLOAD_GATE_ALLOW_DEMO_ROLES === "1";
const attachmentRisk = process.env.BETA_FEEDBACK_ATTACHMENTS_ENABLED === "1" && !process.env.BLOB_READ_WRITE_TOKEN;

console.log("Photo-only ResourceSpace readiness inventory");
console.log("Values intentionally not printed.\n");
console.log("Required names");
for (const item of requiredEnv) console.log(row(item));
console.log("\nOptional/future names");
for (const item of optionalEnv) console.log(row(item));

const failures = [];
if (liveWriteback) failures.push("ResourceSpace live writeback appears enabled. Keep writeback queued/dry-run until human proof.");
if (productionDemoDownloads) failures.push("Production runtime must not allow demo-role download gate access.");
if (attachmentRisk) failures.push("Feedback attachments enabled without Blob token; disable attachments or configure private storage policy.");

if (failures.length) {
  console.error("\nUnsafe readiness state:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nReadiness dry run passed: no unsafe env posture detected by name/status checks.");
