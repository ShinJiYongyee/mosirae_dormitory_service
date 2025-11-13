/**
 * middleware/sessionAuth.js
 * 
 * 세션 기반 관리자 인증 미들웨어
 * req.session.isAdmin이 true일 때만 통과
 * 미들웨어 함수를 반환하는 팩토리 패턴 사용하지 않음 (세션은 이미 server.js에서 설정됨)
 */

export default function sessionAuth(req, res, next) {
    // 세션에 isAdmin이 true로 설정되어 있는지 확인
    if (req.session && req.session.isAdmin === true) {
        // 인증 성공 - 다음 미들웨어로 진행
        return next();
    }

    // 인증 실패 - 401 Unauthorized 응답
    return res.status(401).json({
        ok: false,
        message: '로그인이 필요합니다.'
    });
}
