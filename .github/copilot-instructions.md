# Mosirae Dormitory Service - AI Coding Agent Instructions

## Architecture Overview

This is a Node.js Express server for a Korean dormitory management system with **dual-mode storage**: MongoDB (primary) or in-memory fallback. The system handles reservations for study rooms and multipurpose halls, plus additional services (applications, checkins, maintenances, overnights, points).

### Key Design Pattern: Graceful Degradation
- MongoDB is **optional**. If `MONGODB_URI` is missing or connection fails, the app falls back to in-memory storage
- Routes use **factory functions** (e.g., `reservationsRouterFactory(useDb)`) to abstract storage layer
- All route handlers check `useDb` flag and branch logic accordingly

```javascript
// Pattern example from routes/reservations.js
if (useDb) {
    const doc = await ReservationModel.create(newRes);
    return res.status(201).json({ ok: true, data: doc });
} else {
    newRes.id = String(Date.now()) + Math.random().toString(36).slice(2);
    memoryStore.push(newRes);
    return res.status(201).json({ ok: true, data: newRes });
}
```

## Project Structure

- `server.js` - Entry point with ESM imports, MongoDB connection handling, static file serving with UTF-8 charset enforcement
- `routes/` - Router factories (only `reservations.js` is implemented; others are empty placeholders)
- `models/` - Mongoose schemas (only `Reservation.js` is defined)
- `middleware/adminAuth.js` - HTTP Basic Auth using `process.env.ADMIN_USER/ADMIN_PASS`
- `html_assets/` - Static HTML pages served from root path `/`
- `public/` - Static assets served from `/assets` (CSS/JS for reservation system)

## Critical Conventions

### 1. ESM-Only Codebase
- All files use ES modules (`"type": "module"` in package.json)
- Use `import`/`export`, never `require()`
- Top-level `await` is allowed in `server.js`

### 2. Korean Language & UTF-8
- All user-facing content is in **Korean** (comments, UI strings, response messages)
- Static file middleware explicitly sets UTF-8 charset headers for `.html`, `.css`, `.js` to prevent character corruption
- Keep this pattern when adding new static routes

### 3. Reservation System Domain Model
- **Spaces**: `ROOM_A`, `ROOM_B` (capacity 2), `HALL_1` (capacity 10)
- **Time slots**: 09:00-21:00 in 1-hour blocks (defined in `TIMESLOTS` array)
- **Status**: `confirmed` (within capacity), `waitlist` (over capacity), `cancelled`
- **Waitlist promotion**: When a confirmed reservation is cancelled, the first waitlisted reservation (by `createdAt`) auto-promotes to confirmed

### 4. API Response Format
All endpoints follow this pattern:
```javascript
{ ok: true, data: {...} }      // Success
{ ok: false, message: "..." }  // Error
```

### 5. Mongoose Schema Pattern
```javascript
// Use this pattern to prevent model recompilation in hot-reload scenarios
const Model = mongoose.models.ModelName || mongoose.model('ModelName', schema);
export default Model;
```

## Development Workflow

### Running the Server
```powershell
npm start              # Production mode
npm run dev            # Development mode (NODE_ENV=development)
```
Server runs on port 3000 by default (`process.env.PORT` || 3000)

### Environment Variables (.env)
```
MONGODB_URI=mongodb://...     # Optional - falls back to in-memory if missing
ADMIN_USER=admin              # For HTTP Basic Auth
ADMIN_PASS=secret
PORT=3000
```

### Testing Storage Modes
- **With MongoDB**: Set `MONGODB_URI` in `.env` and ensure MongoDB is accessible
- **In-memory mode**: Comment out or remove `MONGODB_URI` - server logs `⚠️ MongoDB connect failed, fallback to in-memory`

## Integration Points

### Frontend-Backend Communication
- Frontend files: `html_assets/reservation.html` + `public/js/reservation.js`
- API endpoints: `/api/reservations/*`
- Client uses `fetch()` with `charset=utf-8` in Content-Type headers

### Static File Serving (Dual Setup)
1. `html_assets/` → served from root `/` (index.html, reservation.html, etc.)
2. `public/` → served from `/assets` (CSS/JS modules)
3. Explicit route: `GET /reservation` → sends `html_assets/reservation.html`

### Admin Routes (Not Yet Implemented)
- `public/admin_reservations.html` and `public/admin_waitlist.html` exist but are not wired up in `server.js`
- Should use `adminAuth` middleware when implemented

## Common Tasks

### Adding a New Route Module
1. Create route factory in `routes/<name>.js`:
   ```javascript
   export default async function routerFactory(useDb) {
       const router = express.Router();
       // ... implement dual-mode storage logic
       return router;
   }
   ```
2. Import and mount in `server.js`:
   ```javascript
   const router = await routerFactory(useDb);
   app.use('/api/<name>', router);
   ```

### Adding a New Mongoose Model
1. Define schema in `models/<Name>.js` with unique indexes as needed
2. Use collection name explicitly: `{ collection: 'collectionName' }`
3. Export with hot-reload protection pattern (see above)

### Debugging Tips
- Check console for MongoDB connection status: `✅ MongoDB connected` or `⚠️ MongoDB connect failed`
- In-memory mode: Data persists only while server is running; restarts clear all state
- Route factories log errors if model imports fail: `⚠️ <Model> model load failed, fallback to memory`

## Unimplemented Features (Scaffolding Only)
- `routes/applications.js`, `checkins.js`, `maintenances.js`, `overnights.js`, `points.js` are **empty files**
- Corresponding models (`Application.js`, `Checkin.js`, etc.) are also empty
- These represent planned features but have no logic yet - implement following the `reservations.js` pattern when needed
