import mongoose from "mongoose";

const ReservationSchema = new mongoose.Schema({
    roomId: { type: String, required: true },     // 예: R101
    date: { type: String, required: true },       // 'YYYY-MM-DD'
    timeSlot: { type: String, required: true },   // '19:00-21:00'
    capacity: { type: Number, default: 1 },

    requester: {
        studentId: String,
        name: String,
        phone: String,
        email: String
    },

    status: {
        type: String,
        enum: ["confirmed", "waitlist", "canceled"],
        default: "confirmed"
    },

    createdAt: { type: Date, default: Date.now }
});

// 조회 성능용 인덱스
ReservationSchema.index({ roomId: 1, date: 1, timeSlot: 1 });
ReservationSchema.index({ "requester.studentId": 1, roomId: 1, date: 1, timeSlot: 1 });

export default mongoose.model("Reservation", ReservationSchema);
