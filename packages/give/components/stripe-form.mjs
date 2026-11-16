let stripeScript;

function loadStripe() {
	stripeScript ??= new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = "https://js.stripe.com/endive/stripe.js";
		script.addEventListener("load", () => resolve(window.Stripe), { once: true });
		script.addEventListener("error", () => {
			script.remove();
			stripeScript = undefined;
			reject(new Error("Stripe.js could not load"));
		}, { once: true });
		document.head.append(script);
	});
	return stripeScript;
}

export function setupStripeDonation(element) {
	const form = element.querySelector("form");
	const custom = form.elements.namedItem("custom");
	const submit = form.querySelector('button[type="submit"]');
	const status = element.querySelector("[data-status]");
	const mount = element.querySelector("[data-card-checkout]");
	const change = element.querySelector("[data-change]");
	let checkoutForm;
	let confirming = false;
	let attempt;
	let lastAmount;
	mount.id = "stripe-checkout-" + crypto.randomUUID();
	submit.disabled = false;

	function updateCustomAmount() {
		const enteringCustom = new FormData(form).get("preset") === "custom";
		custom.closest("label").hidden = !enteringCustom;
		custom.disabled = !enteringCustom;
		custom.required = enteringCustom;
	}
	updateCustomAmount();
	form.addEventListener("change", updateCustomAmount);

	change.addEventListener("click", () => {
		if (confirming) return;
		checkoutForm.destroy();
		checkoutForm = undefined;
		attempt = undefined;
		change.hidden = true;
		form.hidden = false;
		status.textContent = "";
		submit.focus();
	});

	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		if (submit.disabled) return;
		submit.disabled = true;
		const values = new FormData(form);
		const selected = values.get("preset");
		const amount = Math.round(Number(selected === "custom" ? values.get("custom") : selected) * 100);
		if (!attempt || amount !== lastAmount) attempt = crypto.randomUUID();
		lastAmount = amount;
		status.textContent = "Loading secure card payment…";
		try {
			const Stripe = await loadStripe();
			const response = await fetch(element.dataset.endpoint, {
				method: "POST",
				body: new URLSearchParams({ amount: String(amount), attempt }),
				signal: AbortSignal.timeout(15_000),
			});
			const { client_secret } = await response.json();
			if (!response.ok || !client_secret) throw new Error("Session unavailable");
			const checkout = Stripe(element.dataset.key).initCheckoutFormSdk({ clientSecret: client_secret });
			checkoutForm = checkout.createForm({ layout: "expanded" });
			checkoutForm.mount("#" + mount.id);
			const actions = await checkout.loadActions();
			if (actions.type !== "success") throw new Error("Checkout unavailable");

			checkoutForm.on("confirm", async (formEvent) => {
				if (confirming) return;
				confirming = change.disabled = true;
				status.textContent = "";
				try {
					const result = await actions.actions.confirm({ formConfirmEvent: formEvent, redirect: "if_required" });
					if (result.type === "success") change.hidden = true;
				} catch {
					status.textContent = "Payment confirmation was interrupted. Check for a receipt before starting another donation.";
				} finally {
					confirming = change.disabled = false;
				}
			});
			form.hidden = true;
			change.hidden = false;
			status.textContent = "";
		} catch {
			checkoutForm?.destroy();
			checkoutForm = undefined;
			status.textContent = "Card checkout could not start. Please try again.";
		} finally {
			submit.disabled = false;
		}
	});
}
