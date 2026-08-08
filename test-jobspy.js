require("dotenv").config({ path: ".env.local" });

const { fetchJobSpyJobs } = require("./src/lib/jobspy.ts");

fetchJobSpyJobs({ topic: "cyber security", location: { city: "London", region: "", country: "United Kingdom", label: "London", source: "manual" } })
  .then((jobs) => {
    console.log(`\n✅ JobSpy — ${jobs.length} jobs`);
    for (const job of jobs.slice(0, 5)) {
      console.log(`   • [${job.source}] ${job.title} @ ${job.company}`);
    }
  })
  .catch((err) => {
    console.error("❌", err.message);
    process.exit(1);
  });
