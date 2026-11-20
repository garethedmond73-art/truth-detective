const $ = id => document.getElementById(id);
let items = JSON.parse(localStorage.getItem("td-items") || "[]");
let connections = JSON.parse(localStorage.getItem("td-connections") || "[]");

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
const askForm = $("askForm");
if (askForm) {
  askForm.addEventListener("submit", async event => {
    event.preventDefault();
    const question = $("detectiveQuestion").value.trim();
    const answerBox = $("detectiveAnswer");
    const askButton = $("askButton");
    if (!question) return;
    askButton.disabled = true;
    askButton.textContent = "Investigating…";
    answerBox.textContent = "The detective is examining the evidence. This may take a little while…";
    try {
      const response = await fetch(DETECTIVE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The investigation could not be completed.");
      answerBox.replaceChildren();
      const answerText = document.createElement("div");
      answerText.className = "detective-answer-text";
      answerText.textContent = data.answer || "No answer was returned.";
      answerBox.appendChild(answerText);
      if (Array.isArray(data.citations) && data.citations.length) {
        const heading = document.createElement("h3");
        heading.textContent = "Sources";
        answerBox.appendChild(heading);
        const list = document.createElement("ul");
        data.citations.forEach(source => {
          if (!source.url || !/^https?:\/\//i.test(source.url)) return;
          const item = document.createElement("li");
          const link = document.createElement("a");
          link.href = source.url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = source.title || source.url;
          item.appendChild(link);
          list.appendChild(item);
        });
        if (list.children.length) answerBox.appendChild(list);
      }
    } catch (error) {
      answerBox.textContent = "Investigation error: " + error.message;
    } finally {
      askButton.disabled = false;
      askButton.textContent = "Investigate";
    }
  });
}
