import { donationBlockType, embeddedDonationBlockType } from "../lib/studio.mjs";

import Donate from "./Donate.astro";
import EmbeddedDonate from "./EmbeddedDonate.astro";

export const blockComponents = { [donationBlockType]: Donate, [embeddedDonationBlockType]: EmbeddedDonate };
