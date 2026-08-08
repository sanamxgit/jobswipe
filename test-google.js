require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GOOGLE_API_KEY?.trim();
const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;

console.log("API Key loaded:", apiKey ? "Yes (length: " + apiKey.length + ")" : "No");
console.log("Search Engine ID loaded:", cx ? "Yes" : "No");

if (!apiKey || !cx) {
  console.log("❌ Missing credentials in .env.local");
  process.exit(1);
}

const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=cyber+security+jobs+UK`;

fetch(url)
  .then(res => res.json())
  .then(data => console.log("✅ Success:", JSON.stringify(data, null, 2).slice(0, 500) + "..."))
  .catch(err => console.error("❌ Error:", err.message));