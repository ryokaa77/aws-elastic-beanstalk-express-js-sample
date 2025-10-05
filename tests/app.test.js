const request = require('supertest');

describe('GET /', () => {
  it('should return 200 OK', async () => {
    const res = await request('http://localhost:8080').get('/'); // 直接访问本地端口
    expect(res.statusCode).toBe(200);
  });
});
