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

// Starter research map: these are prompts and hypotheses, not established findings.
const STARTER_QUESTIONS = [
  "What does neuroscience tell us about the relationship between the brain and consciousness, and what remains unexplained?",
  "What do near-death experiences actually show? Compare first-person reports, clinical research and physiological explanations.",
  "In Luke 17:20–21, what are the possible meanings of 'the kingdom of God is within you' or 'among you'?",
  "Does the conservation of energy provide evidence that personal consciousness survives death, or are these different questions?",
  "Is history best understood as repeating cycles, a spiral, or a mixture of recurring patterns and unique events?",
  "What themes do different religions and philosophies share, and where do their teachings genuinely differ?",
  "Can the Bible be read both as a historical text and as a personal inner journey? What supports and challenges each reading?",
  "How can we distinguish meaningful symbol and language patterns from coincidence, translation effects and confirmation bias?",
  "What does modern cosmology explain about the Big Bang, and what questions about the origin of time and existence remain open?",
  "Is consciousness separate from the universe, or could it be understood as part of a wider reality? Compare scientific and philosophical arguments."
];

const STARTER_EVIDENCE = [
  {id:"starter-brain",claim:"Conscious experience is closely associated with brain activity",kind:"Science",status:"Research lead",source:"Neuroscience research; brain injury, anaesthesia and altered-state studies",pattern:"Changes to brain function can change memory, perception, personality and awareness",meaning:"This supports a strong relationship between brain processes and ordinary conscious experience",alternative:"Correlation and dependence do not by themselves settle every philosophical account of consciousness",support:"Investigate lesion studies, anaesthesia, sleep, brain stimulation and neural correlates of consciousness",challenge:"Explain what these findings do and do not establish about subjective experience and the possibility of survival"},
  {id:"starter-nde",claim:"Some people report vivid experiences during near-death crises",kind:"Human experience",status:"Unverified as survival evidence",source:"Published near-death experience studies and first-person accounts; verify each case",pattern:"Reports can include unusual perceptions, encounters, life reviews or a sense of peace",meaning:"These accounts raise questions about consciousness under extreme physiological conditions",alternative:"Memory formation, oxygen and blood-flow changes, medication, expectation and retrospective reconstruction may contribute",support:"Compare independently documented cases and prospective hospital studies",challenge:"A reported experience is not by itself proof that consciousness left the body or survived death"},
  {id:"starter-luke",claim:"Luke 17:20–21 is translated as 'within you' or 'among you'",kind:"Scripture",status:"Interpretation disputed",source:"Luke 17:20–21; compare Greek text and multiple translations",pattern:"Translations differ in how they render the phrase often associated with 'entos hymōn'",meaning:"The passage can prompt reflection on inner transformation and the presence of God's kingdom among people",alternative:"The immediate context includes Jesus speaking to the Pharisees, which affects how 'within you' is interpreted",support:"Examine Greek usage, grammar, historical context and translation notes",challenge:"Do not treat one English rendering as the only possible meaning"},
  {id:"starter-energy",claim:"Conservation of energy does not by itself demonstrate survival of personal consciousness",kind:"Science",status:"Strong distinction to preserve",source:"Physics: conservation laws; neuroscience: brain function and consciousness",pattern:"Energy changes form in physical processes; personal memories and identity involve organised biological processes",meaning:"Energy conservation and personal survival are separate claims requiring different evidence",alternative:"Philosophical views may propose forms of consciousness not captured by current physical models",support:"Use conservation laws accurately and distinguish energy from information, memory and subjective experience",challenge:"Avoid assuming that because energy is conserved, an individual's awareness or memories must continue"},
  {id:"starter-cycles",claim:"History contains recurring patterns, but each recurrence occurs in a different context",kind:"History",status:"Plausible framework",source:"Comparative history; studies of empires, institutions, conflict and social change",pattern:"Rise and decline, reform, centralisation and fragmentation recur in different societies",meaning:"A spiral can be a useful metaphor for recurrence with change rather than exact repetition",alternative:"Patterns may be selected retrospectively; societies differ and do not follow one universal cycle",support:"Compare multiple independent cases and define measurable patterns before drawing parallels",challenge:"Look for counterexamples and avoid predicting events from superficial similarities"},
  {id:"starter-shared",claim:"Religions and philosophies share some ethical and contemplative themes while differing in important doctrines",kind:"Philosophy",status:"Broadly observable; scope varies",source:"Primary scriptures and philosophical texts from multiple traditions",pattern:"Compassion, self-discipline, humility and questions about suffering appear in many traditions",meaning:"Shared themes may point to recurring human concerns",alternative:"Similar language can conceal different meanings, metaphysics and practices",support:"Compare passages in context rather than relying on slogans or summaries",challenge:"Record disagreements and distinctive teachings as carefully as common ground"},
  {id:"starter-bible",claim:"A personal or symbolic reading of scripture is an interpretive approach, not the only reading",kind:"Scripture",status:"Interpretive framework",source:"Biblical texts, literary criticism, historical context and theological traditions",pattern:"Biblical narratives use recurring images, poetry, metaphor and layered literary forms",meaning:"A reader may find personal meaning alongside historical or communal interpretations",alternative:"A personal interpretation can become detached from grammar, genre and original context",support:"Compare literary structure, historical setting, traditional readings and personal resonance",challenge:"Do not present a personally meaningful reading as the text's proven original meaning"},
  {id:"starter-patterns",claim:"Apparent symbol and word patterns need testing against coincidence and selection effects",kind:"Symbols & language patterns",status:"Methodological caution",source:"Linguistics, textual criticism and statistical reasoning",pattern:"Repeated words, numbers and shapes can appear striking across large bodies of material",meaning:"Some patterns may be meaningful, but pattern discovery needs a testable method",alternative:"Translation choices, large search spaces, selective examples and confirmation bias can create apparent connections",support:"Predefine search rules, compare control texts and record misses as well as hits",challenge:"A pattern noticed after searching is weaker evidence than a prediction tested independently"},
  {id:"starter-cosmos",claim:"The Big Bang model describes the universe's early hot, dense expansion but does not settle every question about ultimate origins",kind:"Science",status:"Well-supported model; ultimate origin open",source:"Cosmology observations including cosmic expansion, cosmic microwave background and primordial abundances",pattern:"Multiple independent observations support an evolving universe with an early hot, dense state",meaning:"The model explains much of the universe's development, while deeper questions remain",alternative:"Different models explore the earliest moments and what, if anything, preceded the hot Big Bang phase",support:"Check evidence from expansion, the cosmic microwave background and light-element abundances",challenge:"Do not claim science has proven creation from nothing or identified a final cause"}
];

const STARTER_CONNECTIONS = [
  ["starter-brain","starter-nde","Both concern the relationship between brain function and reported conscious experience","Compare what clinical neuroscience explains with what remains uncertain","Tentative"],
  ["starter-nde","starter-energy","Near-death reports raise survival questions, but energy conservation does not answer them","Keep experiential reports and physical laws as separate evidence categories","Tentative"],
  ["starter-luke","starter-bible","Both explore inner or symbolic readings of scripture","Read the phrase in its literary and historical context before drawing personal parallels","Moderate"],
  ["starter-cycles","starter-bible","Recurring biblical story patterns can be compared with recurring historical patterns","Test specific examples and avoid assuming the same cycle is repeating","Tentative"],
  ["starter-shared","starter-bible","Shared ethical themes can be compared with layered interpretations of scripture","Compare primary texts while preserving differences between traditions","Tentative"],
  ["starter-patterns","starter-bible","Symbolic readings of biblical language need a method for testing patterns","Record the observed wording separately from the proposed meaning","Moderate"],
  ["starter-cosmos","starter-energy","Both raise questions about energy, change and the origin of the universe","Distinguish established physical models from metaphysical interpretations","Tentative"],
  ["starter-brain","starter-shared","Different traditions offer accounts of mind, self and awareness that can be compared with neuroscience","Do not assume spiritual concepts map directly onto scientific terms","Tentative"]
];

function loadStarterMap() {
  if (localStorage.getItem("td-starter-map-v1")) return;
  const existingIds = new Set(items.map(item => item.id));
  STARTER_EVIDENCE.forEach(item => { if (!existingIds.has(item.id)) items.push(item); });
  const existingLinks = new Set(connections.map(link => link.id));
  STARTER_CONNECTIONS.forEach((link, index) => {
    const id = "starter-link-" + index;
    if (!existingLinks.has(id)) connections.push({
      id, from:link[0], to:link[1], text:link[2], reason:link[3], strength:link[4]
    });
  });
  localStorage.setItem("td-starter-map-v1","yes");
  saveAll();
}
function renderStarterQuestions() {
  const host = $("starterQuestions");
  if (!host) return;
  host.innerHTML = STARTER_QUESTIONS.map((question,index) =>
    '<button type="button" class="starter-question" data-question-index="' + index + '">' +
    esc(question) + '</button>'
  ).join("");
  host.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      $("detectiveQuestion").value = STARTER_QUESTIONS[Number(button.dataset.questionIndex)];
      $("detectiveQuestion").focus();
      $("askForm").scrollIntoView({behavior:"smooth",block:"center"});
    });
  });
}


function readableEvidenceField(label, value) {
  const raw = String(value || "");
  if (!raw) return "Not recorded";
  let html = "";
  try {
    const parsed = JSON.parse(raw);
    const records = Array.isArray(parsed) ? parsed : [parsed];
    if (records.length && records.every(record => record && typeof record === "object")) {
      html = records.map((record,index) => {
        const fields = Object.entries(record).map(([key,val]) =>
          '<p><strong>' + esc(key.replace(/([A-Z])/g," $1").replace(/^./,c=>c.toUpperCase())) +
          ':</strong> ' + esc(typeof val === "string" ? val : JSON.stringify(val)) + '</p>'
        ).join("");
        return '<section class="readable-json-record"><strong>Research record ' + (index+1) + '</strong>' + fields + '</section>';
      }).join("");
    }
  } catch (_) {}
  if (!html) {
    html = esc(raw)
      .replace(/&quot;([A-Za-z][A-Za-z0-9_]*)&quot;\s*:/g, '<strong>$1:</strong> ')
      .replace(/\s*,\s*(?=&quot;[A-Za-z][A-Za-z0-9_]*&quot;\s*:)/g, '<br>');
  }
  if (raw.length > 260 || html.includes("readable-json-record")) {
    return '<details class="evidence-long-field"><summary>Read ' + esc(label.toLowerCase()) + ' (' + raw.length + ' characters)</summary><div class="evidence-field-content">' + html + '</div></details>';
  }
  return html;
}

function investigationDisplayTitle(record) {
  const type = String(record?.type || "");
  if (type === "Big picture review") return "Whole-board big picture";
  if (type === "Whole-board theory comparison") return "Compare all theories";
  if (type === "Missing-link analysis") return "Find missing links";
  return String(record?.question || "Investigation").slice(0,180);
}

function draw() {
  $("items").innerHTML = items.map(item => `
    <article class="evidence-card">
      <b>${esc(item.investigationId ? investigationDisplayTitle(investigations.find(record => record.id === item.investigationId)) : item.claim)}</b>
      <p>${esc(item.kind)} · ${esc(item.status)}</p>
      <p><strong>Source:</strong> ${readableEvidenceField("Source",item.source)}</p>
      ${item.pattern ? `<p><strong>Observed pattern:</strong> ${readableEvidenceField("Observed pattern",item.pattern)}</p>` : ""}
      ${item.meaning ? `<p><strong>Possible meaning:</strong> ${readableEvidenceField("Possible meaning",item.meaning)}</p>` : ""}
      ${item.alternative ? `<p><strong>Alternative explanation:</strong> ${readableEvidenceField("Alternative explanation",item.alternative)}</p>` : ""}
      <p><strong>Supports:</strong> ${readableEvidenceField("Supporting evidence",item.support)}</p>
      <p><strong>Challenges:</strong> ${readableEvidenceField("Challenges",item.challenge)}</p>
      <button class="secondary" onclick="removeItem('${esc(item.id)}')">Delete evidence</button>
    </article>
  `).join("");
  drawConnectionSelectors();
  drawConnections();
  if (!$("networkExplorer").hidden) { fillPathSelectors(); drawNetworkGraph([]); }
}

function drawConnectionSelectors() {
  const options = items.map(item => `<option value="${esc(item.id)}">${esc(item.claim)} — ${esc(item.kind)}</option>`).join("");
  $("fromEvidence").innerHTML = options;
  $("toEvidence").innerHTML = options;
  if (items.length > 1 && $("toEvidence").options.length > 1) $("toEvidence").selectedIndex = 1;
  $("addConnection").disabled = items.length < 2;
  $("addConnection").title = items.length < 2 ? "Add at least two evidence records first" : "Connect two evidence records";
}
function fillPathSelectors(){const opts=items.map(n=>'<option value="'+esc(n.id)+'">'+esc(n.claim.slice(0,100))+'</option>').join("");$("pathStart").innerHTML=opts;$("pathEnd").innerHTML=opts;if(items.length>1)$("pathEnd").selectedIndex=1;}
function drawNetworkGraph(path){
 const svg=$("networkSvg"),ns="http://www.w3.org/2000/svg";
 const nodes=items,links=connections.filter(l=>evidenceById(l.from)&&evidenceById(l.to)&&l.from!==l.to);
 const degree={},pos={},cols=2,cellW=320,cellH=205,rows=Math.ceil(nodes.length/cols),w=640,h=Math.max(240,rows*cellH+35);
 nodes.forEach(n=>degree[n.id]=0);
 links.forEach(l=>{degree[l.from]++;degree[l.to]++;});
 nodes.forEach((n,i)=>{const col=i%cols,row=Math.floor(i/cols);pos[n.id]={x:cellW/2+col*cellW,y:row*cellH+75};});
 svg.setAttribute("viewBox","0 0 "+w+" "+h);
 svg.replaceChildren();
 const pathSet=new Set(path||[]);
 // Draw links first so that topic markers remain easy to see.
 links.forEach(l=>{const p=pos[l.from],q=pos[l.to],line=document.createElementNS(ns,"line");line.setAttribute("x1",p.x);line.setAttribute("y1",p.y);line.setAttribute("x2",q.x);line.setAttribute("y2",q.y);line.setAttribute("class","network-edge"+(pathSet.has(l.from)&&pathSet.has(l.to)?" path-edge":""));svg.appendChild(line);});
 nodes.forEach(n=>{
  const p=pos[n.id],g=document.createElementNS(ns,"g"),circle=document.createElementNS(ns,"circle"),label=document.createElementNS(ns,"text"),count=degree[n.id]||0;
  g.setAttribute("class","network-node"+(pathSet.has(n.id)?" path-node":""));
  g.setAttribute("tabindex","0");g.setAttribute("role","button");g.setAttribute("aria-label","Select topic: "+n.claim);
  circle.setAttribute("cx",p.x);circle.setAttribute("cy",p.y);circle.setAttribute("r",Math.min(32,20+count*2));g.appendChild(circle);
  const degreeText=document.createElementNS(ns,"text");degreeText.setAttribute("x",p.x);degreeText.setAttribute("y",p.y+6);degreeText.setAttribute("class","network-degree");degreeText.textContent=String(count);g.appendChild(degreeText);
  label.setAttribute("x",p.x);label.setAttribute("y",p.y+48);label.setAttribute("class","network-topic-label");
  const words=(n.claim||"Untitled topic").split(/\s+/);let line="",lines=[];
  words.forEach(word=>{const test=(line+" "+word).trim();if(test.length>25&&line){lines.push(line);line=word;}else line=test;});
  if(line)lines.push(line);lines.slice(0,3).forEach((part,i)=>{const t=document.createElementNS(ns,"tspan");t.setAttribute("x",p.x);t.setAttribute("dy",i===0?0:20);t.textContent=part+(i===2&&lines.length>3?"…":"");label.appendChild(t);});
  g.appendChild(label);
  const choose=()=>{$("pathStart").value=n.id;$("pathExplanation").textContent="Selected topic: "+n.claim+" · "+n.kind+" · "+n.status+". Supports: "+(n.support||"Not recorded")+". Challenges: "+(n.challenge||"Not recorded")+". Choose a destination and tap Show possible path.";};
  g.addEventListener("click",choose);g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();choose();}});
  const title=document.createElementNS(ns,"title");title.textContent=n.claim+" — "+count+" proposed links";g.appendChild(title);svg.appendChild(g);
 });
 $("networkSummary").textContent=nodes.length+" topics · "+links.length+" proposed connections";
 const hubs=nodes.slice().sort((x,y)=>degree[y.id]-degree[x.id]).slice(0,5);
 $("hubList").innerHTML="<strong>Most connected topics</strong><ol>"+hubs.map(n=>"<li>"+esc(n.claim)+" <span>"+degree[n.id]+" links</span></li>").join("")+"</ol>";
}
function findNetworkPath(){const start=$("pathStart").value,end=$("pathEnd").value;if(!start||!end||start===end){$("pathExplanation").textContent="Choose two different topics.";return;}const adj={};items.forEach(n=>adj[n.id]=[]);connections.forEach(l=>{if(adj[l.from]&&adj[l.to]){adj[l.from].push(l.to);adj[l.to].push(l.from);}});const queue=[start],prev={};prev[start]=null;while(queue.length){const id=queue.shift();if(id===end)break;(adj[id]||[]).forEach(next=>{if(!(next in prev)){prev[next]=id;queue.push(next);}});}if(!(end in prev)){drawNetworkGraph([]);$("pathExplanation").textContent="No recorded route connects those topics yet. That gap shows where more evidence or a justified link may be needed.";return;}const path=[];let id=end;while(id){path.unshift(id);id=prev[id];}drawNetworkGraph(path);$("pathExplanation").textContent="Possible route ("+(path.length-1)+" links): "+path.map(id=>evidenceById(id).claim).join(" → ")+". This is the shortest recorded route, not a measure of truth or evidence quality.";}
function analyseNetwork(){
const host=$("networkAnalysis"),links=connections.filter(l=>evidenceById(l.from)&&evidenceById(l.to)),degree={};items.forEach(n=>degree[n.id]=0);links.forEach(l=>{degree[l.from]++;degree[l.to]++;});
const ranked=items.map(n=>({n,count:degree[n.id]})).sort((a,b)=>b.count-a.count),hubs=ranked.filter(x=>x.count).slice(0,3),alone=ranked.filter(x=>!x.count),adj={};items.forEach(n=>adj[n.id]=[]);links.forEach(l=>{adj[l.from].push(l.to);adj[l.to].push(l.from);});
const routes=[];for(let i=0;i<ranked.length;i++)for(let j=i+1;j<ranked.length;j++){let st=ranked[i].n.id,en=ranked[j].n.id;if(!degree[st]||!degree[en])continue;let q=[st],prev={[st]:null};while(q.length){let id=q.shift();if(id===en)break;adj[id].forEach(v=>{if(!(v in prev)){prev[v]=id;q.push(v);}});}if(en in prev){let p=[],id=en;while(id){p.unshift(id);id=prev[id];}if(p.length>2)routes.push(p);}}
let out="<h3>Map report</h3><p>"+items.length+" topics and "+links.length+" connections.</p><h4>Most connected topics</h4>"+(hubs.length?"<ol>"+hubs.map(x=>"<li>"+esc(x.n.claim)+" — "+x.count+" links</li>").join("")+"</ol>":"<p>No connections yet.</p>");
out+="<h4>Possible routes</h4>"+(routes.length?"<ol>"+routes.slice(0,3).map(p=>"<li>"+p.map(id=>esc(evidenceById(id).claim)).join(" → ")+"</li>").join("")+"</ol>":"<p>Add more links to create multi-step routes.</p>");
out+="<h4>Topics needing links</h4>"+(alone.length?"<ul>"+alone.slice(0,5).map(x=>"<li>"+esc(x.n.claim)+" has no links yet.</li>").join("")+"</ul>":"<p>Every topic has at least one link.</p>");
out+="<p><strong>Remember:</strong> lots of links do not mean an idea is true. Check the sources and look for evidence that could prove it wrong.</p><button type='button' id='askMapQuestion'>Investigate a possible route</button>";host.innerHTML=out;
const route=routes[0]?routes[0].map(id=>evidenceById(id).claim).join(" → "):"Which two topics have a connection supported by independent evidence?";$("askMapQuestion").onclick=()=>{$("detectiveQuestion").value="Investigate this possible route: "+route+". Check independent evidence for every link, find weak points, give alternative explanations and say what could disprove it.";$("askForm").scrollIntoView({behavior:"smooth",block:"center"});};
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

window.toggleNetworkExplorer = function(){const panel=$("networkExplorer"),button=$("openNetwork");panel.hidden=!panel.hidden;button.textContent=panel.hidden?"Explore visual connection map":"Hide visual connection map";if(!panel.hidden){fillPathSelectors();drawNetworkGraph([]);panel.scrollIntoView({behavior:"smooth",block:"start"});}};
$("findPath").addEventListener("click",findNetworkPath);
$("analyseNetwork").addEventListener("click",analyseNetwork);
$("clearPath").addEventListener("click",()=>{drawNetworkGraph([]);$("pathExplanation").textContent="Choose two topics to trace a route. A path is a research lead, not proof.";});
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
loadStarterMap();
saveAll();
draw();
renderStarterQuestions();

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
  host.innerHTML = investigations.slice().reverse().map(record => {
    const answer = renderSafeMarkdown(record.answer || "");
    const sources = (Array.isArray(record.citations) ? record.citations : [])
      .filter(source => source && /^https?:\/\//i.test(source.url || ""))
      .map(source => '<li><a href="' + esc(source.url) + '" target="_blank" rel="noopener noreferrer">' +
        esc(source.title || source.url) + '</a></li>').join("");
    return `
      <article class="archive-card">
        <strong>${esc(investigationDisplayTitle(record))}</strong>
        <p class="archive-meta">${esc(new Date(record.createdAt).toLocaleString())} · ${esc(record.type || "Investigation")}</p>
        <details class="archive-full-answer">
          <summary>Read the full investigation</summary>
          <div class="archive-answer-text">${answer}</div>
          ${sources ? '<h4>Sources</h4><ul>' + sources + '</ul>' : ''}
        </details>
        <button class="secondary" onclick="addInvestigationToLedger('${esc(record.id)}')" disabled>Automatically added to evidence ledger</button>
      </article>`;
  }).join("");
}
function renderSafeMarkdown(markdown) {
  const inline = value => {
    let out = esc(value);
    out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (match,label,url) =>
      '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + label + '</a>');
    out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/\*(.+?)\*/g, "<em>$1</em>");
    out = out.replace(/\`([^\`]+)\`/g, "<code>$1</code>");
    out = out.replace(/(https?:\/\/[^\s<]+)/g, url => {
      const clean = url.replace(/[.,;!?]+$/, "");
      const tail = url.slice(clean.length);
      return '<a href="' + esc(clean) + '" target="_blank" rel="noopener noreferrer">' + esc(clean) + '</a>' + tail;
    });
    return out;
  };
  const lines = String(markdown || "").replace(/\r/g, "").split("\n");
  const blocks = [];
  let paragraph = [], list = [], listType = "";
  const flushParagraph = () => {
    if (paragraph.length) { blocks.push("<p>" + paragraph.map(inline).join(" ") + "</p>"); paragraph=[]; }
  };
  const flushList = () => {
    if (list.length) {
      const tag = listType === "ol" ? "ol" : "ul";
      blocks.push("<" + tag + ">" + list.map(item => "<li>" + inline(item) + "</li>").join("") + "</" + tag + ">");
      list=[]; listType="";
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushParagraph(); flushList(); continue; }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    const bullet = /^[-*•]\s+(.+)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph(); flushList();
      const level = Math.min(4, heading[1].length + 1);
      blocks.push("<h" + level + ">" + inline(heading[2]) + "</h" + level + ">");
    } else if (bullet || numbered) {
      flushParagraph();
      const nextType = numbered ? "ol" : "ul";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      list.push((bullet || numbered)[1]);
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph(); flushList();
  return blocks.join("");
}

function showInvestigation(record, showActions = true) {
  const answerBox = $("detectiveAnswer");
  answerBox.replaceChildren();
  const scorecardMarker = /(?:^|\\n)EVIDENCE SCORECARD\\s*\\n/i;
  const scorecardMatch = scorecardMarker.exec(record.answer || "");
  const mainAnswer = scorecardMatch ? record.answer.slice(0, scorecardMatch.index).trim() : (record.answer || "");
  const scorecardText = scorecardMatch ? record.answer.slice(scorecardMatch.index + scorecardMatch[0].length).trim() : "";
  const answerText = document.createElement("div");
  answerText.className = "detective-answer-text";
  answerText.innerHTML = renderSafeMarkdown(mainAnswer);
  answerBox.appendChild(answerText);
  const scorecard = document.createElement("section");
  scorecard.className = "truth-scorecard";
  const scoreTitle = document.createElement("h3");
  scoreTitle.textContent = "Evidence scorecard";
  scorecard.appendChild(scoreTitle);
  const scoreBody = document.createElement("p");
  scoreBody.className = "detective-answer-text";
  scoreBody.innerHTML = renderSafeMarkdown(scorecardText || "Not provided for this investigation. Run a new investigation to request an evidence assessment.");
  scorecard.appendChild(scoreBody);
  const caution = document.createElement("p");
  caution.className = "small-note";
  caution.textContent = "This is a reasoned assessment, not a numerical truth score. Check the sources yourself; missing citations or counter-evidence should lower confidence.";
  scorecard.appendChild(caution);
  answerBox.appendChild(scorecard);
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

async function requestInvestigation(question, type = "Investigation", options = {}) {
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
      body: JSON.stringify({ question, mode: options.fastReview ? "board-review" : "standard" })
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
