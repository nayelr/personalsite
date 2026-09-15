const CACHE_TTL = 1000 * 60 * 60 * 24;
const cache = new Map();

const KNOWN_PROFILES = {
  nayelrehman: {
    name: "Nayel Rehman", role: "EE & Philosophy at UIUC", company: "Cactus Capital", location: "Fairfax, VA",
    photo: "/collective/assets/nayel.jpg"
  },
  "anusha-agarwal-b216b825b": {
    name: "Anusha Agarwal", role: "UPenn M&T · Regeneron STS Scholar", company: "Orbitum", location: "Washington DC–Baltimore Area",
    photo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSZOAZCgvZ_luwEInfoPiuW_xM_s3PfouL-YXuza7lM2A&s=10"
  },
  "rushil-kukreja": {
    name: "Rushil Kukreja", role: "Physics at Princeton University", company: "SpaceX", location: "New York, NY",
    photo: "https://hacktj.org/team/rushil.jpg"
  },
  anushdevkar: {
    name: "Anush Devkar", role: "Engineering", company: "Greenway Engineering Inc.", location: "DC Metro Area",
    photo: "/collective/assets/anush.png"
  }
};

function parseProfile(raw){
  let url;
  try { url = new URL(raw); } catch { throw new Error("Invalid URL"); }
  if(!/(^|\.)linkedin\.com$/i.test(url.hostname) || !/^\/in\//i.test(url.pathname)) throw new Error("LinkedIn profile URL required");
  const slug = decodeURIComponent(url.pathname.split("/").filter(Boolean)[1] || "").toLowerCase();
  if(!slug) throw new Error("LinkedIn profile URL required");
  url.protocol = "https:";
  url.hostname = "www.linkedin.com";
  url.pathname = `/in/${slug}/`;
  url.search = "";
  url.hash = "";
  const slugName = slug.replace(/[-_]+/g, " ").replace(/\b\w/g, c => c.toUpperCase()).replace(/\s+\d+$/, "");
  return { url: url.toString(), slug, slugName };
}

async function fetchJson(url, options={}){
  const result = await fetch(url, { ...options, signal: AbortSignal.timeout(12000) });
  if(!result.ok) throw new Error(`Provider returned ${result.status}`);
  return result.json();
}

function currentPosition(person){
  return person?.positions?.positionHistory?.find(item => !item?.startEndDate?.end) || person?.employment_history?.find(item => item?.current) || null;
}

async function fromScrapIn(profileUrl){
  const key = process.env.SCRAPIN_API_KEY;
  if(!key) return null;
  const endpoint = `https://api.scrapin.io/enrichment/profile?apikey=${encodeURIComponent(key)}&linkedinUrl=${encodeURIComponent(profileUrl)}`;
  const payload = await fetchJson(endpoint);
  const person = payload?.person || payload?.data?.person || payload?.data;
  if(!person) return null;
  const job = currentPosition(person);
  return {
    name: [person.firstName,person.lastName].filter(Boolean).join(" ") || person.name,
    role: person.headline || job?.title || "",
    company: job?.companyName || payload?.company?.name || "",
    location: person.location || "",
    photo: person.photoUrl || person.photo_url || "",
    source: "scrapin"
  };
}

async function fromApollo(profileUrl){
  const key = process.env.APOLLO_API_KEY;
  if(!key) return null;
  const endpoint = `https://api.apollo.io/api/v1/people/match?linkedin_url=${encodeURIComponent(profileUrl)}&reveal_personal_emails=false&reveal_phone_number=false`;
  const payload = await fetchJson(endpoint, { method:"POST", headers:{ "accept":"application/json", "Content-Type":"application/json", "Cache-Control":"no-cache", "x-api-key":key } });
  const person = payload?.person;
  if(!person) return null;
  return {
    name: person.name || [person.first_name,person.last_name].filter(Boolean).join(" "),
    role: person.headline || person.title || "",
    company: person.organization?.name || currentPosition(person)?.organization_name || "",
    location: person.present_raw_address || [person.city,person.state,person.country].filter(Boolean).join(", "),
    photo: person.photo_url || "",
    source: "apollo"
  };
}

async function fromPeopleDataLabs(profileUrl){
  const key = process.env.PDL_API_KEY;
  if(!key) return null;
  const endpoint = `https://api.peopledatalabs.com/v5/person/enrich?profile=${encodeURIComponent(profileUrl)}&titlecase=true&min_likelihood=5`;
  const payload = await fetchJson(endpoint, { headers:{ "X-Api-Key":key, "accept":"application/json" } });
  const person = payload?.data;
  if(!person) return null;
  const job = person.job_title || person.experience?.find(item => !item?.end_date)?.title;
  return {
    name: person.full_name || person.display_name || "",
    role: job || "",
    company: person.job_company_name || "",
    location: person.location_name || "",
    photo: person.profile_pic_url || person.picture_url || "",
    source: "pdl"
  };
}

function parseMicrolink(payload, slugName){
  const title = payload?.data?.title || "";
  const description = payload?.data?.description || "";
  const cleanTitle = title.replace(/\s*\|\s*LinkedIn.*$/i, "").trim();
  const headline = cleanTitle.includes(" - ") ? cleanTitle.slice(cleanTitle.indexOf(" - ") + 3) : "";
  const headlineParts = headline.match(/^(.*?)\s+(?:at|@)\s+(.+)$/i);
  const firstDescriptionPart = description.split(/\s+·\s+/)[0]?.trim() || "";
  const descriptionParts = firstDescriptionPart.match(/^(.*?)\s+(?:at|@)\s+(.+)$/i);
  return {
    name: payload?.data?.author || (cleanTitle.includes(" - ") ? cleanTitle.slice(0, cleanTitle.indexOf(" - ")) : cleanTitle) || slugName,
    role: headlineParts?.[1] || descriptionParts?.[1] || firstDescriptionPart,
    company: headlineParts?.[2] || descriptionParts?.[2] || description.match(/Experience:\s*([^·]+)/i)?.[1]?.trim() || "",
    location: description.match(/Location:\s*([^·]+)/i)?.[1]?.trim() || "",
    photo: payload?.data?.image?.url || "",
    source: "microlink"
  };
}

async function fromMicrolink(profileUrl, slugName){
  const key = process.env.MICROLINK_API_KEY;
  const base = key ? "https://pro.microlink.io" : "https://api.microlink.io";
  const endpoint = `${base}?url=${encodeURIComponent(profileUrl)}&meta=true${key ? "&proxy=true" : ""}`;
  const payload = await fetchJson(endpoint, { headers:{ "User-Agent":"TheCollective/1.0", ...(key ? {"x-api-key":key} : {}) } });
  return parseMicrolink(payload, slugName);
}

async function resolveUnavatar(slug){
  const key = process.env.UNAVATAR_API_KEY;
  const endpoint = `https://unavatar.io/linkedin/user:${encodeURIComponent(slug)}?fallback=false`;
  const result = await fetch(endpoint, { headers:key ? {"x-api-key":key} : {}, signal:AbortSignal.timeout(12000) });
  if(!result.ok) return "";
  const type = result.headers.get("content-type") || "";
  if(!type.startsWith("image/") || type.includes("svg")) return "";
  const bytes = new Uint8Array(await result.arrayBuffer());
  if(bytes.length < 1000 || bytes.length > 2_000_000) return "";
  return `data:${type.split(";")[0]};base64,${Buffer.from(bytes).toString("base64")}`;
}

async function snapshotPhoto(photoUrl){
  if(!photoUrl || photoUrl.startsWith("data:image/")) return photoUrl || "";
  try {
    const result = await fetch(photoUrl, { headers:{ "User-Agent":"Mozilla/5.0", "Referer":"https://www.linkedin.com/" }, signal:AbortSignal.timeout(12000) });
    const type = result.headers.get("content-type") || "";
    if(!result.ok || !type.startsWith("image/")) return photoUrl;
    const bytes = new Uint8Array(await result.arrayBuffer());
    if(bytes.length > 2_000_000) return photoUrl;
    return `data:${type.split(";")[0]};base64,${Buffer.from(bytes).toString("base64")}`;
  } catch { return photoUrl; }
}

async function enrich(profile){
  if(KNOWN_PROFILES[profile.slug]) return { ...KNOWN_PROFILES[profile.slug], source:"verified-cache" };
  for(const provider of [fromScrapIn,fromApollo,fromPeopleDataLabs]){
    try {
      const data = await provider(profile.url);
      if(data?.name || data?.photo) return data;
    } catch {}
  }
  try { return await fromMicrolink(profile.url, profile.slugName); } catch {}
  return { name:profile.slugName, role:"", company:"", location:"", photo:"", source:"slug" };
}

export default async function handler(request, response) {
  const raw = request.query?.url;
  if (!raw || typeof raw !== "string") return response.status(400).json({ error:"LinkedIn URL required" });
  let profile;
  try { profile = parseProfile(raw); } catch(error) { return response.status(400).json({ error:error.message }); }

  const cached = cache.get(profile.url);
  if(cached && Date.now() - cached.time < CACHE_TTL) return response.status(200).json({ ...cached.data, cached:true });

  const data = await enrich(profile);
  let photo = data.photo || "";
  if(!photo) {
    try { photo = await resolveUnavatar(profile.slug); } catch {}
  }
  photo = await snapshotPhoto(photo);
  const result = {
    name:data.name || profile.slugName,
    role:data.role || "",
    company:data.company || "",
    location:data.location || "",
    photo,
    source:data.source,
    partial:!data.role || !photo,
    manualPhotoRequired:!photo,
    providerReady:Boolean(process.env.SCRAPIN_API_KEY || process.env.APOLLO_API_KEY || process.env.PDL_API_KEY || process.env.MICROLINK_API_KEY)
  };
  cache.set(profile.url, { time:Date.now(), data:result });
  return response.status(200).json(result);
}
