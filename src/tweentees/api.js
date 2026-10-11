let csrf = "";
export const setCsrf = (v) => {
  csrf = v || "";
};
export async function api(path, { method = "GET", body, signal } = {}) {
  const form = body instanceof FormData;
  const response = await fetch("/api/tt" + path, {
    method,
    credentials: "same-origin",
    signal,
    headers: {
      ...(!form && body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
      ...(csrf ? { "x-csrf-token": csrf } : {}),
    },
    ...(body === undefined ? {} : { body: form ? body : JSON.stringify(body) }),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw Error("The server returned an unexpected response. Please retry.");
  }
  if (!response.ok) {
    const e = Error(data.error || "Request failed.");
    e.status = response.status;
    if (response.status === 401)
      window.dispatchEvent(new Event("tween-session-expired"));
    throw e;
  }
  return data;
}
export const money = (cents) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(cents / 100);
export const date = (value) =>
  new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(Number(value));
export function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
}
