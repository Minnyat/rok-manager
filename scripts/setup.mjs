#!/usr/bin/env node

/**
 * ROK Manager — One-command setup script
 * Usage: npm run setup
 *
 * Automates: D1 creation, migration, password hashing, wrangler.toml update, build & deploy.
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { createInterface } from "readline";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function run(cmd, opts = {}) {
	console.log(`\n> ${cmd}`);
	return execSync(cmd, {
		cwd: ROOT,
		stdio: opts.silent ? "pipe" : "inherit",
		encoding: "utf-8",
		...opts,
	});
}

function runSilent(cmd) {
	return execSync(cmd, { cwd: ROOT, stdio: "pipe", encoding: "utf-8" });
}

function ask(question) {
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	return new Promise((r) =>
		rl.question(question, (ans) => {
			rl.close();
			r(ans.trim());
		}),
	);
}

async function main() {
	console.log("\n⚔️  ROK Manager Setup\n");
	console.log("This script will:");
	console.log("  1. Create a Cloudflare D1 database");
	console.log("  2. Set your admin password");
	console.log("  3. Run database migrations");
	console.log("  4. Build & deploy to Cloudflare Pages\n");

	// Check prerequisites
	try {
		runSilent("wrangler --version");
	} catch {
		console.error(
			"❌ Wrangler CLI not found. Install it: npm install -g wrangler",
		);
		process.exit(1);
	}

	// Check wrangler login
	try {
		runSilent("wrangler whoami");
	} catch {
		console.log("📋 You need to login to Cloudflare first.\n");
		run("wrangler login");
	}

	// Step 1: Kingdom name
	const kingdom = await ask('🏰 Your kingdom number (e.g. "3494"): ');
	if (kingdom) {
		const configPath = resolve(ROOT, "src/lib/config.ts");
		let configFile = readFileSync(configPath, "utf-8");
		configFile = configFile.replace(
			"kingdomNumber: '',",
			`kingdomNumber: '${kingdom}',`,
		);
		writeFileSync(configPath, configFile);
		console.log(`✅ Kingdom set to: ${kingdom}`);
	}

	// Step 2: Create D1 database
	console.log("\n📦 Creating D1 database...");
	let dbId;
	try {
		const output = runSilent("wrangler d1 create rok-manager-db");
		const match = output.match(/database_id\s*=\s*"([^"]+)"/);
		if (match) {
			dbId = match[1];
			console.log(`✅ Database created: ${dbId}`);
		}
	} catch (e) {
		const errMsg = e.stderr || e.stdout || "";
		if (errMsg.includes("already exists")) {
			console.log(
				"ℹ️  Database already exists, reading ID from wrangler.toml...",
			);
			const toml = readFileSync(resolve(ROOT, "wrangler.toml"), "utf-8");
			const m = toml.match(/database_id\s*=\s*"([^"]+)"/);
			if (m && m[1] !== "YOUR_DATABASE_ID_HERE") {
				dbId = m[1];
				console.log(`✅ Using existing database: ${dbId}`);
			} else {
				console.log("⚠️  Database exists but ID not in wrangler.toml.");
				dbId = await ask("Paste your D1 database ID: ");
			}
		} else {
			console.error("❌ Failed to create database:", errMsg);
			process.exit(1);
		}
	}

	// Update wrangler.toml
	if (dbId) {
		const tomlPath = resolve(ROOT, "wrangler.toml");
		let toml = readFileSync(tomlPath, "utf-8");
		toml = toml.replace(/database_id\s*=\s*"[^"]*"/, `database_id = "${dbId}"`);
		writeFileSync(tomlPath, toml);
		console.log("✅ wrangler.toml updated");
	}

	// Step 3: Admin password
	const password = await ask("🔑 Choose admin password (min 6 chars): ");
	if (!password || password.length < 6) {
		console.error("❌ Password must be at least 6 characters");
		process.exit(1);
	}

	// Hash password using bcryptjs (already installed)
	const bcrypt = await import("bcryptjs");
	const hash = await bcrypt.hash(password, 10);

	// Update seed migration
	const seedPath = resolve(ROOT, "migrations/0002_seed_admin.sql");
	const seedSql = `INSERT OR IGNORE INTO users (username, password_hash, role, main_governor_id, is_active)
VALUES ('admin', '${hash}', 'admin', 0, 1);
`;
	writeFileSync(seedPath, seedSql);
	console.log("✅ Admin password set");

	// Step 4: Run migrations
	console.log("\n📋 Running migrations on remote D1...");
	run(
		"wrangler d1 execute rok-manager-db --remote --file=migrations/0001_init.sql",
	);
	run(
		"wrangler d1 execute rok-manager-db --remote --file=migrations/0002_seed_admin.sql",
	);
	run(
		"wrangler d1 execute rok-manager-db --remote --file=migrations/0003_user_bonus.sql",
	);
	run(
		"wrangler d1 execute rok-manager-db --remote --file=migrations/0004_kvk_core.sql",
	);
	run(
		"wrangler d1 execute rok-manager-db --remote --file=migrations/0005_kvk_scoring_bonus.sql",
	);
	run(
		"wrangler d1 execute rok-manager-db --remote --file=migrations/0006_kvk_account_links.sql",
	);
	run(
		"wrangler d1 execute rok-manager-db --remote --file=migrations/0007_formula_plugin.sql",
	);
	console.log("✅ Migrations complete");

	// Step 5: Build
	console.log("\n🔨 Building...");
	run("npx vite build");

	// Step 6: Deploy
	console.log("\n🚀 Deploying to Cloudflare Pages...");
	try {
		runSilent(
			"wrangler pages project create rok-manager --production-branch master",
		);
		console.log("✅ Pages project created");
	} catch {
		console.log("ℹ️  Pages project already exists");
	}
	run(
		"wrangler pages deploy .svelte-kit/cloudflare --project-name rok-manager",
	);

	// Done
	console.log("\n" + "=".repeat(50));
	console.log("✅ Setup complete!\n");
	console.log("⚠️  One manual step remaining:");
	console.log("   Go to Cloudflare Dashboard > Workers & Pages > rok-manager");
	console.log("   > Settings > Bindings > Add binding");
	console.log("   > D1 Database, variable name: DB, select rok-manager-db");
	console.log("   > Save, then redeploy:\n");
	console.log("   npm run deploy\n");
	console.log(`📋 Login: admin / ${password}`);
	console.log("=".repeat(50) + "\n");
}

main().catch((e) => {
	console.error("❌ Setup failed:", e.message);
	process.exit(1);
});
