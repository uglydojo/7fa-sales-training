// APEX Mission Board - New week with auto-transfer
// POST /api/week - Archive current week, carry forward unchecked items

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const RANKS = [
  { threshold: 0, name: 'Ronin', class: 'rank-ronin' },
  { threshold: 20, name: 'Samurai', class: 'rank-samurai' },
  { threshold: 40, name: 'Shogun', class: 'rank-shogun' },
  { threshold: 60, name: 'Daimyo', class: 'rank-daimyo' },
  { threshold: 80, name: 'Apex Warrior', class: 'rank-apex' },
  { threshold: 100, name: 'Apex Legend', class: 'rank-legend' },
];

function getRankForPercent(percent) {
  let r = RANKS[0];
  for (const rank of RANKS) {
    if (percent >= rank.threshold) r = rank;
  }
  return r;
}

function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1));
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  const fmt = (dt) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return fmt(mon) + ' - ' + fmt(sun);
}

function getWeekId(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1));
  return mon.toISOString().split('T')[0];
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost(context) {
  const { env, request } = context;
  try {
    const board = JSON.parse(await env.APEX_BOARD.get('board-state'));
    if (!board) {
      return new Response(JSON.stringify({ error: 'Board not initialized' }), {
        status: 404,
        headers: CORS_HEADERS,
      });
    }

    // Optionally accept new tasks for the next week
    let body = {};
    try { body = await request.json(); } catch { /* empty body is fine */ }

    const totalTasks = board.taskList.length;
    const completedIds = Object.keys(board.tasks);
    const done = completedIds.length;
    const percent = totalTasks > 0 ? Math.round((done / totalTasks) * 100) : 0;
    const rank = getRankForPercent(percent);

    // Archive current week
    const archiveEntry = {
      weekId: board.weekId,
      weekLabel: board.weekLabel,
      version: board.version,
      completed: done,
      total: totalTasks,
      percent,
      rank: rank.name,
      rankClass: rank.class,
      completedTasks: board.taskList.filter(t => board.tasks[String(t.id)]),
      archivedAt: new Date().toISOString(),
    };

    if (!board.history) board.history = [];
    board.history.push(archiveEntry);

    // Separate completed vs uncompleted tasks
    const uncompleted = board.taskList.filter(t => !board.tasks[String(t.id)]);

    // If new tasks provided, use those; otherwise carry forward uncompleted
    const nextTasks = body.tasks || uncompleted;

    // Re-number tasks starting from 1
    const renumbered = nextTasks.map((t, i) => ({
      ...t,
      id: i + 1,
    }));

    // Build new week state
    const now = new Date();
    board.version = '2.0';
    board.weekId = getWeekId(now);
    board.weekLabel = getWeekRange(now);
    board.lastUpdated = now.toISOString();
    board.tasks = {};
    board.taskList = renumbered;

    await env.APEX_BOARD.put('board-state', JSON.stringify(board));

    return new Response(JSON.stringify({
      ok: true,
      archived: archiveEntry,
      newWeek: {
        weekId: board.weekId,
        weekLabel: board.weekLabel,
        taskCount: renumbered.length,
        carriedForward: uncompleted.length,
      },
    }), { headers: CORS_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}
