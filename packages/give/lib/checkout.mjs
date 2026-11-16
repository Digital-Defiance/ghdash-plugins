const stripeHosts = new Set(["buy.stripe.com", "donate.stripe.com"]);
const paypalHosts = new Set(["paypal.com", "www.paypal.com", "www.sandbox.paypal.com"]);

function checkoutUrl(value) {
	if (typeof value !== "string") return null;
	const input = value.trim();
	if (!/^https:\/\//i.test(input) || /[\\\s\u0000-\u001f\u007f]/u.test(input)) return null;

	const url = URL.parse(input);
	if (!url || url.username || url.password || url.port || url.hash) return null;

	if (stripeHosts.has(url.hostname) && /^\/[a-z0-9_]+$/i.test(url.pathname) && !url.search) {
		return url.href;
	}

	if (paypalHosts.has(url.hostname) && /^\/donate\/?$/.test(url.pathname)) {
		const buttonIds = url.searchParams.getAll("hosted_button_id");
		if (url.searchParams.size === 1 && buttonIds.length === 1 && /^[A-Z0-9]+$/i.test(buttonIds[0])) {
			return url.href;
		}
	}

	return null;
}

export function checkoutChoices(choices) {
	if (!Array.isArray(choices)) return [];

	const seen = new Set();
	const links = [];
	for (const choice of choices) {
		const label = typeof choice?.label === "string" ? choice.label.trim() : "";
		const url = checkoutUrl(choice?.url);
		if (!label || !url || seen.has(url)) continue;
		seen.add(url);
		links.push({ label, url });
	}
	return links;
}
