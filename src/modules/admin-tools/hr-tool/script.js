const TODAY = "2026-08-05";

/* ---------------------------------------------------------
   In-memory data store (no backend — resets on reload)
--------------------------------------------------------- */
const state = {
  role: null,
  view: "dashboard",
  currentUser: null,

  // Teams — each has one Reporting Manager (by employee name). HR can add/remove from Rules & Org Structure.
  teams: [
    { name: "Leadership", manager: null },
    { name: "Content", manager: "Vikram Seth" },
    { name: "Partnerships & BD", manager: "Kunal Verma" },
  ],

  // Org Structure — HR-managed master lists. Every dropdown across the tool (onboarding, expenses, leave) pulls from here.
  orgStructure: {
    designations: [
      "Founder & CEO", "Co-founder & COO", "People Ops Head", "Content Lead", "Senior Content Writer", "Content Writer",
      "Video Editor", "Graphic Designer", "Social Media Executive", "Partnerships Lead", "BD Associate", "Tech Lead"
    ],
    expenseCategories: ["Travel", "Meals", "Office Supplies", "Client Entertainment", "Software/Subscription", "Other"],
    requiredDocuments: ["PAN Card", "Aadhar", "Education Certificates", "Previous Employment Proof", "Bank Proof"],
    holidays: [
      { date: "2026-08-15", name: "Independence Day" },
      { date: "2026-10-02", name: "Gandhi Jayanti" },
      { date: "2026-10-20", name: "Diwali" },
      { date: "2027-01-26", name: "Republic Day" },
    ],
  },

  employees: [
    { id: "E-100", name: "Rohan Kapoor", email: "rohan.kapoor@snf.co", designation: "Founder & CEO", team: "Leadership", manager: null, status: "active", doj: "2018-04-01", sysRole: "Founder", ctc: 1800000, leaveBalance: { Casual: 8, Sick: 8, Earned: 18 }, documents: [], signedDocs: [] },
    { id: "E-101", name: "Ananya Rao", email: "ananya.rao@snf.co", designation: "Senior Content Writer", team: "Content", manager: "Vikram Seth", status: "active", doj: "2022-03-14", sysRole: "Employee", ctc: 640000, leaveBalance: { Casual: 6, Sick: 8, Earned: 12 }, documents: [], signedDocs: [] },
    { id: "E-102", name: "Ravi Kulkarni", email: "ravi.k@snf.co", designation: "Video Editor", team: "Content", manager: "Vikram Seth", status: "active", doj: "2021-07-01", sysRole: "Employee", ctc: 560000, leaveBalance: { Casual: 4, Sick: 5, Earned: 9 }, documents: [], signedDocs: [] },
    { id: "E-103", name: "Meera Iyer", email: "meera.iyer@snf.co", designation: "Social Media Executive", team: "Partnerships & BD", manager: "Kunal Verma", status: "probation", doj: "2026-06-01", sysRole: "Employee", ctc: 380000, leaveBalance: { Casual: 0, Sick: 2, Earned: 0 }, documents: [], signedDocs: [] },
    { id: "E-104", name: "Vikram Seth", email: "vikram.seth@snf.co", designation: "Content Lead", team: "Content", manager: null, status: "active", doj: "2019-11-20", sysRole: "Reporting Manager", ctc: 920000, leaveBalance: { Casual: 7, Sick: 6, Earned: 15 }, documents: [], signedDocs: [] },
    { id: "E-105", name: "Divya Menon", email: "divya.menon@snf.co", designation: "People Ops Head", team: "Leadership", manager: null, status: "active", doj: "2020-01-15", sysRole: "HR Head", ctc: 980000, leaveBalance: { Casual: 5, Sick: 7, Earned: 10 }, documents: [], signedDocs: [] },
    { id: "E-106", name: "Arjun Nair", email: "arjun.nair@snf.co", designation: "Graphic Designer", team: "Content", manager: "Vikram Seth", status: "exited", doj: "2020-05-10", sysRole: "Employee", ctc: 520000, leaveBalance: { Casual: 0, Sick: 0, Earned: 0 }, documents: [], signedDocs: [] },
    { id: "E-107", name: "Priya Chandran", email: "priya.chandran@snf.co", designation: "Content Writer", team: "Content", manager: "Vikram Seth", status: "onboarding", doj: "2026-07-29", sysRole: "Employee", ctc: 520000, leaveBalance: { Casual: 0, Sick: 0, Earned: 0 }, documents: [], signedDocs: [] },
    { id: "E-108", name: "Sanjay Bhatt", email: "sanjay.bhatt@snf.co", designation: "BD Associate", team: "Partnerships & BD", manager: "Kunal Verma", status: "onboarding", doj: "2026-07-26", sysRole: "Employee", ctc: 420000, leaveBalance: { Casual: 0, Sick: 0, Earned: 0 }, documents: [], signedDocs: [] },
    { id: "E-109", name: "Kunal Verma", email: "kunal.verma@snf.co", designation: "Partnerships Lead", team: "Partnerships & BD", manager: null, status: "active", doj: "2020-09-01", sysRole: "Reporting Manager", ctc: 860000, leaveBalance: { Casual: 6, Sick: 6, Earned: 14 }, documents: [], signedDocs: [] },
  ],

  // Onboarding pipeline — offer sent -> signed (login issued) -> doc upload -> HR review -> agreement drafted/signed -> complete
  onboarding: [
    {
      id: "O-1", name: "Priya Chandran", personalEmail: "priya.chandran@gmail.com", designation: "Content Writer", team: "Content", ctc: 520000, stage: "doc_review",
      offerSentDate: "2026-07-28", signedDate: "2026-07-29", uploadDeadline: "2026-08-05", employeeId: "E-107", agreementStage: "not_started",
      docs: [
        { name: "PAN Card", status: "pending" }, { name: "Aadhar", status: "approved" }, { name: "Education Certificates", status: "pending" }, { name: "Previous Employment Proof", status: "pending" }, { name: "Bank Proof", status: "approved" }
      ]
    },
    {
      id: "O-2", name: "Sanjay Bhatt", personalEmail: "sanjay.bhatt@gmail.com", designation: "BD Associate", team: "Partnerships & BD", ctc: 420000, stage: "doc_review",
      offerSentDate: "2026-07-25", signedDate: "2026-07-26", uploadDeadline: "2026-08-02", employeeId: "E-108", agreementStage: "pending_employee_signature",
      docs: [
        { name: "PAN Card", status: "approved" }, { name: "Aadhar", status: "approved" }, { name: "Education Certificates", status: "approved" }, { name: "Previous Employment Proof", status: "approved" }, { name: "Bank Proof", status: "approved" }
      ]
    },
    {
      id: "O-3", name: "Kavita Rao", personalEmail: "kavita.rao@gmail.com", designation: "Social Media Executive", team: "Partnerships & BD", ctc: 380000, stage: "awaiting_signature",
      offerSentDate: "2026-08-03", signedDate: null, uploadDeadline: null, employeeId: null, agreementStage: "not_started", docs: []
    },
  ],

  attendance: [
    { emp: "Ananya Rao", date: "2026-08-04", status: "Present", inTime: "09:02", outTime: "18:05" },
    { emp: "Ravi Kulkarni", date: "2026-08-04", status: "Present", inTime: "08:58", outTime: "17:59" },
    { emp: "Meera Iyer", date: "2026-08-04", status: "Missed Punch", inTime: "09:10", outTime: "—" },
  ],

  // Two-level approval: stage "rm" (awaiting reporting manager) -> "hr" (RM-cleared, awaiting HR) -> "done"
  regularizations: [
    { id: "R-1", emp: "Meera Iyer", date: "2026-08-04", reason: "Forgot to punch out", stage: "rm", status: "pending", rmRemarks: "", hrRemarks: "" },
    { id: "R-2", emp: "Ravi Kulkarni", date: "2026-08-03", reason: "System/network issue", stage: "hr", status: "pending", rmRemarks: "Confirmed with Vikram — approved.", hrRemarks: "" },
  ],
  leaveRequests: [
    { id: "L-1", emp: "Ravi Kulkarni", type: "Casual", from: "2026-08-12", to: "2026-08-12", remarks: "Family function", stage: "rm", status: "pending", rmRemarks: "", hrRemarks: "" },
    { id: "L-2", emp: "Ananya Rao", type: "Earned", from: "2026-08-20", to: "2026-08-22", remarks: "", stage: "done", status: "approved", rmRemarks: "Approved.", hrRemarks: "Approved." },
  ],
  expenses: [
    { id: "X-1", emp: "Divya Menon", category: "Travel", amount: 1450, stage: "hr", status: "pending", rmRemarks: "", hrRemarks: "" },
    { id: "X-2", emp: "Vikram Seth", category: "Client Entertainment", amount: 2200, stage: "done", status: "approved", rmRemarks: "", hrRemarks: "Approved." },
    { id: "X-3", emp: "Meera Iyer", category: "Office Supplies", amount: 640, stage: "rm", status: "pending", rmRemarks: "", hrRemarks: "" },
  ],

  tickets: [
    { id: "T-1", emp: "Meera Iyer", category: "Leave Query", status: "open", note: "Why is my probation leave balance zero?" },
    { id: "T-2", emp: "Ravi Kulkarni", category: "Payroll Query", status: "progress", note: "August payslip shows wrong HRA." },
  ],
  compliance: [
    { task: "Monthly TDS deposit", due: "2026-08-07", status: "upcoming" },
    { task: "Professional Tax payment", due: "2026-08-20", status: "upcoming" },
    { task: "POSH IC quarterly review", due: "2026-09-15", status: "upcoming" },
    { task: "Form 16 issuance (annual)", due: "2027-06-15", status: "scheduled" },
    { task: "Gratuity liability review", due: "2026-10-01", status: "scheduled" },
  ],
  payrollRun: { month: "August 2026", status: "not_run" },
  attendanceOverrides: {}, // key "empName|date" -> manually corrected status (present/absent/leave/off)
  // Real-clock punch in/out state, keyed by employee name — separate from the simulated
  // TODAY used everywhere else, since "disable until 11:59 PM" needs an actual clock.
  punchLog: {},

  templates: {
    "Offer Letter": { content: "Dear {{employee_name}},\n\nWe are pleased to offer you the position of {{designation}} in the {{team}} team at DOTFYI Media Ventures Pvt. Ltd. (StartupNews.fyi), with an annual CTC of {{ctc}}.\n\nPlease review and sign below to confirm your acceptance." },
    "Employment Agreement": { content: "This Employment Agreement is entered into between DOTFYI Media Ventures Pvt. Ltd. and {{employee_name}}, appointed as {{designation}} in the {{team}} team, effective {{doj}}.\n\nAnnual CTC: {{ctc}} — Basic {{basic}}, HRA {{hra}}, Allowances {{allowances}}.\n\nStandard SNF terms of employment apply." },
    "Relieving Letter": { content: "" },
    "Experience Letter": { content: "" },
    "Increment Letter": { content: "" },
    "Promotion Letter": { content: "" },
    "Warning Letter": { content: "" },
  },

  rules: {
    workingDaysPattern: "Mon–Sat, alternate Saturdays off",
    // Official punch-in/punch-out window — editable by HR Head from Rules & Org Structure.
    shiftStartTime: "10:00",
    shiftEndTime: "19:00",
    shiftGraceMinutes: 15,
    halfDayThresholdHours: 4,
    regularizationWindowDays: 5,
    regularizationOverride: false,
    salaryPeriodFrom: 1,
    salaryPeriodTo: "last",
    ctcSplit: { basic: 50, hra: 20, allowances: 30 },
    leaveTypes: {
      "Casual": true, "Sick": true, "Earned": true, "Maternity": true, "Paternity": true, "Comp-off": true,
    },
    twoLevelApproval: { leave: true, attendance: true, expense: true },
    lateMarkPenalty: false,
    geoFencing: false,
    selfieCheckin: false,
    pfEsi: false,
    optionalHolidayChoice: true,
    assetChecklist: true,
  },
  auditLog: [
    { ts: "2026-08-01 10:12", who: "Divya Menon (HR Head)", change: "Enabled two-level approval for Leave, Attendance, Expense" },
    { ts: "2026-07-20 15:40", who: "Divya Menon (HR Head)", change: "Set regularization window to 5 days" },
  ],
};

function initials(name) { return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase(); }
function isAdmin(role) { return role === "HR Head" || role === "Founder"; }
function statusBadge(s) {
  const map = { active: "active", probation: "probation", exited: "exited", onboarding: "onboarding", pending: "pending", approved: "approved", rejected: "rejected", open: "open", progress: "progress", resolved: "resolved", not_uploaded: "notuploaded" };
  const labels = { not_uploaded: "Not uploaded" };
  const key = s.toLowerCase().replace(" ", "");
  const cls = map[key] || map[s] || "pending";
  const label = labels[s] || s;
  return `<span class="badge ${cls}">${label}</span>`;
}
function approvalBadge(req) {
  if (req.status === "rejected") return `<span class="badge rejected">Rejected</span>`;
  if (req.stage === "done" && req.status === "approved") return `<span class="badge approved">Approved</span>`;
  if (req.stage === "rm") return `<span class="badge rmpending">Pending — Manager</span>`;
  if (req.stage === "hr") return `<span class="badge hrpending">Pending — HR</span>`;
  return `<span class="badge pending">Pending</span>`;
}
function empByName(name) { return state.employees.find(e => e.name === name); }
function rmOf(name) { const e = empByName(name); return e ? e.manager : null; }
function mergeTemplate(content, data) {
  return (content || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (data[k] !== undefined ? data[k] : m));
}
function downloadDoc(filename, content) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function pendingEmployeeDocUpdates() {
  return state.employees.filter(e => e.status !== "exited" && e.status !== "onboarding" && (e.documents || []).some(d => d.status === "pending"));
}
function salaryPeriodLabel() {
  const f = state.rules.salaryPeriodFrom;
  const t = state.rules.salaryPeriodTo;
  return f + " to " + (t === "last" ? "last day of the month" : t);
}
function shiftTimingsLabel() {
  const r = state.rules;
  return `${r.shiftStartTime}–${r.shiftEndTime} · ${r.shiftGraceMinutes} min grace · half-day below ${r.halfDayThresholdHours} hrs`;
}
/* Export helpers — CSV needs no library; Excel uses SheetJS (loaded via CDN) */
function toCSV(rows) {
  return rows.map(r => r.map(c => {
    const s = String(c === null || c === undefined ? "" : c);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(",")).join("\n");
}
function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function exportCSV(filename, rows) { downloadBlob(filename, toCSV(rows), "text/csv"); }
function exportExcel(filename, rows) {
  if (typeof XLSX === "undefined") { alert("Excel export library didn't load — try CSV instead, or check your connection."); return; }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filename);
}

/* ---------------------------------------------------------
   Router
--------------------------------------------------------- */
const views = {
  dashboard: renderDashboard, directory: renderDirectory, onboarding: renderOnboarding, offboarding: renderOffboarding,
  attendance: renderAttendance, leave: renderLeave, payroll: renderPayroll, expenses: renderExpenses,
  compliance: renderCompliance, posh: renderPosh, helpdesk: renderHelpdesk, company: renderCompany, rules: renderRules,
  documents: renderDocuments,
};
const viewAccess = {
  dashboard: ["HR Head", "Founder", "Reporting Manager", "Employee"],
  directory: ["HR Head", "Founder", "Reporting Manager"],
  onboarding: ["HR Head", "Founder"],
  offboarding: ["HR Head", "Founder"],
  attendance: ["HR Head", "Founder", "Reporting Manager", "Employee"],
  leave: ["HR Head", "Founder", "Reporting Manager", "Employee"],
  payroll: ["HR Head", "Founder", "Employee"],
  expenses: ["HR Head", "Founder", "Reporting Manager", "Employee"],
  compliance: ["HR Head", "Founder"],
  posh: ["HR Head", "Founder"],
  helpdesk: ["HR Head", "Founder", "Reporting Manager", "Employee"],
  company: ["HR Head", "Founder"],
  rules: ["HR Head", "Founder"],
  documents: ["HR Head", "Founder", "Reporting Manager", "Employee"],
};
function setView(v) {
  state.view = v;
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === v));
  render();
}
document.querySelectorAll(".nav-item").forEach(b => { b.addEventListener("click", () => setView(b.dataset.view)); });
document.getElementById("logoutBtn").addEventListener("click", () => {
  state.currentUser = null; state.role = null; state.view = "dashboard";
  showLogin();
});
function applyNavAccess() {
  document.querySelectorAll(".nav-item[data-view]").forEach(b => {
    const allowed = viewAccess[b.dataset.view].includes(state.role);
    b.style.display = allowed ? "" : "none";
  });
  document.querySelectorAll(".nav-group-label").forEach(label => {
    let el = label.nextElementSibling, anyVisible = false;
    while (el && el.classList.contains("nav-item")) {
      if (el.style.display !== "none") anyVisible = true;
      el = el.nextElementSibling;
    }
    label.style.display = anyVisible ? "" : "none";
  });
  document.getElementById("whoAmI").textContent = state.currentUser ? `${state.currentUser.name} · ${state.role}` : "—";
}
function pendingCountFor(view) {
  if (!state.currentUser) return 0;
  const role = state.role, me = state.currentUser;
  if (view === 'onboarding' && isAdmin(role)) {
    const docReview = state.onboarding.some(o => o.docs.some(d => d.status === 'pending'));
    const agreementReview = state.onboarding.some(o => o.agreementStage === 'pending_employer_signature');
    const docUpdates = pendingEmployeeDocUpdates().length > 0;
    return (docReview || agreementReview || docUpdates) ? 1 : 0;
  }
  if (view === 'attendance') {
    return scopedApprovals(state.regularizations).filter(r => r.status === 'pending' && ((role === 'Reporting Manager' && r.stage === 'rm' && rmOf(r.emp) === me.name) || (isAdmin(role) && r.stage === 'hr'))).length;
  }
  if (view === 'leave') {
    return scopedApprovals(state.leaveRequests).filter(l => l.status === 'pending' && ((role === 'Reporting Manager' && l.stage === 'rm' && rmOf(l.emp) === me.name) || (isAdmin(role) && l.stage === 'hr'))).length;
  }
  if (view === 'expenses') {
    return scopedApprovals(state.expenses).filter(x => x.status === 'pending' && ((role === 'Reporting Manager' && x.stage === 'rm' && rmOf(x.emp) === me.name) || (isAdmin(role) && x.stage === 'hr'))).length;
  }
  if (view === 'documents' && role === 'Employee') {
    const rejected = (me.documents || []).some(d => d.status === 'rejected');
    const ob = me.status === 'onboarding' ? myOnboardingRecord() : null;
    const needsSign = ob && ob.agreementStage === 'pending_employee_signature';
    return (rejected || needsSign) ? 1 : 0;
  }
  return 0;
}
function updateNavBadges() {
  document.querySelectorAll(".nav-item[data-view]").forEach(b => {
    let dot = b.querySelector(".nav-dot");
    const count = pendingCountFor(b.dataset.view);
    if (count > 0) {
      if (!dot) { dot = document.createElement("span"); dot.className = "nav-dot"; b.appendChild(dot); }
    } else if (dot) { dot.remove(); }
  });
}
function render() {
  if (!state.currentUser) { showLogin(); return; }
  if (!viewAccess[state.view].includes(state.role)) state.view = "dashboard";
  applyNavAccess();
  updateNavBadges();
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === state.view));
  const main = document.getElementById("main");
  main.innerHTML = "";
  views[state.view]();
}

/* ---------------------------------------------------------
   LOGIN
--------------------------------------------------------- */
function showLogin() {
  document.querySelector(".app").style.display = "none";
  const loginable = state.employees.filter(e => e.status !== "exited");
  document.getElementById("loginRoot").innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#FFF 0%,#EEF2FF 60%,#C7D2FE 100%);padding:20px;">
      <div style="width:100%;max-width:380px;">
        <div style="display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:22px;">
          <div style="width:34px;height:34px;border-radius:9px;background:var(--forest);display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Space Grotesk';font-weight:700;">H</div>
          <div style="font-family:'Space Grotesk';font-weight:700;font-size:21px;color:var(--ink);">Huey</div>
        </div>
        <div class="card pad">
          <h3 style="margin:0 0 4px;font-size:16px;">Log in</h3>
          <div class="meta" style="margin-bottom:16px;">Enter your Employee ID. In production this pairs with a password/OTP and looks up your account on a real server.</div>
          <div class="field">
            <label class="field-label">Employee ID</label>
            <input type="text" id="loginId" placeholder="e.g. E-101" list="empIdList">
            <datalist id="empIdList">${loginable.map(e => `<option value="${e.id}">${e.name} · ${e.sysRole}</option>`).join("")}</datalist>
          </div>
          <div class="field">
            <label class="field-label">Password</label>
            <input type="text" placeholder="Any value works in this preview" value="••••••••">
          </div>
          <div id="loginError" class="notice" style="display:none;background:var(--red-soft);border-color:#FECACA;color:var(--red);"></div>
          <button class="btn primary" style="width:100%;justify-content:center;" onclick="doLogin()">Log in →</button>
        </div>
        <div class="footnote" style="text-align:center;">
          Demo IDs: E-105 HR Head · E-104 Reporting Manager (Content) · E-109 Reporting Manager (Partnerships &amp; BD) · E-101 Employee · E-107 New joinee (mid document upload)<br><br>
          Received an offer letter? <a href="#" onclick="openSignOffer();return false;" style="color:var(--forest);font-weight:600;">Sign it and get your login →</a>
        </div>
      </div>
    </div>
  `;
}
function doLogin() {
  const id = document.getElementById("loginId").value.trim().toUpperCase();
  const emp = state.employees.find(e => e.id.toUpperCase() === id && e.status !== "exited");
  const errBox = document.getElementById("loginError");
  if (!emp) {
    errBox.style.display = "block";
    errBox.textContent = "We couldn't find an active account with that Employee ID. Check the ID or use one of the demo IDs below.";
    return;
  }
  state.currentUser = emp; state.role = emp.sysRole; state.view = "dashboard";
  document.getElementById("loginRoot").innerHTML = "";
  document.querySelector(".app").style.display = "";
  render();
}

/* ---------------------------------------------------------
   OFFER LETTER E-SIGN (pre-login — candidate previews, then signs)
--------------------------------------------------------- */
function daysLeft(deadline) {
  if (!deadline) return null;
  const ms = new Date(deadline + "T23:59:59") - new Date(TODAY);
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
function addDays(dateStr, n) { const d = new Date(dateStr); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function openSignOffer() {
  const pending = state.onboarding.filter(o => o.stage === "awaiting_signature");
  document.getElementById("loginRoot").innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#FFF 0%,#EEF2FF 60%,#C7D2FE 100%);padding:20px;">
      <div style="width:100%;max-width:460px;">
        <div style="display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:22px;">
          <div style="width:34px;height:34px;border-radius:9px;background:var(--forest);display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Space Grotesk';font-weight:700;">H</div>
          <div style="font-family:'Space Grotesk';font-weight:700;font-size:21px;color:var(--ink);">Huey</div>
        </div>
        <div class="card pad">
          <h3 style="margin:0 0 4px;font-size:16px;">Sign your offer letter</h3>
          <div class="meta" style="margin-bottom:16px;">In production this page opens from a unique link HR emails to your personal address. Pick your name below for this preview.</div>
          <div class="field"><label class="field-label">Your name</label>
            <select id="ofrPick" onchange="renderOfferPreview()">
              <option value="">— Select —</option>
              ${pending.map(o => `<option value="${o.id}">${o.name} · ${o.designation}</option>`).join("")}
            </select>
          </div>
          <div id="offerPreview"></div>
        </div>
        <div class="footnote" style="text-align:center;"><a href="#" onclick="showLogin();return false;" style="color:var(--forest);font-weight:600;">← Back to login</a></div>
      </div>
    </div>
  `;
}
function renderOfferPreview() {
  const id = document.getElementById("ofrPick").value;
  const box = document.getElementById("offerPreview");
  if (!id) { box.innerHTML = ""; return; }
  const o = state.onboarding.find(x => x.id === id);
  const tmpl = state.templates["Offer Letter"];
  box.innerHTML = `
    <div class="notice info" style="margin-top:14px;">
      <div><strong>Preview — generated from "${tmpl || 'default'}" template</strong><br>
      <strong>${o.name}</strong> — offer for <strong>${o.designation}</strong>, ${o.team}<br>
      Annual CTC: ₹${o.ctc.toLocaleString("en-IN")} · Offer sent ${o.offerSentDate}<br>
      By signing, you accept the terms of employment. HR will then generate your Employee ID and login — you'll have <strong>7 days from signing</strong> to upload your onboarding documents.</div>
    </div>
    <button class="btn primary" style="width:100%;justify-content:center;margin-top:6px;" onclick="signOffer('${o.id}')">✓ Confirm, looks correct — sign offer letter</button>
  `;
}
function signOffer(id) {
  const o = state.onboarding.find(x => x.id === id);
  const today = TODAY;
  o.signedDate = today; o.uploadDeadline = addDays(today, 7); o.stage = "doc_upload";
  o.docs = state.orgStructure.requiredDocuments.map(name => ({ name, status: "not_uploaded" }));
  const newId = "E-" + (100 + state.employees.length + 1);
  o.employeeId = newId;
  const teamManager = (state.teams.find(t => t.name === o.team) || {}).manager || null;
  const offerMerged = mergeTemplate(state.templates["Offer Letter"].content, { employee_name: o.name, designation: o.designation, team: o.team, ctc: "₹" + o.ctc.toLocaleString("en-IN") });
  state.employees.push({ id: newId, name: o.name, email: o.name.toLowerCase().replace(/\s+/g, ".") + "@snf.co", designation: o.designation, team: o.team, manager: teamManager, status: "onboarding", doj: today, sysRole: "Employee", ctc: o.ctc, leaveBalance: { Casual: 0, Sick: 0, Earned: 0 }, documents: [], signedDocs: [{ type: "Offer Letter", content: offerMerged, signedDate: today }] });
  document.getElementById("loginRoot").innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#FFF 0%,#EEF2FF 60%,#C7D2FE 100%);padding:20px;">
      <div class="card pad" style="max-width:420px;text-align:center;">
        <div style="font-size:34px;margin-bottom:10px;">✓</div>
        <h3 style="margin:0 0 8px;">Offer signed, ${o.name.split(" ")[0]}!</h3>
        <div class="meta" style="margin-bottom:14px;">Your Employee ID is <strong>${newId}</strong>. In production this and a password are shared with you directly through the portal — not by email. Log in now — you have <strong>7 days</strong> (until ${o.uploadDeadline}) to upload your documents for HR review.</div>
        <button class="btn primary" onclick="showLogin()">Go to login →</button>
      </div>
    </div>
  `;
}

function pageHead(title, sub) {
  return `<div class="topbar">
    <div><h1 class="page-title">${title}</h1><div class="page-sub">${sub}</div></div>
    <div class="as-role">${state.currentUser ? state.currentUser.name : ""} · ${state.role}</div>
  </div>`;
}

/* ---------------------------------------------------------
   DASHBOARD — clickable KPI tiles, scoped by role
--------------------------------------------------------- */
function statTile(label, num, note, view) {
  return `<div class="card pad clickable" onclick="setView('${view}')"><div class="stat-label">${label}</div><div class="stat-num">${num}</div><div class="stat-note">${note}</div></div>`;
}
function renderDashboard() {
  if (state.role === "Employee") { renderEmployeeDashboard(); return; }
  if (state.role === "Reporting Manager") { renderManagerDashboard(); return; }

  const active = state.employees.filter(e => e.status === "active").length;
  const probation = state.employees.filter(e => e.status === "probation").length;
  const pendingLeaveHR = state.leaveRequests.filter(l => l.stage === "hr" && l.status === "pending").length;
  const pendingLeaveRM = state.leaveRequests.filter(l => l.stage === "rm" && l.status === "pending").length;
  const pendingOnboard = state.onboarding.length;
  const pendingReg = state.regularizations.filter(r => r.status === "pending").length;
  const pendingExp = state.expenses.filter(x => x.status === "pending").length;
  const probationSoon = state.employees.filter(e => e.status === "probation");

  document.getElementById("main").innerHTML = `
    ${pageHead("Dashboard", "A quick read on what needs your attention today. Every number below is clickable.")}
    <div class="grid grid-4" style="margin-bottom:16px;">
      ${statTile("Active Employees", active, probation + " on probation", "directory")}
      ${statTile("Pending Onboarding", pendingOnboard, "awaiting document/agreement approval", "onboarding")}
      ${statTile("Pending Regularizations", pendingReg, "across manager + HR review", "attendance")}
      ${statTile("Payroll Cycle", state.payrollRun.month, state.payrollRun.status === "not_run" ? "not yet run" : "completed", "payroll")}
    </div>
    <div class="grid grid-4" style="margin-bottom:26px;">
      ${statTile("Leave — awaiting HR", pendingLeaveHR, "RM-cleared, needs your action", "leave")}
      ${statTile("Leave — awaiting Manager", pendingLeaveRM, "not yet reached HR", "leave")}
      ${statTile("Pending Expense Approvals", pendingExp, "across manager + HR review", "expenses")}
      ${statTile("Probation ending soon", probationSoon.length, "review confirmation", "directory")}
    </div>
    <section class="block">
      <div class="block-head"><h2>Upcoming compliance due dates</h2><button class="btn ghost sm" onclick="setView('compliance')">View calendar →</button></div>
      <div class="card"><table><thead><tr><th>Task</th><th>Due</th><th>Status</th></tr></thead>
        <tbody>${state.compliance.slice(0, 4).map(c => `<tr><td>${c.task}</td><td>${c.due}</td><td>${statusBadge(c.status === "upcoming" ? "pending" : "resolved")}</td></tr>`).join("")}</tbody>
      </table></div>
    </section>
    <div class="grid grid-2">
      <section class="block">
        <div class="block-head"><h2>Onboarding queue</h2><button class="btn ghost sm" onclick="setView('onboarding')">Open →</button></div>
        <div class="card pad">
          ${state.onboarding.map(o => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--line);">
              <div class="row-name"><div class="avatar">${initials(o.name)}</div><div><div>${o.name}</div><div class="meta">${o.designation}</div></div></div>
              <span class="badge pending">${stageLabel[o.stage] || o.stage}</span>
            </div>`).join("") || `<div class="empty">Nothing pending.</div>`}
        </div>
      </section>
      <section class="block">
        <div class="block-head"><h2>Helpdesk tickets</h2><button class="btn ghost sm" onclick="setView('helpdesk')">Open →</button></div>
        <div class="card pad">
          ${state.tickets.map(t => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--line);">
              <div><div>${t.emp}</div><div class="meta">${t.category}</div></div>${statusBadge(t.status)}
            </div>`).join("")}
        </div>
      </section>
    </div>
  `;
}
function renderManagerDashboard() {
  const me = state.currentUser;
  const team = state.employees.filter(e => e.team === me.team && e.status !== "exited");
  const myPendingLeave = state.leaveRequests.filter(l => l.stage === "rm" && l.status === "pending" && rmOf(l.emp) === me.name);
  const myPendingReg = state.regularizations.filter(r => r.stage === "rm" && r.status === "pending" && rmOf(r.emp) === me.name);
  const myPendingExp = state.expenses.filter(x => x.stage === "rm" && x.status === "pending" && rmOf(x.emp) === me.name);
  document.getElementById("main").innerHTML = `
    ${pageHead("Team Dashboard — " + me.team, "Your team, and the chain above you. Sibling departments aren't visible from here.")}
    <div class="grid grid-4" style="margin-bottom:26px;">
      ${statTile("Team Size", team.length, me.team + " team", "directory")}
      ${statTile("Leave — awaiting you", myPendingLeave.length, "first-level approval", "leave")}
      ${statTile("Regularizations — awaiting you", myPendingReg.length, "first-level approval", "attendance")}
      ${statTile("Expenses — awaiting you", myPendingExp.length, "first-level approval", "expenses")}
    </div>
    <section class="block">
      <div class="block-head"><h2>Your team</h2><button class="btn ghost sm" onclick="setView('directory')">Open directory →</button></div>
      <div class="card"><table><thead><tr><th>Name</th><th>Designation</th><th>Status</th></tr></thead>
        <tbody>${team.map(e => `<tr><td><div class="row-name"><div class="avatar">${initials(e.name)}</div>${e.name}</div></td><td>${e.designation}</td><td>${statusBadge(e.status)}</td></tr>`).join("")}</tbody>
      </table></div>
    </section>
    <div class="footnote">CTC and salary details are restricted to HR Head/Founder and are not visible from your view, including in the Employee Directory and Payroll.</div>
  `;
}
function myOnboardingRecord() { return state.onboarding.find(o => o.employeeId === state.currentUser.id); }
function renderEmployeeDashboard() {
  const me = state.currentUser;
  const myLeave = state.leaveRequests.filter(l => l.emp === me.name);
  const myTix = state.tickets.filter(t => t.emp === me.name);
  const myAtt = state.attendance.find(a => a.emp === me.name && a.date === TODAY);
  const ob = me.status === "onboarding" ? myOnboardingRecord() : null;
  document.getElementById("main").innerHTML = `
    ${pageHead("Welcome back, " + me.name.split(" ")[0], "Here's where things stand for you today.")}
    ${ob ? renderMyOnboardingCard(ob) : ""}
    <div class="grid grid-4" style="margin-bottom:26px;">
      <div class="card pad"><div class="stat-label">Today</div><div class="stat-num" style="font-size:19px;">${myAtt ? myAtt.status : "Not punched in"}</div><div class="stat-note">${myAtt ? myAtt.inTime + " – " + myAtt.outTime : "Punch in from Attendance"}</div></div>
      ${Object.entries(me.leaveBalance).filter(([k]) => state.rules.leaveTypes[k] !== false).map(([k, v]) => `<div class="card pad"><div class="stat-label">${k} Leave</div><div class="stat-num">${v}</div><div class="stat-note">days remaining</div></div>`).join("")}
    </div>
    <div class="grid grid-2">
      <section class="block">
        <div class="block-head"><h2>My leave requests</h2><button class="btn ghost sm" onclick="setView('leave')">Open →</button></div>
        <div class="card pad">${myLeave.map(l => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line);"><div>${l.type} · ${l.from}${l.to !== l.from ? " – " + l.to : ""}</div>${approvalBadge(l)}</div>`).join("") || `<div class="empty">No leave requests yet.</div>`}</div>
      </section>
      <section class="block">
        <div class="block-head"><h2>My helpdesk tickets</h2><button class="btn ghost sm" onclick="setView('helpdesk')">Open →</button></div>
        <div class="card pad">${myTix.map(t => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line);"><div>${t.category}</div>${statusBadge(t.status)}</div>`).join("") || `<div class="empty">No open tickets.</div>`}</div>
      </section>
    </div>
  `;
}
function renderMyOnboardingCard(o) {
  const dl = daysLeft(o.uploadDeadline);
  const approvedCount = o.docs.filter(d => d.status === "approved").length;
  const allApproved = o.docs.length && approvedCount === o.docs.length;
  const overdue = dl !== null && dl < 0 && !allApproved;
  return `
  <section class="block">
    <div class="card pad" style="border-color:${overdue ? '#FECACA' : 'var(--line)'};margin-bottom:16px;">
      <div class="block-head"><h2>Document upload — required to complete onboarding</h2>
        ${allApproved ? `<span class="badge approved">All documents approved</span>` : overdue ? `<span class="badge rejected">Upload window closed</span>` : `<span class="badge pending">${dl} day${dl === 1 ? '' : 's'} left</span>`}
      </div>
      <div class="meta" style="margin-bottom:12px;">Upload window: ${o.signedDate} – ${o.uploadDeadline}. HR Head reviews and approves each document below.</div>
      <table><thead><tr><th>Document</th><th>Status</th><th style="text-align:right;">Action</th></tr></thead>
        <tbody>${o.docs.map((d, i) => `
          <tr><td>${d.name}</td><td>${statusBadge(d.status)}</td>
            <td style="text-align:right;">
              ${(d.status === "not_uploaded" || d.status === "rejected") ? `<label class="btn sm" style="display:inline-block;">${d.status === "rejected" ? "Re-upload" : "Choose file"}<input type="file" style="display:none;" onchange="myDocUpload('${o.id}',${i})"></label>` : d.status === "pending" ? `<span class="meta">awaiting HR review</span>` : `<span class="meta">on file</span>`}
            </td>
          </tr>`).join("")}</tbody>
      </table>
    </div>
    ${o.agreementStage === "pending_employee_signature" ? `
    <div class="card pad" style="border-color:#BFDBFE;">
      <div class="block-head"><h2>Employment Agreement — your signature required</h2><span class="badge hrpending">Awaiting your signature</span></div>
      ${agreementPreviewHtml(o)}
      <button class="btn primary" style="width:100%;justify-content:center;margin-top:12px;" onclick="employeeSignAgreement('${o.id}')">✓ Confirm, looks correct — sign agreement</button>
    </div>` : o.agreementStage === "signed" || o.agreementStage === "pending_employer_signature" ? `
    <div class="notice good">You've signed your Employment Agreement. ${o.agreementStage === "signed" ? "Countersigned by HR — on file. You can download it anytime from My Documents." : "Waiting on HR's countersignature."}</div>` : ""}
  `;
}
function myDocUpload(oid, idx) {
  const o = state.onboarding.find(x => x.id === oid);
  o.docs[idx].status = "pending"; o.docs[idx].uploaded = true;
  render();
}

/* ---------------------------------------------------------
   EMPLOYEE DIRECTORY — bulk import, team-scoped for RM, CTC hidden from RM
--------------------------------------------------------- */
function visibleEmployees() {
  if (isAdmin(state.role)) return state.employees;
  if (state.role === "Reporting Manager") return state.employees.filter(e => e.team === state.currentUser.team);
  return state.employees.filter(e => e.id === state.currentUser.id);
}
function renderDirectory() {
  document.getElementById("main").innerHTML = `
    ${pageHead("Employee Directory", isAdmin(state.role) ? "Search, filter, and open any employee's full profile." : "Your team only — sibling departments aren't visible here.")}
    <div class="toolbar" style="margin-bottom:16px;justify-content:space-between;">
      <div class="toolbar">
        <input class="search" id="empSearch" type="text" placeholder="Search by name or designation">
        <select id="statusFilter" style="width:150px;">
          <option value="">All statuses</option><option value="onboarding">Onboarding</option><option value="active">Active</option><option value="probation">Probation</option><option value="exited">Exited</option>
        </select>
        <select id="teamFilter" style="width:170px;">
          <option value="">All teams</option>${state.teams.map(t => `<option>${t.name}</option>`).join("")}
        </select>
      </div>
      ${isAdmin(state.role) ? `<div class="toolbar">
        <button class="btn sm" onclick="exportDirectory('csv')">⇩ CSV</button>
        <button class="btn sm" onclick="exportDirectory('excel')">⇩ Excel</button>
        <button class="btn" onclick="openBulkImport()">⇧ Bulk import (CSV)</button>
        <button class="btn primary" onclick="openAddEmployee()">+ Send offer letter</button>
      </div>` : ""}
    </div>
    <div class="card"><table><thead><tr><th>Name</th><th>Designation</th><th>Team</th><th>Status</th><th></th></tr></thead>
      <tbody id="empRows"></tbody>
    </table></div>
  `;
  const draw = () => {
    const q = document.getElementById("empSearch").value.toLowerCase();
    const st = document.getElementById("statusFilter").value;
    const tm = document.getElementById("teamFilter").value;
    const rows = visibleEmployees().filter(e => (e.name.toLowerCase().includes(q) || e.designation.toLowerCase().includes(q)) && (!st || e.status === st) && (!tm || e.team === tm));
    document.getElementById("empRows").innerHTML = rows.map(e => `
      <tr><td><div class="row-name"><div class="avatar">${initials(e.name)}</div><div><div>${e.name}</div><div class="meta">${e.email}</div></div></div></td>
      <td>${e.designation}</td><td>${e.team}</td><td>${statusBadge(e.status)}</td>
      <td style="text-align:right;"><button class="btn ghost sm" onclick="openEmployeeProfile('${e.id}')">View profile →</button></td></tr>
    `).join("") || `<tr><td colspan="5"><div class="empty">No employees match this search.</div></td></tr>`;
  };
  document.getElementById("empSearch").addEventListener("input", draw);
  document.getElementById("statusFilter").addEventListener("change", draw);
  document.getElementById("teamFilter").addEventListener("change", draw);
  draw();
}
function exportDirectory(fmt) {
  const rows = [["Name", "Email", "Designation", "Team", "Status", "DOJ", "Annual CTC"]];
  visibleEmployees().forEach(e => rows.push([e.name, e.email, e.designation, e.team, e.status, e.doj, e.ctc]));
  if (fmt === "csv") exportCSV("employee_directory.csv", rows); else exportExcel("employee_directory.xlsx", rows);
}
function openEmployeeProfile(id) {
  const e = state.employees.find(x => x.id === id);
  const canSeeCTC = isAdmin(state.role) || state.currentUser.id === e.id;
  const buttons = [{ label: "Close", cls: "btn", action: closeModal }];
  if (isAdmin(state.role) && e.id !== state.currentUser.id) {
    buttons.unshift({ label: "Remove employee", cls: "btn reject", action: () => removeEmployeeRecord(e.id) });
  }
  if (e.status === "probation" && isAdmin(state.role)) {
    buttons.unshift({ label: "Extend probation", cls: "btn", action: () => extendProbation(e.id) });
    buttons.unshift({ label: "Confirm — move to Active", cls: "btn approve", action: () => confirmProbation(e.id) });
  }
  const cs = e.ctcSplitOverride || state.rules.ctcSplit;
  showModal(`${e.name}`, `
    <div class="field"><label class="field-label">Designation</label>${e.designation}</div>
    <div class="field"><label class="field-label">Team</label>${e.team}${e.manager ? " · reports to " + e.manager : ""}</div>
    <div class="field"><label class="field-label">Date of Joining</label>${e.doj}</div>
    <div class="field"><label class="field-label">Status</label>${statusBadge(e.status)}${e.probationExtendedBy ? ` <span class="meta">(extended by ${e.probationExtendedBy} days)</span>` : ""}</div>
    <div class="field"><label class="field-label">Annual CTC</label>${canSeeCTC ? "₹" + e.ctc.toLocaleString("en-IN") : `<span class="meta">Restricted — not visible to Reporting Managers.</span>`}</div>
    ${canSeeCTC ? `<div class="field"><label class="field-label">CTC split</label>Basic ${cs.basic}% · HRA ${cs.hra}% · Allowances ${cs.allowances}% ${e.ctcSplitOverride ? `<span class="badge pending">Custom</span>` : `<span class="meta">(company default)</span>`}
      ${isAdmin(state.role) ? `<button class="btn ghost sm" style="margin-left:6px;" onclick="editEmployeeCtcSplit('${e.id}')">Edit</button>` : ""}</div>` : ""}
    <div class="field"><label class="field-label">Leave balance</label>${Object.entries(e.leaveBalance).filter(([k]) => state.rules.leaveTypes[k] !== false).map(([k, v]) => `<span class="badge active" style="margin-right:6px;">${k}: ${v}</span>`).join("")}</div>
    <div class="field"><label class="field-label">Document vault</label><span class="meta">Restricted — visible only to HR Head/Founder and the employee.</span></div>
  `, buttons);
}
function editEmployeeCtcSplit(id) {
  const e = state.employees.find(x => x.id === id);
  const cs = e.ctcSplitOverride || state.rules.ctcSplit;
  showModal("CTC split — " + e.name, `
    <div class="notice info">Overrides the company default just for ${e.name.split(" ")[0]}. Must add up to 100%.</div>
    <div class="rule-inputs">
      Basic <input class="mini-input" type="number" id="empCtcBasic" value="${cs.basic}">%
      HRA <input class="mini-input" type="number" id="empCtcHra" value="${cs.hra}">%
      Allowances <input class="mini-input" type="number" id="empCtcAllow" value="${cs.allowances}">%
    </div>
  `, [
    { label: "Reset to company default", cls: "btn", action: () => { e.ctcSplitOverride = null; logRuleChange(`Reset ${e.name}'s CTC split to company default`); closeModal(); openEmployeeProfile(id); } },
    { label: "Cancel", cls: "btn", action: closeModal },
    {
      label: "Save", cls: "btn primary", action: () => {
        const b = Number(document.getElementById("empCtcBasic").value) || 0;
        const h = Number(document.getElementById("empCtcHra").value) || 0;
        const a = Number(document.getElementById("empCtcAllow").value) || 0;
        if (b + h + a !== 100) { alert(`Basic + HRA + Allowances must add up to 100%. Currently: ${b + h + a}%`); return; }
        e.ctcSplitOverride = { basic: b, hra: h, allowances: a };
        logRuleChange(`Set custom CTC split for ${e.name}: Basic ${b}% / HRA ${h}% / Allowances ${a}%`);
        closeModal(); openEmployeeProfile(id);
      }
    }
  ]);
}
function removeEmployeeRecord(id) {
  const e = state.employees.find(x => x.id === id);
  if (!confirm(`Remove ${e.name} from the Directory? This is for correcting mistaken entries — for a real exit, use Offboarding instead. This can't be undone.`)) return;
  state.teams.forEach(t => { if (t.manager === e.name) t.manager = null; });
  state.employees = state.employees.filter(x => x.id !== id);
  logRuleChange(`Removed employee record: ${e.name}`);
  closeModal(); setView("directory");
}
function confirmProbation(id) {
  const e = state.employees.find(x => x.id === id);
  e.status = "active";
  e.leaveBalance = { Casual: 6, Sick: 6, Earned: 10 };
  logRuleChange(`Confirmed ${e.name} — moved from Probation to Active`);
  closeModal(); render();
}
function extendProbation(id) {
  const days = prompt("Extend probation by how many days?", "30");
  if (!days || isNaN(Number(days))) return;
  const e = state.employees.find(x => x.id === id);
  e.probationExtendedBy = (e.probationExtendedBy || 0) + Number(days);
  logRuleChange(`Extended ${e.name}'s probation by ${days} days`);
  closeModal(); render();
}

/* Designation dropdown — sourced from Org Structure. Includes a "+ Add new" escape hatch that registers it centrally. */
function designationSelectHtml(id, selected) {
  return `<select id="${id}" onchange="handleDesigSelect(this)">
    ${state.orgStructure.designations.map(d => `<option ${d === selected ? "selected" : ""}>${d}</option>`).join("")}
    <option value="__add_new__">+ Add new designation…</option>
  </select>`;
}
function handleDesigSelect(sel) {
  if (sel.value === "__add_new__") {
    const name = prompt("New designation name (this gets added to Organisation Structure for future use too):");
    if (name && name.trim()) {
      addDesignation(name.trim(), false);
      const opt = document.createElement("option");
      opt.value = name.trim(); opt.textContent = name.trim(); opt.selected = true;
      sel.insertBefore(opt, sel.lastElementChild);
    } else {
      sel.selectedIndex = 0;
    }
  }
}
function openAddEmployee() {
  showModal("Draft offer letter", `
    <div class="notice info">Fill in the details, then preview exactly what the candidate will see before anything goes out. Designation is picked from Organisation Structure — if it's missing, add it right here and it's saved for future use.</div>
    <div class="field"><label class="field-label">Full name</label><input id="fName" type="text" placeholder="e.g. Kavita Rao"></div>
    <div class="field"><label class="field-label">Personal email (for your records only — nothing is emailed)</label><input id="fEmail" type="text" placeholder="e.g. kavita@gmail.com"></div>
    <div class="field"><label class="field-label">Designation</label>${designationSelectHtml("fDesig", null)}</div>
    <div class="field"><label class="field-label">Team</label><select id="fTeam">${state.teams.map(t => `<option>${t.name}</option>`).join("")}</select></div>
    <div class="field"><label class="field-label">Annual CTC (₹)</label><input id="fCtc" type="number" placeholder="e.g. 480000"></div>
  `, [
    { label: "Cancel", cls: "btn", action: closeModal },
    {
      label: "Preview offer letter", cls: "btn primary", action: () => {
        const name = document.getElementById("fName").value.trim();
        if (!name) { alert("Please enter the candidate's full name."); return; }
        const desig = document.getElementById("fDesig").value;
        if (desig === "__add_new__") { alert("Please finish adding the new designation first."); return; }
        const draft = {
          name, personalEmail: document.getElementById("fEmail").value.trim() || "—",
          designation: desig, team: document.getElementById("fTeam").value,
          ctc: Number(document.getElementById("fCtc").value) || 0,
        };
        closeModal();
        previewOfferDraft(draft);
      }
    }
  ]);
}
function previewOfferDraft(draft) {
  const merged = mergeTemplate(state.templates["Offer Letter"].content, { employee_name: draft.name, designation: draft.designation, team: draft.team, ctc: "₹" + draft.ctc.toLocaleString("en-IN") });
  showModal("Preview — Offer Letter", `
    <div class="notice info">This is exactly what ${draft.name.split(" ")[0]} will see in their portal. Nothing is sent — not even by email — until you approve.</div>
    <div class="card pad" style="white-space:pre-wrap;font-size:12.5px;">${merged}</div>
  `, [
    { label: "Back to edit", cls: "btn", action: () => { closeModal(); openAddEmployee(); } },
    {
      label: "Approve & Send", cls: "btn primary", action: () => {
        state.onboarding.push({
          id: "O-" + (Date.now() % 1000), name: draft.name, personalEmail: draft.personalEmail, designation: draft.designation, team: draft.team, ctc: draft.ctc,
          stage: "awaiting_signature", offerSentDate: TODAY, signedDate: null, uploadDeadline: null, employeeId: null, agreementStage: "not_started", docs: []
        });
        closeModal(); setView("onboarding");
      }
    }
  ]);
}
function openBulkImport() {
  showModal("Bulk import employees (CSV)", `
    <div class="notice info">Use this once to bring in employees you've already onboarded outside this tool. Columns: Name, Email, Designation, Team, Manager, DOJ, CTC. Any designation not already in Organisation Structure gets added automatically.</div>
    <div class="field"><label class="field-label">Paste CSV data (or choose a file in production)</label>
      <textarea id="csvData" placeholder="Name,Email,Designation,Team,Manager,DOJ,CTC
Kavita Rao,kavita.rao@snf.co,Social Media Executive,Partnerships & BD,Kunal Verma,2025-01-10,380000" style="min-height:110px;"></textarea>
    </div>
  `, [
    { label: "Cancel", cls: "btn", action: closeModal },
    {
      label: "Import employees", cls: "btn primary", action: () => {
        const raw = document.getElementById("csvData").value.trim();
        if (!raw) { alert("Paste CSV data first."); return; }
        const lines = raw.split("\n").filter(l => l.trim() && !l.toLowerCase().startsWith("name,"));
        let count = 0;
        lines.forEach(line => {
          const [name, email, designation, team, manager, doj, ctc] = line.split(",").map(s => s.trim());
          if (!name) return;
          if (designation) addDesignation(designation, true);
          const newId = "E-" + (100 + state.employees.length + 1);
          state.employees.push({ id: newId, name, email: email || "—", designation: designation || "—", team: team || state.teams[0].name, manager: manager || null, status: "active", doj: doj || TODAY, sysRole: "Employee", ctc: Number(ctc) || 0, leaveBalance: { Casual: 6, Sick: 6, Earned: 10 }, documents: [], signedDocs: [] });
          count++;
        });
        closeModal();
        alert(count + " employee(s) imported. Logins auto-created; they can be asked to upload missing documents into the Document Vault.");
        setView("directory");
      }
    }
  ]);
}

/* ---------------------------------------------------------
   ONBOARDING — docs -> Employment Agreement (preview -> both sign) -> complete
--------------------------------------------------------- */
function renderOnboarding() {
  document.getElementById("main").innerHTML = `
    ${pageHead("Onboarding", "Offer letter → e-signature → document upload → HR approval → Employment Agreement (preview, then sign) → Active.")}
    <div class="toolbar" style="justify-content:flex-end;margin-bottom:14px;"><button class="btn primary" onclick="openAddEmployee()">+ Draft offer letter</button></div>
    <div id="onboardList"></div>
    <section class="block" style="margin-top:8px;">
      <div class="block-head"><h2>Document updates from active employees</h2></div>
      <div class="card" id="docUpdatesBox"></div>
    </section>
  `;
  drawOnboarding();
  drawDocUpdates();
}
function drawDocUpdates() {
  const emps = pendingEmployeeDocUpdates();
  const box = document.getElementById("docUpdatesBox");
  if (!box) return;
  if (!emps.length) { box.innerHTML = `<div class="empty">No pending document updates.</div>`; return; }
  box.innerHTML = `<table><thead><tr><th>Employee</th><th>Document</th><th>Status</th><th style="text-align:right;">Action</th></tr></thead><tbody>
    ${emps.flatMap(e => e.documents.map((d, i) => d.status === "pending" ? `<tr><td>${e.name}</td><td>${d.name}</td><td>${statusBadge(d.status)}</td>
      <td style="text-align:right;"><button class="btn approve sm" onclick="empDocAction('${e.id}',${i},'approved')">Approve</button>
      <button class="btn reject sm" onclick="empDocAction('${e.id}',${i},'rejected')">Reject with remarks</button></td></tr>` : "").filter(Boolean)).join("")}
  </tbody></table>`;
}
function empDocAction(empId, idx, status) {
  const e = state.employees.find(x => x.id === empId);
  if (status === "rejected") {
    showModal("Reject document", `<div class="field"><label class="field-label">Remarks (required)</label><textarea id="rejRemarks2"></textarea></div>`, [
      { label: "Cancel", cls: "btn", action: closeModal },
      {
        label: "Reject", cls: "btn reject", action: () => {
          const r = document.getElementById("rejRemarks2").value.trim();
          if (!r) { alert("Remarks are required on rejection."); return; }
          e.documents[idx].status = "rejected"; closeModal(); drawDocUpdates();
        }
      }
    ]);
  } else { e.documents[idx].status = "approved"; drawDocUpdates(); }
}
const stageLabel = { awaiting_signature: "Awaiting candidate's e-signature", doc_upload: "Document upload window open", doc_review: "Documents under HR review", completed: "Completed" };
function drawOnboarding() {
  const el = document.getElementById("onboardList");
  if (!state.onboarding.length) { el.innerHTML = `<div class="card"><div class="empty">No one currently in the onboarding pipeline.</div></div>`; return; }
  el.innerHTML = state.onboarding.map(o => {
    if (o.stage === "awaiting_signature") {
      return `<section class="block"><div class="card pad">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div class="row-name"><div class="avatar">${initials(o.name)}</div><div><div style="font-weight:600;">${o.name}</div><div class="meta">${o.designation} · ${o.team} · ₹${o.ctc.toLocaleString("en-IN")} CTC</div></div></div>
            <span class="badge pending">${stageLabel[o.stage]}</span>
          </div>
          <div class="meta" style="margin-top:10px;">Offer letter sent ${o.offerSentDate} to ${o.personalEmail}. Once ${o.name.split(" ")[0]} signs it, an Employee ID and login are issued automatically and their 7-day document window begins.</div>
        </div></section>`;
    }
    const approvedCount = o.docs.filter(d => d.status === "approved").length;
    const uploadedCount = o.docs.filter(d => d.status === "approved" || d.status === "pending" || d.status === "rejected").length;
    const pct = Math.round((approvedCount / o.docs.length) * 100);
    const dl = daysLeft(o.uploadDeadline);
    const overdue = dl !== null && dl < 0 && pct < 100;
    return `<section class="block"><div class="card pad">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
          <div class="row-name"><div class="avatar">${initials(o.name)}</div><div><div style="font-weight:600;">${o.name}</div><div class="meta">${o.designation} · ${o.employeeId} · window ${o.signedDate} – ${o.uploadDeadline}</div></div></div>
          <div style="text-align:right;">
            <span class="badge ${pct === 100 ? 'approved' : overdue ? 'rejected' : 'pending'}">${pct === 100 ? 'All docs approved' : overdue ? 'Window closed' : (dl + ' day' + (dl === 1 ? '' : 's') + ' left')}</span>
            <div class="meta" style="margin-top:4px;">${approvedCount}/${o.docs.length} approved · ${uploadedCount}/${o.docs.length} uploaded</div>
          </div>
        </div>
        <div class="progress-track" style="margin-bottom:14px;"><div class="progress-fill" style="width:${pct}%;"></div></div>
        <table><thead><tr><th>Document</th><th>Status</th><th style="text-align:right;">Action</th></tr></thead>
          <tbody>${o.docs.map((d, i) => `
            <tr><td>${d.name}</td><td>${statusBadge(d.status)}</td>
              <td style="text-align:right;">
                ${d.status === "pending" ? `<button class="btn approve sm" onclick="docAction('${o.id}',${i},'approved')">Approve</button>
                <button class="btn reject sm" onclick="docAction('${o.id}',${i},'rejected')">Reject with remarks</button>` : d.status === "not_uploaded" ? `<span class="meta">not yet uploaded</span>` : `<span class="meta">reviewed</span>`}
              </td></tr>`).join("")}</tbody>
        </table>
        ${pct === 100 ? renderAgreementBlock(o) : ""}
        ${overdue ? `<div class="notice" style="margin-top:14px;">Upload window has closed with documents still missing or unreviewed. Follow up with ${o.name.split(" ")[0]} directly, or extend the deadline.</div>` : ""}
      </div></section>`;
  }).join("");
}
function docAction(oid, idx, status) {
  const o = state.onboarding.find(x => x.id === oid);
  if (status === "rejected") {
    showModal("Reject document", `<div class="field"><label class="field-label">Remarks (required)</label><textarea id="rejRemarks"></textarea></div>`, [
      { label: "Cancel", cls: "btn", action: closeModal },
      {
        label: "Reject", cls: "btn reject", action: () => {
          const r = document.getElementById("rejRemarks").value.trim();
          if (!r) { alert("Remarks are required on rejection."); return; }
          o.docs[idx].status = "rejected"; closeModal(); drawOnboarding();
        }
      }
    ]);
  } else { o.docs[idx].status = "approved"; drawOnboarding(); }
}
function agreementMerged(o) {
  const emp = o.employeeId ? state.employees.find(e => e.id === o.employeeId) : null;
  const cs = (emp && emp.ctcSplitOverride) ? emp.ctcSplitOverride : state.rules.ctcSplit;
  const basic = Math.round(o.ctc * cs.basic / 100), hra = Math.round(o.ctc * cs.hra / 100), allow = o.ctc - basic - hra;
  return mergeTemplate(state.templates["Employment Agreement"].content, {
    employee_name: o.name, designation: o.designation, team: o.team, doj: o.signedDate || TODAY,
    ctc: "₹" + o.ctc.toLocaleString("en-IN"), basic: "₹" + basic.toLocaleString("en-IN"), hra: "₹" + hra.toLocaleString("en-IN"), allowances: "₹" + allow.toLocaleString("en-IN")
  });
}
function agreementPreviewHtml(o) {
  return `<div class="notice info" style="margin-top:10px;white-space:pre-wrap;">
      <strong>Preview</strong><br>${agreementMerged(o)}
    </div>`;
}
function renderAgreementBlock(o) {
  if (o.agreementStage === "not_started") {
    return `<div class="notice good" style="margin-top:14px;">All documents approved.
      <button class="btn primary sm" style="margin-left:auto;" onclick="draftAgreement('${o.id}')">Draft Employment Agreement</button></div>`;
  }
  if (o.agreementStage === "pending_employee_signature") {
    return `<div class="card pad" style="margin-top:14px;background:#F1F5F9;">
      <div class="block-head"><h2>Employment Agreement</h2><span class="badge rmpending">Sent — awaiting employee signature</span></div>
      ${agreementPreviewHtml(o)}
    </div>`;
  }
  if (o.agreementStage === "pending_employer_signature") {
    return `<div class="card pad" style="margin-top:14px;background:#F1F5F9;">
      <div class="block-head"><h2>Employment Agreement</h2><span class="badge hrpending">Employee signed — your countersignature required</span></div>
      ${agreementPreviewHtml(o)}
      <button class="btn primary" style="width:100%;justify-content:center;margin-top:12px;" onclick="employerSignAgreement('${o.id}')">✓ Confirm, looks correct — countersign</button>
    </div>`;
  }
  if (o.agreementStage === "signed") {
    if (state.rules.assetChecklist) {
      o.assets = o.assets || { laptop: false, idCard: false, accessCard: false };
      const allIssued = o.assets.laptop && o.assets.idCard && o.assets.accessCard;
      return `<div class="card pad" style="margin-top:14px;background:#F1F5F9;">
        <div class="block-head"><h2>Employment Agreement</h2><span class="badge approved">Signed by both parties</span></div>
        <button class="btn ghost sm" onclick="downloadDoc('${o.name.replace(/\s+/g, "_")}_Employment_Agreement.txt', ${JSON.stringify(agreementMerged(o))})">⇩ Download</button>
        <div class="rule-desc" style="margin:12px 0 8px;font-weight:600;color:var(--ink);">Asset issuance checklist</div>
        <label style="display:block;margin-bottom:6px;"><input type="checkbox" ${o.assets.laptop ? "checked" : ""} onchange="toggleAsset('${o.id}','laptop',this.checked)"> Laptop issued</label>
        <label style="display:block;margin-bottom:6px;"><input type="checkbox" ${o.assets.idCard ? "checked" : ""} onchange="toggleAsset('${o.id}','idCard',this.checked)"> ID card issued</label>
        <label style="display:block;margin-bottom:10px;"><input type="checkbox" ${o.assets.accessCard ? "checked" : ""} onchange="toggleAsset('${o.id}','accessCard',this.checked)"> Access card issued</label>
        <button class="btn primary sm" ${allIssued ? "" : "disabled"} onclick="completeOnboarding('${o.id}')">Mark onboarding complete → Active</button>
        ${allIssued ? "" : `<div class="meta" style="margin-top:6px;">Tick off all assets to complete onboarding.</div>`}
      </div>`;
    }
    return `<div class="notice good" style="margin-top:14px;">Employment Agreement signed by both parties.
      <button class="btn ghost sm" onclick="downloadDoc('${o.name.replace(/\s+/g, "_")}_Employment_Agreement.txt', ${JSON.stringify(agreementMerged(o))})">⇩ Download</button>
      <button class="btn primary sm" style="margin-left:auto;" onclick="completeOnboarding('${o.id}')">Mark onboarding complete → Active</button></div>`;
  }
  return "";
}
function toggleAsset(oid, key, val) {
  const o = state.onboarding.find(x => x.id === oid);
  o.assets = o.assets || { laptop: false, idCard: false, accessCard: false };
  o.assets[key] = val;
  drawOnboarding();
}
function draftAgreement(oid) {
  const o = state.onboarding.find(x => x.id === oid);
  showModal("Preview — Employment Agreement", `${agreementPreviewHtml(o)}
    <div class="meta">This is exactly what ${o.name.split(" ")[0]} will see as a pending action on their dashboard. Nothing is sent by email. You'll countersign after they sign.</div>`, [
    { label: "Cancel", cls: "btn", action: closeModal },
    { label: "Approve & Send", cls: "btn primary", action: () => { o.agreementStage = "pending_employee_signature"; closeModal(); drawOnboarding(); } }
  ]);
}
function employeeSignAgreement(oid) { state.onboarding.find(x => x.id === oid).agreementStage = "pending_employer_signature"; render(); }
function employerSignAgreement(oid) {
  const o = state.onboarding.find(x => x.id === oid);
  o.agreementStage = "signed";
  const emp = state.employees.find(e => e.id === o.employeeId);
  if (emp) { emp.signedDocs = emp.signedDocs || []; emp.signedDocs.push({ type: "Employment Agreement", content: agreementMerged(o), signedDate: TODAY }); }
  drawOnboarding();
}
function completeOnboarding(oid) {
  const o = state.onboarding.find(x => x.id === oid);
  const emp = state.employees.find(e => e.id === o.employeeId);
  if (emp) { emp.status = "probation"; emp.leaveBalance = { Casual: 0, Sick: 2, Earned: 0 }; emp.documents = o.docs.map(d => ({ name: d.name, status: d.status })); }
  o.stage = "completed";
  state.onboarding = state.onboarding.filter(x => x.id !== oid);
  drawOnboarding(); render();
}

/* ---------------------------------------------------------
   OFFBOARDING
--------------------------------------------------------- */
function renderOffboarding() {
  document.getElementById("main").innerHTML = `
    ${pageHead("Offboarding", "Notice period, full & final settlement, and asset return.")}
    <div class="card"><table><thead><tr><th>Employee</th><th>Notice Period</th><th>F&F Status</th><th>Assets Returned</th><th></th></tr></thead>
      <tbody><tr>
        <td><div class="row-name"><div class="avatar">${initials("Arjun Nair")}</div><div>Arjun Nair</div></div></td>
        <td>Completed – 2026-05-10</td><td>${statusBadge("approved")}</td><td>Laptop ✓ · ID Card ✓ · Access Card ✓</td>
        <td style="text-align:right;"><button class="btn ghost sm" onclick="alert('Relieving letter & experience letter already e-signed and archived.')">View documents</button></td>
      </tr></tbody>
    </table></div>
    <div class="footnote">Full & final settlement is auto-computed from pending salary, leave encashment, and deductions before HR approves. Relieving/experience letters follow the same preview-then-sign pattern as the employment agreement.</div>
  `;
}

/* ---------------------------------------------------------
   ATTENDANCE — team-scoped, two-level regularization, N-day window
--------------------------------------------------------- */
function scopedApprovals(list) {
  if (isAdmin(state.role)) return list;
  if (state.role === "Reporting Manager") return list.filter(x => x.emp === state.currentUser.name || rmOf(x.emp) === state.currentUser.name);
  return list.filter(x => x.emp === state.currentUser.name);
}
// Punch in/out — uses the real wall clock (not the simulated TODAY) since "disable until
// 11:59 PM" is a real time-of-day concept; the resulting record is still filed under the
// simulated TODAY date so the calendar/dashboard/table views everywhere else stay consistent.
function todayRealDateStr() { return new Date().toISOString().slice(0, 10); }
function nowTimeStr() { return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); }
function nowMinutesSinceMidnight() { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
function getTodayPunch(empName) {
  const p = state.punchLog[empName];
  return (p && p.date === todayRealDateStr()) ? p : null;
}
// Compares a punch-in's real clock-minutes against HR's configured shift start + grace
// period (Rules & Org Structure). Returns null if there's nothing to compare yet.
function latenessInfo(inMinutes) {
  if (inMinutes == null) return null;
  const [h, m] = state.rules.shiftStartTime.split(":").map(Number);
  const graceEnd = (h * 60 + m) + Number(state.rules.shiftGraceMinutes || 0);
  const diff = inMinutes - graceEnd;
  if (diff <= 0) return { late: false, text: "On time" };
  const hrs = Math.floor(diff / 60), mins = diff % 60;
  const parts = [];
  if (hrs > 0) parts.push(hrs + " hr");
  parts.push(mins + " min");
  return { late: true, text: parts.join(" ") + " late" };
}
function syncAttendanceRecord(empName) {
  const punch = getTodayPunch(empName);
  if (!punch) return;
  let rec = state.attendance.find(a => a.emp === empName && a.date === TODAY);
  if (!rec) {
    rec = { emp: empName, date: TODAY, status: "Present", inTime: punch.inTime || "—", outTime: punch.outTime || "—" };
    state.attendance.push(rec);
  } else {
    rec.status = "Present";
    rec.inTime = punch.inTime || "—";
    rec.outTime = punch.outTime || "—";
  }
}
// Punch In and Punch Out are independent — an employee can use either one first (e.g. punch
// out without having punched in, if they forgot earlier), so neither button waits on the other.
function punchIn() {
  const me = state.currentUser;
  const existing = getTodayPunch(me.name);
  if (existing && existing.inTime) return; // already punched in today, button should be disabled
  const time = nowTimeStr();
  const minutes = nowMinutesSinceMidnight();
  state.punchLog[me.name] = { date: todayRealDateStr(), inTime: time, inMinutes: minutes, outTime: existing ? existing.outTime : null };
  syncAttendanceRecord(me.name);
  const lateness = latenessInfo(minutes);
  alert("Punched in at " + time + " — " + lateness.text + ". Geolocation captured.");
  renderAttendance();
}
function punchOut() {
  const me = state.currentUser;
  const existing = getTodayPunch(me.name);
  if (existing && existing.outTime) return; // already punched out today, button should be disabled
  const time = nowTimeStr();
  state.punchLog[me.name] = { date: todayRealDateStr(), inTime: existing ? existing.inTime : null, inMinutes: existing ? existing.inMinutes : null, outTime: time };
  syncAttendanceRecord(me.name);
  alert("Punched out at " + time + (existing && existing.inTime ? "." : " — no punch-in recorded today."));
  renderAttendance();
}
function renderAttendance() {
  const isEmployeeOnly = state.role === "Employee";
  const scopeFilter = isAdmin(state.role) ? () => true : state.role === "Reporting Manager" ? (a) => (rmOf(a.emp) === state.currentUser.name || a.emp === state.currentUser.name) : (a) => a.emp === state.currentUser.name;
  const attRows = state.attendance.filter(a => a.date === TODAY && scopeFilter(a));
  const regRows = scopedApprovals(state.regularizations);
  const myPunch = isEmployeeOnly ? getTodayPunch(state.currentUser.name) : null;
  const punchedIn = !!(myPunch && myPunch.inTime);
  const punchedOut = !!(myPunch && myPunch.outTime);
  const myLateness = punchedIn ? latenessInfo(myPunch.inMinutes) : null;
  document.getElementById("main").innerHTML = `
    ${pageHead("Attendance", isEmployeeOnly ? "Your punches and regularization requests." : "Punches and regularization requests, scoped to your view.")}
    ${isEmployeeOnly ? `<div class="toolbar" style="justify-content:flex-end;align-items:center;margin-bottom:14px;gap:8px;">
      <div style="color:var(--muted);font-size:12.5px;margin-right:auto;">
        Shift: ${state.rules.shiftStartTime} – ${state.rules.shiftEndTime} (${state.rules.shiftGraceMinutes} min grace) — set by HR
        ${myLateness ? `<br><span style="font-weight:700;color:${myLateness.late ? "var(--red)" : "var(--green)"};">${myLateness.late ? "⚠ " : "✓ "}${myLateness.text}</span>` : ""}
      </div>
      <button class="btn primary" ${punchedIn ? "disabled" : ""} onclick="punchIn()">⏱ Punch In${punchedIn ? " — " + myPunch.inTime : ""}</button>
      <button class="btn primary" ${punchedOut ? "disabled" : ""} onclick="punchOut()">⏱ Punch Out${punchedOut ? " — " + myPunch.outTime : ""}</button>
    </div>` : ""}
    <section class="block">
      <div class="block-head"><h2>Today — ${new Date(TODAY).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</h2></div>
      <div class="card"><table><thead><tr><th>Employee</th><th>Status</th><th>In</th><th>Out</th></tr></thead>
        <tbody>${attRows.map(a => `<tr><td>${a.emp}</td><td>${statusBadge(a.status === "Present" ? "active" : "pending")}</td><td>${a.inTime}</td><td>${a.outTime}</td></tr>`).join("") || `<tr><td colspan="4"><div class="empty">No attendance recorded yet today.</div></td></tr>`}</tbody>
      </table></div>
    </section>
    <section class="block">
      <div class="block-head"><h2>Regularization requests</h2>${isEmployeeOnly ? `<button class="btn sm" onclick="openRegularize()">+ Submit request</button>` : ""}</div>
      <div class="meta" style="margin-bottom:10px;">Window to request: within ${state.rules.regularizationWindowDays} days of the attendance date. ${state.rules.twoLevelApproval.attendance ? "Manager approves first, then HR." : "HR approves directly (manager step off)."}</div>
      <div class="card"><table><thead><tr><th>Employee</th><th>Date</th><th>Reason</th><th>Status</th><th style="text-align:right;">Action</th></tr></thead>
        <tbody id="regRows">${regRows.map(r => `
          <tr><td>${r.emp}</td><td>${r.date}</td><td>${r.reason}</td><td>${approvalBadge(r)}</td>
          <td style="text-align:right;">${approvalActionButtons(r, 'reg')}</td></tr>`).join("") || `<tr><td colspan="5"><div class="empty">Nothing here.</div></td></tr>`}</tbody>
      </table></div>
    </section>
  `;
}
function approvalActionButtons(req, kind) {
  const canActRM = state.role === "Reporting Manager" && req.stage === "rm" && rmOf(req.emp) === state.currentUser.name && req.status === "pending";
  const canActHR = isAdmin(state.role) && req.stage === "hr" && req.status === "pending";
  if (canActRM) return `<button class="btn approve sm" onclick="approvalAction('${kind}','${req.id}','rm','approved')">Approve</button>
    <button class="btn reject sm" onclick="approvalAction('${kind}','${req.id}','rm','rejected')">Reject with remarks</button>`;
  if (canActHR) return `<button class="btn approve sm" onclick="approvalAction('${kind}','${req.id}','hr','approved')">Approve</button>
    <button class="btn reject sm" onclick="approvalAction('${kind}','${req.id}','hr','rejected')">Reject with remarks</button>`;
  return "—";
}
function listFor(kind) { return kind === 'reg' ? state.regularizations : kind === 'leave' ? state.leaveRequests : state.expenses; }
function redrawFor(kind) { if (kind === 'reg') renderAttendance(); else if (kind === 'leave') drawLeave(); else drawExpenses(); }
function approvalAction(kind, id, level, decision) {
  const list = listFor(kind);
  const req = list.find(x => x.id === id);
  const proceed = (remarks) => {
    if (level === 'rm') {
      req.rmRemarks = remarks || "";
      if (decision === 'rejected') { req.status = 'rejected'; req.stage = 'done'; }
      else { req.stage = state.rules.twoLevelApproval[kind === 'reg' ? 'attendance' : kind] ? 'hr' : 'done'; if (req.stage === 'done') req.status = 'approved'; }
    } else { req.hrRemarks = remarks || ""; req.status = decision; req.stage = 'done'; }
    redrawFor(kind);
  };
  if (decision === 'rejected') {
    showModal("Reject — remarks required", `<div class="field"><label class="field-label">Remarks (required)</label><textarea id="genRemarks"></textarea></div>`, [
      { label: "Cancel", cls: "btn", action: closeModal },
      {
        label: "Reject", cls: "btn reject", action: () => {
          const r = document.getElementById("genRemarks").value.trim();
          if (!r) { alert("Remarks required."); return; }
          closeModal(); proceed(r);
        }
      }
    ]);
  } else {
    showModal("Approve — remarks (optional)", `<div class="field"><label class="field-label">Remarks</label><textarea id="genRemarks" placeholder="optional"></textarea></div>`, [
      { label: "Cancel", cls: "btn", action: closeModal },
      { label: "Approve", cls: "btn approve", action: () => { const r = document.getElementById("genRemarks").value.trim(); closeModal(); proceed(r); } }
    ]);
  }
}
function openRegularize(prefillDate) {
  showModal("Submit regularization request", `
    <div class="notice">Requests must be submitted within ${state.rules.regularizationWindowDays} days of the attendance date.</div>
    <div class="field"><label class="field-label">Date</label><input type="date" id="regDate" value="${prefillDate || TODAY}"></div>
    <div class="field"><label class="field-label">Reason</label>
      <select id="regReason" onchange="document.getElementById('regReasonOtherWrap').style.display = this.value === '__other__' ? 'block' : 'none';">
        <option>Forgot to punch out</option><option>Forgot to punch in</option><option>System/network issue</option><option>Worked from a client site</option><option value="__other__">Other (please specify)</option>
      </select>
    </div>
    <div class="field" id="regReasonOtherWrap" style="display:none;"><label class="field-label">Please specify</label><textarea id="regReasonOther" placeholder="Describe the reason..."></textarea></div>
  `, [
    { label: "Cancel", cls: "btn", action: closeModal },
    {
      label: "Submit", cls: "btn primary", action: () => {
        const dateVal = document.getElementById("regDate").value;
        const diff = Math.round((new Date(TODAY) - new Date(dateVal)) / (1000 * 60 * 60 * 24));
        if (!state.rules.regularizationOverride && diff > state.rules.regularizationWindowDays) {
          alert(`This date is outside the ${state.rules.regularizationWindowDays}-day regularization window. Contact HR for an override.`); return;
        }
        const reasonSelect = document.getElementById("regReason").value;
        const reason = reasonSelect === "__other__" ? document.getElementById("regReasonOther").value.trim() : reasonSelect;
        if (!reason) { alert("Please describe the reason."); return; }
        const stage = state.rules.twoLevelApproval.attendance ? 'rm' : 'hr';
        state.regularizations.unshift({ id: "R-" + Date.now(), emp: state.currentUser.name, date: dateVal, reason, stage, status: "pending", rmRemarks: "", hrRemarks: "" });
        closeModal(); renderAttendance();
      }
    }
  ]);
}

/* ---------------------------------------------------------
   LEAVE
--------------------------------------------------------- */
function renderLeave() {
  const enabledTypes = Object.entries(state.rules.leaveTypes).filter(([, on]) => on).map(([k]) => k);
  document.getElementById("main").innerHTML = `
    ${pageHead("Leave Management", "Requests, approvals, and live balances. " + (state.rules.twoLevelApproval.leave ? "Manager approves first, then HR." : "HR approves directly."))}
    <div class="toolbar" style="justify-content:flex-end;margin-bottom:14px;"><button class="btn primary" onclick="openApplyLeave()">+ Apply for leave</button></div>
    <div class="card"><table><thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Remarks</th><th>Status</th><th style="text-align:right;">Action</th></tr></thead>
      <tbody id="leaveRows"></tbody>
    </table></div>
    <div class="footnote">Leave types currently enabled by HR: ${enabledTypes.join(", ") || "none"}. Configure this from Rules & Org Structure.</div>
  `;
  drawLeave();
}
function drawLeave() {
  const rows = scopedApprovals(state.leaveRequests);
  document.getElementById("leaveRows").innerHTML = rows.map(l => `
    <tr><td>${l.emp}</td><td>${l.type}</td><td>${l.from}${l.to !== l.from ? " – " + l.to : ""}</td><td>${l.remarks || "—"}</td><td>${approvalBadge(l)}</td>
    <td style="text-align:right;">${approvalActionButtons(l, 'leave')}</td></tr>`).join("") || `<tr><td colspan="6"><div class="empty">No leave requests.</div></td></tr>`;
}
function openApplyLeave() {
  const lockedToSelf = state.role === "Employee" || state.role === "Reporting Manager";
  const enabledTypes = Object.entries(state.rules.leaveTypes).filter(([, on]) => on).map(([k]) => k);
  showModal("Apply for leave", `
    <div class="field"><label class="field-label">Employee</label>
      ${lockedToSelf ? `<input type="text" value="${state.currentUser.name}" disabled>` : `<select id="lvEmp">${state.employees.filter(e => e.status !== "exited").map(e => `<option>${e.name}</option>`).join("")}</select>`}
    </div>
    <div class="field"><label class="field-label">Leave type</label>
      <select id="lvType" onchange="document.getElementById('lvTypeOtherWrap').style.display = this.value === '__other__' ? 'block' : 'none';">
        ${enabledTypes.map(t => `<option>${t}</option>`).join("")}
        <option value="__other__">Other (please specify)</option>
      </select>
    </div>
    <div class="field" id="lvTypeOtherWrap" style="display:none;"><label class="field-label">Please specify leave type</label><input type="text" id="lvTypeOther" placeholder="e.g. Bereavement leave"></div>
    <div class="grid grid-2">
      <div class="field"><label class="field-label">From</label><input type="date" id="lvFrom"></div>
      <div class="field"><label class="field-label">To</label><input type="date" id="lvTo"></div>
    </div>
    <div class="field"><label class="field-label">Remarks (optional)</label><textarea id="lvRem"></textarea></div>
  `, [
    { label: "Cancel", cls: "btn", action: closeModal },
    {
      label: "Submit request", cls: "btn primary", action: () => {
        const typeSelect = document.getElementById("lvType").value;
        const type = typeSelect === "__other__" ? document.getElementById("lvTypeOther").value.trim() : typeSelect;
        if (!type) { alert("Please specify the leave type."); return; }
        const empName = lockedToSelf ? state.currentUser.name : document.getElementById("lvEmp").value;
        const stage = state.rules.twoLevelApproval.leave && rmOf(empName) ? 'rm' : 'hr';
        state.leaveRequests.unshift({
          id: "L-" + Date.now(), emp: empName, type,
          from: document.getElementById("lvFrom").value || "2026-08-10", to: document.getElementById("lvTo").value || document.getElementById("lvFrom").value || "2026-08-10",
          remarks: document.getElementById("lvRem").value, stage, status: "pending", rmRemarks: "", hrRemarks: ""
        });
        closeModal(); drawLeave();
      }
    }
  ]);
}

/* ---------------------------------------------------------
   PAYROLL — pre-payroll summary + monthly attendance calendar
--------------------------------------------------------- */
function synthAttendanceStatus(empName, day) {
  const date = new Date(2026, 7, day);
  if (date.getDay() === 0) return "off";
  const seed = (empName.length + day) % 11;
  if (seed === 0) return "absent";
  if (seed === 1) return "leave";
  return "present";
}
function attendanceKey(empName, dateStr) { return empName + "|" + dateStr; }
function getDayStatus(empName, dateStr, day) {
  const override = state.attendanceOverrides[attendanceKey(empName, dateStr)];
  return override || synthAttendanceStatus(empName, day);
}
function synthTimes(empName, day) {
  const seed = (empName.length + day) % 45;
  return { inTime: "09:" + String(seed).padStart(2, "0"), outTime: "18:" + String((seed + 10) % 60).padStart(2, "0") };
}
function attendanceCalendarHtml(empName) {
  const daysInMonth = 31;
  const firstDow = new Date(2026, 7, 1).getDay();
  const dows = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  let cells = "";
  for (let i = 0; i < firstDow; i++) cells += `<div class="cal-cell blank"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `2026-08-${String(d).padStart(2, '0')}`;
    const status = getDayStatus(empName, dateStr, d);
    const reg = state.regularizations.find(r => r.emp === empName && r.date === dateStr);
    let cellClass = status;
    if (reg) { cellClass = (reg.stage === "done" && reg.status === "approved") ? "regapproved" : reg.status === "pending" ? "regpending" : status; }
    cells += `<div class="cal-cell ${cellClass}" style="cursor:pointer;" onclick="openDayDetail('${empName.replace(/'/g, "\\'")}','${dateStr}',${d})"><div class="cal-day">${d}</div></div>`;
  }
  return `<div class="cal-grid">${dows.map(d => `<div class="cal-dow">${d}</div>`).join("")}${cells}</div>
    <div class="cal-legend">
      <span><span class="dot" style="background:var(--green-soft);border:1px solid #14532D;"></span>Present</span>
      <span><span class="dot" style="background:#FECACA;border:1px solid #7F1D1D;"></span>Absent</span>
      <span><span class="dot" style="background:#DBEAFE;border:1px solid #1E3A8A;"></span>On leave</span>
      <span><span class="dot" style="background:#FDE68A;border:1px solid #78350F;"></span>Regularization pending</span>
      <span><span class="dot" style="background:#EDE9FE;border:1px solid #5B21B6;"></span>Already regularized</span>
      <span><span class="dot" style="background:#F1F5F9;border:1px solid var(--muted);"></span>Week-off</span>
    </div>
    <div class="footnote">Click any day for details${isAdmin(state.role) ? " — HR can also correct a day's status directly." : "."}</div>`;
}
function openDayDetail(empName, dateStr, day) {
  const status = getDayStatus(empName, dateStr, day);
  const reg = state.regularizations.find(r => r.emp === empName && r.date === dateStr);
  // A real punch (from the Punch In/Out buttons) always wins over the simulated demo status —
  // both the status label and the in/out times shown here must reflect what actually happened
  // on this date, not the synthetic placeholder used to make unpunched days look populated.
  const real = state.attendance.find(a => a.emp === empName && a.date === dateStr);
  const statusLabels = { present: "Present", absent: "Absent", leave: "On leave", off: "Week-off" };
  const statusLabel = real ? real.status : (statusLabels[status] || status);
  const times = real ? { inTime: real.inTime, outTime: real.outTime } : (status === "present" ? synthTimes(empName, day) : { inTime: "—", outTime: "—" });
  let regBlock = "";
  if (reg) {
    regBlock = `<div class="field"><label class="field-label">Regularization</label>
      ${reg.reason} — ${approvalBadge(reg)}
      ${reg.rmRemarks ? `<div class="meta">Manager remarks: ${reg.rmRemarks}</div>` : ""}
      ${reg.hrRemarks ? `<div class="meta">HR remarks: ${reg.hrRemarks}</div>` : ""}
      <div style="margin-top:8px;">${approvalActionButtons(reg, "reg")}</div>
    </div>`;
  } else if (empName === state.currentUser.name) {
    // Only offered on your own day, and only when there isn't already a request for it —
    // regularization requests are always submitted for the logged-in user (see openRegularize()),
    // so this wouldn't make sense while looking at someone else's calendar (e.g. HR/RM view).
    regBlock = `<div class="field"><button class="btn sm" onclick="closeModal(); openRegularize('${dateStr}');">+ Submit regularization request for this day</button></div>`;
  }
  let overrideBlock = "";
  if (isAdmin(state.role)) {
    overrideBlock = `<div class="field"><label class="field-label">HR correction</label>
      <select id="manualAttStatus">
        <option value="present" ${status === "present" ? "selected" : ""}>Present</option>
        <option value="absent" ${status === "absent" ? "selected" : ""}>Absent</option>
        <option value="leave" ${status === "leave" ? "selected" : ""}>On leave</option>
        <option value="off" ${status === "off" ? "selected" : ""}>Week-off</option>
      </select>
      <button class="btn sm" style="margin-top:8px;" onclick="setManualAttendance('${empName.replace(/'/g, "\\'")}','${dateStr}',${day})">Save correction</button>
    </div>`;
  }
  showModal(`${empName} — ${new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, `
    <div class="field"><label class="field-label">Status</label>${statusLabel}</div>
    <div class="field"><label class="field-label">In / Out</label>${times.inTime} – ${times.outTime}</div>
    ${regBlock}
    ${overrideBlock}
  `, [{ label: "Close", cls: "btn", action: closeModal }]);
}
function setManualAttendance(empName, dateStr, day) {
  const val = document.getElementById("manualAttStatus").value;
  state.attendanceOverrides[attendanceKey(empName, dateStr)] = val;
  logRuleChange(`Manually set ${empName}'s attendance on ${dateStr} to ${val}`);
  closeModal();
  render();
}
function renderPayroll() {
  if (state.role === "Employee") {
    document.getElementById("main").innerHTML = `
      ${pageHead("My Payslips", "Download your monthly salary slips, and see your attendance for the cycle.")}
      <div class="card"><table><thead><tr><th>Month</th><th>Gross</th><th>Deductions</th><th>Net Pay</th><th></th></tr></thead>
        <tbody>
          <tr><td>July 2026</td><td>₹62,000</td><td>₹4,850</td><td>₹57,150</td><td style="text-align:right;"><button class="btn ghost sm">Download PDF</button></td></tr>
          <tr><td>${state.payrollRun.month}</td><td>₹62,000</td><td>₹4,850</td><td>₹57,150</td><td style="text-align:right;"><button class="btn ghost sm" ${state.payrollRun.status !== "run" ? "disabled" : ""}>Download PDF</button></td></tr>
        </tbody>
      </table></div>
      <section class="block" style="margin-top:22px;">
        <div class="block-head"><h2>Attendance calendar — ${state.payrollRun.month}</h2></div>
        <div class="card pad">${attendanceCalendarHtml(state.currentUser.name)}</div>
      </section>
      <div class="footnote">TDS is auto-calculated from your tax regime choice and Form 12BB investment declarations. Salary period: ${salaryPeriodLabel()}.</div>
    `;
    return;
  }
  const payable = state.employees.filter(e => e.status !== "exited");
  const totalCTC = payable.reduce((s, e) => s + Math.round(e.ctc / 12), 0);
  document.getElementById("main").innerHTML = `
    ${pageHead("Payroll & Salary Slips", "Auto-computed from CTC structure, attendance, and approved leave. Salary period: " + salaryPeriodLabel())}
    <div class="card pad" style="margin-bottom:20px;">
      <div class="block-head"><h2>Pre-payroll summary — ${state.payrollRun.month}</h2></div>
      <table><thead><tr><th>Employee</th><th>Gross</th><th>Deductions</th><th>Net Pay</th></tr></thead>
        <tbody>${payable.map(e => { const gross = Math.round(e.ctc / 12); const ded = Math.round(gross * 0.078); return `<tr><td>${e.name}</td><td>₹${gross.toLocaleString("en-IN")}</td><td>₹${ded.toLocaleString("en-IN")}</td><td>₹${(gross - ded).toLocaleString("en-IN")}</td></tr>`; }).join("")}</tbody>
      </table>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;">
        <div class="meta">Total payout: <strong>₹${totalCTC.toLocaleString("en-IN")}</strong> · TDS auto-applied per employee tax regime</div>
        <div class="toolbar">
          <button class="btn sm" onclick="exportPayroll('csv')">⇩ CSV</button>
          <button class="btn sm" onclick="exportPayroll('excel')">⇩ Excel</button>
          <button class="btn primary" ${state.payrollRun.status === "run" ? "disabled" : ""} onclick="runPayroll()">${state.payrollRun.status === "run" ? "Payroll run ✓" : "Run Payroll"}</button>
        </div>
      </div>
    </div>
    <section class="block">
      <div class="block-head"><h2>Attendance calendar (feeds payroll)</h2>
        <select id="calEmpPicker" onchange="drawCalPicker()" style="width:220px;">${payable.map(e => `<option>${e.name}</option>`).join("")}</select>
      </div>
      <div class="card pad" id="calBox">${attendanceCalendarHtml(payable[0].name)}</div>
    </section>
    <section class="block">
      <div class="block-head"><h2>Payslip history</h2></div>
      <div class="card"><table><thead><tr><th>Month</th><th>Employees paid</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <tr><td>July 2026</td><td>${payable.length}</td><td>${statusBadge("approved")}</td><td style="text-align:right;"><button class="btn ghost sm">Download payslips (PDF)</button></td></tr>
          <tr><td>${state.payrollRun.month}</td><td>${payable.length}</td><td>${statusBadge(state.payrollRun.status === "run" ? "approved" : "pending")}</td><td style="text-align:right;"><button class="btn ghost sm" ${state.payrollRun.status !== "run" ? "disabled" : ""}>Download payslips (PDF)</button></td></tr>
        </tbody>
      </table></div>
    </section>
  `;
}
function drawCalPicker() { document.getElementById("calBox").innerHTML = attendanceCalendarHtml(document.getElementById("calEmpPicker").value); }
function runPayroll() { state.payrollRun.status = "run"; renderPayroll(); }
function exportPayroll(fmt) {
  const payable = state.employees.filter(e => e.status !== "exited");
  const rows = [["Employee", "Gross", "Deductions", "Net Pay"]];
  payable.forEach(e => { const gross = Math.round(e.ctc / 12); const ded = Math.round(gross * 0.078); rows.push([e.name, gross, ded, gross - ded]); });
  const fname = "payroll_" + state.payrollRun.month.replace(/\s+/g, "_");
  if (fmt === "csv") exportCSV(fname + ".csv", rows); else exportExcel(fname + ".xlsx", rows);
}

/* ---------------------------------------------------------
   EXPENSES
--------------------------------------------------------- */
function renderExpenses() {
  document.getElementById("main").innerHTML = `
    ${pageHead("Expense Reimbursement", "Approved amounts flow into the next payroll cycle automatically. " + (state.rules.twoLevelApproval.expense ? "Manager approves first, then HR." : "HR approves directly."))}
    <div class="toolbar" style="justify-content:flex-end;margin-bottom:14px;"><button class="btn primary" onclick="openSubmitExpense()">+ Submit expense</button></div>
    <div class="card"><table><thead><tr><th>Employee</th><th>Category</th><th>Amount</th><th>Status</th><th style="text-align:right;">Action</th></tr></thead>
      <tbody id="expRows"></tbody>
    </table></div>
  `;
  drawExpenses();
}
function drawExpenses() {
  const rows = scopedApprovals(state.expenses);
  document.getElementById("expRows").innerHTML = rows.map(x => `
    <tr><td>${x.emp}</td><td>${x.category}</td><td>₹${x.amount.toLocaleString("en-IN")}</td><td>${approvalBadge(x)}</td>
    <td style="text-align:right;">${approvalActionButtons(x, 'exp')}</td></tr>`).join("") || `<tr><td colspan="5"><div class="empty">No expense claims.</div></td></tr>`;
}
function openSubmitExpense() {
  showModal("Submit expense", `
    <div class="field"><label class="field-label">Category</label><select id="exCat">${state.orgStructure.expenseCategories.map(c => `<option>${c}</option>`).join("")}</select></div>
    <div class="field"><label class="field-label">Amount (₹)</label><input type="number" id="exAmt" placeholder="e.g. 850"></div>
    <div class="field"><label class="field-label">Bill / receipt</label><input type="file"></div>
  `, [
    { label: "Cancel", cls: "btn", action: closeModal },
    {
      label: "Submit", cls: "btn primary", action: () => {
        const stage = state.rules.twoLevelApproval.expense && rmOf(state.currentUser.name) ? 'rm' : 'hr';
        state.expenses.unshift({ id: "X-" + Date.now(), emp: state.currentUser.name, category: document.getElementById("exCat").value, amount: Number(document.getElementById("exAmt").value) || 0, stage, status: "pending", rmRemarks: "", hrRemarks: "" });
        closeModal(); drawExpenses();
      }
    }
  ]);
}

/* ---------------------------------------------------------
   COMPLIANCE CALENDAR
--------------------------------------------------------- */
function renderCompliance() {
  document.getElementById("main").innerHTML = `
    ${pageHead("Compliance Calendar & Reminders", "Statutory due dates, auto-generated so nothing slips.")}
    <div class="card"><table><thead><tr><th>Task</th><th>Due date</th><th>Status</th></tr></thead>
      <tbody>${state.compliance.map(c => `<tr><td>${c.task}</td><td>${c.due}</td><td>${statusBadge(c.status === "upcoming" ? "pending" : "active")}</td></tr>`).join("")}</tbody>
    </table></div>
    <div class="grid grid-3" style="margin-top:20px;">
      <div class="card pad"><div class="stat-label">Shops & Establishment</div><div class="stat-note" style="margin-top:8px;">Registration on file · renewal reminder set for 2027-01-01</div></div>
      <div class="card pad"><div class="stat-label">PF / ESI</div><div class="stat-note" style="margin-top:8px;">${state.rules.pfEsi ? "Active." : "Currently toggled off — one click to activate from Rules & Org Structure once headcount crosses the statutory threshold."}</div></div>
      <div class="card pad"><div class="stat-label">Gratuity accrual</div><div class="stat-note" style="margin-top:8px;">Tracked per employee from DOJ · visible only to HR.</div></div>
    </div>
  `;
}

/* ---------------------------------------------------------
   POSH
--------------------------------------------------------- */
function renderPosh() {
  document.getElementById("main").innerHTML = `
    ${pageHead("POSH Internal Committee", "Confidential — visible only to IC members.")}
    <div class="notice">This module is access-restricted. Complaint logs and resolution timelines are only visible to designated Internal Committee members.</div>
    <div class="card pad">
      <div class="field"><label class="field-label">IC Members</label>Divya Menon (Presiding Officer) · Ananya Rao · External Member — Adv. S. Krishnan</div>
      <div class="field"><label class="field-label">Complaint log</label><span class="meta">No open complaints on record.</span></div>
    </div>
  `;
}

/* ---------------------------------------------------------
   HELPDESK
--------------------------------------------------------- */
function renderHelpdesk() {
  document.getElementById("main").innerHTML = `
    ${pageHead("HR Helpdesk / Grievance", "Tickets routed by category — POSH tickets go straight to the IC, confidentially.")}
    <div class="toolbar" style="justify-content:flex-end;margin-bottom:14px;"><button class="btn primary" onclick="openRaiseTicket()">+ Raise a ticket</button></div>
    <div class="card"><table><thead><tr><th>Employee</th><th>Category</th><th>Note</th><th>Status</th><th style="text-align:right;">Action</th></tr></thead>
      <tbody id="ticketRows"></tbody>
    </table></div>
  `;
  drawTickets();
}
function drawTickets() {
  const rows = isAdmin(state.role) ? state.tickets : state.role === "Reporting Manager" ? state.tickets.filter(t => t.emp === state.currentUser.name || rmOf(t.emp) === state.currentUser.name) : state.tickets.filter(t => t.emp === state.currentUser.name);
  const canManage = isAdmin(state.role);
  document.getElementById("ticketRows").innerHTML = rows.map(t => `
    <tr><td>${t.emp}</td><td>${t.category}</td><td>${t.note}</td><td>${statusBadge(t.status)}</td>
    <td style="text-align:right;">
      ${canManage ? `<select onchange="updateTicket('${t.id}', this.value)" style="width:auto;">
        <option value="open" ${t.status === "open" ? "selected" : ""}>Open</option>
        <option value="progress" ${t.status === "progress" ? "selected" : ""}>In Progress</option>
        <option value="resolved" ${t.status === "resolved" ? "selected" : ""}>Resolved</option>
      </select>` : statusBadge(t.status)}
    </td></tr>`).join("") || `<tr><td colspan="5"><div class="empty">No tickets.</div></td></tr>`;
}
function openRaiseTicket() {
  showModal("Raise a ticket", `
    <div class="field"><label class="field-label">Category</label><select id="tkCat"><option>Payroll Query</option><option>Leave Query</option><option>General</option><option>POSH-related (confidential, routed to IC only)</option></select></div>
    <div class="field"><label class="field-label">Note</label><textarea id="tkNote" placeholder="Describe your query..."></textarea></div>
  `, [
    { label: "Cancel", cls: "btn", action: closeModal },
    {
      label: "Submit", cls: "btn primary", action: () => {
        state.tickets.unshift({ id: "T-" + Date.now(), emp: state.currentUser ? state.currentUser.name : "You", category: document.getElementById("tkCat").value, status: "open", note: document.getElementById("tkNote").value || "—" });
        closeModal(); drawTickets();
      }
    }
  ]);
}
function updateTicket(id, status) { state.tickets.find(t => t.id === id).status = status; drawTickets(); }

/* ---------------------------------------------------------
   COMPANY PROFILE — letter templates HR uploads
--------------------------------------------------------- */
function renderCompany() {
  document.getElementById("main").innerHTML = `
    ${pageHead("Company Profile", "Configured once — drives attendance, leave, and payroll automatically. Fine-tune rules anytime from Rules & Org Structure.")}
    <div class="grid grid-2">
      <div class="card pad">
        <div class="block-head"><h2>Registered details</h2></div>
        <div class="field"><label class="field-label">Company name</label>DOTFYI Media Ventures Pvt. Ltd. (StartupNews.fyi)</div>
        <div class="field"><label class="field-label">CIN</label>U74999DL2021PTC123456</div>
        <div class="field"><label class="field-label">Registered state</label>Delhi</div>
      </div>
      <div class="card pad">
        <div class="block-head"><h2>Work policy (from Rules &amp; Org Structure)</h2></div>
        <div class="field"><label class="field-label">Working days</label>${state.rules.workingDaysPattern}</div>
        <div class="field"><label class="field-label">Shift</label>${shiftTimingsLabel()}</div>
        <div class="field"><label class="field-label">Salary period</label>${salaryPeriodLabel()}</div>
      </div>
    </div>
    <section class="block" style="margin-top:20px;">
      <div class="block-head"><h2>Letter templates — drafted and edited right here</h2></div>
      <div class="card"><table><thead><tr><th>Document type</th><th>Draft status</th><th style="text-align:right;">Action</th></tr></thead>
        <tbody>${Object.entries(state.templates).map(([type, t]) => `
          <tr><td>${type}</td><td>${t.content && t.content.trim() ? `<span class="meta">Draft on file — ${t.content.length} characters</span>` : `<span class="badge notuploaded">No draft yet</span>`}</td>
          <td style="text-align:right;"><button class="btn sm" onclick="editTemplate('${type}')">${t.content && t.content.trim() ? "Edit draft" : "Create draft"}</button></td></tr>
        `).join("")}</tbody>
      </table></div>
      <div class="footnote">Every generated document fills in from these drafts using merge-fields, and always shows a full preview to HR before it's approved and sent — nothing is emailed, it lands as a pending action on the recipient's dashboard.</div>
    </section>
  `;
}
function editTemplate(type) {
  const t = state.templates[type];
  const extraTags = type === "Employment Agreement" ? ", {{basic}}, {{hra}}, {{allowances}}" : "";
  showModal("Draft — " + type, `
    <div class="notice info">Merge tags available: {{employee_name}}, {{designation}}, {{team}}, {{doj}}, {{ctc}}${extraTags}. They auto-fill when the document is generated.</div>
    <div class="field"><label class="field-label">Upload a Word document (.docx) to pull its text in — or just type/paste below</label><input type="file" accept=".docx" onchange="handleTemplateWordUpload(this)"></div>
    <div class="field"><textarea id="tmplContent" style="min-height:200px;">${t.content || ""}</textarea></div>
    <button class="btn sm" onclick="previewTemplateSample()">Preview with sample data</button>
    <div id="tmplPreviewBox"></div>
  `, [
    { label: "Cancel", cls: "btn", action: closeModal },
    {
      label: "Save draft", cls: "btn primary", action: () => {
        state.templates[type].content = document.getElementById("tmplContent").value;
        logRuleChange(`Updated "${type}" template draft`);
        closeModal(); renderCompany();
      }
    }
  ]);
}
function handleTemplateWordUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    if (typeof mammoth === "undefined") { alert("Word import library didn't load — try pasting the text directly instead."); return; }
    mammoth.extractRawText({ arrayBuffer: e.target.result }).then(function (result) {
      document.getElementById("tmplContent").value = result.value;
    }).catch(function () {
      alert("Couldn't read that Word file. Try pasting the text directly instead.");
    });
  };
  reader.readAsArrayBuffer(file);
}
function previewTemplateSample() {
  const content = document.getElementById("tmplContent").value;
  const sample = { employee_name: "Jane Doe", designation: "Content Writer", team: "Content", doj: "2026-08-05", ctc: "₹6,00,000", basic: "₹3,00,000", hra: "₹1,20,000", allowances: "₹1,80,000" };
  document.getElementById("tmplPreviewBox").innerHTML = `<div class="notice info" style="white-space:pre-wrap;margin-top:10px;"><strong>Sample preview</strong><br>${mergeTemplate(content, sample)}</div>`;
}

/* ---------------------------------------------------------
   RULES & ORG STRUCTURE — HR Head manages designations, teams,
   expense categories, leave types, and every toggleable rule — anytime.
--------------------------------------------------------- */
function toggle(checked, onchange) { return `<label class="toggle-switch"><input type="checkbox" ${checked ? "checked" : ""} onchange="${onchange}"><span class="toggle-slider"></span></label>`; }

function addDesignation(name, silent) {
  name = name.trim();
  if (!name) return;
  if (!state.orgStructure.designations.includes(name)) {
    state.orgStructure.designations.push(name);
    if (!silent) logRuleChange(`Added designation: ${name}`);
  }
}
function removeDesignation(name) {
  const count = state.employees.filter(e => e.designation === name).length;
  const msg = count > 0 ? `${count} employee(s) currently hold "${name}". Remove it from the list anyway? Their existing records won't change.` : `Remove "${name}" from Organisation Structure?`;
  if (!confirm(msg)) return;
  state.orgStructure.designations = state.orgStructure.designations.filter(d => d !== name);
  logRuleChange(`Removed designation: ${name}`);
  renderRules();
}
function addDesignationFromRules() {
  const input = document.getElementById("newDesigInput");
  if (input.value.trim()) { addDesignation(input.value, false); renderRules(); }
}
function addTeamFromRules() {
  const input = document.getElementById("newTeamInput");
  const name = input.value.trim();
  if (!name) return;
  if (state.teams.some(t => t.name === name)) { alert("That team already exists."); return; }
  state.teams.push({ name, manager: null });
  logRuleChange(`Added team: ${name}`);
  renderRules();
}
function removeTeam(name) {
  if (state.employees.some(e => e.team === name && e.status !== "exited")) {
    alert("Can't remove a team that still has employees assigned. Move them to another team first.");
    return;
  }
  state.teams = state.teams.filter(t => t.name !== name);
  logRuleChange(`Removed team: ${name}`);
  renderRules();
}
function setTeamManager(name, manager) {
  state.teams.find(t => t.name === name).manager = manager || null;
  logRuleChange(`Set Reporting Manager for ${name} to ${manager || "none"}`);
  renderRules();
}
function addExpenseCategory() {
  const input = document.getElementById("newExpCatInput");
  const name = input.value.trim();
  if (!name) return;
  if (!state.orgStructure.expenseCategories.includes(name)) { state.orgStructure.expenseCategories.push(name); logRuleChange(`Added expense category: ${name}`); }
  renderRules();
}
function removeExpenseCategory(name) {
  const count = state.expenses.filter(x => x.category === name).length;
  const msg = count > 0 ? `${count} expense record(s) use "${name}". Remove it from the list anyway? Their existing records won't change.` : `Remove "${name}" from Organisation Structure?`;
  if (!confirm(msg)) return;
  state.orgStructure.expenseCategories = state.orgStructure.expenseCategories.filter(c => c !== name);
  logRuleChange(`Removed expense category: ${name}`);
  renderRules();
}
function addRequiredDocFromRules() {
  const input = document.getElementById("newReqDocInput");
  const name = input.value.trim();
  if (!name) return;
  if (!state.orgStructure.requiredDocuments.includes(name)) { state.orgStructure.requiredDocuments.push(name); logRuleChange(`Added required onboarding document: ${name}`); }
  renderRules();
}
function removeRequiredDoc(name) {
  state.orgStructure.requiredDocuments = state.orgStructure.requiredDocuments.filter(d => d !== name);
  logRuleChange(`Removed required onboarding document: ${name}`);
  renderRules();
}
function addHolidayFromRules() {
  const date = document.getElementById("newHolidayDate").value;
  const name = document.getElementById("newHolidayName").value.trim();
  if (!date || !name) { alert("Both a date and a name are needed."); return; }
  state.orgStructure.holidays.push({ date, name });
  state.orgStructure.holidays.sort((a, b) => a.date.localeCompare(b.date));
  logRuleChange(`Added holiday: ${name} (${date})`);
  renderRules();
}
function removeHoliday(date, name) {
  state.orgStructure.holidays = state.orgStructure.holidays.filter(h => !(h.date === date && h.name === name));
  logRuleChange(`Removed holiday: ${name} (${date})`);
  renderRules();
}
function updateSalaryFrom(val) { state.rules.salaryPeriodFrom = Number(val); logRuleChange(`Set salary period start day to ${val}`); renderRules(); }
function updateSalaryTo(val) { state.rules.salaryPeriodTo = val === "last" ? "last" : Number(val); logRuleChange(`Set salary period end to ${val === "last" ? "last day of month" : val}`); renderRules(); }
function updateCtcSplit() {
  const b = Number(document.getElementById("ctcBasicPct").value) || 0;
  const h = Number(document.getElementById("ctcHraPct").value) || 0;
  const a = Number(document.getElementById("ctcAllowPct").value) || 0;
  if (b + h + a !== 100) { alert(`Basic + HRA + Allowances must add up to 100%. Currently: ${b + h + a}%`); return; }
  state.rules.ctcSplit = { basic: b, hra: h, allowances: a };
  logRuleChange(`Updated CTC split to Basic ${b}% / HRA ${h}% / Allowances ${a}%`);
  renderRules();
}
function addLeaveTypeFromRules() {
  const input = document.getElementById("newLeaveTypeInput");
  const name = input.value.trim();
  if (!name) return;
  if (state.rules.leaveTypes[name] !== undefined) { alert("That leave type already exists."); return; }
  state.rules.leaveTypes[name] = true;
  logRuleChange(`Added leave type: ${name}`);
  renderRules();
}

function renderRules() {
  const r = state.rules;
  document.getElementById("main").innerHTML = `
    ${pageHead("Rules & Organisation Structure", "Build out your org here — designations, teams, categories — and every rule below is a toggle you can flip anytime.")}

    <section class="block">
      <div class="block-head"><h2>Teams &amp; Reporting Managers</h2></div>
      <div class="card pad">
        <div class="rule-desc" style="margin-bottom:10px;">Add as many teams as you need. Each team has one Reporting Manager, who then sees only that team plus their own chain upward.</div>
        <table><thead><tr><th>Team</th><th>Reporting Manager</th><th></th></tr></thead>
          <tbody>${state.teams.map(t => `
            <tr><td>${t.name}</td>
            <td><select onchange="setTeamManager('${t.name}', this.value)" style="width:220px;">
              <option value="">— None —</option>
              ${state.employees.filter(e => e.status !== "exited").map(e => `<option value="${e.name}" ${t.manager === e.name ? "selected" : ""}>${e.name}</option>`).join("")}
            </select></td>
            <td style="text-align:right;">${t.name === "Leadership" ? "" : `<button class="btn ghost sm" onclick="removeTeam('${t.name}')">Remove</button>`}</td></tr>`).join("")}
          </tbody>
        </table>
        <div class="add-inline" style="margin-top:14px;">
          <input type="text" id="newTeamInput" placeholder="e.g. Tech">
          <button class="btn sm" onclick="addTeamFromRules()">+ Add team</button>
        </div>
      </div>
    </section>

    <section class="block">
      <div class="block-head"><h2>Designations</h2></div>
      <div class="card pad">
        <div class="rule-desc" style="margin-bottom:10px;">This list feeds the Designation dropdown everywhere — offer letters, onboarding, directory. If a designation is missing while onboarding, HR can add it right there too — it lands here automatically for future use.</div>
        <div class="chip-list">${state.orgStructure.designations.map(d => `<span class="chip">${d} <button onclick="removeDesignation('${d}')" title="Remove">×</button></span>`).join("")}</div>
        <div class="add-inline">
          <input type="text" id="newDesigInput" placeholder="e.g. Growth Marketer">
          <button class="btn sm" onclick="addDesignationFromRules()">+ Add designation</button>
        </div>
      </div>
    </section>

    <section class="block">
      <div class="block-head"><h2>Expense categories</h2></div>
      <div class="card pad">
        <div class="chip-list">${state.orgStructure.expenseCategories.map(c => `<span class="chip">${c} <button onclick="removeExpenseCategory('${c}')" title="Remove">×</button></span>`).join("")}</div>
        <div class="add-inline">
          <input type="text" id="newExpCatInput" placeholder="e.g. Events">
          <button class="btn sm" onclick="addExpenseCategory()">+ Add category</button>
        </div>
      </div>
    </section>

    <section class="block">
      <div class="block-head"><h2>Required onboarding documents</h2></div>
      <div class="card pad">
        <div class="rule-desc" style="margin-bottom:10px;">This checklist is what every new hire is asked to upload, and what shows up in every employee's My Documents. Add or remove document types here, once.</div>
        <div class="chip-list">${state.orgStructure.requiredDocuments.map(d => `<span class="chip">${d} <button onclick="removeRequiredDoc('${d}')" title="Remove">×</button></span>`).join("")}</div>
        <div class="add-inline">
          <input type="text" id="newReqDocInput" placeholder="e.g. PF Nomination Form">
          <button class="btn sm" onclick="addRequiredDocFromRules()">+ Add document type</button>
        </div>
      </div>
    </section>

    <section class="block">
      <div class="block-head"><h2>Holiday calendar</h2></div>
      <div class="card pad">
        <div class="rule-desc" style="margin-bottom:10px;">Feeds the attendance calendar's week-off/holiday colouring and the optional-holiday pool.</div>
        <table><thead><tr><th>Date</th><th>Holiday</th><th></th></tr></thead>
          <tbody>${state.orgStructure.holidays.map(h => `<tr><td>${h.date}</td><td>${h.name}</td><td style="text-align:right;"><button class="btn ghost sm" onclick="removeHoliday('${h.date}','${h.name.replace(/'/g, "\\'")}')">Remove</button></td></tr>`).join("")}</tbody>
        </table>
        <div class="add-inline" style="margin-top:12px;">
          <input type="date" id="newHolidayDate" style="max-width:170px;">
          <input type="text" id="newHolidayName" placeholder="e.g. Holi">
          <button class="btn sm" onclick="addHolidayFromRules()">+ Add holiday</button>
        </div>
      </div>
    </section>

    <section class="block">
      <div class="block-head"><h2>CTC structure</h2></div>
      <div class="card pad">
        <div class="rule-desc" style="margin-bottom:10px;">Used to split annual CTC into Basic / HRA / Allowances wherever it's shown — offer letters, agreements, payroll. Must add up to 100%.</div>
        <div class="rule-inputs">
          Basic <input class="mini-input" type="number" id="ctcBasicPct" value="${r.ctcSplit.basic}">%
          HRA <input class="mini-input" type="number" id="ctcHraPct" value="${r.ctcSplit.hra}">%
          Allowances <input class="mini-input" type="number" id="ctcAllowPct" value="${r.ctcSplit.allowances}">%
          <button class="btn sm" onclick="updateCtcSplit()">Save split</button>
        </div>
      </div>
    </section>

    <section class="block">
      <div class="block-head"><h2>Attendance &amp; leave window rules</h2></div>
      <div class="card pad">
        <div class="rule-row">
          <div><div class="rule-name">Shift timings (punch in / punch out)</div><div class="rule-desc">Official shift start and end time. Shown to employees on their Attendance page and in Company Profile.</div></div>
          <div class="rule-inputs">
            In <input type="time" id="shiftStartTime" value="${r.shiftStartTime}" onchange="updateRule('shiftStartTime', this.value)" style="width:120px;">
            Out <input type="time" id="shiftEndTime" value="${r.shiftEndTime}" onchange="updateRule('shiftEndTime', this.value)" style="width:120px;">
          </div>
        </div>
        <div class="rule-row">
          <div><div class="rule-name">Grace period</div><div class="rule-desc">Minutes after shift start before a punch-in counts as late.</div></div>
          <div class="rule-inputs"><input class="mini-input" type="number" id="shiftGraceMinutes" value="${r.shiftGraceMinutes}" onchange="updateRule('shiftGraceMinutes', Number(this.value))"> min</div>
        </div>
        <div class="rule-row">
          <div><div class="rule-name">Half-day threshold</div><div class="rule-desc">Minimum hours worked in a day before it counts as a full day rather than a half day.</div></div>
          <div class="rule-inputs"><input class="mini-input" type="number" id="halfDayThresholdHours" value="${r.halfDayThresholdHours}" onchange="updateRule('halfDayThresholdHours', Number(this.value))"> hrs</div>
        </div>
        <div class="rule-row">
          <div><div class="rule-name">Regularization window</div><div class="rule-desc">How many days after an attendance date an employee may still request regularization.</div></div>
          <div class="rule-inputs"><input class="mini-input" type="number" id="regWindow" value="${r.regularizationWindowDays}" onchange="updateRule('regularizationWindowDays', Number(this.value))"> days</div>
        </div>
        <div class="rule-row">
          <div><div class="rule-name">Admin override past window</div><div class="rule-desc">Allow HR to manually accept a regularization request submitted after the window has closed.</div></div>
          ${toggle(r.regularizationOverride, "updateRuleBool('regularizationOverride', this.checked)")}
        </div>
        <div class="rule-row">
          <div><div class="rule-name">Salary calculation period</div><div class="rule-desc">Defines the payroll cycle used across payroll, attendance-linked pay, and reports.</div></div>
          <div class="rule-inputs">
            From day <select onchange="updateSalaryFrom(this.value)" style="width:80px;">${Array.from({ length: 31 }, (_, i) => i + 1).map(d => `<option value="${d}" ${r.salaryPeriodFrom === d ? "selected" : ""}>${d}</option>`).join("")}</select>
            To <select onchange="updateSalaryTo(this.value)" style="width:140px;">
              <option value="last" ${r.salaryPeriodTo === "last" ? "selected" : ""}>Last day of month</option>
              ${Array.from({ length: 31 }, (_, i) => i + 1).map(d => `<option value="${d}" ${r.salaryPeriodTo === d ? "selected" : ""}>${d}</option>`).join("")}
            </select>
          </div>
        </div>
      </div>
    </section>

    <section class="block">
      <div class="block-head"><h2>Approval chain — per module</h2></div>
      <div class="card pad">
        ${["leave", "attendance", "expense"].map(m => `
        <div class="rule-row">
          <div><div class="rule-name">Two-level approval — ${m === "attendance" ? "Attendance regularization" : m.charAt(0).toUpperCase() + m.slice(1)}</div><div class="rule-desc">On: Reporting Manager approves first, then HR Head. Off: HR Head approves directly.</div></div>
          ${toggle(r.twoLevelApproval[m], `updateApprovalRule('${m}', this.checked)`)}
        </div>`).join("")}
      </div>
    </section>

    <section class="block">
      <div class="block-head"><h2>Leave types</h2></div>
      <div class="card pad">
        <div class="rule-desc" style="margin-bottom:8px;">Untick a type and it disappears everywhere — application dropdown, balances, reports. Add a custom type if you need one beyond the defaults.</div>
        ${Object.entries(r.leaveTypes).map(([type, on]) => `
        <div class="rule-row"><div class="rule-name">${type}</div>${toggle(on, `updateLeaveType('${type}', this.checked)`)}</div>`).join("")}
        <div class="add-inline" style="margin-top:12px;">
          <input type="text" id="newLeaveTypeInput" placeholder="e.g. Sabbatical">
          <button class="btn sm" onclick="addLeaveTypeFromRules()">+ Add leave type</button>
        </div>
      </div>
    </section>

    <section class="block">
      <div class="block-head"><h2>Other configurable rules</h2></div>
      <div class="card pad">
        <div class="rule-row"><div><div class="rule-name">Late-mark penalty</div><div class="rule-desc">Deduct leave for repeated late marks.</div></div>${toggle(r.lateMarkPenalty, "updateRuleBool('lateMarkPenalty', this.checked)")}</div>
        <div class="rule-row"><div><div class="rule-name">Geo-fencing</div><div class="rule-desc">Restrict punch-in to within a radius of office location(s).</div></div>${toggle(r.geoFencing, "updateRuleBool('geoFencing', this.checked)")}</div>
        <div class="rule-row"><div><div class="rule-name">Selfie check-in</div><div class="rule-desc">Require a photo capture at punch in/out.</div></div>${toggle(r.selfieCheckin, "updateRuleBool('selfieCheckin', this.checked)")}</div>
        <div class="rule-row"><div><div class="rule-name">PF / ESI statutory modules</div><div class="rule-desc">Keep off until headcount/wage crosses the statutory threshold — one click to activate later.</div></div>${toggle(r.pfEsi, "updateRuleBool('pfEsi', this.checked)")}</div>
        <div class="rule-row"><div><div class="rule-name">Optional holiday self-selection</div><div class="rule-desc">Let employees pick their own festival holidays from a pool.</div></div>${toggle(r.optionalHolidayChoice, "updateRuleBool('optionalHolidayChoice', this.checked)")}</div>
        <div class="rule-row"><div><div class="rule-name">Asset issuance/return checklist</div><div class="rule-desc">Track laptop/ID/access card handover in onboarding and offboarding.</div></div>${toggle(r.assetChecklist, "updateRuleBool('assetChecklist', this.checked)")}</div>
      </div>
    </section>

    <section class="block">
      <div class="block-head"><h2>Sample data</h2></div>
      <div class="card pad" style="border-color:#FECACA;">
        <div class="rule-desc" style="margin-bottom:10px;">Wipes every sample employee, onboarding record, attendance/leave/expense entry, and ticket — so you can start entering real data. Your Teams, Designations, Rules, and Templates are kept, since that's real setup, not sample data. Your own login is kept so you don't get locked out. This can't be undone.</div>
        <button class="btn reject" onclick="resetSampleData()">⚠ Delete all sample data</button>
      </div>
    </section>

    <section class="block">
      <div class="block-head"><h2>Recent changes (audit log)</h2></div>
      <div class="card"><table><thead><tr><th>When</th><th>Who</th><th>Change</th></tr></thead>
        <tbody>${state.auditLog.slice(0, 10).map(a => `<tr><td>${a.ts}</td><td>${a.who}</td><td>${a.change}</td></tr>`).join("")}</tbody>
      </table></div>
    </section>
  `;
}
function resetSampleData() {
  const typed = prompt('This deletes all sample employees and records except your own login. Type "RESET" to confirm.');
  if (typed !== "RESET") { if (typed !== null) alert('Not confirmed — type RESET exactly to proceed.'); return; }
  const me = state.currentUser;
  state.employees = [{ ...me, manager: null, ctcSplitOverride: null }];
  state.teams.forEach(t => { if (t.manager && t.manager !== me.name) t.manager = null; });
  state.onboarding = [];
  state.attendance = [];
  state.attendanceOverrides = {};
  state.regularizations = [];
  state.leaveRequests = [];
  state.expenses = [];
  state.tickets = [];
  state.payrollRun = { month: state.payrollRun.month, status: "not_run" };
  logRuleChange("Reset all sample data (kept Teams, Org Structure, Rules, and Templates)");
  alert("Sample data cleared. Your Directory now has just your own account — add real employees from here.");
  renderRules();
}
function logRuleChange(text) { state.auditLog.unshift({ ts: TODAY, who: (state.currentUser ? state.currentUser.name : "HR") + " (" + state.role + ")", change: text }); }
function updateRule(key, value) { state.rules[key] = value; logRuleChange(`Set ${key} to "${value}"`); renderRules(); }
function updateRuleBool(key, value) { state.rules[key] = value; logRuleChange(`${value ? "Enabled" : "Disabled"} ${key}`); renderRules(); }
function updateApprovalRule(mod, value) { state.rules.twoLevelApproval[mod] = value; logRuleChange(`${value ? "Enabled" : "Disabled"} two-level approval for ${mod}`); renderRules(); }
function updateLeaveType(type, value) { state.rules.leaveTypes[type] = value; logRuleChange(`${value ? "Enabled" : "Disabled"} leave type: ${type}`); renderRules(); }

/* ---------------------------------------------------------
   MY DOCUMENTS — upload/re-upload anytime, download signed letters
--------------------------------------------------------- */
function myDocumentRows() {
  const me = state.currentUser;
  const existing = me.documents || [];
  return state.orgStructure.requiredDocuments.map(name => existing.find(d => d.name === name) || { name, status: "not_uploaded" });
}
function renderDocuments() {
  const me = state.currentUser;
  const docs = myDocumentRows();
  const signed = me.signedDocs || [];
  document.getElementById("main").innerHTML = `
    ${pageHead("My Documents", "Everything of yours — identity documents, signed letters, and payslips. Upload or update anytime, not just during onboarding.")}
    <section class="block">
      <div class="block-head"><h2>Identity &amp; onboarding documents</h2></div>
      <div class="meta" style="margin-bottom:10px;">This checklist is set by HR under Organisation Structure — you can upload or replace any of these anytime.</div>
      <div class="card"><table><thead><tr><th>Document</th><th>Status</th><th style="text-align:right;">Action</th></tr></thead>
        <tbody>${docs.map(d => `
          <tr><td>${d.name}</td><td>${statusBadge(d.status)}</td>
          <td style="text-align:right;"><label class="btn sm" style="display:inline-block;">${d.status === "not_uploaded" ? "Upload" : d.status === "rejected" ? "Re-upload" : "Replace"}<input type="file" style="display:none;" onchange="myDocUploadOrReplace('${d.name.replace(/'/g, "\\'")}')"></label></td></tr>
        `).join("")}</tbody>
      </table></div>
    </section>
    <section class="block">
      <div class="block-head"><h2>Signed letters</h2></div>
      <div class="card">${signed.length ? `<table><thead><tr><th>Document</th><th>Signed on</th><th style="text-align:right;">Action</th></tr></thead>
        <tbody>${signed.map((d, i) => `<tr><td>${d.type}</td><td>${d.signedDate}</td><td style="text-align:right;"><button class="btn ghost sm" onclick="downloadSignedDoc(${i})">⇩ Download</button></td></tr>`).join("")}</tbody></table>` : `<div class="empty">No signed documents yet.</div>`}</div>
    </section>
    <div class="footnote">Payslips live under Payroll. Nothing here is ever emailed — download a copy directly whenever you need one.</div>
  `;
}
function myDocUploadOrReplace(name) {
  const me = state.currentUser;
  me.documents = me.documents || [];
  const existing = me.documents.find(d => d.name === name);
  if (existing) { existing.status = "pending"; } else { me.documents.push({ name, status: "pending" }); }
  renderDocuments();
}
function downloadSignedDoc(idx) {
  const d = state.currentUser.signedDocs[idx];
  downloadDoc(d.type.replace(/\s+/g, "_") + ".txt", d.content);
}

/* ---------------------------------------------------------
   Modal helper
--------------------------------------------------------- */
function showModal(title, bodyHtml, buttons) {
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="modal">
        <div class="modal-head"><h3>${title}</h3><button class="x-close" onclick="closeModal()">×</button></div>
        <div class="modal-body">${bodyHtml}</div>
        <div class="modal-foot" id="modalFoot"></div>
      </div>
    </div>`;
  const foot = document.getElementById("modalFoot");
  buttons.forEach(b => {
    const btn = document.createElement("button");
    btn.className = b.cls; btn.textContent = b.label; btn.onclick = b.action;
    foot.appendChild(btn);
  });
  document.getElementById("modalBackdrop").addEventListener("click", e => { if (e.target.id === "modalBackdrop") closeModal(); });
}
function closeModal() { document.getElementById("modalRoot").innerHTML = ""; }

render();
