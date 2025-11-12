// models/Reservation.js (ESM)
import mongoose from 'mongoose';

const ReservationSchema = new mongoose.Schema({
    spaceId: { type: String, required: true },
    spaceName: { type: String, required: true },
    date: { type: String, required: true },      // YYYY-MM-DD
    timeSlot: { type: String, required: true },  // ¿¹: "09:00-10:00"
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },
    status: { type: String, enum: ['confirmed', 'waitlist', 'cancelled'], default: 'confirmed' },
    createdAt: { type: Date, default: Date.now }
}, { collection: 'reservations' });

ReservationSchema.index({ spaceId: 1, date: 1, timeSlot: 1, studentId: 1 }, { unique: true });

const Reservation = mongoose.models.Reservation || mongoose.model('Reservation', ReservationSchema);
export default Reservation;
