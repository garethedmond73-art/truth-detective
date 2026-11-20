/* Truth Detective usability + automatic connection discovery */
(() => {
  "use strict";
  // Wait until the core app script has finished initialising its shared state.
  window.addEventListener("load", function initialiseEnhancements() {
  if (typeof saveAll !== "function" || typeof items === "undefined" || typeof connections === "undefined") {
    console.error("Truth Detective enhancements paused: core app did not initialise.");
    return;
  }
  const $ = id => document.getElementById(id);
  const originalSaveAll = saveAll;
  const dismissedPairs = new Set(JSON.parse(localStorage.getItem("td-auto-discovery-dismissed") || "[]"));
  let pendingSuggestions = JSON.parse(localStorage.getItem("td-auto-discovery-pending") || "[]");
  let discoveryTimer = null;
  let discoveryBusy = false;
  let graphZoom = 1;

  function fingerprint() {
    const compact = items.map(item => [item.id,item.claim,item.kind,item.status,item.source,item.pattern,item.meaning,item.alternative,item.support,item.challenge]);
    const pairs = connections.map(link => [link.from,link.to].sort().join("::")).sort();
    return JSON.stringify({compact,pairs});
  }
  function setStatus(message) {
    const host = $("autoDiscoveryStatus");
    if (host) host.textContent = message;
  }
  function pairKey(a,b) { return [a,b].sort().join("::"); }

  async function discoverConnections() {
    if (discoveryBusy || !Array.isArray(items) || items.length < 2) {
      if (items.length < 2) setStatus("Add at least two evidence records to start discovering connections.");
      return;
    }
    const currentFingerprint = fingerprint();
    if (localStorage.getItem("td-auto-discovery-hash") === currentFingerprint) {
      setStatus("Up to date. I will look again automatically when your evidence changes.");
      return;
    }
    discoveryBusy = true;
    setStatus("Searching your evidence for new connections…");
    try {
      const excluded = connections.map(link => ({from:link.from,to:link.to}))
        .concat(pendingSuggestions.map(link => ({from:link.from,to:link.to})))
        .concat(Array.from(dismissedPairs).map(key => {const parts=key.split("::");return {from:parts[0],to:parts[1]};}));
      const response = await fetch("https://truth-detective-ai.garethedmond73.workers.dev/discover", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ evidence: items.slice(-36), existingConnections: excluded })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Discovery could not be completed.");
      const known = new Set(excluded.map(link => pairKey(link.from,link.to)));
      const found = [];
      (Array.isArray(data.connections) ? data.connections : []).forEach((suggestion,index) => {
        const key = pairKey(suggestion.from,suggestion.to);
        if (known.has(key) || !evidenceById(suggestion.from) || !evidenceById(suggestion.to)) return;
        known.add(key);
        found.push({
          id: "ai-link-" + Date.now() + "-" + index + "-" + Math.random().toString(36).slice(2,7),
          from: suggestion.from, to: suggestion.to,
          text: suggestion.text, reason: suggestion.reason,
          strength: suggestion.strength === "Moderate" ? "Moderate" : "Tentative",
          evidenceBasis: suggestion.evidenceBasis || "",
          challenge: suggestion.challenge || "",
          sourceUrls: Array.isArray(suggestion.sourceUrls) ? suggestion.sourceUrls : [],
          origin: "ai-discovery"
        });
      });
      pendingSuggestions = pendingSuggestions.concat(found);
      localStorage.setItem("td-auto-discovery-pending", JSON.stringify(pendingSuggestions));
      localStorage.setItem("td-auto-discovery-hash", fingerprint());
      renderDiscoveryResults();
      setStatus(found.length
        ? "Found " + found.length + " possible connection" + (found.length === 1 ? "" : "s") + ". Review each suggestion below before adding it to your map."
        : "No new useful links found this time. I will check again when your evidence changes.");
    } catch (error) {
      setStatus("Discovery paused: " + error.message + " I will retry automatically in 30 seconds.");
      scheduleDiscovery(30000);
    } finally {
      discoveryBusy = false;
    }
  }
  function renderDiscoveryResults() {
    const host = $("autoDiscoveryResults");
    if (!host) return;
    const suggestions = pendingSuggestions.slice().reverse();
    if (!suggestions.length) {
      host.innerHTML = '<p class="small-note">No suggestions waiting for review. New ideas will appear here automatically.</p>';
      return;
    }
    host.innerHTML = suggestions.map(link => {
      const a = evidenceById(link.from), b = evidenceById(link.to);
      if (!a || !b) return "";
      const urls = (link.sourceUrls || []).filter(url => typeof url === "string" && (url.startsWith("https://") || url.startsWith("http://"))).map(url => '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">Check source</a>').join(" · ");
      return '<article class="auto-discovery-card"><span class="auto-discovery-tag">AI suggested · ' + esc(link.strength || "Tentative") + ' · Not yet added</span><strong>' + esc(a.claim) + ' ↔ ' + esc(b.claim) + '</strong><p>' + esc(link.text) + '</p><p>' + esc(link.reason || "") + '</p>' + (link.evidenceBasis ? '<p><b>Evidence to check:</b> ' + esc(link.evidenceBasis) + '</p>' : '') + (link.challenge ? '<p><b>Possible weakness:</b> ' + esc(link.challenge) + '</p>' : '') + (urls ? '<p>' + urls + '</p>' : '<p class="small-note">No direct source link returned; treat as an unverified research lead.</p>') + '<div class="discovery-review-actions"><button type="button" data-discovery-accept="' + esc(link.id) + '">Add to connection map</button><button type="button" class="secondary" data-discovery-dismiss="' + esc(link.id) + '">Dismiss</button></div></article>';
    }).join("");
  }
  $("autoDiscoveryResults").addEventListener("click", event => {
    const accept = event.target.closest("[data-discovery-accept]");
    const dismiss = event.target.closest("[data-discovery-dismiss]");
    const id = (accept && accept.dataset.discoveryAccept) || (dismiss && dismiss.dataset.discoveryDismiss);
    if (!id) return;
    const index = pendingSuggestions.findIndex(link => link.id === id);
    if (index < 0) return;
    const suggestion = pendingSuggestions[index];
    pendingSuggestions.splice(index,1);
    localStorage.setItem("td-auto-discovery-pending", JSON.stringify(pendingSuggestions));
    if (accept) {
      if (!connections.some(link => pairKey(link.from,link.to) === pairKey(suggestion.from,suggestion.to))) {
        connections.push(suggestion);
        originalSaveAll();
        if (typeof draw === "function") draw();
        setStatus("Connection added to your map as a tentative research lead. Check its sources and possible weaknesses.");
      }
    } else {
      dismissedPairs.add(pairKey(suggestion.from,suggestion.to));
      localStorage.setItem("td-auto-discovery-dismissed", JSON.stringify(Array.from(dismissedPairs)));
      setStatus("Suggestion dismissed. I will not suggest this pair again.");
    }
    renderDiscoveryResults();
  });
  function scheduleDiscovery(delay=1600) {
    clearTimeout(discoveryTimer);
    discoveryTimer = setTimeout(discoverConnections, delay);
  }

  // Re-check after each evidence/connection save, without triggering a loop when suggestions are stored.
  saveAll = function() {
    originalSaveAll();
    if ($("autoDiscoveryStatus")) scheduleDiscovery();
  };

  const originalRemoveConnection = window.removeConnection;
  window.removeConnection = function(id) {
    const link = connections.find(item => item.id === id);
    if (link) {
      dismissedPairs.add(pairKey(link.from,link.to));
      localStorage.setItem("td-auto-discovery-dismissed", JSON.stringify(Array.from(dismissedPairs)));
    }
    originalRemoveConnection(id);
  };

  // A spaced two-column layout with generous vertical room prevents long labels colliding.
  drawNetworkGraph = function(path) {
    const svg = $("networkSvg"), ns = "http://www.w3.org/2000/svg";
    if (!svg) return;
    const nodes = items, links = connections.filter(link => evidenceById(link.from) && evidenceById(link.to) && link.from !== link.to);
    const degree = {}, pos = {}, width = 360, cellH = 230, cols = 2, rows = Math.ceil(nodes.length / cols);
    nodes.forEach(node => degree[node.id] = 0);
    links.forEach(link => { degree[link.from]++; degree[link.to]++; });
    nodes.forEach((node,index) => {
      const col = index % cols, row = Math.floor(index / cols);
      pos[node.id] = {x: col === 0 ? 90 : 270, y: row * cellH + 52};
    });
    const height = Math.max(220, rows * cellH + 100);
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("preserveAspectRatio", "xMidYMin meet");
    svg.replaceChildren();
    const pathSet = new Set(path || []);
    links.forEach(link => {
      const p=pos[link.from], q=pos[link.to], line=document.createElementNS(ns,"line");
      line.setAttribute("x1",p.x); line.setAttribute("y1",p.y); line.setAttribute("x2",q.x); line.setAttribute("y2",q.y);
      line.setAttribute("class","network-edge"+(pathSet.has(link.from)&&pathSet.has(link.to)?" path-edge":""));
      svg.appendChild(line);
    });
    nodes.forEach(node => {
      const p=pos[node.id], g=document.createElementNS(ns,"g"), circle=document.createElementNS(ns,"circle");
      g.setAttribute("class","network-node"+(pathSet.has(node.id)?" path-node":""));
      g.setAttribute("tabindex","0"); g.setAttribute("role","button"); g.setAttribute("aria-label","Select topic: "+node.claim);
      circle.setAttribute("cx",p.x); circle.setAttribute("cy",p.y); circle.setAttribute("r",Math.min(27,19+(degree[node.id]||0)));
      g.appendChild(circle);
      const count=document.createElementNS(ns,"text");
      count.setAttribute("x",p.x); count.setAttribute("y",p.y+5); count.setAttribute("class","network-degree"); count.textContent=String(degree[node.id]||0); g.appendChild(count);
      const label=document.createElementNS(ns,"text");
      label.setAttribute("x",p.x); label.setAttribute("y",p.y+43); label.setAttribute("class","network-topic-label");
      const words=(node.claim||"Untitled topic").split(/\s+/); let line="", lines=[];
      words.forEach(word=>{const next=(line+" "+word).trim();if(next.length>19&&line){lines.push(line);line=word;}else line=next;});
      if(line)lines.push(line);
      lines.slice(0,4).forEach((part,i)=>{const span=document.createElementNS(ns,"tspan");span.setAttribute("x",p.x);span.setAttribute("dy",i===0?0:15);span.textContent=part+(i===3&&lines.length>4?"…":"");label.appendChild(span);});
      g.appendChild(label);
      const choose=()=>{$("pathStart").value=node.id;$("pathExplanation").textContent="Selected: "+node.claim+". Choose a destination to trace a possible route.";};
      g.addEventListener("click",choose);g.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();choose();}});
      const title=document.createElementNS(ns,"title");title.textContent=node.claim+" — "+(degree[node.id]||0)+" proposed links";g.appendChild(title);
      svg.appendChild(g);
    });
    $("networkSummary").textContent=nodes.length+" topics · "+links.length+" proposed connections";
    const hubs=nodes.slice().sort((a,b)=>(degree[b.id]||0)-(degree[a.id]||0)).slice(0,5);
    $("hubList").innerHTML="<strong>Most connected topics</strong><ol>"+hubs.map(node=>"<li>"+esc(node.claim)+" <span>"+(degree[node.id]||0)+" links</span></li>").join("")+"</ol>";
  };

  const originalDrawConnections = drawConnections;
  drawConnections = function() {
    originalDrawConnections();
    const cards = $("connections").querySelectorAll(".connection-card");
    const visible = connections.filter(link => evidenceById(link.from) && evidenceById(link.to));
    cards.forEach((card,index) => {
      const link=visible[index];
      if (!link || link.origin !== "ai-discovery") return;
      const note=document.createElement("p");
      note.className="small-note";
      note.innerHTML="<strong>Automatic suggestion:</strong> "+esc(link.evidenceBasis||"Research lead only")+(link.challenge?"<br><strong>Check:</strong> "+esc(link.challenge):"");
      card.appendChild(note);
      (link.sourceUrls||[]).forEach(url=>{
        if(/^https?:\/\//i.test(url)){const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";a.textContent="Open source";a.style.marginRight="10px";card.appendChild(a);}
      });
    });
  };

  function setZoom(value) {
    graphZoom=Math.max(.75,Math.min(1.8,value));
    const svg=$("networkSvg");
    if (!svg) return;
    svg.style.width=(100*graphZoom)+"%";
    svg.style.maxWidth="none";
  }
  $("mapZoomIn").addEventListener("click",()=>setZoom(graphZoom+.15));
  $("mapZoomOut").addEventListener("click",()=>setZoom(graphZoom-.15));
  $("mapFit").addEventListener("click",()=>{graphZoom=1;setZoom(1);const wrap=document.querySelector(".network-canvas-wrap");if(wrap){wrap.scrollTop=0;wrap.scrollLeft=0;}});
  renderDiscoveryResults();
  setStatus("Checking your saved evidence for possible connections…");
  scheduleDiscovery(1200);
  });
})();