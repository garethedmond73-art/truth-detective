const $ = id => document.getElementById(id);
let items = JSON.parse(localStorage.getItem("td-items") || "[]");

function esc(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function draw() {
  $("items").innerHTML = items.map((item, index) => `
    <article>
      <b>${esc(item.claim)}</b>
      <p>${esc(item.kind)} · ${esc(item.status)}</p>
      <p><strong>Source:</strong> ${esc(item.source)}</p>
      ${item.pattern ? `<p><strong>Observed pattern:</strong> ${esc(item.pattern)}</p>` : ""}
      ${item.meaning ? `<p><strong>Possible meaning:</strong> ${esc(item.meaning)}</p>` : ""}
      ${item.alternative ? `<p><strong>Alternative explanation:</strong> ${esc(item.alternative)}</p>` : ""}
      <p><strong>Supports:</strong> ${esc(item.support)}</p>
      <p><strong>Challenges:</strong> ${esc(item.challenge)}</p>
      <button onclick="removeItem(${index})">Delete</button>
    </article>
  `).join("");
}

window.removeItem = index => {
  items.splice(index, 1);
  save();
};

function save() {
  localStorage.setItem("td-items", JSON.stringify(items));
  draw();
}

$("add").onclick = () => $("dlg").showModal();

$("save").onclick = event => {
  event.preventDefault();
  items.push({
    claim: $("claim").value,
    kind: $("kind").value,
    status: $("status").value,
    source: $("source").value,
    pattern: $("pattern").value,
    meaning: $("meaning").value,
    alternative: $("alternative").value,
    support: $("support").value,
    challenge: $("challenge").value
  });
  save();
  $("dlg").close();
  $("claim").value = "";
  ["source", "pattern", "meaning", "alternative", "support", "challenge"].forEach(id => $(id).value = "");
};

draw();