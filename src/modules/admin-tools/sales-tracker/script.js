const TYPES = ["Social Media","Events","PR-National","PR-International","Others"];
const STATUSES = ["Query received","Initiated","Under discussion","On hold","Dropped","No response","Will reach when needed","Successfully closed"];
const STATUS_COLORS = {
  "Query received":["#EFF6FF","#1D4ED8"], "Initiated":["#E9F7EE","#1F7A3F"],
  "Under discussion":["#FFF3D6","#8A5A00"], "On hold":["#F1EFE8","#5F5E5A"],
  "Dropped":["#FCE4E4","#B3231F"], "No response":["#FCE4E4","#B3231F"],
  "Will reach when needed":["#FFF3D6","#8A5A00"], "Successfully closed":["#E9F7EE","#1F7A3F"]
};
const SUMMARY_STATUSES = ["Initiated","In progress","Successfully closed","Dropped"];
const STATUS_TO_SUMMARY = {
  "Query received":"In progress",
  "Initiated":"Initiated",
  "Under discussion":"In progress",
  "On hold":"In progress",
  "Dropped":"Dropped",
  "No response":"In progress",
  "Will reach when needed":"In progress",
  "Successfully closed":"Successfully closed"
};

/* ---- Contact no.: country code + flag dropdown, per-country digit validation ---- */
const COUNTRY_CODE_META = {
  '+91': { iso: 'in' }, '+1': { iso: 'us' }, '+44': { iso: 'gb' }, '+971': { iso: 'ae' },
  '+65': { iso: 'sg' }, '+61': { iso: 'au' }, '+49': { iso: 'de' }, '+33': { iso: 'fr' },
  '+81': { iso: 'jp' }, '+86': { iso: 'cn' }, '+7': { iso: 'ru' }, '+55': { iso: 'br' },
  '+27': { iso: 'za' }, '+92': { iso: 'pk' }, '+880': { iso: 'bd' }, '+94': { iso: 'lk' },
  '+977': { iso: 'np' }, '+60': { iso: 'my' }, '+62': { iso: 'id' }, '+63': { iso: 'ph' },
  '+66': { iso: 'th' }, '+82': { iso: 'kr' }, '+39': { iso: 'it' }, '+34': { iso: 'es' },
  '+31': { iso: 'nl' }, '+52': { iso: 'mx' }, '+966': { iso: 'sa' }, '+64': { iso: 'nz' },
};
const PHONE_RULES = {
  '+91': { pattern: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit Indian mobile number starting with 6-9.' },
  '+1': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit US/Canada phone number.' },
  '+44': { pattern: /^\d{10,11}$/, message: 'Enter a valid 10-11 digit UK phone number.' },
  '+971': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit UAE phone number.' },
  '+65': { pattern: /^\d{8}$/, message: 'Enter a valid 8-digit Singapore phone number.' },
  '+61': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit Australian phone number.' },
  '+49': { pattern: /^\d{10,11}$/, message: 'Enter a valid 10-11 digit German phone number.' },
  '+33': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit French phone number.' },
  '+81': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Japanese phone number.' },
  '+86': { pattern: /^\d{11}$/, message: 'Enter a valid 11-digit Chinese phone number.' },
  '+7': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Russian phone number.' },
  '+55': { pattern: /^\d{10,11}$/, message: 'Enter a valid 10-11 digit Brazilian phone number.' },
  '+27': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit South African phone number.' },
  '+92': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Pakistani phone number.' },
  '+880': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Bangladeshi phone number.' },
  '+94': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit Sri Lankan phone number.' },
  '+977': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Nepali phone number.' },
  '+60': { pattern: /^\d{9,10}$/, message: 'Enter a valid 9-10 digit Malaysian phone number.' },
  '+62': { pattern: /^\d{9,12}$/, message: 'Enter a valid 9-12 digit Indonesian phone number.' },
  '+63': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Philippine phone number.' },
  '+66': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit Thai phone number.' },
  '+82': { pattern: /^\d{9,10}$/, message: 'Enter a valid 9-10 digit South Korean phone number.' },
  '+39': { pattern: /^\d{9,10}$/, message: 'Enter a valid 9-10 digit Italian phone number.' },
  '+34': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit Spanish phone number.' },
  '+31': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit Dutch phone number.' },
  '+52': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Mexican phone number.' },
  '+966': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit Saudi Arabian phone number.' },
  '+64': { pattern: /^\d{8,9}$/, message: 'Enter a valid 8-9 digit New Zealand phone number.' },
  other: { pattern: /^\d{6,15}$/, message: 'Enter a valid phone number (6-15 digits).' },
};

// Generic "renders below its trigger, shows a flag per option" dropdown, mirrors the
// pattern used for country/city/phone-code pickers on the public event submission form.
// opts.searchable adds a filter-as-you-type box at the top of the list; opts.digitOpens
// additionally lets pressing a digit/+ key while the (closed) button has focus jump
// straight into that search — e.g. pressing "9" on the contact country-code picker opens
// it already filtered to codes containing "9", no separate click-to-open step needed.
function wireCustomDropdown(selectEl, wrapEl, btnEl, labelEl, listEl, opts){
  opts = opts || {};
  let searchInput = null;
  function buildOptionLabel(opt){
    const frag = document.createDocumentFragment();
    const iso = opt.dataset.iso;
    if(iso){
      const img = document.createElement('img');
      img.className = 'cs-flag';
      img.src = 'https://flagcdn.com/40x30/'+iso+'.png';
      img.srcset = 'https://flagcdn.com/40x30/'+iso+'.png 2x, https://flagcdn.com/60x45/'+iso+'.png 3x';
      img.width = 20; img.height = 15; img.alt = '';
      img.onerror = ()=>{ img.remove(); };
      frag.appendChild(img);
    }
    frag.appendChild(document.createTextNode(opt.textContent));
    return frag;
  }
  function syncLabel(){
    const opt = selectEl.options[selectEl.selectedIndex];
    labelEl.innerHTML = '';
    if(opt) labelEl.appendChild(buildOptionLabel(opt));
    listEl.querySelectorAll('li[data-value]').forEach(li=> li.classList.toggle('selected', li.dataset.value===selectEl.value));
  }
  function filterList(){
    if(!searchInput) return;
    const term = searchInput.value.trim().toLowerCase();
    listEl.querySelectorAll('li[data-value]').forEach(li=>{
      const matches = !term || li.textContent.toLowerCase().includes(term);
      li.classList.toggle('filtered-out', !matches);
    });
  }
  function rebuildList(){
    listEl.innerHTML = '';
    searchInput = null;
    if(opts.searchable){
      const searchLi = document.createElement('li');
      searchLi.className = 'dropdown-search-item';
      searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.className = 'dropdown-search-input';
      searchInput.placeholder = opts.searchPlaceholder || 'Search…';
      searchInput.setAttribute('aria-label', opts.searchPlaceholder || 'Search');
      searchLi.appendChild(searchInput);
      listEl.appendChild(searchLi);

      searchInput.addEventListener('input', filterList);
      searchInput.addEventListener('click', e=> e.stopPropagation());
      searchInput.addEventListener('keydown', e=>{
        if(e.key==='Escape'){ close(); btnEl.focus(); }
        else if(e.key==='Enter'){
          e.preventDefault();
          const firstMatch = listEl.querySelector('li[data-value]:not(.filtered-out)');
          if(firstMatch) firstMatch.click();
        }
      });
    }
    Array.from(selectEl.options).forEach(opt=>{
      const li = document.createElement('li');
      li.setAttribute('role','option');
      li.dataset.value = opt.value;
      li.appendChild(buildOptionLabel(opt));
      if(opt.value===selectEl.value) li.classList.add('selected');
      listEl.appendChild(li);
    });
    syncLabel();
  }
  function open(seed){
    listEl.classList.add('open'); btnEl.classList.add('open'); btnEl.setAttribute('aria-expanded','true');
    if(searchInput){
      searchInput.value = seed != null ? seed : '';
      filterList();
      setTimeout(()=>{
        searchInput.focus();
        searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
      }, 0);
    }
  }
  function close(){ listEl.classList.remove('open'); btnEl.classList.remove('open'); btnEl.setAttribute('aria-expanded','false'); }
  btnEl.addEventListener('click', e=>{ e.stopPropagation(); listEl.classList.contains('open') ? close() : open(); });
  listEl.addEventListener('click', e=>{
    const li = e.target.closest('li[data-value]');
    if(!li) return;
    selectEl.value = li.dataset.value;
    selectEl.dispatchEvent(new Event('change', {bubbles:true}));
    syncLabel();
    close();
  });
  document.addEventListener('click', e=>{ if(!wrapEl.contains(e.target)) close(); });
  btnEl.addEventListener('keydown', e=>{
    if(e.key==='Escape') close();
    else if(e.key==='Enter' || e.key===' ' || e.key==='ArrowDown'){ e.preventDefault(); open(); }
    else if(opts.searchable && opts.digitOpens && /^[0-9+]$/.test(e.key)){ e.preventDefault(); open(e.key); }
  });
  return { rebuildList, syncLabel, close };
}

function setFieldError(fieldId, errId, message){
  const errEl = document.getElementById(errId);
  const fieldEl = document.getElementById(fieldId);
  if(message){
    errEl.textContent = message;
    errEl.classList.add('visible');
    if(fieldEl) fieldEl.classList.add('has-error');
  } else {
    errEl.textContent = '';
    errEl.classList.remove('visible');
    if(fieldEl) fieldEl.classList.remove('has-error');
  }
  return !message;
}

const contactCodeEl = document.getElementById('f_contact_code');
const contactCodeCustomEl = document.getElementById('f_contact_code_custom');
const contactNumberEl = document.getElementById('f_contact_number');

Array.from(contactCodeEl.options).forEach(opt=>{
  const meta = COUNTRY_CODE_META[opt.value];
  if(meta && meta.iso) opt.dataset.iso = meta.iso;
});

const contactCodeDropdown = wireCustomDropdown(
  contactCodeEl,
  document.getElementById('contact-code-wrap'),
  document.getElementById('contact-code-btn'),
  document.getElementById('contact-code-btn-label'),
  document.getElementById('contact-code-list'),
  { searchable: true, digitOpens: true, searchPlaceholder: 'Search code…' }
);
contactCodeDropdown.rebuildList();

function getContactCode(){
  if(contactCodeEl.value==='other'){
    return (contactCodeCustomEl.value||'').trim() || 'other';
  }
  return contactCodeEl.value;
}
const CUSTOM_CODE_RE = /^\+\d{1,4}$/;
function validateContact(){
  const digits = contactNumberEl.value.replace(/\D/g,'');
  if(contactCodeEl.value==='other' && contactCodeCustomEl.value.trim() && !CUSTOM_CODE_RE.test(contactCodeCustomEl.value.trim())){
    return setFieldError('field_contact', 'err_contact', 'Enter a valid country code (e.g. +123).');
  }
  if(!digits) return setFieldError('field_contact', 'err_contact', '');
  const rule = PHONE_RULES[getContactCode()] || PHONE_RULES.other;
  return setFieldError('field_contact', 'err_contact', rule.pattern.test(digits) ? '' : rule.message);
}
// Splits a saved "contact" string like "+91 9876543210" back into code/number for the
// edit form; unrecognized codes (not in the dropdown) fall back to "Other" + a custom code.
function parseContactValue(raw){
  const trimmed = (raw||'').trim();
  const m = trimmed.match(/^(\+\d{1,4})\s*(.*)$/);
  if(!m) return { code:'+91', custom:'', number: trimmed.replace(/\D/g,'') };
  const code = m[1];
  const digits = m[2].replace(/\D/g,'');
  const knownCodes = Array.from(contactCodeEl.options).map(o=>o.value).filter(v=>v!=='other');
  if(knownCodes.includes(code)) return { code, custom:'', number: digits };
  return { code:'other', custom: code, number: digits };
}

contactCodeEl.addEventListener('change', ()=>{
  contactCodeCustomEl.style.display = contactCodeEl.value==='other' ? 'inline-block' : 'none';
  if(document.getElementById('err_contact').classList.contains('visible') || contactNumberEl.value) validateContact();
});
contactCodeCustomEl.addEventListener('input', ()=>{
  if(document.getElementById('err_contact').classList.contains('visible')) validateContact();
});
contactCodeCustomEl.addEventListener('blur', validateContact);
contactNumberEl.addEventListener('blur', validateContact);
contactNumberEl.addEventListener('input', ()=>{
  if(document.getElementById('err_contact').classList.contains('visible')) validateContact();
});

let leads = [];
let team = [];

/* ---- Storage layer: uses Claude's shared storage when available (inside Claude.ai),
   falls back to this browser's local storage when opened as a plain file ---- */
const hasCloudStorage = (typeof window.storage !== 'undefined' && window.storage !== null);

async function storageGet(key){
  if(hasCloudStorage){
    try{ const r = await window.storage.get(key, true); return r ? r.value : null; }
    catch(e){ return null; }
  }
  return localStorage.getItem(key);
}
async function storageSet(key, value){
  if(hasCloudStorage){
    try{ await window.storage.set(key, value, true); return; }catch(e){}
  }
  localStorage.setItem(key, value);
}

function todayStr(){ return new Date().toISOString().slice(0,10); }

function sampleTeam(){
  return ["Aisha Khan","Rohan Desai","Meera Pillai","Vikram Rao"];
}

function sampleLeads(){
  const t = todayStr();
  const team = sampleTeam();
  return [
    {id:"lead_s1", date:t, name:"Rhea Kapoor", company:"Nimbus Foods", contact:"+91 98200 11223", email:"rhea@nimbusfoods.in", source:"IG DM @nimbusfoods", type:"Social Media", otherType:"", query:"Wants to be featured in a startup funding roundup after their seed round announcement.", assignedTo:team[0], status:"Query received"},
    {id:"lead_s2", date:t, name:"Arjun Mehta", company:"Voltix Energy", contact:"+91 90040 55667", email:"arjun@voltix.io", source:"Startup Mahakumbh booth", type:"Events", otherType:"", query:"Interested in event coverage and a press release for their EV charging launch.", assignedTo:team[1], status:"Initiated", nextFollowUpDate:t, lastConnectDate:t, lastCallDiscussion:"Confirmed launch date, waiting on final press kit before we draft the release."},
    {id:"lead_s3", date:t, name:"Sana Iyer", company:"CloudNest Technologies", contact:"+91 88888 44556", email:"sana@cloudnest.com", source:"press@cloudnest.com", type:"PR-National", otherType:"", query:"Series A funding announcement, needs coverage before their embargo lifts this week.", assignedTo:team[2], status:"Under discussion", nextFollowUpDate:t, lastConnectDate:t, lastCallDiscussion:"Discussed embargo timing on call, they'll share final numbers a day before lift."},
    {id:"lead_s4", date:t, name:"Daniel Osei", company:"PayBridge Africa", contact:"+233 24 555 1122", email:"daniel@paybridge.africa", source:"LinkedIn message", type:"PR-International", otherType:"", query:"Cross-border payments startup expanding to India, wants market-entry press coverage.", assignedTo:team[3], status:"On hold"},
    {id:"lead_s5", date:t, name:"Neha Verma", company:"Freelance consultant", contact:"+91 99110 22334", email:"neha.verma@gmail.com", source:"WhatsApp forward", type:"Others", otherType:"Referral from investor", query:"General query about partnership and advertising opportunities.", assignedTo:team[0], status:"No response"},
    {id:"lead_s6", date:t, name:"Kabir Shah", company:"Loopwave Tech", contact:"+91 97110 33445", email:"kabir@loopwave.io", source:"Instagram reel comment", type:"Social Media", otherType:"", query:"Wanted a brand mention after their product reel went viral - feature published and closed.", assignedTo:team[1], status:"Successfully closed"},
    {id:"lead_s7", date:t, name:"Priya Nair", company:"GreenCart", contact:"+91 96660 22110", email:"priya@greencart.in", source:"Referral - investor demo day", type:"Events", otherType:"", query:"Follow-up from demo day; decided to go with another publication.", assignedTo:team[2], status:"Dropped"},
    {id:"lead_s8", date:t, name:"Farhan Ali", company:"MedixCare", contact:"+91 91234 56780", email:"farhan@medixcare.in", source:"Email inquiry", type:"PR-National", otherType:"", query:"Healthtech startup launching in tier-2 cities, wants a founder interview feature.", assignedTo:team[3], status:"Successfully closed"},
    {id:"lead_s9", date:t, name:"Ishita Bose", company:"Bloom Learning", contact:"+91 90909 12345", email:"ishita@bloomlearning.co", source:"Instagram DM", type:"Social Media", otherType:"", query:"Edtech app crossed 1M downloads, wants a milestone story covered.", assignedTo:"", status:"Will reach when needed"}
  ];
}

async function loadAll(){
  const rawLeads = await storageGet('leads');
  if(rawLeads){
    try{ leads = JSON.parse(rawLeads); }catch(e){ leads = sampleLeads(); }
  } else {
    leads = sampleLeads();
    await saveLeads();
  }
  const rawTeam = await storageGet('team');
  if(rawTeam){
    try{ team = JSON.parse(rawTeam); }catch(e){ team = sampleTeam(); }
  } else {
    team = sampleTeam();
    await saveTeam();
  }

  renderTeam(); renderFilters(); renderTable(); renderSummary();
}
async function saveLeads(){ await storageSet('leads', JSON.stringify(leads)); }
async function saveTeam(){ await storageSet('team', JSON.stringify(team)); }

function fillSelect(sel, options, placeholder){
  sel.innerHTML='';
  if(placeholder){ const o=document.createElement('option'); o.value=''; o.textContent=placeholder; sel.appendChild(o); }
  options.forEach(v=>{ const o=document.createElement('option'); o.value=v; o.textContent=v; sel.appendChild(o); });
}

function renderTeam(){
  fillSelect(document.getElementById('f_assigned'), team, 'Unassigned');
  fillSelect(document.getElementById('filterAssigned'), team, 'All members');
  const wrap = document.getElementById('teamChips');
  wrap.innerHTML='';
  if(team.length===0){ wrap.innerHTML = '<span class="hint">No team members yet â add names below.</span>'; }
  team.forEach((name,i)=>{
    const chip=document.createElement('span'); chip.className='team-chip';
    chip.innerHTML = `${name} <button data-i="${i}" title="Remove">&times;</button>`;
    chip.querySelector('button').onclick=async()=>{ team.splice(i,1); await saveTeam(); renderTeam(); };
    wrap.appendChild(chip);
  });
}

function renderFilters(){
  fillSelect(document.getElementById('filterType'), TYPES, 'All types');
  fillSelect(document.getElementById('filterStatus'), STATUSES, 'All statuses');
}

// Shared by the table render and the CSV/Excel/PDF export buttons, so exports always match
// whatever the table is currently showing (filters + search applied, same sort order).
function getFilteredLeads(){
  const ft = document.getElementById('filterType').value;
  const fs = document.getElementById('filterStatus').value;
  const fa = document.getElementById('filterAssigned').value;
  const q = document.getElementById('filterSearch').value.toLowerCase();
  return leads.filter(l=>{
    if(ft && l.type!==ft) return false;
    if(fs && l.status!==fs) return false;
    if(fa && l.assignedTo!==fa) return false;
    if(q){
      const hay = [l.name,l.company,l.email,l.contact,l.source].join(' ').toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  }).sort((a,b)=> (b.date||'').localeCompare(a.date||''));
}

function renderTable(){
  const body = document.getElementById('leadsBody');
  body.innerHTML='';
  const filtered = getFilteredLeads();

  filtered.forEach(l=>{
    const tr = document.createElement('tr');
    const typeLabel = l.type==='Others' && l.otherType ? `Others: ${l.otherType}` : l.type;
    tr.innerHTML = `
      <td>${l.date||''}</td>
      <td>${l.name||''}</td>
      <td>${l.company||''}</td>
      <td>${l.contact||''}</td>
      <td>${l.email||''}</td>
      <td>${l.source||''}</td>
      <td><span class="badge">${typeLabel}</span></td>
      <td class="cell-query">${(l.query||'').slice(0,120)}</td>
      <td>${l.assignedTo||'<span class="hint">Unassigned</span>'}</td>
      <td class="cell-status"></td>
      <td class="cell-followup"></td>
      <td class="cell-lastconnect"></td>
      <td class="cell-calldiscussion"></td>
      <td>
        <button class="small" data-edit="${l.id}">Edit</button>
        <button class="small danger" data-del="${l.id}">Delete</button>
      </td>`;

    // Current status: inline-editable select, saves + refreshes summary/charts on change.
    // Colored like the old read-only pill (STATUS_COLORS) so status is still glanceable.
    const statusSel = document.createElement('select');
    statusSel.className = 'inline-cell';
    STATUSES.forEach(s=>{
      const o = document.createElement('option');
      o.value = s; o.textContent = s;
      if(s===l.status) o.selected = true;
      statusSel.appendChild(o);
    });
    function applyStatusColor(sel, status){
      const c = STATUS_COLORS[status] || ["#F1EFE8","#5F5E5A"];
      sel.style.background = c[0];
      sel.style.color = c[1];
      sel.style.borderColor = c[1];
      sel.style.fontWeight = '700';
    }
    applyStatusColor(statusSel, l.status);
    statusSel.addEventListener('change', async ()=>{
      l.status = statusSel.value;
      l.updatedAt = new Date().toISOString();
      applyStatusColor(statusSel, l.status);
      await saveLeads();
      renderSummary();
    });
    tr.querySelector('.cell-status').appendChild(statusSel);

    // Next follow-up date
    const followupInput = document.createElement('input');
    followupInput.type = 'date';
    followupInput.className = 'inline-cell';
    followupInput.value = l.nextFollowUpDate || '';
    followupInput.addEventListener('change', async ()=>{
      l.nextFollowUpDate = followupInput.value;
      await saveLeads();
    });
    tr.querySelector('.cell-followup').appendChild(followupInput);

    // Last connect date
    const lastConnectInput = document.createElement('input');
    lastConnectInput.type = 'date';
    lastConnectInput.className = 'inline-cell';
    lastConnectInput.value = l.lastConnectDate || '';
    lastConnectInput.addEventListener('change', async ()=>{
      l.lastConnectDate = lastConnectInput.value;
      await saveLeads();
    });
    tr.querySelector('.cell-lastconnect').appendChild(lastConnectInput);

    // Last updated status / discussion on call
    const discussionInput = document.createElement('input');
    discussionInput.type = 'text';
    discussionInput.className = 'inline-cell inline-cell-text';
    discussionInput.placeholder = 'Notes from last call...';
    discussionInput.value = l.lastCallDiscussion || '';
    discussionInput.addEventListener('change', async ()=>{
      l.lastCallDiscussion = discussionInput.value;
      await saveLeads();
    });
    tr.querySelector('.cell-calldiscussion').appendChild(discussionInput);

    // Clicking anywhere in the row opens the full Add/edit lead form for it — except clicks
    // on the inline-editable controls or the Edit/Delete buttons themselves, which already
    // handle their own interaction (and would otherwise re-open the form on every click).
    tr.addEventListener('click', e=>{
      if(e.target.closest('button, input, select')) return;
      editLead(l.id);
    });

    body.appendChild(tr);
  });

  body.querySelectorAll('[data-edit]').forEach(b=> b.onclick = ()=> editLead(b.dataset.edit));
  body.querySelectorAll('[data-del]').forEach(b=> b.onclick = async ()=>{
    leads = leads.filter(l=>l.id!==b.dataset.del);
    await saveLeads(); renderTable(); renderSummary();
  });
}

function barChartHtml(pairs, maxColor){
  const max = Math.max(1, ...pairs.map(p=>p[1]));
  return pairs.map(([label,count])=>{
    const pct = Math.round((count/max)*100);
    return `<div class="bar-row">
      <div class="bar-label">${label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
      <div class="bar-count">${count}</div>
    </div>`;
  }).join('');
}

function renderSummary(){
  const total = leads.length;
  const open = leads.filter(l=>!['Successfully closed','Dropped'].includes(l.status)).length;
  const closed = leads.filter(l=>l.status==='Successfully closed').length;
  const dropped = leads.filter(l=>l.status==='Dropped').length;
  document.getElementById('metrics').innerHTML = `
    <div class="metric"><div class="num">${total}</div><div class="lbl">Total leads</div></div>
    <div class="metric"><div class="num">${open}</div><div class="lbl">Active</div></div>
    <div class="metric"><div class="num">${closed}</div><div class="lbl">Closed</div></div>
    <div class="metric"><div class="num">${dropped}</div><div class="lbl">Dropped</div></div>`;

  let html = '<table class="summary-table"><thead><tr><th style="text-align:left;">Type \\ Status</th>';
  SUMMARY_STATUSES.forEach(s=> html += `<th>${s}</th>`);
  html += '<th>Total</th></tr></thead><tbody>';
  TYPES.forEach(t=>{
    const rowLeads = leads.filter(l=>l.type===t);
    html += `<tr><td class="rowlabel">${t}</td>`;
    SUMMARY_STATUSES.forEach(s=>{
      const c = rowLeads.filter(l=> STATUS_TO_SUMMARY[l.status]===s).length;
      html += `<td>${c||''}</td>`;
    });
    html += `<td class="total">${rowLeads.length}</td></tr>`;
  });
  html += '<tr><td class="rowlabel">Total</td>';
  SUMMARY_STATUSES.forEach(s=>{
    const c = leads.filter(l=> STATUS_TO_SUMMARY[l.status]===s).length;
    html += `<td class="total">${c||''}</td>`;
  });
  html += `<td class="total">${total}</td></tr>`;
  html += '</tbody></table>';
  document.getElementById('summaryTableWrap').innerHTML = html;

  const typePairs = TYPES.map(t=> [t, leads.filter(l=>l.type===t).length]);
  document.getElementById('typeChart').innerHTML = barChartHtml(typePairs);

  const statusPairs = STATUSES.map(s=> [s, leads.filter(l=>l.status===s).length]);
  document.getElementById('statusChart').innerHTML = barChartHtml(statusPairs);
}

document.getElementById('f_type').onchange = e=>{
  document.getElementById('otherTypeWrap').style.display = e.target.value==='Others' ? 'block' : 'none';
};

function clearForm(){
  document.getElementById('editId').value='';
  document.getElementById('f_date').value = todayStr();
  document.getElementById('f_name').value='';
  document.getElementById('f_name').classList.remove('invalid');
  document.getElementById('f_company').value='';
  contactCodeEl.value = '+91';
  contactCodeCustomEl.value = '';
  contactCodeCustomEl.style.display = 'none';
  contactNumberEl.value = '';
  contactCodeDropdown.syncLabel();
  setFieldError('field_contact', 'err_contact', '');
  document.getElementById('f_email').value='';
  document.getElementById('f_source').value='';
  document.getElementById('f_type').value='Social Media';
  document.getElementById('f_otherType').value='';
  document.getElementById('otherTypeWrap').style.display='none';
  document.getElementById('f_query').value='';
  document.getElementById('f_assigned').value='';
  document.getElementById('f_status').value='Query received';
  document.getElementById('f_nextFollowUp').value='';
  document.getElementById('f_lastConnect').value='';
  document.getElementById('f_lastCallDiscussion').value='';
  document.getElementById('saveBtn').textContent='Save lead';
  document.getElementById('leadModalTitle').textContent='Add lead';
}

function editLead(id){
  const l = leads.find(x=>x.id===id);
  if(!l) return;
  openLeadModal();
  document.getElementById('editId').value = l.id;
  document.getElementById('f_date').value = l.date||todayStr();
  document.getElementById('f_name').value = l.name||'';
  document.getElementById('f_name').classList.remove('invalid');
  document.getElementById('f_company').value = l.company||'';
  const parsedContact = parseContactValue(l.contact);
  contactCodeEl.value = parsedContact.code;
  contactCodeCustomEl.value = parsedContact.custom;
  contactCodeCustomEl.style.display = parsedContact.code==='other' ? 'inline-block' : 'none';
  contactNumberEl.value = parsedContact.number;
  contactCodeDropdown.syncLabel();
  setFieldError('field_contact', 'err_contact', '');
  document.getElementById('f_email').value = l.email||'';
  document.getElementById('f_source').value = l.source||'';
  document.getElementById('f_type').value = l.type||'Social Media';
  document.getElementById('otherTypeWrap').style.display = l.type==='Others' ? 'block':'none';
  document.getElementById('f_otherType').value = l.otherType||'';
  document.getElementById('f_query').value = l.query||'';
  document.getElementById('f_assigned').value = l.assignedTo||'';
  document.getElementById('f_status').value = l.status||'Query received';
  document.getElementById('f_nextFollowUp').value = l.nextFollowUpDate||'';
  document.getElementById('f_lastConnect').value = l.lastConnectDate||'';
  document.getElementById('f_lastCallDiscussion').value = l.lastCallDiscussion||'';
  document.getElementById('saveBtn').textContent='Update lead';
  document.getElementById('leadModalTitle').textContent='Edit lead';
}

/* ---- Add/edit lead modal: open/close, close (X) button, backdrop click, Escape ---- */
function openLeadModal(){
  document.getElementById('leadModalOverlay').classList.add('open');
}
function closeLeadModal(){
  document.getElementById('leadModalOverlay').classList.remove('open');
}
document.getElementById('leadModalCloseBtn').onclick = ()=>{ clearForm(); closeLeadModal(); };
document.getElementById('leadModalOverlay').addEventListener('click', e=>{
  if(e.target.id === 'leadModalOverlay'){ clearForm(); closeLeadModal(); }
});
document.addEventListener('keydown', e=>{
  if(e.key === 'Escape' && document.getElementById('leadModalOverlay').classList.contains('open')){
    clearForm(); closeLeadModal();
  }
});
document.getElementById('cancelEditBtn').onclick = ()=>{ clearForm(); closeLeadModal(); };

document.getElementById('saveBtn').onclick = async ()=>{
  const id = document.getElementById('editId').value;
  const nameEl = document.getElementById('f_name');
  const msg = document.getElementById('formMsg');
  if(!nameEl.value.trim()){
    nameEl.classList.add('invalid');
    msg.innerHTML = '<div class="msg err">Name is required.</div>';
    nameEl.focus();
    return;
  }
  nameEl.classList.remove('invalid');
  if(!validateContact()){
    msg.innerHTML = '<div class="msg err">Please enter a valid contact number.</div>';
    contactNumberEl.focus();
    return;
  }
  const lead = {
    id: id || ('lead_'+Date.now()),
    date: document.getElementById('f_date').value || todayStr(),
    name: nameEl.value.trim(),
    company: document.getElementById('f_company').value.trim(),
    contact: contactNumberEl.value.trim() ? (getContactCode()+' '+contactNumberEl.value.replace(/\D/g,'')) : '',
    email: document.getElementById('f_email').value.trim(),
    source: document.getElementById('f_source').value.trim(),
    type: document.getElementById('f_type').value,
    otherType: document.getElementById('f_otherType').value.trim(),
    query: document.getElementById('f_query').value.trim(),
    assignedTo: document.getElementById('f_assigned').value,
    status: document.getElementById('f_status').value,
    nextFollowUpDate: document.getElementById('f_nextFollowUp').value || '',
    lastConnectDate: document.getElementById('f_lastConnect').value || '',
    lastCallDiscussion: document.getElementById('f_lastCallDiscussion').value.trim(),
    updatedAt: new Date().toISOString()
  };
  if(id){
    leads = leads.map(l=> l.id===id ? lead : l);
  } else {
    leads.push(lead);
  }
  await saveLeads();
  renderTable(); renderSummary();
  clearForm();
  closeLeadModal();
};

document.getElementById('addTeamBtn').onclick = async ()=>{
  const inp = document.getElementById('teamInput');
  const name = inp.value.trim();
  if(!name) return;
  if(!team.includes(name)) team.push(name);
  inp.value='';
  await saveTeam(); renderTeam();
};
document.getElementById('teamInput').addEventListener('keydown', e=>{ if(e.key==='Enter') document.getElementById('addTeamBtn').click(); });

['filterType','filterStatus','filterAssigned','filterSearch'].forEach(id=>{
  document.getElementById(id).addEventListener('input', renderTable);
  document.getElementById(id).addEventListener('change', renderTable);
});

// Wipes every lead (e.g. clearing out the seeded dummy data before real use) — ignores
// active filters and always removes everything, unlike the export buttons above it.
document.getElementById('deleteAllBtn').onclick = async ()=>{
  if(!leads.length){ alert('There are no leads to delete.'); return; }
  const confirmed = confirm(`Delete ALL ${leads.length} lead(s) from this table? This cannot be undone.`);
  if(!confirmed) return;
  leads = [];
  await saveLeads();
  renderTable();
  renderSummary();
};

/* ---- Collapsible sections ---- */
function openSection(key){
  document.getElementById('body_'+key).classList.remove('collapsed');
  document.getElementById('chev_'+key).classList.add('open');
}
function toggleSection(key){
  const body = document.getElementById('body_'+key);
  const chev = document.getElementById('chev_'+key);
  body.classList.toggle('collapsed');
  chev.classList.toggle('open');
}
document.getElementById('head_team').onclick = ()=> toggleSection('team');
document.getElementById('head_summary').onclick = ()=> toggleSection('summary');
document.getElementById('head_add').onclick = ()=>{ clearForm(); openLeadModal(); };
document.getElementById('head_ai').onclick = ()=> toggleSection('ai');
document.getElementById('head_table').onclick = ()=> toggleSection('table');

/* ---- AI extraction (only works inside Claude.ai) ---- */
async function extractFromClaude(contentBlocks){
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      model:"claude-sonnet-4-6",
      max_tokens:1000,
      messages:[{
        role:"user",
        content:[
          ...contentBlocks,
          {type:"text", text:"Extract lead details from the above. Respond ONLY with raw JSON, no markdown fences, no preamble, in exactly this shape: {\"name\":\"\",\"company\":\"\",\"contact\":\"\",\"email\":\"\",\"source\":\"\",\"query\":\"\"}. For source, put where this lead came from (e.g. Instagram, WhatsApp, email) if identifiable. Use empty string for anything not found."}
        ]
      }]
    })
  });
  const data = await res.json();
  const textBlock = (data.content||[]).find(b=>b.type==='text');
  if(!textBlock) throw new Error('No response');
  const clean = textBlock.text.replace(/```json|```/g,'').trim();
  return JSON.parse(clean);
}

function applyExtracted(obj){
  openLeadModal();
  if(obj.name){ document.getElementById('f_name').value = obj.name; document.getElementById('f_name').classList.remove('invalid'); }
  if(obj.company) document.getElementById('f_company').value = obj.company;
  if(obj.contact){
    const parsedContact = parseContactValue(obj.contact);
    contactCodeEl.value = parsedContact.code;
    contactCodeCustomEl.value = parsedContact.custom;
    contactCodeCustomEl.style.display = parsedContact.code==='other' ? 'inline-block' : 'none';
    contactNumberEl.value = parsedContact.number;
    contactCodeDropdown.syncLabel();
    setFieldError('field_contact', 'err_contact', '');
  }
  if(obj.email) document.getElementById('f_email').value = obj.email;
  if(obj.source) document.getElementById('f_source').value = obj.source;
  if(obj.query) document.getElementById('f_query').value = obj.query;
  window.scrollTo({top:0,behavior:'smooth'});
}

const dropZone = document.getElementById('dropZone');
const imgInput = document.getElementById('imgInput');
dropZone.onclick = ()=> imgInput.click();
dropZone.ondragover = e=>{ e.preventDefault(); dropZone.style.background='var(--pink-bg)'; };
dropZone.ondragleave = ()=> dropZone.style.background='var(--pink-bg2)';
dropZone.ondrop = e=>{ e.preventDefault(); dropZone.style.background='var(--pink-bg2)'; if(e.dataTransfer.files[0]) handleImage(e.dataTransfer.files[0]); };
imgInput.onchange = ()=>{ if(imgInput.files[0]) handleImage(imgInput.files[0]); };

function handleImage(file){
  const aiMsg = document.getElementById('aiMsg');
  if(!hasCloudStorage){
    aiMsg.innerHTML = '<div class="msg err">This feature only works when the dashboard is opened inside Claude.ai.</div>';
    return;
  }
  aiMsg.innerHTML = '<div class="msg info">Reading image...</div>';
  const reader = new FileReader();
  reader.onload = async ()=>{
    try{
      const base64 = reader.result.split(',')[1];
      const mediaType = file.type || 'image/png';
      const obj = await extractFromClaude([{type:"image", source:{type:"base64", media_type:mediaType, data:base64}}]);
      applyExtracted(obj);
      aiMsg.innerHTML = '<div class="msg ok">Details extracted â review and save above.</div>';
    }catch(e){
      aiMsg.innerHTML = '<div class="msg err">Could not read the image. Try again or enter details manually.</div>';
    }
  };
  reader.readAsDataURL(file);
}

document.getElementById('parseTranscriptBtn').onclick = async ()=>{
  const aiMsg = document.getElementById('aiMsg');
  if(!hasCloudStorage){
    aiMsg.innerHTML = '<div class="msg err">This feature only works when the dashboard is opened inside Claude.ai.</div>';
    return;
  }
  const text = document.getElementById('transcriptInput').value.trim();
  if(!text){ aiMsg.innerHTML = '<div class="msg err">Paste some text first.</div>'; return; }
  aiMsg.innerHTML = '<div class="msg info">Reading transcript...</div>';
  try{
    const obj = await extractFromClaude([{type:"text", text:text}]);
    applyExtracted(obj);
    aiMsg.innerHTML = '<div class="msg ok">Details extracted â review and save above.</div>';
  }catch(e){
    aiMsg.innerHTML = '<div class="msg err">Could not parse the text. Try entering details manually.</div>';
  }
};

/* ---- CSV / Excel / PDF export of the currently filtered "All leads" table ---- */
function leadExportRow(l){
  const typeLabel = l.type==='Others' && l.otherType ? `Others: ${l.otherType}` : (l.type||'');
  return {
    'Date': l.date||'',
    'Name': l.name||'',
    'Company': l.company||'',
    'Contact': l.contact||'',
    'Email': l.email||'',
    'Source': l.source||'',
    'Type': typeLabel,
    'Query': l.query||'',
    'Assigned To': l.assignedTo||'',
    'Current Status': l.status||'',
    'Next Follow-up': l.nextFollowUpDate||'',
    'Last Connect Date': l.lastConnectDate||'',
    'Last Call Discussion': l.lastCallDiscussion||'',
  };
}

function downloadBlob(content, filename, mime){
  const blob = new Blob([content], {type: mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=> URL.revokeObjectURL(url), 1000);
}

function csvCell(v){
  const s = String(v==null ? '' : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
}

// Dynamically loads a CDN script exactly once (this page has no bundler/npm access, unlike
// the rest of the admin panel's Excel export which uses the `xlsx` package directly).
function loadScriptOnce(src, isAlreadyLoaded){
  return new Promise((resolve, reject)=>{
    if(isAlreadyLoaded()) return resolve();
    const existing = document.querySelector(`script[data-dyn-src="${src}"]`);
    if(existing){
      existing.addEventListener('load', ()=> resolve());
      existing.addEventListener('error', ()=> reject(new Error('Failed to load '+src)));
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.dataset.dynSrc = src;
    s.onload = ()=> resolve();
    s.onerror = ()=> reject(new Error('Failed to load '+src));
    document.head.appendChild(s);
  });
}

async function withExportButtonBusy(btn, busyLabel, fn){
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = busyLabel;
  try{ await fn(); }
  finally{ btn.disabled = false; btn.textContent = original; }
}

function exportCsv(){
  const rows = getFilteredLeads().map(leadExportRow);
  if(!rows.length){ alert('No leads match the current filters — nothing to export.'); return; }
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')].concat(
    rows.map(r=> headers.map(h=> csvCell(r[h])).join(','))
  );
  // Leading BOM so Excel/Sheets open the UTF-8 file without mangling special characters.
  downloadBlob('﻿'+lines.join('\r\n'), `sales-tracker-leads-${todayStr()}.csv`, 'text/csv;charset=utf-8;');
}

async function exportExcel(){
  const rows = getFilteredLeads().map(leadExportRow);
  if(!rows.length){ alert('No leads match the current filters — nothing to export.'); return; }
  const btn = document.getElementById('exportExcelBtn');
  await withExportButtonBusy(btn, 'Preparing…', async ()=>{
    try{
      await loadScriptOnce('https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js', ()=> typeof XLSX !== 'undefined');
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = Object.keys(rows[0]).map(()=> ({wch:20}));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Leads');
      XLSX.writeFile(wb, `sales-tracker-leads-${todayStr()}.xlsx`);
    }catch(e){
      alert('Could not load the Excel export library — check your internet connection and try again.');
    }
  });
}

async function exportPdf(){
  const rows = getFilteredLeads().map(leadExportRow);
  if(!rows.length){ alert('No leads match the current filters — nothing to export.'); return; }
  const btn = document.getElementById('exportPdfBtn');
  await withExportButtonBusy(btn, 'Preparing…', async ()=>{
    try{
      await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', ()=> typeof window.jspdf !== 'undefined');
      await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js', ()=> !!(window.jspdf && window.jspdf.jsPDF.API.autoTable));
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation:'landscape', unit:'pt' });
      const headers = Object.keys(rows[0]);
      const body = rows.map(r=> headers.map(h=> r[h]));
      doc.setFontSize(14);
      doc.setTextColor(79,70,229);
      doc.text('Sales Tracker — Leads', 40, 30);
      doc.autoTable({
        head:[headers], body, startY:45,
        styles:{fontSize:7, cellPadding:4, overflow:'linebreak'},
        headStyles:{fillColor:[99,102,241], textColor:255},
        columnStyles:{7:{cellWidth:160}, 12:{cellWidth:140}},
      });
      doc.save(`sales-tracker-leads-${todayStr()}.pdf`);
    }catch(e){
      alert('Could not load the PDF export library — check your internet connection and try again.');
    }
  });
}

document.getElementById('exportCsvBtn').onclick = exportCsv;
document.getElementById('exportExcelBtn').onclick = exportExcel;
document.getElementById('exportPdfBtn').onclick = exportPdf;

clearForm();
loadAll();
