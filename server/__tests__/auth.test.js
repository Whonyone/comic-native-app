const request = require('supertest');
const app = require('../app');

// 각 테스트마다 독립된 사용자 저장소를 위해 routes/auth 모듈을 리셋
beforeEach(() => {
  jest.resetModules();
});

// 공통 테스트 사용자 데이터
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  nickname: '테스트유저',
  phonenumber: '010-1234-5678',
};

describe('POST /api/auth/signup', () => {
  test('필수 필드가 모두 있으면 201과 유저 정보를 반환한다', async () => {
    const res = await request(app).post('/api/auth/signup').send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      email: testUser.email,
      nickname: testUser.nickname,
      phonenumber: testUser.phonenumber,
      role: 'user',
    });
    expect(res.body.user.id).toBeDefined();
    // 비밀번호는 응답에 포함되지 않아야 한다
    expect(res.body.user.password).toBeUndefined();
  });

  test('이미 가입된 이메일이면 409를 반환한다', async () => {
    await request(app).post('/api/auth/signup').send(testUser);
    const res = await request(app).post('/api/auth/signup').send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('이미 사용 중인 이메일입니다.');
  });

  test('필드가 누락되면 400을 반환한다', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      email: 'test@example.com',
      password: 'password123',
      // nickname, phonenumber 누락
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('모든 필드를 입력해주세요.');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    // 각 로그인 테스트 전에 유저 생성
    await request(app).post('/api/auth/signup').send(testUser);
  });

  test('올바른 이메일/비밀번호로 로그인하면 200과 토큰, 유저 정보를 반환한다', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toMatchObject({
      email: testUser.email,
      nickname: testUser.nickname,
      role: 'user',
    });
    expect(res.body.user.password).toBeUndefined();
  });

  test('존재하지 않는 이메일이면 401을 반환한다', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'wrong@example.com',
      password: testUser.password,
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('이메일 또는 비밀번호가 올바르지 않습니다.');
  });

  test('비밀번호가 틀리면 401을 반환한다', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('이메일 또는 비밀번호가 올바르지 않습니다.');
  });

  test('이메일 또는 비밀번호가 없으면 400을 반환한다', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      // password 누락
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('이메일과 비밀번호를 입력해주세요.');
  });
});
