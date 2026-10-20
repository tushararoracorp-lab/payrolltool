// Applies an approved request. Always called inside one database transaction.
const { TABLE } = require('./sanitize');

const COLUMNS = {
  notifications: ['category','state','title','short_summary','reference','effective_date','published_date','flag','status','issued_by','official_url','note','explainer_en','explainer_hi','words_en','words_hi','dedupe_key'],
  pt_rules: ['state','effective_from','frequency','cycle_text','basis','due_text','act','annual_cap','slab_tables','notes','official_url'],
  lwf_rules: ['state','effective_from','employee_amount','employer_amount','ratio','frequency','due_text','act','notes','official_url'],
  mw_rates: ['state','effective_from','structure','flag','cadence','zones','authority','label','categories','reference','note','official_url'],
};
const JSON_COLS = new Set(['slab_tables', 'categories']);

async function insertEntry(tx, kind, clean, requestId) {
  const table = TABLE[kind], cols = COLUMNS[table];
  const vals = cols.map((c) => (JSON_COLS.has(c) ? JSON.stringify(clean[c]) : clean[c] ?? null));
  const ph = cols.map((c, i) => (JSON_COLS.has(c) ? `$${i + 1}::jsonb` : `$${i + 1}`));
  const rows = await tx.query(
    `INSERT INTO ${table} (${cols.join(',')}, created_by_request) VALUES (${ph.join(',')}, $${cols.length + 1}) RETURNING id`,
    [...vals, requestId]);
  return rows[0].id;
}
async function removeEntry(tx, kind, id, requestId) {
  const table = TABLE[kind];
  const rows = await tx.query(`UPDATE ${table} SET removed_at = now(), removed_by_request = $2 WHERE id = $1 AND removed_at IS NULL RETURNING id`, [id, requestId]);
  if (!rows.length) throw new Error('The entry to remove no longer exists or was already removed.');
  return rows[0].id;
}
async function audit(tx, requestId, event, kind, targetId, detail) {
  await tx.query('INSERT INTO audit_log (request_id, event, kind, target_id, detail) VALUES ($1,$2,$3,$4,$5::jsonb)',
    [requestId, event, kind, targetId, JSON.stringify(detail || {})]);
}

// decision: 'approve' | 'reject'. Returns { status, message }.
async function decide(tx, requestId, nonce, decision, ip) {
  const rows = await tx.query('SELECT * FROM change_requests WHERE id = $1 FOR UPDATE', [requestId]);
  const r = rows[0];
  if (!r || r.nonce !== nonce) return { status: 'invalid', message: 'This approval link is not valid.' };
  if (r.status !== 'pending') return { status: 'already', message: `This request was already ${r.status}.` };
  if (new Date(r.expires_at) < new Date()) {
    await tx.query("UPDATE change_requests SET status='expired', decided_at=now() WHERE id=$1", [requestId]);
    await audit(tx, requestId, 'expired', r.kind, r.target_id, {});
    return { status: 'expired', message: 'This request expired. Ask the submitter to send it again.' };
  }
  if (decision === 'reject') {
    await tx.query("UPDATE change_requests SET status='rejected', decided_at=now(), decision_ip=$2 WHERE id=$1", [requestId, ip || null]);
    await audit(tx, requestId, 'rejected', r.kind, r.target_id, {});
    return { status: 'rejected', message: 'Rejected. Nothing was changed.' };
  }
  // which pages show this data, so the website can refresh exactly those after an approval
  const affected = { kind: r.kind, states: [], categories: [], notifications: [] };
  const note = (state, category) => { if (state && !affected.states.includes(state)) affected.states.push(state); if (category && !affected.categories.includes(category)) affected.categories.push(category); };
  if (r.payload) note(r.payload.state, r.payload.category);
  if (r.target_id) {
    const old = await tx.query(`SELECT state${r.kind === 'notification' ? ', category, dedupe_key, title' : ''} FROM ${TABLE[r.kind]} WHERE id = $1`, [r.target_id]);
    if (old[0]) { note(old[0].state, old[0].category); if (r.kind === 'notification') affected.notifications.push({ key: old[0].dedupe_key, title: old[0].title }); }
  }
  let added = null, removed = null;
  if (r.action === 'REMOVE' || r.action === 'REPLACE') removed = await removeEntry(tx, r.kind, r.target_id, requestId);
  if (r.action === 'ADD' || r.action === 'REPLACE') added = await insertEntry(tx, r.kind, r.payload, requestId);
  await tx.query("UPDATE change_requests SET status='approved', decided_at=now(), decision_ip=$2 WHERE id=$1", [requestId, ip || null]);
  if (removed) await audit(tx, requestId, 'removed', r.kind, removed, {});
  if (added) await audit(tx, requestId, 'added', r.kind, added, { summary: r.summary });
  await audit(tx, requestId, 'approved', r.kind, added || removed, {});
  return { status: 'approved', message: 'Approved and applied.', added, removed, affected };
}
module.exports = { insertEntry, removeEntry, audit, decide, COLUMNS };
