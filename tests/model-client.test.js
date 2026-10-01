const { test } = require('node:test');
const assert = require('node:assert/strict');
const { requestModel } = require('../src/model-client');

const options = {
  endpoint: 'https://example.com/v1/chat/completions',
  model: 'test-model',
  apiKey: 'test-only-key',
  messages: [{ role: 'user', content: '你好' }],
};
const chatReply = { choices: [{ message: { content: '你好呀' } }] };
const responsesReply = { output: [
  { type: 'reasoning', summary: [] },
  { type: 'message', content: [{ type: 'output_text', text: '晚上好' }] },
] };
function mockFetch(replies) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, ...init, body: JSON.parse(init.body) });
    const reply = replies[calls.length - 1];
    assert.ok(reply, 'Unexpected extra request');
    if (reply instanceof Error) throw reply;
    return { ok: reply.status >= 200 && reply.status < 300, status: reply.status, json: async () => reply.data };
  };
  return { calls, fetchImpl };
}

test('Base URL sends a Chat Completions request with the selected model', async () => {
  const mock = mockFetch([{ status: 200, data: chatReply }]);
  assert.equal(await requestModel({ ...options, ...mock, endpoint: 'https://example.com/v1/' }), '你好呀');
  assert.equal(mock.calls[0].url, options.endpoint);
  assert.deepEqual(mock.calls[0].body, { model: options.model, messages: options.messages });
  assert.equal(mock.calls[0].headers.Authorization, 'Bearer test-only-key');
  assert.equal(mock.calls[0].redirect, 'error');
});

test('explicit Responses endpoint sends input and reads nested output text', async () => {
  const mock = mockFetch([{ status: 200, data: responsesReply }]);
  assert.equal(await requestModel({ ...options, ...mock, endpoint: 'https://example.com/v1/responses/' }), '晚上好');
  assert.deepEqual(mock.calls[0].body, { model: options.model, input: options.messages });
  assert.equal(mock.calls.length, 1);
});

test('missing route retries once on the same host with Responses format', async () => {
  const mock = mockFetch([
    { status: 404, data: { error: { message: 'No gateway route matched this request path.' } } },
    { status: 200, data: responsesReply },
  ]);
  assert.equal(await requestModel({ ...options, ...mock }), '晚上好');
  assert.equal(mock.calls[1].url, 'https://example.com/v1/responses');
  assert.deepEqual(mock.calls[1].body, { model: options.model, input: options.messages });
  assert.equal(mock.calls.length, 2);
});

for (const status of [401, 403, 429, 500]) {
  test(`HTTP ${status} is reported without retry`, async () => {
    const mock = mockFetch([{ status, data: { error: { message: 'No gateway route matched this request path.' } } }]);
    await assert.rejects(requestModel({ ...options, ...mock }), new RegExp(String(status)));
    assert.equal(mock.calls.length, 1);
  });
}

test('model not found is not treated as a missing route', async () => {
  const mock = mockFetch([{ status: 404, data: { error: { message: 'Model not found' } } }]);
  await assert.rejects(requestModel({ ...options, ...mock }), /Model not found/);
  assert.equal(mock.calls.length, 1);
});

test('custom endpoint does not guess another path', async () => {
  const mock = mockFetch([{ status: 404, data: { error: 'No gateway route matched' } }]);
  await assert.rejects(requestModel({ ...options, ...mock, endpoint: 'https://example.com/custom' }), /404/);
  assert.equal(mock.calls.length, 1);
});

test('failed fallback reports final status and stops', async () => {
  const mock = mockFetch([
    { status: 404, data: { error: 'No gateway route matched' } },
    { status: 403, data: { error: { message: 'Access denied' } } },
  ]);
  await assert.rejects(requestModel({ ...options, ...mock }), /403.*Access denied/);
  assert.equal(mock.calls.length, 2);
});

test('network failure is explained and never retried', async () => {
  const mock = mockFetch([new TypeError('fetch failed')]);
  await assert.rejects(requestModel({ ...options, ...mock }), /无法连接模型服务 example.com/);
  assert.equal(mock.calls.length, 1);
});

test('empty model output is reported', async () => {
  const mock = mockFetch([{ status: 200, data: { output: [] } }]);
  await assert.rejects(requestModel({ ...options, ...mock, endpoint: 'https://example.com/v1/responses' }), /没有返回文本/);
});
