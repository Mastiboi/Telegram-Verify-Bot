const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");

const app = express();
const PORT = 5000;
let browser, page;
let latestSVG = null; // Store latest QR code in memory

// Enable CORS for all requests
app.use(cors({ origin: "http://localhost:5173" })); // Allow only your frontend

async function initBrowser() {
    if (browser) return;

    browser = await chromium.launch({ headless: false });
    page = await browser.newPage();

    try {
        await page.goto("https://web.telegram.org/a/", { waitUntil: "networkidle" });
        console.log("Browser initialized and page loaded");
        checkForNewSVG();
    } catch (error) {
        console.error("Error initializing browser:", error);
        await restartBrowser();
    }
}

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

async function restartBrowser() {
    console.log("Restarting browser...");
    if (browser) {
        await browser.close();
        browser = null;
    }
    await initBrowser();
}

app.get("/qr.svg", (req, res) => {
    res.set("Access-Control-Allow-Origin", "http://localhost:5173"); // Allow your frontend
    res.set("Content-Type", "image/svg+xml");

    if (latestSVG) {
        res.send(latestSVG);
    } else {
        res.status(404).send("No QR code found");
    }
});

app.listen(PORT, async () => {
    await initBrowser();
    console.log(`Server running at http://localhost:${PORT}`);
});
