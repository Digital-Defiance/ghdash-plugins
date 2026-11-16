import assert from "node:assert/strict";
import { test } from "node:test";
import { handleDonation } from "../lib/stripe-worker.mjs";

const origin = "https://example.org";
const attempt = "2dad45d7-b458-40b3-b697-cfe3b362d204";
const env = {
	DONATION_NAME: "Example donation",
	DONATION_RETURN_URL: origin + "/donate/",
	STRIPE_SECRET_KEY: "sk_test_fixture",
};

function request(amount = "1250", headers = {}) {
	return new Request("https://checkout.example.org/create-checkout-session", {
		method: "POST",
		headers: { origin, ...headers },
		body: new URLSearchParams({ amount, attempt }),
	});
}

test("creates a card-only embedded session in cents and returns only its client secret", async () => {
	const response = await handleDonation(request(), env, async (url, options) => {
		assert.equal(url, "https://api.stripe.com/v1/checkout/sessions");
		assert.equal(options.headers.authorization, "Bearer sk_test_fixture");
		assert.equal(options.headers["idempotency-key"], "gitdash-give-" + attempt);
		assert.equal(options.body.get("ui_mode"), "form");
		assert.equal(options.body.get("return_url"), origin + "/donate/");
		assert.equal(options.body.get("line_items[0][price_data][unit_amount]"), "1250");
		assert.equal(options.body.get("allowed_payment_method_types[0]"), "card");
		assert.equal(options.body.has("payment_method_types[0]"), false);
		return Response.json({ client_secret: "cs_test_fixture_secret_session", private: "not returned" });
	});
	assert.equal(response.status, 200);
	assert.equal(response.headers.get("cache-control"), "no-store");
	assert.equal(response.headers.get("access-control-allow-origin"), origin);
	assert.deepEqual(await response.json(), { client_secret: "cs_test_fixture_secret_session" });
});

test("blocks invalid amounts, oversized bodies, unexpected origins, and rate-limited requests", async () => {
	const rejectFetch = () => assert.fail("Stripe should not be called");
	for (const amount of ["49", "1.23", "1000001", "-500"]) {
		assert.equal((await handleDonation(request(amount), env, rejectFetch)).status, 400);
	}
	assert.equal((await handleDonation(request("1".repeat(300)), env, rejectFetch)).status, 413);
	assert.equal((await handleDonation(request("1250", { origin: "https://other.example" }), env, rejectFetch)).status, 403);
	const limited = { ...env, DONATION_RATE_LIMIT: { limit: async () => ({ success: false }) } };
	assert.equal((await handleDonation(request("1250", { "cf-connecting-ip": "192.0.2.1" }), limited, rejectFetch)).status, 429);
});

test("does not expose upstream Stripe error details to the browser", async () => {
	const response = await handleDonation(request(), env, async () => Response.json({ error: "sensitive details" }, { status: 400 }));
	assert.equal(response.status, 502);
	assert.doesNotMatch(await response.text(), /sensitive details/);
});
