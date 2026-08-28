const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

let jobs = [
  {
    id: 1,
    title: "Junior Software Developer",
    company: "Technology Company",
    location: "Hyderabad",
    salary: "₹4 LPA - ₹7 LPA",
    type: "Full Time",
    experience: "0-2 Years",
    category: "Private",
    updated: new Date().toISOString()
  }
];

// Get all jobs
app.get("/api/jobs", (req, res) => {
  res.json({
    success: true,
    count: jobs.length,
    jobs
  });
});

// Search jobs
app.get("/api/jobs/search", (req, res) => {
  const q = (req.query.q || "").toLowerCase();

  const results = jobs.filter(job =>
    job.title.toLowerCase().includes(q) ||
    job.company.toLowerCase().includes(q) ||
    job.location.toLowerCase().includes(q) ||
    job.category.toLowerCase().includes(q)
  );

  res.json({
    success: true,
    count: results.length,
    jobs: results
  });
});

// Automatic job sync
async function syncJobs() {
  console.log("🔄 Checking for new jobs...");

  // Real job API/source will be connected here.
  // New jobs will be added automatically.

  console.log(`✅ Job sync completed. Total jobs: ${jobs.length}`);
}

// Start server
app.listen(PORT, () => {
  console.log("🚀 JOBMITRA INDIA backend started");
  console.log(`🌐 API: http://localhost:${PORT}`);
  syncJobs();
});

// Run automatic sync every 10 minutes
setInterval(syncJobs, 10 * 60 * 1000);
