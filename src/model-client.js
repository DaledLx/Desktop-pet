// OpenAI-compatible HTTP formats; provider, model and credentials are supplied by the user.
function requestTarget(endpoint) {
  const url = new URL(endpoint);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('API 地址必须使用 http:// 或 https://。');
  const pathname = url.pathname.replace(/\/+$/, '');
  if (!pathname || /\/v\d+$/.test(pathname)) {
    url.pathname = `${pathname}/chat/completions`;
  } else {
    url.pathname = pathname;
  }
  return { url, format: url.pathname.endsWith('/responses') ? 'responses' : 'chat' };
}

function errorDetail(data, status) {
  const detail = data?.error?.message || data?.error || data?.message;
  return typeof detail === 'string' ? detail : `API 请求失败（${status}）`;
}

function readText(data, format) {
  if (format === 'responses') {
    if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
    const output = Array.isArray(data?.output) ? data.output : [];
    return output.filter((item) => item?.type === 'message')
      .flatMap((item) => Array.isArray(item.content) ? item.content : [])
      .filter((part) => part?.type === 'output_text' && typeof part.text === 'string')
      .map((part) => part.text).join('\n').trim();
  }
  const content = data?.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content.trim() : '';
}

async function requestModel({ endpoint, model, apiKey, messages, fetchImpl = fetch }) {
  const { url, format } = requestTarget(endpoint);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  async function send(target, protocol) {
    // Omit optional sampling/token parameters for compatibility with models
    // that reject those parameters. Each provider applies its own defaults.
    const body = protocol === 'responses'
      ? { model, input: messages }
      : { model, messages };
    const response = await fetchImpl(target.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: controller.signal,
      redirect: 'error',
    });
    const data = await response.json().catch(() => ({}));
    return { response, data, detail: errorDetail(data, response.status) };
  }
  try {
    let protocol = format;
    let result = await send(url, protocol);
    // Retry only an explicit missing-route error at a recognized standard path.
    // Authentication, model, rate limit and network errors must not be retried.
    const routeMismatch = /no gateway route matched|no route matched|route not found/i.test(result.detail);
    const routeFailure = [400, 404, 405].includes(result.response.status);
    if (!result.response.ok && routeFailure && routeMismatch && url.pathname.endsWith('/chat/completions')) {
      const alternate = new URL(url);
      alternate.pathname = alternate.pathname.slice(0, -'/chat/completions'.length) + '/responses';
      protocol = 'responses';
      result = await send(alternate, protocol);
    }
    if (!result.response.ok) throw new Error(`API 请求失败（${result.response.status}）：${result.detail}`);
    const text = readText(result.data, protocol);
    if (!text) throw new Error('模型没有返回文本内容。');
    return text;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('模型响应超时，请稍后再试。');
    if (error.name === 'TypeError' && /fetch failed/i.test(error.message || '')) {
      throw new Error(`无法连接模型服务 ${url.host}。请检查网络、DNS、代理或 API 地址。`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { requestModel };
