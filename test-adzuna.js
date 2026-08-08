require("dotenv").config({ path: ".env.local" });

const appId = process.env.ADZUNA_APP_ID?.trim();
const appKey = process.env.ADZUNA_APP_KEY?.trim();

console.log("ADZUNA_APP_ID:", appId ? `Yes (${appId.length} chars)` : "Missing");
console.log("ADZUNA_APP_KEY:", appKey ? `Yes (${appKey.length} chars)` : "Missing");

if (!appId || !appKey) {
  console.log("\n❌ Set both ADZUNA_APP_ID and ADZUNA_APP_KEY in .env.local");
  console.log("   Register free at https://developer.adzuna.com/");
  process.exit(1);
}

const url =
  "https://api.adzuna.com/v1/api/jobs/gb/search/1?" +
  new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: "3",
    what: "cyber security",
    where: "uk",
    sort_by: "date",
    max_days_old: "7",
    content: "1",
    "content-type": "application/json",
  });

fetch(url)
  .then(async (res) => {
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.log("\n❌ Adzuna returned non-JSON (likely temporary outage). Try again.");
      console.log("   Status:", res.status, "— body starts with:", text.slice(0, 80));
      process.exit(1);
    }
    if (!res.ok || data.exception) {
      console.log("\n❌ Adzuna auth/request failed:", data.display || data.exception || res.status);
      if (data.exception === "AUTH_FAIL") {
        console.log("   Check Application ID + Application Key on your Adzuna developer dashboard.");
      }
      process.exit(1);
    }
    console.log(`\n✅ Success — ${data.count} UK cyber security jobs found`);
    for (const job of data.results ?? []) {
      console.log(`   • ${job.title} @ ${job.company?.display_name} (${job.location?.display_name})`);
    }
  })
  .catch((err) => {
    console.error("❌ Network error:", err.message);
    process.exit(1);
  });
