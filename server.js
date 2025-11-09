import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import reservationsRouter from "./routes/reservations.js";
import adminAuth from "./middleware/adminAuth.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

await mongoose.connect(process.env.MONGODB_URI, {});

const htmlRoot = path.join(__dirname, "html_assets");
app.use("/images", express.static(path.join(htmlRoot, "images")));

// app.js를 UTF-8로 서빙
app.get("/public/app.js", (req, res) => {
    const p = path.join(__dirname, "public", "app.js");
    const js = fs.readFileSync(p, "utf8");
    res.set("Content-Type", "application/javascript; charset=utf-8");
    res.send(js);
});

// 공통 HTML 응답 helper (UTF-8)
function serveHtmlWithScript(filename) {
    return (req, res) => {
        const filePath = path.join(htmlRoot, filename);
        let html = fs.readFileSync(filePath, "utf8");
        if (!html.includes("/public/app.js")) {
            html = html.replace("</body>", `<script src="/public/app.js"></script>\n</body>`);
        }
        res.set("Content-Type", "text/html; charset=utf-8");
        res.send(html);
    };
}

// 사용자 페이지
app.get("/", serveHtmlWithScript("index.html"));
app.get("/application", serveHtmlWithScript("application_page.html"));
app.get("/checkin", serveHtmlWithScript("checkin_page.html"));
app.get("/overnight", serveHtmlWithScript("overnight_page.html"));
app.get("/maintenance", serveHtmlWithScript("maintenance_page.html"));
app.get("/points", serveHtmlWithScript("points_page.html"));

// 공간예약 사용자 페이지
app.get("/reservation", (req, res) => {
    const page = path.join(__dirname, "public", "reservation_page.html");
    let html = fs.readFileSync(page, "utf8");
    if (!html.includes("/public/app.js")) {
        html = html.replace("</body>", `<script src="/public/app.js"></script>\n</body>`);
    }
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(html);
});

// (관리자 전용) 페이지들 - Basic Auth 보호
app.get("/admin/reservations", adminAuth, (req, res) => {
    const page = path.join(__dirname, "public", "admin_reservations.html");
    let html = fs.readFileSync(page, "utf8");
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(html);
});

app.get("/admin/waitlist", adminAuth, (req, res) => {
    const page = path.join(__dirname, "public", "admin_waitlist.html");
    let html = fs.readFileSync(page, "utf8");
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(html);
});

// API
app.use("/api/reservations", reservationsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running: http://localhost:${PORT}`));
