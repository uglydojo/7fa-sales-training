// APEX Mission Board - Full board state API
// GET /api/board  - Returns full board state
// PUT /api/board  - Replaces full board state

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const DEFAULT_STATE = {
  version: '2.0',
  weekId: null,
  weekLabel: '',
  lastUpdated: null,
  created: null,
  tasks: {},
  history: [],
  taskList: [],
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const raw = await env.APEX_BOARD.get('board-state');
    if (!raw) {
      return new Response(JSON.stringify(DEFAULT_STATE), { headers: CORS_HEADERS });
    }
    return new Response(raw, { headers: CORS_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}

export async function onRequestPut(context) {
  const { env, request } = context;
  try {
    const body = await request.json();
    body.lastUpdated = new Date().toISOString();
    await env.APEX_BOARD.put('board-state', JSON.stringify(body));
    return new Response(JSON.stringify({ ok: true, lastUpdated: body.lastUpdated }), {
      headers: CORS_HEADERS,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}
