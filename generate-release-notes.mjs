#!/usr/bin/env node

import { execFileSync } from "child_process";
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";

const releaseAssets = ["main.js", "manifest.json", "styles.css"];
const [version, outputPath] = process.argv.slice(2);

if (!version || !outputPath) {
	console.error("Usage: node generate-release-notes.mjs <version> <output-path>");
	process.exit(1);
}

function runGit(args) {
	try {
		return execFileSync("git", args, {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
	} catch {
		return "";
	}
}

function isSemverTag(tag) {
	return /^\d+\.\d+\.\d+$/.test(tag);
}

function getPreviousSemverTag(currentVersion) {
	const tags = runGit(["tag", "--sort=-version:refname", "--merged", "HEAD"])
		.split(/\r?\n/)
		.map(function(tag) {
			return tag.trim();
		})
		.filter(Boolean)
		.filter(isSemverTag);

	return tags.find(function(tag) {
		return tag !== currentVersion;
	}) ?? null;
}

function stripGeneratedMetadata(line) {
	return line
		.replace(/^\s*[-*]\s+/, "")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replace(/\s+by\s+@\S+.*$/i, "")
		.replace(/\s+in\s+#\d+\s*$/i, "")
		.replace(/\s+\(#\d+\)\s*$/i, "")
		.trim();
}

function isVersionBumpLine(line) {
	const text = stripGeneratedMetadata(line);
	return /^(?:bump version|version bump)(?:\s+(?:to\s+)?v?\d+\.\d+\.\d+)?$/i.test(text);
}

function normalizeMarkdown(markdown) {
	return markdown.replace(/\n{3,}/g, "\n\n").trim();
}

function normalizeGeneratedChangeNotes(body) {
	if (!body) {
		return "";
	}

	const lines = body.split(/\r?\n/);
	const normalizedLines = [];

	for (const line of lines) {
		const trimmed = line.trim();

		if (isVersionBumpLine(line)) {
			continue;
		}

		if (/^#{1,6}\s+what'?s changed\s*$/i.test(trimmed)) {
			continue;
		}

		if (/^#{1,5}\s+/.test(line)) {
			normalizedLines.push(line.replace(/^(#{1,5})\s+/, "$1# "));
			continue;
		}

		normalizedLines.push(line);
	}

	return normalizeMarkdown(normalizedLines.join("\n"));
}

function getFallbackSubjects(previousTag) {
	const args = ["log", "--no-merges", "--format=%s"];

	if (previousTag) {
		args.push(`${previousTag}..HEAD`);
	} else {
		args.push("-n", "20");
	}

	return runGit(args)
		.split(/\r?\n/)
		.map(function(subject) {
			return subject.trim();
		})
		.filter(Boolean)
		.filter(function(subject) {
			return !isVersionBumpLine(subject);
		});
}

function createFallbackChangeNotes(previousTag) {
	const subjects = getFallbackSubjects(previousTag);
	const uniqueSubjects = [];
	const seenSubjects = new Set();

	for (const subject of subjects) {
		if (!seenSubjects.has(subject)) {
			seenSubjects.add(subject);
			uniqueSubjects.push(subject);
		}
	}

	if (uniqueSubjects.length === 0) {
		return "- No user-facing changes were detected from commit messages.";
	}

	return uniqueSubjects.map(function(subject) {
		return `- ${subject}`;
	}).join("\n");
}

async function fetchGithubGeneratedNotes(currentVersion, previousTag) {
	const repository = process.env.GITHUB_REPOSITORY;
	const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

	if (!repository || !token) {
		return "";
	}

	const body = {
		tag_name: currentVersion,
	};

	if (process.env.GITHUB_SHA) {
		body.target_commitish = process.env.GITHUB_SHA;
	}

	if (previousTag) {
		body.previous_tag_name = previousTag;
	}

	const response = await fetch(`https://api.github.com/repos/${repository}/releases/generate-notes`, {
		method: "POST",
		headers: {
			Accept: "application/vnd.github+json",
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			"User-Agent": "stock-blocks-release-notes",
			"X-GitHub-Api-Version": "2022-11-28",
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const responseText = await response.text();
		throw new Error(`GitHub release notes API failed with ${response.status}: ${responseText}`);
	}

	const releaseNotes = await response.json();
	return typeof releaseNotes.body === "string" ? releaseNotes.body : "";
}

function createChecksum(filePath) {
	return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function getChecksums() {
	const checksums = {};

	for (const asset of releaseAssets) {
		checksums[asset] = createChecksum(asset);
	}

	return checksums;
}

function buildReleaseNotes(currentVersion, changeNotes, checksums) {
	return [
		`## Stock Blocks Plugin v${currentVersion}`,
		"",
		"### What changed",
		"",
		changeNotes,
		"",
		"### Checksums (SHA256)",
		"```",
		`main.js:      ${checksums["main.js"]}`,
		`manifest.json: ${checksums["manifest.json"]}`,
		`styles.css:   ${checksums["styles.css"]}`,
		"```",
		"",
		"### Verification",
		"After downloading, verify file integrity:",
		"```bash",
		"sha256sum main.js manifest.json styles.css",
		"```",
		"",
		"This release is built by GitHub Actions and includes GitHub artifact attestations for the release assets.",
		"",
	].join("\n");
}

async function main() {
	const previousTag = getPreviousSemverTag(version);
	let generatedChangeNotes = "";

	try {
		generatedChangeNotes = await fetchGithubGeneratedNotes(version, previousTag);
	} catch (error) {
		console.warn(error.message);
	}

	const changeNotes = normalizeGeneratedChangeNotes(generatedChangeNotes) || createFallbackChangeNotes(previousTag);
	const checksums = getChecksums();

	writeFileSync(outputPath, buildReleaseNotes(version, changeNotes, checksums));
	console.log(`Release notes written to ${outputPath}`);
}

main().catch(function(error) {
	console.error(error.message);
	process.exit(1);
});
