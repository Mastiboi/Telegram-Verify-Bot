const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");

const app = express();
const PORT = process.env.PORT || 5000; // Use Railway's provided port if available

let browser, page;
let latestSVG = null;

// CORS Configuration (Modify as Needed)
app.use(cors({ origin: "telegram-verify-bot-production.up.railway.app" }));

// Initialize Playwright Browser
async function initBrowser() {
    if (browser) return; // Prevent duplicate instances

    try {
        browser = await chromium.launch({
            headless: true,  // Ensures it's running headless
            args: ['--no-sandbox', '--disable-setuid-sandbox'] // Required for Railway
        });

        page = await browser.newPage();
        await page.goto("https://web.telegram.org/a/", { waitUntil: "networkidle" });

        console.log("Browser initialized and Telegram Web loaded");

        checkForNewSVG();
    } catch (error) {
        console.error("Error initializing browser:", error);
        await restartBrowser();
    }
}

// Get Session ID
async function getSessionID() {
    if (!page) return null;

    const cookies = await page.context().cookies();
    const sessionID = Buffer.from(JSON.stringify(cookies)).toString("base64"); // Encode as Base64
    console.log("Session ID:", sessionID);
    return sessionID;
}

// Load Session ID
async function loadSessionID(sessionID) {
    if (!page) return;

    const cookies = JSON.parse(Buffer.from(sessionID, "base64").toString("utf8")); // Decode Base64
    await page.context().addCookies(cookies);
    console.log("Session restored!");
    await page.reload({ waitUntil: "networkidle" });
}

// Check for QR Code Updates
async function checkForNewSVG() {
    while (browser) {
        try {
            await page.waitForSelector(".qr-container svg", { timeout: 40000 });
            const svg = await page.evaluate(() => document.querySelector(".qr-container svg")?.outerHTML);

            if (svg && svg !== latestSVG) {
                latestSVG = svg;
                console.log("QR Code updated.");
            }
        } catch (error) {
            console.error("Error fetching SVG:", error);
            await restartBrowser();
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// Restart Browser on Failure
async function restartBrowser() {
    console.log("Restarting browser...");
    if (browser) {
        await browser.close();
        browser = null;
    }
    await initBrowser();
}

// API: Get Session ID
app.get("/get-session", async (req, res) => {
    if (!page) return res.status(500).send("Browser not initialized");
    const sessionID = await getSessionID();
    res.json({ sessionID });
});

// API: Load Session ID
app.post("/load-session", express.json(), async (req, res) => {
    if (!req.body.sessionID) return res.status(400).send("Session ID required");
    await loadSessionID(req.body.sessionID);
    res.send("Session restored!");
});

// API: Serve QR Code as SVG
app.get("/qr.svg", (req, res) => {
    res.set("Access-Control-Allow-Origin", "telegram-verify-bot-production.up.railway.app");
    res.set("Content-Type", "image/svg+xml");

    if (latestSVG) {
        res.send(latestSVG);
    } else {
        res.status(404).send("No QR code found");
    }
});

// Start Server and Initialize Browser
app.listen(PORT, async () => {
    await initBrowser();
    console.log(`Server running at telegram-verify-bot-production.up.railway.app`);
});
