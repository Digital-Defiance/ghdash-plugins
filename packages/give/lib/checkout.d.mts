export interface CheckoutChoice {
	label: string;
	url: string;
}

export function checkoutChoices(choices: unknown): CheckoutChoice[];
