// Popup script — autenticação + seleção de conta + captura
const GENTIA_URL = "https://gentia.tech";
const SUPABASE_URL = "https://tdyvuomybimgygjgvnrk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkeXZ1b215YmltZ3lnamd2bnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNTQwMDksImV4cCI6MjA5NTkzMDAwOX0.5TkRRgBXweXTIHapMy1f-9kSSzBeQu-s8NqxwTzsM6Q";

const STORAGE_KEY = "gentia_session_v3";
const root = document.getElementById("content");
const logoutBtn = document.getElementById("logout");

logoutBtn.addEventListener("click", async () => {
  await chrome.storage.local.remove(STORAGE_KEY);
  render();
});

async function getSession() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const s = data[STORAGE_KEY];
  if (!s) return null;
  if (s.expires_at && s.expires_at * 1000 < Date.now()) return null;
  return s;
}

async function saveSession(s) {
  await chrome.storage.local.set({ [STORAGE_KEY]: s });
}

async function patchSession(patch) {
  const s = (await getSession()) || {};
  await saveSession({ ...s, ...patch });
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function isLinkedInProfile(url) {
  return /^https:\/\/www\.linkedin\.com\/in\//.test(url || "");
}

async function extractFromPage(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: "GENTIA_EXTRACT_PROFILE" }, (resp) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(resp || { ok: false, error: "Sem resposta do conteúdo" });
      }
    });
  });
}

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "html") e.innerHTML = v;
    else if (v != null) e.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null) continue;
    e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return e;
}

function clear() { root.innerHTML = ""; }

// ---------- Login ----------

function renderLogin(error) {
  clear();
  logoutBtn.hidden = true;
  const form = el("form", { onsubmit: handleLogin });
  if (error) form.appendChild(el("div", { class: "error" }, error));
  form.appendChild(
    el("div", { class: "field" },
      el("label", {}, "E-mail"),
      el("input", { type: "email", id: "email", required: true, placeholder: "voce@empresa.com" })
    )
  );
  form.appendChild(
    el("div", { class: "field" },
      el("label", {}, "Senha"),
      el("input", { type: "password", id: "password", required: true })
    )
  );
  form.appendChild(el("button", { class: "btn", type: "submit" }, "Entrar"));
  form.appendChild(el("p", { class: "tip" }, "Use sua conta GENTIA. Sessão salva por 7 dias."));
  root.appendChild(form);
}

async function handleLogin(ev) {
  ev.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return renderLogin(err.error_description || err.msg || "E-mail ou senha inválidos");
    }
    const data = await resp.json();
    await saveSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
      user_id: data?.user?.id,
      account_id: null,
    });
    render();
  } catch (e) {
    renderLogin("Erro de rede: " + e.message);
  }
}

// ---------- Seleção de conta ----------

async function fetchAccounts(session) {
  const url = `${SUPABASE_URL}/rest/v1/account_members?user_id=eq.${session.user_id}&select=account_id,companies(name)`;
  const resp = await fetch(url, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` },
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    console.error("[GENTIA] fetchAccounts failed:", resp.status, errText);
    return { error: `Falha ao carregar contas (${resp.status}). Tente novamente.` };
  }
  const rows = await resp.json();
  return rows.map((r) => ({
    account_id: r.account_id,
    name: r.companies?.name || r.account_id.slice(0, 8),
  }));
}

async function renderAccountPicker(accounts, currentId) {
  clear();
  logoutBtn.hidden = false;
  root.appendChild(el("div", { class: "field" },
    el("label", {}, "Selecione a conta"),
    (() => {
      const sel = el("select", { id: "accountSelect" });
      for (const a of accounts) {
        const opt = el("option", { value: a.account_id }, a.name);
        if (a.account_id === currentId) opt.selected = true;
        sel.appendChild(opt);
      }
      return sel;
    })()
  ));
  const btn = el("button", { class: "btn" }, "Confirmar");
  btn.addEventListener("click", async () => {
    const id = document.getElementById("accountSelect").value;
    await patchSession({ account_id: id });
    render();
  });
  root.appendChild(btn);
}

// ---------- Estados de captura ----------

function renderEmpty(accountName) {
  clear();
  logoutBtn.hidden = false;
  const wrap = el("div", { class: "empty" },
    el("div", { html: "Navegue até um perfil do LinkedIn para capturar." }),
    el("div", { style: "margin-top:8px" },
      el("code", {}, "linkedin.com/in/nome-da-pessoa")
    )
  );
  root.appendChild(wrap);
  if (accountName) {
    const swap = el("button", { class: "link", style: "margin-top:12px" }, `Conta: ${accountName} — trocar`);
    swap.addEventListener("click", switchAccount);
    root.appendChild(swap);
  }
}

async function switchAccount() {
  const session = await getSession();
  if (!session) return render();
  const accounts = await fetchAccounts(session);
  if (!Array.isArray(accounts) || accounts.length <= 1) return render();
  await renderAccountPicker(accounts, session.account_id);
}

function renderProfile(profile, tab, accountName) {
  clear();
  logoutBtn.hidden = false;

  const card = el("div", { class: "profile-card" });
  if (profile.photo_url) {
    card.appendChild(el("img", { src: profile.photo_url, alt: "" }));
  } else {
    card.appendChild(el("div", { style: "width:48px;height:48px;border-radius:50%;background:#eee" }));
  }
  const meta = el("div", { class: "meta" });
  meta.appendChild(el("div", { class: "name" }, profile.name || "Perfil sem nome"));
  if (profile.headline) meta.appendChild(el("div", {}, profile.headline));
  if (profile.location) meta.appendChild(el("div", {}, profile.location));
  if (profile.current_company) meta.appendChild(el("div", {}, profile.current_company));
  card.appendChild(meta);
  root.appendChild(card);

  const jobField = el("div", { class: "field" },
    el("label", {}, "Adicionar à vaga (opcional)"),
    el("select", { id: "jobSelect" },
      el("option", { value: "" }, "Carregando vagas…")
    )
  );
  root.appendChild(jobField);

  const submit = el("button", { class: "btn", id: "submitBtn" }, "Adicionar ao GENTIA");
  submit.addEventListener("click", () => sendCapture(profile, tab));
  root.appendChild(submit);

  if (accountName) {
    const swap = el("button", { class: "link", style: "margin-top:8px;display:block;width:100%;text-align:center" }, `Conta: ${accountName} — trocar`);
    swap.addEventListener("click", switchAccount);
    root.appendChild(swap);
  }

  loadJobs();
}

async function loadJobs() {
  const session = await getSession();
  if (!session?.account_id) return;
  const select = document.getElementById("jobSelect");
  if (!select) return;
  try {
    const url = `${SUPABASE_URL}/rest/v1/recruitment_jobs?select=id,title,status&account_id=eq.${session.account_id}&status=in.(active,published,draft)&order=created_at.desc&limit=100`;
    const resp = await fetch(url, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` },
    });
    if (!resp.ok) {
      select.innerHTML = "";
      select.appendChild(el("option", { value: "" }, "Não foi possível carregar vagas"));
      return;
    }
    const jobs = await resp.json();
    select.innerHTML = "";
    select.appendChild(el("option", { value: "" }, jobs.length ? "Selecionar vaga…" : "Nenhuma vaga ativa"));
    for (const j of jobs) {
      const opt = document.createElement("option");
      opt.value = j.id;
      opt.textContent = j.status === "draft" ? `${j.title} (rascunho)` : j.title;
      select.appendChild(opt);
    }
  } catch (_) {
    select.innerHTML = "";
    select.appendChild(el("option", { value: "" }, "Erro ao carregar vagas"));
  }
}

async function sendCapture(profile, tab) {
  const session = await getSession();
  if (!session?.account_id) return render();
  const submit = document.getElementById("submitBtn");
  if (submit) { submit.disabled = true; submit.textContent = "Enviando…"; }
  const jobId = document.getElementById("jobSelect")?.value || null;

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/extension-capture-profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        account_id: session.account_id,
        captured_by: session.user_id,
        job_id: jobId || null,
        profile_data: profile,
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `Erro ${resp.status}`);
    }
    const data = await resp.json();
    if (data.is_duplicate) renderDuplicate(data);
    else renderSuccess(data);
  } catch (e) {
    clear();
    root.appendChild(el("div", { class: "error" }, e.message || String(e)));
    const back = el("button", { class: "btn secondary" }, "Tentar de novo");
    back.addEventListener("click", () => render());
    root.appendChild(back);
  }
}

function renderDuplicate(data) {
  clear();
  root.appendChild(el("div", { class: "warning" },
    el("div", { html: `<strong>Candidato já cadastrado</strong>` }),
    el("div", { style: "margin-top:6px" }, `${data.candidate_name || "Este perfil"} já está no seu banco.`)
  ));
  const view = el("button", { class: "btn" }, "Ver no GENTIA");
  view.addEventListener("click", () => chrome.tabs.create({ url: `${GENTIA_URL}${data.candidate_url}` }));
  root.appendChild(view);
}

function renderSuccess(data) {
  clear();
  root.appendChild(el("div", { class: "success" },
    el("div", { html: "✅ <strong>Adicionado com sucesso!</strong>" }),
    el("div", { style: "margin-top:6px" }, `${data.candidate_name} foi adicionado ao seu banco.`)
  ));
  const view = el("button", { class: "btn" }, "Ver no GENTIA →");
  view.addEventListener("click", () => chrome.tabs.create({ url: `${GENTIA_URL}${data.candidate_url}` }));
  root.appendChild(view);
}

// ---------- Render principal ----------

async function render() {
  const session = await getSession();
  if (!session) return renderLogin();
  logoutBtn.hidden = false;

  // Garantir conta selecionada
  if (!session.account_id) {
    clear();
    root.appendChild(el("div", { class: "loading" }, "Carregando contas…"));
    const accounts = await fetchAccounts(session);
    if (!Array.isArray(accounts)) {
      clear();
      root.appendChild(el("div", { class: "error" }, accounts.error || "Erro ao carregar contas."));
      return;
    }
    if (accounts.length === 0) {
      clear();
      root.appendChild(el("div", { class: "error" }, "Sua conta não tem acesso a nenhuma organização no GENTIA."));
      return;
    }
    if (accounts.length === 1) {
      await patchSession({ account_id: accounts[0].account_id, account_name: accounts[0].name });
      return render();
    }
    return renderAccountPicker(accounts, null);
  }

  // Buscar nome da conta (se ainda não cacheado)
  let accountName = session.account_name;
  if (!accountName) {
    const accounts = await fetchAccounts(session);
    const found = Array.isArray(accounts) ? accounts.find((a) => a.account_id === session.account_id) : null;
    accountName = found?.name || "";
    if (accountName) await patchSession({ account_name: accountName });
  }

  const tab = await getActiveTab();
  if (!isLinkedInProfile(tab?.url)) return renderEmpty(accountName);

  clear();
  root.appendChild(el("div", { class: "loading" }, "Lendo perfil…"));

  const result = await extractFromPage(tab.id);
  if (!result?.ok || !result?.profile) {
    clear();
    root.appendChild(el("div", { class: "error" }, "Não consegui ler este perfil. Recarregue a página e tente de novo."));
    return;
  }
  renderProfile(result.profile, tab, accountName);
}

render();
