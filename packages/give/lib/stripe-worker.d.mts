export interface DonationWorkerEnv {
	DONATION_NAME: string;
	DONATION_RETURN_URL: string;
	STRIPE_SECRET_KEY: string;
	DONATION_RATE_LIMIT?: { limit(input: { key: string }): Promise<{ success: boolean }> };
}

export function handleDonation(request: Request, env: DonationWorkerEnv, fetchImpl?: typeof fetch): Promise<Response>;
declare const worker: { fetch(request: Request, env: DonationWorkerEnv): Promise<Response> };
export default worker;
