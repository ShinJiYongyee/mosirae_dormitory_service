import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'admin_users' });

const AdminUser = mongoose.models.AdminUser || mongoose.model('AdminUser', schema);
export default AdminUser;
