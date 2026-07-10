const HEALTH_API = "https://health.googleapis.com/v4";

function formatSleep(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder} minutes`;
  if (!remainder) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  return `${hours} ${hours === 1 ? "hour" : "hours"} ${remainder} minutes`;
}

async function accessToken() {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_HEALTH_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "token_refresh_failed");
  return body.access_token;
}

async function latestSleep() {
  const start = new Date();
  start.setDate(start.getDate() - 3);
  const params = new URLSearchParams({
    pageSize: "25",
    filter: `sleep.interval.end_time >= \"${start.toISOString()}\"`,
  });
  const response = await fetch(
    `${HEALTH_API}/users/me/dataTypes/sleep/dataPoints?${params}`,
    {
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        Accept: "application/json",
      },
    },
  );
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.status || "health_api_failed");

  return (body.dataPoints || [])
    .map((point) => point.sleep)
    .filter(
      (sleep) =>
        sleep &&
        !sleep.metadata?.nap &&
        Number(sleep.summary?.minutesAsleep) > 0,
    )
    .sort(
      (left, right) =>
        new Date(right.interval.endTime) - new Date(left.interval.endTime),
    )[0];
}

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ text: "Method not allowed." });
  }

  response.setHeader(
    "Cache-Control",
    "public, max-age=300, s-maxage=900, stale-while-revalidate=3600",
  );

  try {
    const sleep = await latestSleep();
    if (!sleep) throw new Error("no_recent_sleep");
    const minutes = Number(sleep.summary.minutesAsleep);
    return response.status(200).json({
      text: `Last night, Nayel slept for ${formatSleep(minutes)}.`,
      minutes,
      hours: Number((minutes / 60).toFixed(1)),
      sleepEndedAt: sleep.interval.endTime,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Sleep update unavailable", error.message);
    return response.status(503).json({
      text: "Nayel's latest sleep is syncing.",
    });
  }
};
