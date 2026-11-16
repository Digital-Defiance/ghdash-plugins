import { maximumCents, minimumCents } from "./stripe-amounts.mjs";

const attemptId = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

export async function handleDonation(request, env, fetchImpl = fetch) {
	const headers = { "cache-control": "no-store", vary: "Origin" };
	const reply = (value, status) => Response.json(value, { status, headers });
	const baseUrl = URL.parse(env.DONATION_RETURN_URL ?? "");
	if (!baseUrl || baseUrl.protocol !== "https:") {
		return reply({ error: "Card donations are temporarily unavailable." }, 503);
	}
	if (request.headers.get("origin") !== baseUrl.origin) {
		return reply({ error: "Origin not allowed." }, 403);
	}
	headers["access-control-allow-origin"] = baseUrl.origin;
	if (new URL(request.url).pathname !== "/create-checkout-session") {
		return reply({ error: "Endpoint not found." }, 404);
	}
	if (request.method !== "POST") return reply({ error: "Method not allowed." }, 405);
	if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/x-www-form-urlencoded") {
		return reply({ error: "Unsupported request format." }, 415);
	}
	// The browser submits only a short cents value and a UUID.
	const reader = request.body?.getReader();
	if (!reader) return reply({ error: "Missing donation details." }, 400);
	let raw = "";
	try {
		const decoder = new TextDecoder();
		for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
			if (raw.length + chunk.value.length > 256) {
				await reader.cancel();
				return reply({ error: "Request is too large." }, 413);
			}
			raw += decoder.decode(chunk.value);
		}
	} catch {
		return reply({ error: "Could not read the donation details." }, 400);
	}
	const fields = new URLSearchParams(raw);
	const amount = fields.get("amount") ?? "";
	const attempt = fields.get("attempt") ?? "";
	if (!/^\d{2,7}$/.test(amount) || Number(amount) < minimumCents || Number(amount) > maximumCents) {
		return reply({ error: "Enter a donation between $0.50 and $10,000." }, 400);
	}
	if (!attemptId.test(attempt)) return reply({ error: "Invalid checkout attempt." }, 400);
	if (!env.STRIPE_SECRET_KEY || !env.DONATION_NAME) {
		return reply({ error: "Card donations are temporarily unavailable." }, 503);
	}

	const ip = request.headers.get("cf-connecting-ip");
	if (ip && env.DONATION_RATE_LIMIT && !(await env.DONATION_RATE_LIMIT.limit({ key: ip })).success) {
		headers["retry-after"] = "60";
		return reply({ error: "Too many attempts. Please wait a minute and try again." }, 429);
	}

	const body = new URLSearchParams({
		mode: "payment",
		ui_mode: "form",
		return_url: baseUrl.href,
		submit_type: "donate",
		"allowed_payment_method_types[0]": "card",
		"line_items[0][quantity]": "1",
		"line_items[0][price_data][currency]": "usd",
		"line_items[0][price_data][unit_amount]": String(Number(amount)),
		"line_items[0][price_data][product_data][name]": env.DONATION_NAME,
	});
	try {
		const response = await fetchImpl("https://api.stripe.com/v1/checkout/sessions", {
			method: "POST",
			headers: {
				authorization: "Bearer " + env.STRIPE_SECRET_KEY,
				"stripe-version": "2026-10-28.endive",
				"idempotency-key": "gitdash-give-" + attempt,
			},
			body,
			signal: AbortSignal.timeout(10_000),
		});
		const result = await response.json();
		if (response.ok) {
			const { client_secret } = result;
			if (typeof client_secret === "string" && client_secret) return reply({ client_secret }, 200);
		} else {
			console.error("Stripe rejected checkout session", {
				status: response.status,
				requestId: response.headers.get("request-id"),
				type: result?.error?.type,
				code: result?.error?.code,
				param: result?.error?.param,
			});
		}
	} catch {
		console.error("Could not read Stripe checkout session response");
	}
	return reply({ error: "Card checkout could not start. Please try again." }, 502);
}

export default { fetch: (request, env) => handleDonation(request, env) };
