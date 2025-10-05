const request = require('supertest');
const app = require('../app');

let server;

beforeAll(() => {
  server = app.listen(8080); 
});

afterAll((done) => {
  server.close(done); 
});

describe('GET /', () => {
  it('should return 200 OK', async () => {
    const res = await request(server).get('/'); // 传入 server 而不是 app
    expect(res.statusCode).toBe(200);
  });
});
