// MongoDB 데이터 초기화 스크립트
import 'dotenv/config.js';
import mongoose from 'mongoose';

async function clearAllData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('? MongoDB 연결 성공');

        // Maintenance 컬렉션 삭제
        const maintenanceResult = await mongoose.connection.db.collection('maintenances').deleteMany({});
        console.log(`??? ${maintenanceResult.deletedCount}개의 민원 데이터가 삭제되었습니다.`);

        // Points 컬렉션 삭제
        const pointsResult = await mongoose.connection.db.collection('points').deleteMany({});
        console.log(`??? ${pointsResult.deletedCount}개의 상벌점 데이터가 삭제되었습니다.`);

        await mongoose.disconnect();
        console.log('? 작업 완료');
        process.exit(0);
    } catch (error) {
        console.error('? 오류:', error);
        process.exit(1);
    }
}

clearAllData();
