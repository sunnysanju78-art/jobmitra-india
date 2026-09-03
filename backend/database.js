const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "jobmitra-db.json");
const TMP_FILE = path.join(__dirname, "jobmitra-db.tmp");

const EMPTY_DB = {
    jobs: [],
    lastSync: null
};

// ==========================================
// CREATE DATABASE
// ==========================================

function createDatabase() {
    if (!fs.existsSync(DB_FILE)) {
        atomicWrite(EMPTY_DB);
    }
}

// ==========================================
// ATOMIC WRITE
// ==========================================

function atomicWrite(data) {
    const json = JSON.stringify(data, null, 2);

    fs.writeFileSync(TMP_FILE, json, "utf8");
    fs.renameSync(TMP_FILE, DB_FILE);
}

// ==========================================
// READ DATABASE
// ==========================================

function readDatabase() {
    createDatabase();

    try {
        const raw = fs.readFileSync(DB_FILE, "utf8");

        if (!raw.trim()) {
            throw new Error("Database file is empty");
        }

        const data = JSON.parse(raw);

        if (!data || !Array.isArray(data.jobs)) {
            throw new Error("Invalid database structure");
        }

        return {
            jobs: data.jobs,
            lastSync: data.lastSync || null
        };

    } catch (error) {

        console.error(
            "❌ Database read error:",
            error.message
        );

        // IMPORTANT:
        // Never overwrite a corrupted database with [].
        throw new Error(
            "JOBMITRA database is corrupted. Refusing to overwrite existing data."
        );
    }
}

// ==========================================
// WRITE DATABASE
// ==========================================

function writeDatabase(data) {
    if (!data || !Array.isArray(data.jobs)) {
        throw new Error("Invalid database data");
    }

    atomicWrite(data);
}

// ==========================================
// GET ALL JOBS
// ==========================================

function getJobs() {
    return readDatabase().jobs;
}

// ==========================================
// SAVE / UPDATE ONE JOB
// ==========================================

function saveJob(job) {

    if (!job || typeof job !== "object") {
        return {
            action: "skipped",
            job: null
        };
    }

    const db = readDatabase();
    const now = new Date().toISOString();

    const externalId = String(
        job.externalId ||
        `${job.company || ""}-${job.title || ""}-${job.location || ""}`
    );

    const index = db.jobs.findIndex(
        existing =>
            String(existing.externalId || "") === externalId
    );

    // ======================================
    // UPDATE EXISTING
    // ======================================

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

    // ======================================
    // ADD NEW
    // ======================================

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
// OLD COMPATIBILITY FUNCTION
// ==========================================

function addJob(job) {
    const result = saveJob(job);

    return result.action === "added";
}

// ==========================================
// SAVE MANY JOBS
// ==========================================

function saveJobs(jobs) {

    if (!Array.isArray(jobs)) {
        throw new Error("saveJobs expected an array");
    }

    const db = readDatabase();
    const now = new Date().toISOString();

    let added = 0;
    let updated = 0;

    // ======================================
    // INDEX EXISTING JOBS
    // ======================================

    const index = new Map();

    for (let i = 0; i < db.jobs.length; i++) {

        const id = String(
            db.jobs[i].externalId || ""
        );

        if (id) {
            index.set(id, i);
        }
    }

    // ======================================
    // MERGE ALL JOBS IN MEMORY
    // ======================================

    for (const job of jobs) {

        if (!job || typeof job !== "object") {
            continue;
        }

        const externalId = String(
            job.externalId ||
            `${job.company || ""}-${job.title || ""}-${job.location || ""}`
        );

        if (!externalId) {
            continue;
        }

        const existingIndex = index.get(externalId);

        if (existingIndex !== undefined) {

            db.jobs[existingIndex] = {
                ...db.jobs[existingIndex],
                ...job,
                externalId,
                updatedAt: now
            };

            updated++;

        } else {

            db.jobs.push({
                ...job,
                externalId,
                createdAt: now,
                updatedAt: now
            });

            index.set(
                externalId,
                db.jobs.length - 1
            );

            added++;
        }
    }

    // ======================================
    // ONE SAFE WRITE
    // ======================================

    writeDatabase(db);

    return {
        added,
        updated,
        total: db.jobs.length
    };
}

// ==========================================
// LAST SYNC
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

console.log("✅ JOBMITRA SAFE DATABASE READY");
