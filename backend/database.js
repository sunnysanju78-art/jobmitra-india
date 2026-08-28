const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "jobmitra-db.json");

// ==========================================
// CREATE DATABASE
// ==========================================

function createDatabase() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(
            DB_FILE,
            JSON.stringify(
                {
                    jobs: [],
                    lastSync: null
                },
                null,
                2
            )
        );
    }
}


// ==========================================
// READ DATABASE
// ==========================================

function readDatabase() {
    createDatabase();

    try {
        return JSON.parse(
            fs.readFileSync(DB_FILE, "utf8")
        );
    } catch (error) {
        console.error("❌ Database read error:", error.message);

        return {
            jobs: [],
            lastSync: null
        };
    }
}


// ==========================================
// WRITE DATABASE
// ==========================================

function writeDatabase(data) {
    fs.writeFileSync(
        DB_FILE,
        JSON.stringify(data, null, 2)
    );
}


// ==========================================
// GET ALL JOBS
// ==========================================

function getJobs() {
    return readDatabase().jobs;
}


// ==========================================
// ADD OR UPDATE JOB
// ==========================================

function saveJob(job) {

    const db = readDatabase();

    const now = new Date().toISOString();

    const externalId = String(
        job.externalId ||
        `${job.company}-${job.title}-${job.location}`
    );

    const index = db.jobs.findIndex(
        existing =>
            String(existing.externalId) === externalId
    );

    // ========================================
    // EXISTING JOB → UPDATE
    // ========================================

    if (index !== -1) {

        db.jobs[index] = {
            ...db.jobs[index],
            ...job,
            externalId,
            updatedAt: now
        };

        writeDatabase(db);

        return {
            action: "updated",
            job: db.jobs[index]
        };
    }


    // ========================================
    // NEW JOB → ADD
    // ========================================

    const newJob = {
        ...job,
        externalId,
        createdAt: now,
        updatedAt: now
    };

    db.jobs.push(newJob);

    writeDatabase(db);

    return {
        action: "added",
        job: newJob
    };
}


// ==========================================
// OLD FUNCTION — KEEP COMPATIBILITY
// ==========================================

function addJob(job) {

    const result = saveJob(job);

    if (result.action === "added") {
        return true;
    }

    return false;
}


// ==========================================
// SAVE MANY JOBS
// ==========================================

function saveJobs(jobs) {

    let added = 0;
    let updated = 0;

    for (const job of jobs) {

        const result = saveJob(job);

        if (result.action === "added") {
            added++;
        }

        if (result.action === "updated") {
            updated++;
        }
    }

    return {
        added,
        updated,
        total: getJobs().length
    };
}


// ==========================================
// UPDATE LAST SYNC
// ==========================================

function updateLastSync() {

    const db = readDatabase();

    db.lastSync = new Date().toISOString();

    writeDatabase(db);

    return db.lastSync;
}


// ==========================================
// GET LAST SYNC
// ==========================================

function getLastSync() {

    return readDatabase().lastSync;
}


// ==========================================
// EXPORT
// ==========================================

module.exports = {
    getJobs,
    addJob,
    saveJob,
    saveJobs,
    updateLastSync,
    getLastSync
};


console.log("✅ JOBMITRA database ready");
