// Tidings SPA — public frontend. Points at the private backend API.
// Backend URL resolution: window.TIDINGS_API (config.js) > localStorage override > same-origin.
function baseApi() { return ((window.TIDINGS_API || localStorage.getItem('tidings_api') || '').replace(/\/$/, '')); }
let TOK = localStorage.getItem('tidings_tok') || '';
let ME = null;
const V = document.getElementById('view'), NAV = document.getElementById('nav');
const TABS = [['dashboard','📊 Dashboard'],['capture','⚡ Capture'],['journalists','📰 Journalists'],['clients','💼 Clients'],['campaigns','🎯 Campaigns'],['coverage','📎 Coverage'],['import','📥 Import'],['reports','📄 Reports'],['portfolio','🏆 Portfolio'],['jportal','🎙️ J-Portal']];
let TAB = 'dashboard';
async function api(path, method='GET', body) {
  let r;
  try { r = await fetch(baseApi() + path, { method, headers: { 'Content-Type': 'application/json', ...(TOK ? { Authorization: 'Bearer ' + TOK } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); }
  catch { throw new Error('Cannot reach backend at ' + (baseApi() || 'this site') + ' — set the Backend URL below.'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 404 && !j.error) throw new Error('Backend not found at ' + (baseApi() || 'this site') + ' (HTTP 404) — the API lives on your AWS host. Set the Backend URL below.');
    throw new Error(j.error || ('HTTP ' + r.status));
  }
  return j;
}
async function backendOk() {
  try { await api('/api/health'); return true; }
  catch (e) { document.getElementById('a_err').textContent = e.message; return false; }
}
const esc = (s) => (s ?? '').toString().replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function toast(msg, bad) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.className = 'show' + (bad ? ' bad' : '');
  clearTimeout(t._h); t._h = setTimeout(() => t.className = '', 3200);
}
function nav() { NAV.innerHTML = TABS.map(([k, l]) => `<button data-t="${k}" class="${k===TAB?'on':''}">${l}</button>`).join(''); NAV.querySelectorAll('button').forEach(b => b.onclick = () => { TAB = b.dataset.t; nav(); render(); }); }
async function boot() {
  if (!TOK) return showAuth();
  try { const j = await api('/api/me'); ME = j.user; showApp(); } catch { showAuth(); }
}
function showAuth() { document.getElementById('auth').classList.remove('hidden'); document.getElementById('app').classList.add('hidden'); const b = document.getElementById('a_backend'); if (b && !b.value) b.value = window.TIDINGS_API || localStorage.getItem('tidings_api') || ''; }
function showApp() { document.getElementById('auth').classList.add('hidden'); document.getElementById('app').classList.remove('hidden'); document.getElementById('who').textContent = ME.name + ' · ' + ME.role; nav(); render(); }
function saveBackend() { const b = document.getElementById('a_backend'); if (b) localStorage.setItem('tidings_api', b.value.trim()); }
document.getElementById('loginBtn').onclick = async () => { saveBackend(); if (!(await backendOk())) return; try { const j = await api('/api/auth/login','POST',{email:val('a_email'),password:val('a_pass')}); TOK=j.token; localStorage.setItem('tidings_tok',TOK); ME=j.user; showApp(); } catch(e){ err(e);} };
document.getElementById('regBtn').onclick = async () => { saveBackend(); if (!(await backendOk())) return; try { const j = await api('/api/auth/register','POST',{name:val('a_name'),email:val('a_email'),password:val('a_pass'),role:val('a_role')}); TOK=j.token; localStorage.setItem('tidings_tok',TOK); ME=j.user; showApp(); } catch(e){ err(e);} };
document.getElementById('logoutBtn').onclick = async () => { try { await api('/api/auth/logout', 'POST'); } catch {} TOK = ''; localStorage.removeItem('tidings_tok'); showAuth(); };
document.addEventListener('keydown', (e) => { if (e.altKey && (e.key === 'q' || e.key === 'Q')) { TAB = 'capture'; nav(); render(); setTimeout(() => document.getElementById('c_s')?.focus(), 400); } });
function err(e){ document.getElementById('a_err').textContent = e.message; alert(e.message); }
const val = (id) => document.getElementById(id)?.value;

async function render(preset) {
  V.innerHTML = '<p class="mut">Loading…</p>';
  try {
    if (TAB==='dashboard') return vDash();
    if (TAB==='capture') return vCapture();
    if (TAB==='journalists') return vJour(preset);
    if (TAB==='clients') return vClients();
    if (TAB==='campaigns') return vCamps();
    if (TAB==='coverage') return vCov();
    if (TAB==='import') return vImport();
    if (TAB==='reports') return vReports();
    if (TAB==='portfolio') return vPort();
    if (TAB==='jportal') return vJPortal();
  } catch(e){ V.innerHTML = `<div class="card"><b>Error:</b> ${esc(e.message)}</div>`; }
}

// ---- dashboard ----
async function vDash() {
  const d = await api('/api/dashboard/overview');
  const stats = await api('/api/media-database/stats');
  V.innerHTML = `<h2>Portfolio overview</h2>
  <div class="grid3"><div class="card"><div class="kpi">${d.clients}</div><div class="mut">Clients</div></div>
  <div class="card"><div class="kpi">${d.liveCampaigns.length}</div><div class="mut">Live campaigns</div></div>
  <div class="card"><div class="kpi">${d.totals.placements} / ${d.totals.pitches}</div><div class="mut">Placements / pitches · ${d.totals.reach.toLocaleString()} reach</div></div></div>
  <div class="grid2"><div class="card"><h3>Live campaigns & upcoming end dates</h3>${d.liveCampaigns.map(c=>`<div>🎯 <b>${esc(c.name)}</b> <span class="mut">ends ${esc(c.end_date)}</span></div>`).join('')||'<p class="mut">None live.</p>'}</div>
  <div class="card"><h3>Recent weekly snapshots</h3>${d.recentSnapshots.map(s=>`<div class="mut">${esc(s.week_start)} — ${esc(s.summary)}</div>`).join('')||'<p class="mut">No snapshots yet. Open Campaigns → generate snapshot.</p>'}</div></div>
  <div class="card"><h3>Media database freshness</h3><p class="mut">${stats.total} journalists · ${stats.verified} verified · ${stats.stale ?? '?'} stale (unverified 90+ days) · ${stats.bounced} bounced. Each record shows last-verified date. <button class="btn dark" id="staleBtn">Show stale</button></p></div>`;
  const sb = document.getElementById('staleBtn');
  if (sb) sb.onclick = () => { TAB = 'journalists'; nav(); render('stale'); };
}

// ---- capture ----
async function vCapture() {
  const [js, cs, cm] = await Promise.all([api('/api/journalists'), api('/api/clients'), api('/api/campaigns')]);
  V.innerHTML = `<h2>Effortless capture — under 10 seconds</h2>
  <div class="grid2"><div class="card"><h3>⚡ Quick-add (fallback)</h3>
  <label>Journalist</label><select id="c_j">${js.journalists.map(j=>`<option value="${j.id}">${esc(j.name)} · ${esc(j.outlet)}</option>`).join('')}</select>
  <label>Client</label><select id="c_c"><option value="">—</option>${cs.clients.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
  <label>Campaign</label><select id="c_m"><option value="">—</option>${cm.campaigns.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
  <label>Type / Channel</label><div style="display:flex;gap:6px"><select id="c_t"><option>pitch</option><option>reply</option><option>placement</option><option>note</option><option>meeting</option><option>call</option><option>whatsapp</option><option>email</option></select><select id="c_ch"><option>email</option><option>whatsapp</option><option>phone</option><option>in-person</option></select></div>
  <label>Subject</label><input id="c_s" placeholder="Pitch subject"><label>Body / notes</label><textarea id="c_b" rows="3"></textarea>
  <label>Outcome</label><select id="c_o"><option>sent</option><option>replied</option><option>covered</option><option>declined</option><option>no_response</option></select>
  <button class="btn" id="c_go">Log interaction</button> <span id="c_msg" class="mut"></span></div>
  <div class="card"><h3>📧 Forwarded-email parse</h3><p class="mut">Forward/CC to <b>log@tidings.app</b>, then paste here. Parsed into pitch / reply / placement.</p>
  <label>From</label><input id="e_f" placeholder="you@agency.co.za"><label>To</label><input id="e_t" placeholder="journalist@outlet.co.za"><label>Subject</label><input id="e_s"><label>Body</label><textarea id="e_b" rows="4"></textarea>
  <button class="btn dark" id="e_go">Parse (+ auto-log)</button><pre class="dump" id="e_out"></pre></div></div>
  <div class="card"><h3>💬 WhatsApp share / chat export</h3><p class="mut">WhatsApp can't be read automatically — paste a chat export. We extract participants, dates & counts.</p>
  <textarea id="w_t" rows="5" placeholder="[19/09/2026, 09:12] Sarah: Hi, keen on the data sheet..."></textarea>
  <button class="btn dark" id="w_go">Parse export</button><pre class="dump" id="w_out"></pre></div>`;
  document.getElementById('c_go').onclick = async () => { const t0=Date.now(); const sendLog = async (override) => api('/api/capture/quick-log','POST',{journalist_id:val('c_j'),client_id:val('c_c'),campaign_id:val('c_m'),type:val('c_t'),channel:val('c_ch'),subject:val('c_s'),body:val('c_b'),outcome:val('c_o'),override_dnc:override}); try{ await sendLog(false); document.getElementById('c_msg').textContent=`Logged in ${Date.now()-t0}ms ✓ (Alt+Q shortcut)`; toast('Logged ✓'); }catch(e){ if(e.message.includes('Do-not-contact')){ if(confirm(e.message+' — proceed anyway?')){ try{ await sendLog(true); toast('Logged with DNC override'); }catch(e2){toast(e2.message,true);} } else toast('Blocked: do-not-contact', true); } else toast(e.message,true); } };
  document.getElementById('e_go').onclick = async () => { try{ const j=await api('/api/capture/parse-email','POST',{from:val('e_f'),to:val('e_t'),subject:val('e_s'),body:val('e_b'),auto_log:true}); document.getElementById('e_out').textContent=JSON.stringify(j,null,2);}catch(e){alert(e.message);} };
  document.getElementById('w_go').onclick = async () => { try{ const j=await api('/api/capture/whatsapp','POST',{export_text:val('w_t')}); document.getElementById('w_out').textContent=JSON.stringify(j.parsed,null,2);}catch(e){alert(e.message);} };
}

// ---- journalists ----
async function vJour(preset) {
  const j = await api('/api/journalists' + (preset === 'stale' ? '?stale=1' : ''));
  const outs = await api('/api/outlets');
  V.innerHTML = `<h2>Media database & journalist profiles</h2>
  <div class="card"><input id="jq" placeholder="Search name, outlet, beat…"> <button class="btn dark" id="js">Search</button> <button class="btn ghost" style="color:#000;border:1px solid #ccc" id="jst">Stale only</button> <button class="btn ghost" style="color:#000;border:1px solid #ccc" id="jdnc">DNC only</button>
  <div class="mut">${j.count} records · last-verified shown · stale (90d+) & bounce flagged · <select id="jf" style="width:auto"><option value="">All outlets</option>${outs.outlets.map(o=>`<option>${esc(o.outlet)}</option>`).join('')}</select></div>
  <table><tr><th>Name</th><th>Outlet</th><th>Beat</th><th>Channel</th><th>Verified</th><th></th></tr>
  ${j.journalists.slice(0,60).map(x=>`<tr><td><b>${esc(x.name)}</b>${x.bounce_flag?' <span class="badge b-bad">bounce</span>':''}${x.do_not_contact?' <span class="badge b-bad">DNC</span>':''}${x.stale?' <span class="badge b-draft">stale</span>':''}<br><span class="mut">${esc(x.email)}</span></td><td>${esc(x.outlet)}<br><span class="mut">${esc(x.medium)} · ${esc(x.region)}</span></td><td>${esc(x.beat)}</td><td>${esc(x.preferred_channel)}</td><td>${x.verified?`<span class="badge b-ver">✓ ${esc(x.last_verified)}</span>`:`<span class="mut">${esc(x.last_verified||'—')}</span>`}</td><td><button class="btn" data-v="${x.id}">Open</button></td></tr>`).join('')}</table></div>
  <div class="card"><h3>Add journalist</h3><div class="grid3"><input id="n_name" placeholder="Name*"><input id="n_outlet" placeholder="Outlet"><input id="n_beat" placeholder="Beat"><input id="n_email" placeholder="Email"><input id="n_phone" placeholder="Phone"><input id="n_chan" placeholder="Preferred channel"></div><button class="btn" id="n_go">Add</button> <span class="mut">Bad emails auto-flag bounce.</span></div>
  <div class="card"><h3>✉️ Invite journalist (claim-your-profile)</h3><div style="display:flex;gap:6px"><input id="iv_e" placeholder="journalist@outlet.co.za"><input id="iv_n" placeholder="Name"><button class="btn dark" id="iv_go">Invite</button></div><div class="mut" id="iv_m"></div></div>
  <div id="jd"></div>`;
  const open = async (id) => {
    const [d, t, b] = await Promise.all([api('/api/journalists/'+id), api('/api/journalists/'+id+'/timeline'), api('/api/journalists/'+id+'/brief')]);
    const x = d.journalist;
    document.getElementById('jd').innerHTML = `<div class="card"><h3>${esc(x.name)} · ${esc(x.outlet)} ${x.verified?'<span class="badge b-ver">verified</span>':''}</h3>
    <div class="grid2"><div><p class="mut">Beat: ${esc(x.beat)} · Channel: ${esc(x.preferred_channel)} · Times: ${esc(x.preferred_times)}<br>Formats: ${esc(x.pitch_formats)} · Wants: ${esc(x.topics_wanted)} · Avoid: ${esc(x.topics_blocked)}<br>Notes: ${esc(x.notes)} · Last contacted: ${esc(x.last_contacted)} · Last verified: ${esc(x.last_verified)}</p>
    <h4>Pre-pitch brief</h4><p><b>Last contact:</b> ${esc(b.lastContact?.subject||b.lastContact?.body||'none')}<br><b>Landed:</b> ${b.whatLanded.placements} placements from ${b.whatLanded.totalPitches} pitches<br><b>Avoid:</b></p><ul>${b.whatToAvoid.map(a=>`<li>${esc(a)}</li>`).join('')||'<li>Nothing flagged.</li>'}</ul>
    <button class="btn dark" id="bv">Mark verified</button> <button class="btn ghost" style="color:#000;border:1px solid #ccc" id="bb">Flag bounce</button> <button class="btn dark" id="bp">AI pitch draft (Bedrock)</button><pre class="dump hidden" id="bpo"></pre></div>
    <div><h4>Timeline (pitches, replies, placements)</h4>${t.interactions.map(i=>`<div class="mut">📌 [${esc(i.date)}] <b>${esc(i.type)}</b> ${esc(i.subject)} — ${esc(i.outcome)}</div>`).join('')||'<p class="mut">No interactions.</p>'}${t.coverage.map(c=>`<div>🏆 <a href="${esc(c.url)}" target="_blank">${esc(c.title)}</a> <span class="mut">${esc(c.outlet)} · ${esc(c.reach)} reach</span></div>`).join('')}</div></div></div>`;
    document.getElementById('bv').onclick = async()=>{ await api('/api/journalists/'+id+'/verify','POST'); vJour(); };
    document.getElementById('bb').onclick = async()=>{ await api('/api/journalists/'+id+'/flag-bounce','POST'); vJour(); };
    document.getElementById('bp').onclick = async()=>{ const angle=prompt('Story angle / key message for the draft:'); if(!angle)return; const out=document.getElementById('bpo'); out.classList.remove('hidden'); out.textContent='Drafting via Bedrock…'; try{ const a=await api('/api/ai/assist','POST',{action:'pitch',input:{journalist:x.name,outlet:x.outlet,beat:x.beat,preferred:x.preferred_channel+' '+(x.preferred_times||''),avoid:[x.topics_blocked,x.pitch_formats,b.doNotContact?'DO NOT CONTACT':null].filter(Boolean).join('; '),angle}}); out.textContent=a.text; }catch(e){ out.textContent='AI unavailable: '+e.message; } };
  };
  V.querySelectorAll('[data-v]').forEach(btn=>btn.onclick=()=>open(btn.dataset.v));
  const reloadTable = async (qq) => { const r = await api('/api/journalists' + qq); V.querySelector('table').innerHTML = '<tr><th>Name</th><th>Outlet</th><th>Beat</th><th>Channel</th><th>Verified</th><th></th></tr>' + r.journalists.map(x => `<tr><td><b>${esc(x.name)}</b>${x.do_not_contact ? ' <span class="badge b-bad">DNC</span>' : ''}${x.stale ? ' <span class="badge b-draft">stale</span>' : ''}</td><td>${esc(x.outlet)}</td><td>${esc(x.beat)}</td><td>${esc(x.preferred_channel)}</td><td>${x.verified ? '✓' : esc(x.last_verified || '')}</td><td><button class="btn" data-v="${x.id}">Open</button></td></tr>`).join(''); V.querySelectorAll('[data-v]').forEach(btn => btn.onclick = () => open(btn.dataset.v)); };
  document.getElementById('js').onclick = async () => reloadTable('?q=' + encodeURIComponent(document.getElementById('jq').value));
  document.getElementById('jst').onclick = async () => reloadTable('?stale=1');
  document.getElementById('jdnc').onclick = async () => reloadTable('?dnc=1');
  document.getElementById('n_go').onclick = async()=>{ try{ const r = await api('/api/journalists','POST',{name:val('n_name'),outlet:val('n_outlet'),beat:val('n_beat'),email:val('n_email'),phone:val('n_phone'),preferred_channel:val('n_chan')}); toast(r.autoBounce ? 'Added — email looks invalid, bounce flagged.' : 'Added'); render(); }catch(e){toast(e.message, true);} };
  document.getElementById('iv_go').onclick = async () => { try { const r = await api('/api/portal/invites', 'POST', { email: val('iv_e'), name: val('iv_n') }); document.getElementById('iv_m').textContent = r.message; toast('Invite recorded'); } catch (e) { toast(e.message, true); } };
}

// ---- clients ----
async function vClients() {
  const d = await api('/api/clients');
  V.innerHTML = `<h2>Clients portfolio</h2><div class="card"><h3>New client</h3><div class="grid3"><input id="k_n" placeholder="Client name*"><input id="k_s" placeholder="Sector"><input id="k_c" placeholder="Brand colour" value="#3b0a6e"></div><input id="k_m" placeholder="Key messages"><button class="btn" id="k_go">Create</button></div>
  ${d.clients.map(c=>`<div class="card"><h3>${esc(c.name)} <span class="mut">${esc(c.sector)}</span></h3><p class="mut">${esc(c.key_messages)} · Tone: ${esc(c.tone)} · Beats: ${(c.target_beats||[]).join(', ')}</p><button class="btn dark" data-c="${c.id}">Open workspace</button> <span class="mut" id="s_${c.id}"></span><div id="d_${c.id}"></div></div>`).join('')||'<p class="mut">No clients yet.</p>'}`;
  document.getElementById('k_go').onclick = async()=>{ await api('/api/clients','POST',{name:val('k_n'),sector:val('k_s'),brand_color:val('k_c'),key_messages:val('k_m')}); render(); };
  V.querySelectorAll('[data-c]').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.c; const det=await api('/api/clients/'+id); const sug=await api('/api/clients/'+id+'/suggest-journalists'); const team=await api('/api/clients/'+id+'/team');
    document.getElementById('d_'+id).innerHTML=`<div class="grid2"><div><h4>Campaigns (${det.stats.campaigns}) · ${det.stats.placements} placements · ${det.stats.reach} reach</h4>${det.campaigns.map(c=>`<div>🎯 ${esc(c.name)} <span class="badge ${c.status==='live'?'b-live':'b-closed'}">${esc(c.status)}</span></div>`).join('')}
    <h4>Team access</h4>${team.team.map(t=>`<div>${esc(t.name)} (${esc(t.email)}) — ${esc(t.role)}</div>`).join('')||'<p class="mut">Solo. Invite by email:</p>'}<input id="t_${id}" placeholder="teammate@email.co.za"><button class="btn" id="ti_${id}">Invite</button></div>
    <div><h4>Suggested journalists (sector + past results)</h4>${sug.suggestions.slice(0,8).map(s=>`<div>📰 <b>${esc(s.name)}</b> (${esc(s.outlet)}) <span class="mut">score ${s.score} · ${esc((s.reasons||[]).join(', '))}</span></div>`).join('')}</div></div>`;
    document.getElementById('ti_'+id).onclick=async()=>{ try{ await api('/api/clients/'+id+'/team','POST',{email:document.getElementById('t_'+id).value}); alert('Teammate added — they now see only this client.'); }catch(e){alert(e.message);} };
  });
}

// ---- campaigns ----
async function vCamps() {
  const [cs, cm] = await Promise.all([api('/api/clients'), api('/api/campaigns')]);
  V.innerHTML = `<h2>Campaign tracking</h2><div class="card"><h3>New campaign</h3><div class="grid3"><input id="m_n" placeholder="Campaign name*"><select id="m_c">${cs.clients.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select><input id="m_e" type="date"></div><input id="m_o" placeholder="Objectives e.g. 12 placements, 1.5M reach"><button class="btn" id="m_go">Create</button> <button class="btn dark" id="m_due">Generate due snapshots (scheduler)</button> <span class="mut">Auto-covers live campaigns missing a snapshot this week.</span></div>
  ${cm.campaigns.map(c=>`<div class="card"><h3>${esc(c.name)} <span class="badge ${c.status==='live'?'b-live':'b-closed'}">${esc(c.status)}</span></h3><p class="mut">${esc(c.objectives)} · ${esc(c.start_date)} → ${esc(c.end_date)}</p>
  <div class="funnel"><div><div class="kpi">${c.funnel.pitches}</div><div class="mut">Pitches</div></div><div><div class="kpi">${c.funnel.replies}</div><div class="mut">Replies (${c.funnel.replyRate}%)</div></div><div><div class="kpi">${c.funnel.placements}</div><div class="mut">Coverage</div></div><div><div class="kpi">${c.funnel.reach.toLocaleString()}</div><div class="mut">Reach</div></div></div>
  <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap"><button class="btn dark" data-sn="${c.id}">Weekly snapshot</button><button class="btn" data-rp="${c.id}">One-tap report</button><button class="btn ghost" style="color:#000;border:1px solid #ccc" data-cl="${c.id}">Clean-up check</button><button class="btn ok" data-x="${c.id}">Close campaign</button></div><div class="mut" id="o_${c.id}"></div></div>`).join('')}`;
  document.getElementById('m_go').onclick=async()=>{ await api('/api/campaigns','POST',{name:val('m_n'),client_id:val('m_c'),end_date:val('m_e'),objectives:val('m_o')}); render(); };
  document.getElementById('m_due').onclick=async()=>{ try{ const r=await api('/api/campaigns/due-snapshots','POST',{}); toast(r.message); render(); }catch(e){toast(e.message,true);} };
  V.querySelectorAll('[data-sn]').forEach(b=>b.onclick=async()=>{ const r=await api('/api/campaigns/'+b.dataset.sn+'/snapshot','POST',{}); document.getElementById('o_'+b.dataset.sn).textContent='Snapshot: '+r.snapshot.summary; });
  V.querySelectorAll('[data-rp]').forEach(b=>b.onclick=async()=>{ const r=await api('/api/campaigns/'+b.dataset.rp+'/report','POST',{}); document.getElementById('o_'+b.dataset.rp).textContent='Report drafted: '+r.report.title+' — see Reports tab.'; });
  V.querySelectorAll('[data-cl]').forEach(b=>b.onclick=async()=>{ const r=await api('/api/campaigns/'+b.dataset.cl+'/cleanup'); document.getElementById('o_'+b.dataset.cl).textContent=r.message; });
  V.querySelectorAll('[data-x]').forEach(b=>b.onclick=async()=>{ if(!confirm('Close campaign? Final report + case study will auto-draft.'))return; const r=await api('/api/campaigns/'+b.dataset.x+'/close','POST',{}); alert(r.message); render(); });
}

// ---- coverage ----
async function vCov() {
  const [cs, cm, cv] = await Promise.all([api('/api/clients'), api('/api/campaigns'), api('/api/coverage')]);
  V.innerHTML = `<h2>Coverage logging</h2><div class="card"><h3>Paste a link — outlet & date auto-pull</h3><input id="u" placeholder="https://..."><button class="btn dark" id="up">Pull</button> <span id="um" class="mut"></span>
  <div class="grid3"><input id="t" placeholder="Title"><input id="o" placeholder="Outlet"><input id="d" type="date"></div><div class="grid3"><input id="r" type="number" placeholder="Reach"><select id="s"><option>positive</option><option>neutral</option><option>negative</option></select><select id="m"><option value="">Campaign…</option>${cm.campaigns.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div><select id="cc"><option value="">Client…</option>${cs.clients.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select><input id="k" placeholder="Key-message pickup"><button class="btn" id="go">Log coverage</button> <a href="#" id="expCsv" class="mut">Export CSV</a></div>
  <div class="card"><input id="cq" placeholder="Search coverage…"> <button class="btn dark" id="cqs">Search</button><table><tr><th>Title</th><th>Outlet</th><th>Reach</th><th>Sentiment</th></tr>${cv.coverage.map(c=>`<tr><td><a href="${esc(c.url)}" target="_blank">${esc(c.title)}</a></td><td>${esc(c.outlet)}</td><td>${c.reach}</td><td>${esc(c.sentiment)}</td></tr>`).join('')}</table></div>`;
  document.getElementById('cqs').onclick = async () => { const r = await api('/api/coverage?q=' + encodeURIComponent(document.getElementById('cq').value)); V.querySelector('table').innerHTML = '<tr><th>Title</th><th>Outlet</th><th>Reach</th><th>Sentiment</th></tr>' + r.coverage.map(c => `<tr><td>${esc(c.title)}</td><td>${esc(c.outlet)}</td><td>${c.reach}</td><td>${esc(c.sentiment)}</td></tr>`).join(''); };
  document.getElementById('up').onclick=async()=>{ try{ const r=await api('/api/coverage/parse-link','POST',{url:val('u')}); document.getElementById('t').value=r.parsed.title; document.getElementById('o').value=r.parsed.outlet; document.getElementById('um').textContent='Pulled ✓'; }catch(e){alert(e.message);} };
  document.getElementById('go').onclick=async()=>{ await api('/api/coverage','POST',{url:val('u'),title:val('t'),outlet:val('o'),pub_date:val('d'),reach:+val('r')||0,sentiment:val('s'),campaign_id:val('m'),client_id:val('cc'),key_message_pickup:val('k')}); render(); };
  document.getElementById('expCsv').onclick = (e) => { e.preventDefault(); window.open(baseApi() + '/api/export/coverage.csv?token=' + encodeURIComponent(TOK), '_blank'); };
}

// ---- import ----
let IMP = { headers: [], rows: [], mapping: {} };
async function vImport() {
  V.innerHTML = `<h2>Spreadsheet import — column mapper</h2><div class="card"><p class="mut">Upload any CSV or TSV (Name, Outlet, Beat, Email, Phone, Last contacted, Notes, Client, Status…). Auto-suggest + preview + duplicate merge + outlet-move detection. Unmatched columns are preserved into notes/custom fields — no data lost.</p>
  <input type="file" id="f" accept=".csv,.tsv,.txt"><button class="btn dark" id="am">Auto-map</button><div id="map"></div><div id="prev"></div></div>`;
  document.getElementById('f').onchange = (e) => { const file=e.target.files[0]; const rd=new FileReader(); rd.onload=()=>{ const text=rd.result; const delim=text.includes('\t')?'tab':'csv'; const lines=text.split(/\r?\n/).filter(l=>l.trim()); const split=(l)=> delim==='tab' ? l.split('\t').map(x=>x.trim()) : l.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(x=>x.replace(/^"|"$/g,'')); IMP.headers=split(lines[0]); IMP.rows=lines.slice(1).map(split); document.getElementById('map').innerHTML=`<p class="mut">${IMP.rows.length} rows (${delim}) · headers: ${IMP.headers.map(esc).join(' | ')}</p>`; }; rd.readAsText(file); };
  document.getElementById('am').onclick = async () => {
    if(!IMP.headers.length) return alert('Choose a CSV first');
    const m = await api('/api/import/auto-map','POST',{headers:IMP.headers}); IMP.mapping=m.mapping;
    const fields=['',...m.fields];
    document.getElementById('map').innerHTML = IMP.headers.map(h=>`<label>${esc(h)} → </label><select data-h="${esc(h)}">${fields.map(f=>`<option value="${f}" ${IMP.mapping[h]===f?'selected':''}>${f||'(ignore → notes)'}</option>`).join('')}</select>`).join('')+`<br><button class="btn" id="pv">Preview + duplicates</button>`;
    document.querySelectorAll('[data-h]').forEach(s=>s.onchange=()=>IMP.mapping[s.dataset.h]=s.value);
    document.getElementById('pv').onclick = async () => {
      const r = await api('/api/import/preview','POST',{headers:IMP.headers,rows:IMP.rows,mapping:IMP.mapping});
      document.getElementById('prev').innerHTML = `<h4>Preview (first rows as they will appear)</h4><pre class="dump">${esc(JSON.stringify(r.preview,null,2))}</pre><h4>Duplicates (${r.duplicates.length})</h4><pre class="dump">${esc(JSON.stringify(r.duplicates,null,2))}</pre><h4>Possible outlet moves (${(r.possibleMoves||[]).length})</h4><pre class="dump">${esc(JSON.stringify(r.possibleMoves||[],null,2))}</pre><button class="btn ok" id="cm">Import ${r.total} rows</button>`;
      document.getElementById('cm').onclick = async()=>{ const c=await api('/api/import/commit','POST',{headers:IMP.headers,rows:IMP.rows,mapping:IMP.mapping}); toast(`Imported ${c.imported}, skipped ${c.skipped}`); };
    };
  };
}

// ---- reports ----
async function vReports() {
  const r = await api('/api/reports'); const sn = await api('/api/snapshots');
  let ai = { configured: false };
  try { ai = await api('/api/ai/status'); } catch {}
  const AI_ON = !!ai.configured;
  V.innerHTML = `<h2>Automatic campaign reports & weekly snapshots</h2>
  ${ai.configured ? '<p class="mut">🤖 Bedrock AI on (' + esc(ai.region) + ') — lessons drafting available.</p>' : '<p class="mut">🤖 AI off (' + esc(ai.reason || 'Bedrock not configured') + '). Reports still work fully without it.</p>'}
  <div class="card"><h3>Weekly snapshots (auto summary vs objectives)</h3><p class="mut">Snapshots go to you first — share with the client only after review.</p>${sn.snapshots.map(s=>`<div class="mut">📅 ${esc(s.week_start)} — ${esc(s.summary)}<br>Needs attention: ${(s.needs_attention||[]).map(esc).join('; ')||'none'} ${s.shared_with_client?'· <b>shared with client</b>':''}</div><button class="btn dark" data-sh="${s.id}">${s.shared_with_client?'Unshare':'Share with client'}</button><hr>`).join('')||'<p class="mut">None yet.</p>'}</div>
  ${r.reports.map(x=>{const b=x.body||{};return `<div class="card" style="border-top:6px solid ${(x.branding||{}).brand_color||'#3b0a6e'}"><h3>${esc(x.title)} <span class="badge b-draft">${esc(x.status)}</span></h3><p class="mut">Client: ${esc(b.client)} · ${esc(b.period)} · ${esc(b.generatedAt||'')}</p><div class="funnel"><div><div class="kpi">${b.funnel?.pitches??'—'}</div><div class="mut">Pitches</div></div><div><div class="kpi">${b.funnel?.replies??'—'}</div><div class="mut">Replies</div></div><div><div class="kpi">${b.funnel?.placements??'—'}</div><div class="mut">Coverage</div></div><div><div class="kpi">${(b.funnel?.reach??0).toLocaleString()}</div><div class="mut">Reach</div></div></div><h4>Coverage</h4>${(b.coverage||[]).map(c=>`<div>🏆 ${esc(c.title)} — <span class="mut">${esc(c.outlet)} · ${esc(c.sentiment)}</span></div>`).join('')||'<p class="mut">No coverage.</p>'}<p class="mut">Lessons: ${esc(b.lessons)}</p><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn ok" data-a="${x.id}">Approve (nothing reaches client unchecked)</button><button class="btn dark" data-e="${x.id}">Edit lessons/status</button>${AI_ON?`<button class="btn dark" data-ai="${x.id}">AI lessons (Bedrock)</button>`:''}</div></div>`}).join('')||'<p class="mut">No reports. Use Campaigns → One-tap report, or close a campaign.</p>'}`;
  V.querySelectorAll('[data-a]').forEach(b=>b.onclick=async()=>{ await api('/api/reports/'+b.dataset.a+'/approve','POST',{status:'approved'}); render(); });
  V.querySelectorAll('[data-ai]').forEach(b=>b.onclick=async()=>{ b.disabled=true; b.textContent='Drafting…'; try { const cur=await api('/api/reports/'+b.dataset.ai); const bd=cur.report.body||{}; const f=bd.funnel||{}; const a=await api('/api/ai/assist','POST',{action:'lessons',input:{campaign:bd.campaign,objectives:bd.objectives,pitches:f.pitches,replies:f.replies,placements:f.placements,reach:f.reach,sentiment:(f.bySentiment||[]).map(s=>s.sentiment+':'+s.c).join(', '),topOutlets:(bd.topOutlets||[]).map(o=>o.outlet)}}); await api('/api/reports/'+b.dataset.ai,'PUT',{body:{...bd,lessons:'AI draft (Bedrock — review before sending):\n'+a.text}}); toast('AI lessons drafted — review them'); render(); }catch(e){ toast(e.message,true); b.disabled=false; b.textContent='AI lessons (Bedrock)'; } });
  V.querySelectorAll('[data-sh]').forEach(b=>b.onclick=async()=>{ const cur=b.textContent.includes('Unshare'); await api('/api/snapshots/'+b.dataset.sh+'/share','POST',{shared:!cur}); toast(cur?'Unshared':'Shared with client (reviewed) ✓'); render(); });
  V.querySelectorAll('[data-e]').forEach(b=>b.onclick=async()=>{ const cur=await api('/api/reports/'+b.dataset.e); const nl=prompt('Edit lessons learned:', cur.report.body.lessons||''); if(nl===null)return; const ns=prompt('Status (draft/approved/sent):', cur.report.status); const nb={...cur.report.body, lessons:nl}; await api('/api/reports/'+b.dataset.e,'PUT',{body:nb, status:ns||cur.report.status}); toast('Report updated'); render(); });
}

// ---- portfolio ----
async function vPort() {
  const [s, cs, st, tm] = await Promise.all([api('/api/portfolio/summary'), api('/api/portfolio/case-studies'), api('/api/portfolio/settings'), api('/api/portfolio/testimonials')]);
  V.innerHTML = `<h2>Portfolio generator — results-led, always current</h2>
  <div class="grid2"><div class="card"><h3>Career summary</h3><div class="kpi">${s.totals.campaigns} campaigns · ${s.totals.placements} placements · ${s.totals.reach.toLocaleString()} reach</div><ul>${s.bullets.map(b=>`<li>${esc(b)}</li>`).join('')}</ul><p class="mut">CV-ready bullets — copy into CV/profile.</p></div>
  <div class="card"><h3>Share</h3><p>Public link: <a id="pubLink" href="#" target="_blank"></a> <span class="badge b-ver">verified data</span></p><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" id="pdf">Download PDF (print)</button><button class="btn dark" id="cv">Copy CV bullets</button><button class="btn dark" id="op">One-page summary</button></div><div id="opv"></div><label>Headline</label><input id="p_h" value="${esc(st.settings.headline||'')}"><label>Bio</label><textarea id="p_b">${esc(st.settings.bio||'')}</textarea><button class="btn dark" id="p_s">Save</button> <button class="btn ghost" style="color:#000;border:1px solid #ccc" id="apiSet">Backend URL</button></div></div>
  <h3>Case studies (auto-drafted on campaign close — review before publish)</h3>
  ${cs.caseStudies.map(c=>`<div class="card"><h4>${esc(c.title)} <span class="badge b-draft">${esc(c.status)} / signoff:${esc(c.client_signoff)}</span> ${c.anonymised?'<span class="badge b-bad">anonymised</span>':''}</h4><p><b>Challenge:</b> ${esc(c.challenge)}</p><p><b>Approach:</b> ${esc(c.approach)}</p><p><b>Results:</b> ${esc(c.results)} <span class="mut">✔ verified from tracked data</span></p><p class="mut">Client sign-off link (no login): <code>/api/portfolio/signoff/${c.id}</code></p><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn ok" data-ap="${c.id}">Approve & publish</button><button class="btn dark" data-an="${c.id}">Anonymise</button><button class="btn ghost" style="color:#000;border:1px solid #ccc" data-tr="${c.id}">Request testimonial</button></div></div>`).join('')||'<p class="mut">Close a campaign to auto-draft a case study.</p>'}
  <div class="card"><h3>Testimonials</h3>${tm.testimonials.map(t=>`<div>💬 “${esc(t.message||'(requested — '+esc(t.request_sent_to)+')')}” — <b>${esc(t.author)}</b> <span class="mut">${esc(t.status)}</span></div>`).join('')||'<p class="mut">None.</p>'}</div>`;
  document.getElementById('p_s').onclick=async()=>{ await api('/api/portfolio/settings','PUT',{headline:val('p_h'),bio:val('p_b')}); toast('Saved'); };
  { const pl = document.getElementById('pubLink'); const abs = baseApi() + st.publicUrl; pl.href = abs || st.publicUrl; pl.textContent = pl.href; }
  document.getElementById('apiSet').onclick = () => { const cur = localStorage.getItem('tidings_api') || window.TIDINGS_API || ''; const v = prompt('Backend API URL (empty = same origin):', cur); if (v === null) return; localStorage.setItem('tidings_api', v.trim()); toast('Backend set — reloading'); setTimeout(() => location.reload(), 600); };
  document.getElementById('pdf').onclick=()=>window.print();
  document.getElementById('cv').onclick=async()=>{ try{ await navigator.clipboard.writeText(s.bullets.join('\n')); toast('CV bullets copied ✓'); }catch{ toast(s.bullets.join('\n')); } };
  document.getElementById('op').onclick = async () => { const o = await api('/api/portfolio/one-pager'); document.getElementById('opv').innerHTML = `<hr><h4>One-page results summary <span class="badge b-ver">✔ verified</span></h4><p><b>${esc(o.name)}</b> · ${esc(o.headline)}</p><p class="mut">${esc(o.bio)}</p><p>${o.totals.campaigns} campaigns · ${o.totals.placements} placements · ~${o.totals.reach.toLocaleString()} reach</p><ul>${o.highlights.map(h => `<li>${esc(h.title)} — ${esc(h.outlet)} (${h.reach})</li>`).join('')}</ul><button class="btn" onclick="window.print()">Print / save PDF</button>`; };
  V.querySelectorAll('[data-ap]').forEach(b=>b.onclick=async()=>{ await api('/api/portfolio/case-studies/'+b.dataset.ap,'PUT',{status:'approved'}); await api('/api/portfolio/case-studies/'+b.dataset.ap+'/signoff','POST',{decision:'approved'}); render(); });
  V.querySelectorAll('[data-an]').forEach(b=>b.onclick=async()=>{ await api('/api/portfolio/case-studies/'+b.dataset.an,'PUT',{anonymised:true,display_client_name:'A fintech company in Southern Africa'}); render(); });
  V.querySelectorAll('[data-tr]').forEach(b=>b.onclick=async()=>{ const em=prompt('Client email to request testimonial from:'); if(!em)return; const r=await api('/api/portfolio/testimonials/request','POST',{case_study_id:b.dataset.tr,send_to:em}); prompt('Share this submit link with client:', baseApi() + r.submitUrl); });
}

// ---- journalist portal ----
async function vJPortal() {
  V.innerHTML = `<h2>Journalist portal</h2><div class="grid2"><div class="card"><h3>Claim & verify (couple of minutes)</h3><p class="mut">Login as journalist, confirm outlet via work email. Verified profiles show last-verified date.</p><button class="btn" id="cl">Claim my profile</button><div id="clo"></div></div>
  <div class="card"><h3>Controls & privacy (POPIA)</h3><label>Preferred channel</label><select id="pc"><option>email</option><option>whatsapp</option><option>phone</option></select><label>Do-not-contact</label><select id="dn"><option value="0">Allow pitches</option><option value="1">Do not contact</option></select><button class="btn dark" id="pc_s">Save controls</button> <button class="btn ghost" style="color:#000;border:1px solid #ccc" id="ex">Export my data</button> <button class="btn ghost" style="color:#b3125f;border:1px solid #e7b" id="erase">Remove my details</button><div><button class="btn dark" id="dg">Monthly digest</button><div class="mut" id="dgv"></div></div></div></div>
  <div class="grid2"><div class="card"><h3>My summary — who pitched me</h3><div id="jsum"></div></div>
  <div class="card"><h3>Two-way outreach</h3><input id="sr_t" placeholder="Source request title"><input id="sr_b" placeholder="Beat"><textarea id="sr_d" placeholder="What do you need?"></textarea><button class="btn" id="sr_go">Post source request</button><div id="srl"></div>
  <h4>Message a PR pro</h4><input id="mm_t" placeholder="Their user-id (see directory)"><input id="mm_s" placeholder="Subject"><textarea id="mm_b" placeholder="Message"></textarea><button class="btn dark" id="mm_go">Send (limits + reporting anti-spam)</button><div id="msgs"></div><div id="dir"></div></div></div>`;
  const load = async () => {
    try { const s=await api('/api/portal/me/summary'); document.getElementById('jsum').innerHTML=`<p><b>${esc(s.profile.name)}</b> · ${esc(s.profile.outlet)} ${s.profile.verified?'✓':''}</p><p class="mut">Private notes & ratings are never shown here — only who contacted you and published outcomes.</p><h4>Pitched by</h4>${s.pitchedBy.map(p=>`<div class="mut">${esc(p.pr)} — ${esc(p.subject)} (${esc(p.date)})</div>`).join('')||'<p class="mut">No pitches yet.</p>'}<h4>Coverage</h4>${s.coverage.map(c=>`<div>🏆 ${esc(c.title)} <span class="mut">${esc(c.outlet)}</span></div>`).join('')}`; } catch(e){ document.getElementById('jsum').innerHTML=`<p class="mut">${esc(e.message)}</p>`; }
    try { const r=await api('/api/portal/source-requests'); document.getElementById('srl').innerHTML='<h4>Open requests</h4>'+r.sourceRequests.map(x=>`<div>🎙️ <b>${esc(x.title)}</b> <span class="mut">${esc(x.beat)} · ${esc(x.journalist_name)}</span></div>`).join(''); } catch {}
    try { const d=await api('/api/portal/directory'); document.getElementById('dir').innerHTML='<h4>PR directory (opt-in)</h4>'+d.directory.map(u=>`<div class="mut">${esc(u.name)} — ${esc(u.org)} <code>${u.id}</code></div>`).join(''); } catch {}
    try { const mg=await api('/api/portal/messages'); document.getElementById('msgs').innerHTML='<h4>Inbox (report spam to remove)</h4>'+mg.messages.map(m2=>`<div class="mut">✉️ ${esc(m2.subject)} — ${esc(m2.body.slice(0,120))} <button data-rep="${m2.id}" style="font-size:11px">report</button></div>`).join(''); document.querySelectorAll('[data-rep]').forEach(b=>b.onclick=async()=>{ const r=await api('/api/portal/messages/'+b.dataset.rep+'/report','POST',{reason:'spam'}); toast(r.message); load(); }); } catch {}
  };
  await load();
  document.getElementById('cl').onclick=async()=>{ try{ const r=await api('/api/portal/claim','POST',{}); document.getElementById('clo').textContent=r.message; toast(r.message); load(); }catch(e){ const m=e.message; if(m.includes('confirmed')){ if(confirm(m+' — claim anyway (pending manual check)?')){ try{ const r2=await api('/api/portal/claim','POST',{confirmed:true, journalist_id:prompt('Journalist record id:')||undefined}); toast(r2.message); load(); }catch(e2){toast(e2.message,true);} } } else toast(m,true); } };
  document.getElementById('pc_s').onclick=async()=>{ try{ await api('/api/portal/controls','PUT',{preferred_channel:val('pc'),do_not_contact:val('dn')==='1'}); toast('Saved'); }catch(e){toast(e.message,true);} };
  document.getElementById('dg').onclick = async () => { try { const d = await api('/api/portal/digest'); document.getElementById('dgv').textContent = d.summary; } catch (e) { toast(e.message, true); } };
  document.getElementById('erase').onclick = async () => { if (!confirm('Remove your journalist details (POPIA erasure)? This anonymises your record.')) return; try { await api('/api/portal/me', 'DELETE', {}); toast('Details removed'); load(); } catch (e) { toast(e.message, true); } };
  document.getElementById('ex').onclick=async()=>{ const d=await api('/api/export'); toast('Export ready — '+d.interactions.length+' interactions. See console.'); console.log(d); };
  document.getElementById('sr_go').onclick=async()=>{ await api('/api/portal/source-requests','POST',{title:val('sr_t'),beat:val('sr_b'),description:val('sr_d')}); load(); };
  document.getElementById('mm_go').onclick=async()=>{ try{ await api('/api/portal/messages','POST',{to_user_id:val('mm_t'),subject:val('mm_s'),body:val('mm_b')}); toast('Sent'); load(); }catch(e){toast(e.message,true);} };
}

boot();
