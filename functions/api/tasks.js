// APEX Mission Board - Individual task operations
// PUT    /api/tasks  - Toggle a task complete/incomplete
// POST   /api/tasks  - Add a new task
// DELETE /api/tasks  - Remove a task

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

async function getBoard(env) {
  const raw = await env.APEX_BOARD.get('board-state');
  if (!raw) return null;
  return JSON.parse(raw);
}

async function saveBoard(env, board) {
  board.lastUpdated = new Date().toISOString();
  await env.APEX_BOARD.put('board-state', JSON.stringify(board));
  return board;
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

// PUT - Toggle task completion
export async function onRequestPut(context) {
  const { env, request } = context;
  try {
    const { id } = await request.json();
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing task id' }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    const board = await getBoard(env);
    if (!board) {
      return new Response(JSON.stringify({ error: 'Board not initialized. Run /api/migrate first.' }), {
        status: 404,
        headers: CORS_HEADERS,
      });
    }

    const idStr = String(id);
    if (board.tasks[idStr]) {
      delete board.tasks[idStr];
    } else {
      board.tasks[idStr] = { completedAt: new Date().toISOString() };
    }

    const saved = await saveBoard(env, board);
    const completed = !!board.tasks[idStr];
    return new Response(JSON.stringify({ ok: true, id: idStr, completed, lastUpdated: saved.lastUpdated }), {
      headers: CORS_HEADERS,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}

// POST - Add a new task
export async function onRequestPost(context) {
  const { env, request } = context;
  try {
    const { text, detail, xp, tier } = await request.json();
    if (!text) {
      return new Response(JSON.stringify({ error: 'Missing task text' }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    const board = await getBoard(env);
    if (!board) {
      return new Response(JSON.stringify({ error: 'Board not initialized. Run /api/migrate first.' }), {
        status: 404,
        headers: CORS_HEADERS,
      });
    }

    // Generate next ID (find max existing + 1)
    const existingIds = board.taskList.map(t => t.id);
    const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

    const newTask = {
      id: nextId,
      text: text,
      detail: detail || '',
      xp: xp || 10,
      tier: tier !== undefined ? tier : 0,
    };

    board.taskList.push(newTask);
    const saved = await saveBoard(env, board);

    return new Response(JSON.stringify({ ok: true, task: newTask, lastUpdated: saved.lastUpdated }), {
      status: 201,
      headers: CORS_HEADERS,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}

// DELETE - Remove a task
export async function onRequestDelete(context) {
  const { env, request } = context;
  try {
    const { id } = await request.json();
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing task id' }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    const board = await getBoard(env);
    if (!board) {
      return new Response(JSON.stringify({ error: 'Board not initialized. Run /api/migrate first.' }), {
        status: 404,
        headers: CORS_HEADERS,
      });
    }

    const idNum = Number(id);
    board.taskList = board.taskList.filter(t => t.id !== idNum);
    delete board.tasks[String(id)];

    const saved = await saveBoard(env, board);
    return new Response(JSON.stringify({ ok: true, removed: id, lastUpdated: saved.lastUpdated }), {
      headers: CORS_HEADERS,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}
