const $ = id => document.getElementById(id);
let items = JSON.parse(localStorage.getItem("td-items") || "[]");
let connections = JSON.parse(localStorage.getItem("td-connections") || "[]");
let investigations = JSON.parse(localStorage.getItem("td-investigations") || "[]");

// Give older evidence records stable IDs so connections survive refreshes.
items.forEach((item, index) => { if (!item.id) item.id = "legacy-" + index; });

function esc(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}
function saveAll() {
  localStorage.setItem("td-items", JSON.stringify(items));
  localStorage.setItem("td-connections", JSON.stringify(connections));
}
function evidenceById(id) { return items.find(item => item.id === id); }

function draw() {
  $("items").innerHTML = items.map(item => `
    <article class="evidence-card">
      <b>${esc(item.claim)}</b>
      <p>${esc(item.kind)} · ${esc(item.status)}</p>
      <p><strong>Source:</strong> ${esc(item.source) || "Not recorded"}</p>
      ${item.pattern ? `<p><strong>Observed pattern:</strong> ${esc(item.pattern)}</p>` : ""}
      ${item.meaning ? `<p><strong>Possible meaning:</strong> ${esc(item.meaning)}</p>` : ""}
      ${item.alternative ? `<p><strong>Alternative explanation:</strong> ${esc(item.alternative)}</p>` : ""}
      <p><strong>Supports:</strong> ${esc(item.support) || "Not recorded"}</p>
      <p><strong>Challenges:</strong> ${esc(item.challenge) || "Not recorded"}</p>
      <button class="secondary" onclick="removeItem('${esc(item.id)}')">Delete evidence</button>
    </article>
  `).join("");
  drawConnectionSelectors();
  drawConnections();
}

function drawConnectionSelectors() {
  const options = items.map(item => `<option value="${esc(item.id)}">${esc(item.claim)} — ${esc(item.kind)}</option>`).join("");
  $("fromEvidence").innerHTML = options;
  $("toEvidence").innerHTML = options;
  if (items.length > 1 && $("toEvidence").options.length > 1) $("toEvidence").selectedIndex = 1;
  $("addConnection").disabled = items.length < 2;
  $("addConnection").title = items.length < 2 ? "Add at least two evidence records first" : "Connect two evidence records";
}
function drawConnections() {
  const host = $("connections");
  if (!connections.length) {
    host.innerHTML = '<div class="empty-map"><div class="empty-node">Evidence</div><div class="empty-link">↕</div><div class="empty-node">Evidence</div><p>Your first connection will appear here. Add at least two evidence records, then connect them.</p></div>';
    return;
  }
  host.innerHTML = connections.map(link => {
    const a = evidenceById(link.from), b = evidenceById(link.to);
    if (!a || !b) return "";
    return `
      <article class="connection-card">
        <div class="connection-nodes">
          <div class="map-node"><span>${esc(a.kind)}</span><strong>${esc(a.claim)}</strong></div>
          <div class="link-bridge"><span class="bridge-line"></span><span class="bridge-label">CONNECTED BY</span><span class="bridge-line"></span></div>
          <div class="map-node"><span>${esc(b.kind)}</span><strong>${esc(b.claim)}</strong></div>
        </div>
        <p class="connection-idea"><strong>Possible connection:</strong> ${esc(link.text)}</p>
        ${link.reason ? `<p><strong>Why it may matter:</strong> ${esc(link.reason)}</p>` : ""}
        <span class="strength strength-${link.strength.toLowerCase()}">${esc(link.strength)}</span>
        <button class="secondary delete-link" onclick="removeConnection('${esc(link.id)}')">Remove connection</button>
      </article>`;
  }).join("") || '<p class="small-note">Some links refer to evidence that has been deleted. Remove those links or add the evidence again.</p>';
}

window.removeItem = id => {
  items = items.filter(item => item.id !== id);
  connections = connections.filter(link => link.from !== id && link.to !== id);
  saveAll(); draw();
};
window.removeConnection = id => {
  connections = connections.filter(link => link.id !== id);
  saveAll(); draw();
};

$("add").onclick = () => $("dlg").showModal();
$("addConnection").onclick = () => {
  if (items.length < 2) return;
  drawConnectionSelectors();
  $("connectionDlg").showModal();
};
$("save").onclick = event => {
  event.preventDefault();
  items.push({
    id: "e-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    claim: $("claim").value, kind: $("kind").value, status: $("status").value,
    source: $("source").value, pattern: $("pattern").value, meaning: $("meaning").value,
    alternative: $("alternative").value, support: $("support").value, challenge: $("challenge").value
  });
  saveAll(); draw(); $("dlg").close();
  ["claim", "source", "pattern", "meaning", "alternative", "support", "challenge"].forEach(id => $(id).value = "");
};
$("saveConnection").onclick = event => {
  event.preventDefault();
  const from = $("fromEvidence").value, to = $("toEvidence").value;
  if (!from || !to || from === to) {
    alert("Please choose two different evidence records.");
    return;
  }
  connections.push({
    id: "c-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    from, to, text: $("connectionText").value,
    reason: $("connectionReason").value, strength: $("connectionStrength").value
  });
  saveAll(); draw(); $("connectionDlg").close();
  $("connectionText").value = ""; $("connectionReason").value = "";
  $("connectionStrength").value = "Tentative";
};
saveAll();
draw();

// AI investigator — calls the Cloudflare Worker; the API key never reaches the browser.
const DETECTIVE_API = "https://truth-detective-ai.garethedmond73.workers.dev/ask";
let latestInvestigation = null;

function saveInvestigations() {
  localStorage.setItem("td-investigations", JSON.stringify(investigations));
}
function renderCitations(container, citations) {
  if (!Array.isArray(citations) || !citations.length) return;
  const heading = document.createElement("h3");
  heading.textContent = "Sources";
  container.appendChild(heading);
  const list = document.createElement("ul");
  citations.forEach(source => {
    if (!source.url || !(source.url.startsWith("https://") || source.url.startsWith("http://"))) return;
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = source.title || source.url;
    li.appendChild(link);
    list.appendChild(li);
  });
  if (list.children.length) container.appendChild(list);
}
function renderInvestigationArchive() {
  const host = $("investigationArchive");
  if (!host) return;
  if (!investigations.length) {
    host.innerHTML = '<p class="small-note">Saved investigations will appear here on this device.</p>';
    return;
  }
  host.innerHTML = investigations.slice().reverse().map(record => `
    <article class="archive-card">
      <strong>${esc(record.question)}</strong>
      <p class="archive-meta">${esc(new Date(record.createdAt).toLocaleString())} · ${esc(record.type || "Investigation")}</p>
      <p class="archive-preview">${esc(record.answer.slice(0, 420))}${record.answer.length > 420 ? "…" : ""}</p>
      <button class="secondary" onclick="addInvestigationToLedger('${esc(record.id)}')" disabled>Automatically added</button>
    </article>`).join("");
}
function showInvestigation(record, showActions = true) {
  const answerBox = $("detectiveAnswer");
  answerBox.replaceChildren();
  const answerText = document.createElement("div");
  answerText.className = "detective-answer-text";
  answerText.textContent = record.answer;
  answerBox.appendChild(answerText);
  renderCitations(answerBox, record.citations);
  if (showActions) {
    const savedNote = document.createElement("p");
    savedNote.className = "auto-added-note";
    savedNote.textContent = "Automatically saved to your investigation archive and evidence ledger.";
    answerBox.appendChild(savedNote);
    const actions = document.createElement("div");
    actions.className = "investigation-actions";
    const compareButton = document.createElement("button");
    compareButton.type = "button";
    compareButton.className = "secondary";
    compareButton.textContent = "Compare explanations";
    compareButton.onclick = () => compareExplanations(record);
    actions.append(compareButton);
    answerBox.appendChild(actions);
  }
}
function addInvestigationToLedger(id) {
  const record = investigations.find(item => item.id === id);
  if (!record) return;
  if (items.some(item => item.investigationId === id)) {
    alert("This investigation is already in your evidence ledger.");
    return;
  }
  items.push({
    id: "e-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    investigationId: id,
    claim: "Investigation: " + record.question,
    kind: "AI investigation",
    status: "Provisional",
    source: (record.citations || []).map(source => source.title || source.url).join("; ") || "AI-generated synthesis — sources not returned",
    pattern: "",
    meaning: "",
    alternative: "",
    support: record.answer,
    challenge: "This is an AI-generated synthesis, not verified evidence. Check the cited sources and record counter-evidence separately."
  });
  saveAll();
  draw();
  alert("Investigation added to the evidence ledger as provisional. You can now connect it to other evidence.");
}
window.addInvestigationToLedger = addInvestigationToLedger;

async function requestInvestigation(question, type = "Investigation") {
  const answerBox = $("detectiveAnswer");
  const askButton = $("askButton");
  askButton.disabled = true;
  askButton.textContent = type === "Comparison" ? "Comparing…" : "Investigating…";
  answerBox.textContent = type === "Comparison"
    ? "The detective is comparing competing explanations…"
    : "The detective is examining the evidence. This may take a little while…";
  try {
    const response = await fetch(DETECTIVE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });
    let data;
    try { data = await response.json(); }
    catch { throw new Error("The AI service returned an unreadable response. Please try again."); }
    if (!response.ok) throw new Error(data.error || "The investigation could not be completed.");
    if (!data.answer) throw new Error("The detective returned an empty answer. Please try again.");
    const record = {
      id: "i-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      question,
      answer: data.answer,
      citations: Array.isArray(data.citations) ? data.citations : [],
      createdAt: new Date().toISOString(),
      type
    };
    latestInvestigation = record;
    // Automatically archive every successful investigation and comparison.
    investigations.push(record);
    saveInvestigations();
    const sourceList = record.citations.map(source =>
      (source.title || source.url) + " — " + source.url
    ).join("\n");
    items.push({
      id: "e-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      investigationId: record.id,
      claim: (type === "Comparison" ? "Comparison: " : "Investigation: ") + question.slice(0, 220),
      kind: type === "Comparison" ? "AI theory comparison" : "AI investigation",
      status: "Needs review",
      source: sourceList || "No web citations returned — AI synthesis only",
      pattern: "",
      meaning: "",
      alternative: "",
      support: record.answer,
      challenge: "Automatically captured AI output, not independently verified evidence. Check each cited source and add counter-evidence before treating any claim as established."
    });
    saveAll();
    draw();
    renderInvestigationArchive();
    showInvestigation(record);
    return record;
  } catch (error) {
    answerBox.textContent = "Investigation error: " + error.message;
    return null;
  } finally {
    askButton.disabled = false;
    askButton.textContent = "Investigate";
  }
}
async function compareExplanations(record) {
  const comparisonQuestion = `Compare the competing explanations for this question:
${record.question}

Here is the previous investigation to use as context (treat it as provisional, not as established fact):
${record.answer.slice(0, 14000)}

Identify the main competing explanations. For each, give its strongest supporting evidence, strongest objections, assumptions, and what observation or research could distinguish it from the others. Separate established findings from interpretation and speculation. Do not force a single conclusion if the evidence is inconclusive. Cite checkable sources.`;
  const result = await requestInvestigation(comparisonQuestion, "Comparison");
  if (result) {
    const save = document.createElement("p");
    save.className = "small-note";
    save.textContent = "This comparison can be saved to the investigation archive and added to the evidence ledger.";
    $("detectiveAnswer").appendChild(save);
  }
}
const askForm = $("askForm");
if (askForm) {
  askForm.addEventListener("submit", async event => {
    event.preventDefault();
    const question = $("detectiveQuestion").value.trim();
    if (!question) return;
    await requestInvestigation(question);
  });
}
renderInvestigationArchive();
