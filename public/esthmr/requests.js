/* Bound the entire read, including the body, not just the response headers. */
export async function readResponse(url, init = {}, decode = (r) => r.json(), timeout = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return await decode(response);
  } finally {
    clearTimeout(timer);
  }
}
