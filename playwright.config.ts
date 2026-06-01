import { createLovableConfig } from "lovable-agent-playwright-config/config";

export default createLovableConfig({
	timeout: 120000,
	expect: {
		timeout: 15000,
	},
});
