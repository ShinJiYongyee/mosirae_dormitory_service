import dotenv from "dotenv";
dotenv.config();

// HTTP Basic Auth 미들웨어
export default function adminAuth(req, res, next) {
    const header = req.headers.authorization || "";
    // 형식: "Basic base64(user:pass)"
    if (!header.startsWith("Basic ")) {
        res.set("WWW-Authenticate", 'Basic realm="admin"');
        return res.status(401).send("Auth required");
    }

    const base64 = header.replace("Basic ", "").trim();
    let decoded = "";
    try {
        decoded = Buffer.from(base64, "base64").toString("utf8");
    } catch {
        res.set("WWW-Authenticate", 'Basic realm="admin"');
        return res.status(401).send("Invalid auth");
    }

    const [user, pass] = decoded.split(":");
    if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) {
        return next(); // 인증 성공
    }

    res.set("WWW-Authenticate", 'Basic realm="admin"');
    return res.status(401).send("Unauthorized");
}
