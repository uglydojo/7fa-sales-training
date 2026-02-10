// APEX Mission Board - One-time migration
// POST /api/migrate - Seeds KV with the current 23 hardcoded tasks
// DELETE THIS FILE after successful migration

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

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

// Current 23 tasks from the v1.1 board
const SEED_TASKS = [
  { id: 1, text: 'Post Marketing Manager response to Justin', detail: 'Already drafted in handoff - paste in leadership channel', xp: 10, tier: 0 },
  { id: 2, text: 'Respond to Josh re: 4 videos', detail: 'Facebook ads rotation - quick Slack reply with next steps', xp: 10, tier: 0 },
  { id: 3, text: "Send Henry's salary agreement to Josh", detail: 'Forward to close out compensation', xp: 10, tier: 0 },
  { id: 4, text: 'Message Cesar: calculate ROAS', detail: 'Needs Precision access fixed - for marketing meeting', xp: 10, tier: 0 },
  { id: 5, text: 'Nudge Tommy: document phone sales workflow', detail: 'Off track - due March 15', xp: 10, tier: 0 },
  { id: 6, text: 'Post January celebration message', detail: 'Celebrate 10 closes on Slack', xp: 10, tier: 0 },
  { id: 7, text: "Send Diana's team the videos for ad rotation", detail: 'Drive folder with video assets for Facebook ads', xp: 10, tier: 0 },
  { id: 8, text: 'Schedule Sales & Membership L10', detail: 'End of month - create calendar invite', xp: 15, tier: 1 },
  { id: 9, text: 'Schedule Marketing Manager interview', detail: '1hr block: 30 min Esteban, then Josh + Yesenia if vibe check passes', xp: 15, tier: 1 },
  { id: 10, text: 'Schedule AI assistant demo for team', detail: 'Pick a day next week', xp: 15, tier: 1 },
  { id: 11, text: 'Resend 4 bounced emails with corrected addresses', detail: 'Jacob, Rahul, Frank, Mark - addresses in handoff', xp: 20, tier: 2 },
  { id: 12, text: "Update Arash Eskandari's profile", detail: 'Quick update in system', xp: 20, tier: 2 },
  { id: 13, text: 'Plug in February goals in Precision', detail: 'Scorecard data entry', xp: 30, tier: 3 },
  { id: 14, text: 'Fix Launchpad totals in Precision', detail: "Inaccurate - need Henry's closes inputted", xp: 30, tier: 3 },
  { id: 15, text: 'Set up guest tracking process with Cesar', detail: 'Cesar notifies Brett for non-paying invited guest badge prep', xp: 30, tier: 3 },
  { id: 16, text: 'Add registration step to sales onboarding SOP', detail: 'Cesar registers via Accelerate/Elite form, notifies Brett', xp: 30, tier: 3 },
  { id: 17, text: 'Complete January end-of-month sales report', detail: 'Post on Slack for sales team - 10 closed, $12,550 Henry revenue', xp: 50, tier: 4 },
  { id: 18, text: 'Start February weekly sales reports', detail: 'Create template and post first week on Slack', xp: 50, tier: 4 },
  { id: 19, text: 'Update Marketing Manager role posting', detail: "Add Yesenia's + Josh's requirement lists into description", xp: 50, tier: 4 },
  { id: 20, text: 'Feed candidate test results back to AI', detail: 'Build objective scoring system for Marketing Manager candidates', xp: 50, tier: 4 },
  { id: 21, text: 'Reach out to Viral Coach', detail: 'Content strategy help: only 1,200 views max, no trending sounds, weak CTAs', xp: 50, tier: 4 },
  { id: 22, text: 'Transfer data to Precision', detail: 'Migrate relevant data into Precision platform', xp: 50, tier: 4 },
  { id: 23, text: 'Map out July/November guest process', detail: "Full process design - due April for Cody's team", xp: 50, tier: 4 },
];

// Tier definitions matching the board
const TIERS = [
  { index: 0, name: 'Quick Wins', icon: '⚡', meta: 'Under 5 minutes each - warm up the blade' },
  { index: 1, name: 'Scheduling', icon: '📅', meta: '5-15 minutes each - set the battlefield' },
  { index: 2, name: 'Quick Tasks', icon: '💫', meta: '10-20 minutes each - sharpen the edge' },
  { index: 3, name: 'Moderate Effort', icon: '⚙️', meta: '20-45 minutes each - test your discipline' },
  { index: 4, name: 'Heavy Lifts', icon: '🔥', meta: '45+ minutes each - prove you are Apex' },
];

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost(context) {
  const { env } = context;
  try {
    // Check if already migrated
    const existing = await env.APEX_BOARD.get('board-state');
    if (existing) {
      const parsed = JSON.parse(existing);
      if (parsed.taskList && parsed.taskList.length > 0) {
        return new Response(JSON.stringify({
          error: 'Board already has data. To force re-migrate, delete the board-state key first.',
          currentTasks: parsed.taskList.length,
        }), { status: 409, headers: CORS_HEADERS });
      }
    }

    const now = new Date();
    const board = {
      version: '2.0',
      weekId: getWeekId(now),
      weekLabel: getWeekRange(now),
      lastUpdated: now.toISOString(),
      created: now.toISOString(),
      tasks: {},
      history: [],
      taskList: SEED_TASKS,
      tiers: TIERS,
    };

    await env.APEX_BOARD.put('board-state', JSON.stringify(board));

    return new Response(JSON.stringify({
      ok: true,
      message: 'Board seeded with ' + SEED_TASKS.length + ' tasks',
      weekLabel: board.weekLabel,
      tasks: SEED_TASKS.length,
    }), { status: 201, headers: CORS_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}
