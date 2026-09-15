const MEMBERS = ["Nayel", "Anusha", "Anush", "Rushil"];
const COLORS = { Nayel: "#476fdc", Anusha: "#dc7b64", Anush: "#45a08a", Rushil: "#906ac8" };
const MEMBER_PROFILES = {
  Nayel: { name:"Nayel Rehman", role:"EE & Philosophy at UIUC", company:"Cactus Capital", location:"Fairfax, VA", url:"https://www.linkedin.com/in/nayelrehman/", photo:"/collective/assets/nayel.jpg" },
  Anusha: { name:"Anusha Agarwal", role:"UPenn M&T · Regeneron STS Scholar", company:"Orbitum", location:"Washington DC–Baltimore Area", url:"https://www.linkedin.com/in/anusha-agarwal-b216b825b/", photo:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSZOAZCgvZ_luwEInfoPiuW_xM_s3PfouL-YXuza7lM2A&s=10" },
  Anush: { name:"Anush Devkar", role:"Engineering", company:"Greenway Engineering Inc.", location:"DC Metro Area", url:"https://www.linkedin.com/in/anushdevkar/", photo:"https://ugc.production.linktr.ee/a1d76b5c-776f-42bc-bb62-e1daddbed4d7_AnushDevkarProfile-magic.jpeg?io=true&size=avatar-v3_0" },
  Rushil: { name:"Rushil Kukreja", role:"Physics at Princeton University", company:"SpaceX", location:"New York, NY", url:"https://www.linkedin.com/in/rushil-kukreja/", photo:"https://hacktj.org/team/rushil.jpg" }
};
const DUMMY_IDS = new Set(["p1","p2","p3","p4","p5","p6","p7","p8","p9","p10","p11","p12"]);

const state = { currentUser:null, currentOwner:"all", view:"map", zoom:1, selectedId:null, people:loadPeople() };
const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const initials = name => name.split(/\s+/).map(x=>x[0]).slice(0,2).join("").toUpperCase();
const memberClass = name => name.toLowerCase();
const escapeHtml = value => String(value || "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const avatarMarkup = (person, className="person-avatar") => `<span class="${className}${person.photo ? " has-photo" : ""}"><span class="avatar-fallback">${initials(person.name)}</span>${person.photo ? `<img src="${escapeHtml(person.photo)}" alt="" referrerpolicy="no-referrer" onerror="this.remove();this.parentElement.classList.remove('has-photo')">` : ""}</span>`;
const memberAvatarMarkup = (member, className="mini-avatar") => avatarMarkup(MEMBER_PROFILES[member], `${className} ${memberClass(member)}`);

function setMemberAvatar(element, member){
  const profile = MEMBER_PROFILES[member];
  element.className = `mini-avatar ${memberClass(member)}${profile.photo ? " has-photo" : ""}`;
  element.innerHTML = `<span class="avatar-fallback">${member[0]}</span>${profile.photo ? `<img src="${escapeHtml(profile.photo)}" alt="${escapeHtml(profile.name)}" referrerpolicy="no-referrer" onerror="this.remove();this.parentElement.classList.remove('has-photo')">` : ""}`;
}

function loadPeople(){
  try {
    const saved = localStorage.getItem("inner-circle-people-v1");
    const people = saved ? JSON.parse(saved) : [];
    if(!Array.isArray(people)) return [];
    const cleaned = people.filter(person => !DUMMY_IDS.has(person.id));
    if(cleaned.length !== people.length) localStorage.setItem("inner-circle-people-v1", JSON.stringify(cleaned));
    return cleaned;
  } catch { return []; }
}
function savePeople(){ localStorage.setItem("inner-circle-people-v1", JSON.stringify(state.people)); }

function login(name){
  const canonical = MEMBERS.find(m => m.toLowerCase() === name.trim().toLowerCase());
  if(!canonical){ $("#login-error").textContent = "That name isn’t in this circle yet."; return; }
  state.currentUser = canonical;
  sessionStorage.setItem("inner-circle-user", canonical);
  $("#login-screen").hidden = true; $("#app").hidden = false;
  $("#current-user").textContent = canonical;
  setMemberAvatar($("#current-avatar"), canonical);
  $("#person-owner").value = canonical;
  render();
}

function logout(){ sessionStorage.removeItem("inner-circle-user"); state.currentUser=null; $("#app").hidden=true; $("#login-screen").hidden=false; $("#login-name").value=""; $("#login-name").focus(); }

function filteredPeople(){ return state.currentOwner === "all" ? state.people : state.people.filter(p=>p.owners.includes(state.currentOwner)); }

function render(){
  const shown = filteredPeople();
  $$(".nav-item").forEach(b=>b.classList.toggle("active", b.dataset.owner===state.currentOwner));
  MEMBERS.forEach(m=>{
    const el=$(`[data-count="${m}"]`); if(el) el.textContent=state.people.filter(p=>p.owners.includes(m)).length;
    const avatar=$(`[data-owner="${m}"] .mini-avatar`); if(avatar) setMemberAvatar(avatar,m);
  });
  $("#all-count").textContent = state.people.length;
  const shared = state.people.filter(p=>p.owners.length>1).length;
  $("#shared-count").textContent = `${shared} shared connection${shared===1?"":"s"}`;
  $("#view-kicker").textContent = state.currentOwner === "all" ? "The full circle" : `${state.currentOwner}’s network`;
  $("#view-title").textContent = state.currentOwner === "all" ? "Your people, mapped." : `${shown.length} people in view.`;
  const viewProfile = $("#view-profile");
  if(state.currentOwner === "all"){
    viewProfile.hidden = true;
  } else {
    const profile = MEMBER_PROFILES[state.currentOwner];
    viewProfile.innerHTML = `${escapeHtml(profile.name)} · ${escapeHtml(profile.role)} · ${escapeHtml(profile.company)} · ${escapeHtml(profile.location)} · <a href="${escapeHtml(profile.url)}" target="_blank" rel="noreferrer">LinkedIn ↗</a>`;
    viewProfile.hidden = false;
  }
  renderGraph(shown); renderRecent(shown); renderList(shown);
}

function nodePosition(index,total,ownerIndex){
  const bands = [{x:22,y:29},{x:77,y:27},{x:30,y:74},{x:72,y:73}];
  if(ownerIndex !== undefined) return bands[ownerIndex];
  const angle = (Math.PI*2*index/Math.max(total,1))-Math.PI/2;
  const rx = total>8 ? 35 : 29, ry = total>8 ? 36 : 31;
  return {x:50+Math.cos(angle)*rx, y:50+Math.sin(angle)*ry};
}

function renderGraph(people){
  const nodes = $("#network-nodes"), svg=$("#network-lines"); nodes.innerHTML=""; svg.innerHTML="";
  const ownerPositions = {};
  const activeOwners = state.currentOwner === "all" ? MEMBERS : [state.currentOwner];
  activeOwners.forEach((owner,i)=>{
    const pos = state.currentOwner === "all" ? nodePosition(0,0,MEMBERS.indexOf(owner)) : {x:50,y:48}; ownerPositions[owner]=pos;
    const profile=MEMBER_PROFILES[owner];
    const node=document.createElement("button"); node.className="graph-node owner"; node.style.left=pos.x+"%"; node.style.top=pos.y+"%"; node.title=`${profile.name} — ${profile.role} · ${profile.company}`; node.innerHTML=`${avatarMarkup(profile,"node-orb")}<strong>${owner}</strong><small>${state.people.filter(p=>p.owners.includes(owner)).length} people</small>`;node.querySelector(".node-orb").style.background=COLORS[owner];
    node.addEventListener("click",()=>{state.currentOwner=owner;render();}); nodes.appendChild(node);
  });
  const center = state.currentOwner === "all" ? {x:50,y:50} : ownerPositions[state.currentOwner];
  people.forEach((p,i)=>{
    let pos;
    if(state.currentOwner === "all"){
      const primary=ownerPositions[p.owners[0]]; const a=((i*137.5)%360)*Math.PI/180; const spread=p.owners.length>1?14:18;
      pos={x:primary.x+Math.cos(a)*spread,y:primary.y+Math.sin(a)*spread};
      pos.x=Math.max(8,Math.min(92,pos.x)); pos.y=Math.max(9,Math.min(91,pos.y));
    } else { pos=nodePosition(i,people.length); }
    p.__pos=pos;
    const node=document.createElement("button"); node.className="graph-node"; node.style.left=pos.x+"%"; node.style.top=pos.y+"%"; node.dataset.id=p.id; node.innerHTML=`${avatarMarkup(p,"node-orb")}<strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.company)}</small>`;node.querySelector(".node-orb").style.background=COLORS[p.owners[0]];
    node.addEventListener("click",()=>openDetail(p.id)); nodes.appendChild(node);
    p.owners.filter(o=>activeOwners.includes(o)).forEach((owner,idx)=>{
      const line=document.createElementNS("http://www.w3.org/2000/svg","line"); const op=ownerPositions[owner]||center;
      line.setAttribute("x1",op.x+"%");line.setAttribute("y1",op.y+"%");line.setAttribute("x2",pos.x+"%");line.setAttribute("y2",pos.y+"%"); if(p.owners.length>1||idx>0)line.classList.add("shared");svg.appendChild(line);
    });
  });
  applyZoom();
}

function renderRecent(people){
  const sorted=[...people].sort((a,b)=>b.added.localeCompare(a.added)).slice(0,4);
  $("#recent-grid").innerHTML=sorted.map(p=>`<article class="person-card" data-person="${p.id}" tabindex="0"><div class="person-card-top">${avatarMarkup(p)}<span class="owner-dot" style="background:${COLORS[p.owners[0]]}" title="${p.owners.join(", ")}"></span></div><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.role)} · ${escapeHtml(p.company)}</p><time>${new Date(p.added+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"})}</time></article>`).join("");
  $$("[data-person]").forEach(card=>{card.addEventListener("click",()=>openDetail(card.dataset.person));card.addEventListener("keydown",e=>{if(e.key==="Enter")openDetail(card.dataset.person);});});
}

function renderList(people){
  $("#people-list").innerHTML=people.map(p=>`<button class="list-row" data-list-person="${p.id}"><span class="list-person">${avatarMarkup(p)}<span><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.role)}</small></span></span><span>${p.owners.map(escapeHtml).join(", ")}</span><span>${escapeHtml(p.company)}</span><span>${escapeHtml(p.location)}</span></button>`).join("");
  $$("[data-list-person]").forEach(row=>row.addEventListener("click",()=>openDetail(row.dataset.listPerson)));
}

function openDetail(id){
  const p=state.people.find(x=>x.id===id); if(!p)return; state.selectedId=id;
  $("#detail-content").innerHTML=`<div class="detail-hero">${avatarMarkup(p)}<h2>${escapeHtml(p.name)}</h2><p>${escapeHtml(p.role)} at ${escapeHtml(p.company)}</p><p>${escapeHtml(p.location)}</p><a class="detail-link" href="${escapeHtml(p.url)}" target="_blank" rel="noreferrer">View LinkedIn ↗</a></div><div class="detail-block"><h3>Connected through</h3>${p.owners.map(o=>`<div class="through-row">${memberAvatarMarkup(o)}<strong>${o}</strong></div>`).join("")}</div><div class="detail-block"><h3>How you know them</h3><p>${escapeHtml(p.note)||"No note added yet."}</p></div><div class="detail-block"><h3>Added</h3><p>${new Date(p.added+"T12:00:00").toLocaleDateString(undefined,{month:"long",day:"numeric",year:"numeric"})}</p></div><div class="detail-actions"><button class="secondary-button" id="copy-link">Copy LinkedIn</button><button class="secondary-button danger-button" id="delete-person">Remove</button></div>`;
  $("#detail-panel").classList.add("open");$("#detail-panel").setAttribute("aria-hidden","false");
  $("#copy-link").onclick=()=>{navigator.clipboard?.writeText(p.url);showToast("LinkedIn link copied");};
  $("#delete-person").onclick=()=>{ if(confirm(`Remove ${p.name} from the network?`)){state.people=state.people.filter(x=>x.id!==id);savePeople();closeDetail();render();showToast("Connection removed");} };
}
function closeDetail(){ $("#detail-panel").classList.remove("open");$("#detail-panel").setAttribute("aria-hidden","true");state.selectedId=null; }

function search(query){
  const q=query.trim().toLowerCase(), box=$("#search-results"); if(!q){box.hidden=true;return;}
  const hits=state.people.filter(p=>[p.name,p.company,p.role,p.location,...p.owners].join(" ").toLowerCase().includes(q)).slice(0,7);
  box.innerHTML=hits.length?hits.map(p=>`<button class="search-result" data-result="${p.id}">${avatarMarkup(p)}<span class="result-copy"><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.role)} at ${escapeHtml(p.company)}</small></span><span class="path-badge">via ${p.owners.join(" + ")}</span></button>`).join(""):`<div class="search-result"><span class="result-copy"><strong>No one found</strong><small>Try a name, company, school, or location.</small></span></div>`;
  box.hidden=false; $$("[data-result]",box).forEach(b=>b.onclick=()=>{box.hidden=true;$("#global-search").value="";openDetail(b.dataset.result);});
}

function openModal(){
  state.pendingPhoto="";$("#modal-backdrop").hidden=false;$("#add-step-link").hidden=false;$("#connection-form").hidden=true;$("#linkedin-url").value="";$("#person-photo").value="";$("#person-photo-file").value="";$("#photo-fallback").open=false;$("#linkedin-error").textContent="";$("#photo-error").textContent="";$("#linkedin-url").focus();
}
function closeModal(){ $("#modal-backdrop").hidden=true; }

function parseLinkedInSlug(url){
  try { const u=new URL(url); if(!u.hostname.toLowerCase().includes("linkedin.com"))return null; const m=u.pathname.match(/\/in\/([^/?#]+)/i); if(!m)return null; return m[1].replace(/[-_]+/g," ").replace(/\b\w/g,c=>c.toUpperCase()).replace(/\s\d+$/,''); } catch{return null;}
}

function updateProfilePreview(name,message){
  const preview=$("#profile-preview"), previewPerson={name:name||"LinkedIn profile",photo:state.pendingPhoto};
  $(".person-avatar",preview).outerHTML=avatarMarkup(previewPerson,"person-avatar large");
  $("strong",preview).textContent=name||"LinkedIn profile";
  $("span",preview).textContent=message||"Profile ready to review";
}

function compressPhoto(file){
  return new Promise((resolve,reject)=>{
    if(!file?.type?.startsWith("image/")) return reject(new Error("Choose an image file."));
    if(file.size>10_000_000) return reject(new Error("Choose an image smaller than 10 MB."));
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error("That image could not be read."));
    reader.onload=()=>{
      const img=new Image();
      img.onerror=()=>reject(new Error("That image could not be opened."));
      img.onload=()=>{
        const size=480, side=Math.min(img.naturalWidth,img.naturalHeight), sx=(img.naturalWidth-side)/2, sy=(img.naturalHeight-side)/2;
        const canvas=document.createElement("canvas");canvas.width=size;canvas.height=size;
        canvas.getContext("2d").drawImage(img,sx,sy,side,side,0,0,size,size);
        resolve(canvas.toDataURL("image/jpeg",.86));
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function enrichProfile(){
  const url=$("#linkedin-url").value.trim(), guessed=parseLinkedInSlug(url); if(!guessed){$("#linkedin-error").textContent="Paste a valid linkedin.com/in/… profile link.";return;}
  const button=$("#continue-add"); button.disabled=true; button.textContent="Finding public details…"; $("#linkedin-error").textContent="";
  let data={name:guessed,company:"",role:"",location:"",photo:""};
  try { const res=await fetch(`/api/linkedin?url=${encodeURIComponent(url)}`); if(!res.ok)throw new Error();data={...data,...await res.json()}; }
  catch { $("#linkedin-error").textContent="LinkedIn could not be reached. You can still enter the profile manually."; }
  button.disabled=false;button.innerHTML="Continue <span>→</span>";
  state.pendingPhoto=data.photo||"";$("#person-name").value=data.name||guessed;$("#person-company").value=data.company||"";$("#person-role").value=data.role||"";$("#person-location").value=data.location||"";
  $("#person-photo").value=state.pendingPhoto&&!state.pendingPhoto.startsWith("data:")?state.pendingPhoto:"";
  $("#photo-fallback").open=!state.pendingPhoto;
  updateProfilePreview(data.name||guessed,state.pendingPhoto?"Photo and public details imported":"LinkedIn hid the photo — upload one below");
  $("#add-step-link").hidden=true;$("#connection-form").hidden=false;$("#person-name").focus();
}

function addConnection(e){
  e.preventDefault(); const owner=$("#person-owner").value; const person={id:`p${Date.now()}`,name:$("#person-name").value.trim(),company:$("#person-company").value.trim()||"Independent",role:$("#person-role").value.trim()||"Connection",location:$("#person-location").value.trim()||"Location not listed",photo:state.pendingPhoto||$("#person-photo").value.trim()||"",owners:[owner],note:$("#person-note").value.trim(),url:$("#linkedin-url").value.trim(),added:new Date().toISOString().slice(0,10)};
  if(!person.name)return; state.people.unshift(person);savePeople();closeModal();render();showToast(`${person.name} added through ${owner}`);openDetail(person.id);e.target.reset();$("#person-owner").value=state.currentUser;
}

function setView(view){
  state.view=view;$("#map-view").hidden=view!=="map";$("#list-view").hidden=view!=="list";$$("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
}
function applyZoom(){ const t=`scale(${state.zoom})`;$("#network-lines").style.transform=t;$("#network-nodes").style.transform=t; }
function showToast(message){const t=$("#toast");t.textContent=message;t.classList.add("show");clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove("show"),2200);}

function bindEvents(){
  $("#login-form").addEventListener("submit",e=>{e.preventDefault();login($("#login-name").value);});$$('[data-login]').forEach(b=>b.onclick=()=>login(b.dataset.login));
  $("#user-menu").onclick=logout;$("#brand-home").onclick=()=>{state.currentOwner="all";render();};
  $$(".nav-item").forEach(b=>b.onclick=()=>{state.currentOwner=b.dataset.owner;render();});
  $("#add-button").onclick=openModal;$$('[data-close-modal]').forEach(b=>b.onclick=closeModal);$("#modal-backdrop").addEventListener("click",e=>{if(e.target===e.currentTarget)closeModal();});
  $("#continue-add").onclick=enrichProfile;$("#change-link").onclick=()=>{$("#add-step-link").hidden=false;$("#connection-form").hidden=true;};$("#connection-form").addEventListener("submit",addConnection);
  $("#person-photo").addEventListener("input",e=>{state.pendingPhoto=e.target.value.trim();updateProfilePreview($("#person-name").value,state.pendingPhoto?"Using the photo URL below":"Photo removed");});
  $("#person-photo-file").addEventListener("change",async e=>{
    $("#photo-error").textContent="";
    try { state.pendingPhoto=await compressPhoto(e.target.files?.[0]);$("#person-photo").value="";updateProfilePreview($("#person-name").value,"Uploaded photo ready"); }
    catch(error) { $("#photo-error").textContent=error.message; }
  });
  $("#close-detail").onclick=closeDetail;$("#global-search").addEventListener("input",e=>search(e.target.value));
  document.addEventListener("click",e=>{if(!e.target.closest(".global-search-wrap"))$("#search-results").hidden=true;});
  document.addEventListener("keydown",e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("#global-search").focus();}if(e.key==="Escape"){closeModal();closeDetail();}});
  $$("[data-view]").forEach(b=>b.onclick=()=>setView(b.dataset.view));$("#view-all").onclick=()=>setView("list");
  $("#zoom-in").onclick=()=>{state.zoom=Math.min(1.35,state.zoom+.1);applyZoom();};$("#zoom-out").onclick=()=>{state.zoom=Math.max(.75,state.zoom-.1);applyZoom();};$("#zoom-reset").onclick=()=>{state.zoom=1;applyZoom();};
  window.addEventListener("resize",()=>{if(state.currentUser&&state.view==="map")renderGraph(filteredPeople());});
}

function registerWebMcp(){
  const context=document.modelContext;if(!context?.registerTool)return;
  const tools=[
    {name:"search_network",title:"Search network",description:"Search all four friends' saved connections by person, company, role, location, or owner.",inputSchema:{type:"object",properties:{query:{type:"string"}},required:["query"],additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:({query})=>{if(typeof query!=="string"||!query.trim())throw new Error("query is required");return state.people.filter(p=>[p.name,p.company,p.role,p.location,...p.owners].join(" ").toLowerCase().includes(query.toLowerCase())).map(({id,name,role,company,owners})=>({id,name,role,company,owners}));}},
    {name:"add_network_connection",title:"Add network connection",description:"Add a reviewed LinkedIn connection to one member's network.",inputSchema:{type:"object",properties:{name:{type:"string"},linkedinUrl:{type:"string"},owner:{type:"string",enum:MEMBERS},role:{type:"string"},company:{type:"string"},location:{type:"string"},note:{type:"string"}},required:["name","linkedinUrl","owner"],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:(input)=>{if(!input.name?.trim()||!parseLinkedInSlug(input.linkedinUrl)||!MEMBERS.includes(input.owner))throw new Error("Valid name, LinkedIn URL, and owner are required");const person={id:`p${Date.now()}`,name:input.name.trim(),url:input.linkedinUrl,owners:[input.owner],role:input.role||"Connection",company:input.company||"Independent",location:input.location||"Location not listed",note:input.note||"",added:new Date().toISOString().slice(0,10)};state.people.unshift(person);savePeople();render();return {id:person.id,name:person.name,owner:input.owner,status:"added"};}}
  ];
  tools.forEach(tool=>Promise.resolve(context.registerTool(tool)).catch(()=>{}));
}

bindEvents();registerWebMcp();
const remembered=sessionStorage.getItem("inner-circle-user");if(remembered&&MEMBERS.includes(remembered))login(remembered);
