import { test } from "node:test";
import assert from "node:assert/strict";
import { isInside, validateCwd, validateName } from "./validate.ts";
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

function root(): string {
	return mkdtempSync(join(tmpdir(), "webpi-"));
}

test("isInside accepts root and children, rejects siblings and traversal", () => {
	const base = root();
	assert.equal(isInside(base, base), true);
	assert.equal(isInside(base, join(base, "a", "b")), true);
	assert.equal(isInside(base, join(base, "a", "..", "b")), true);
	assert.equal(isInside(base, `${base}-evil`), false);
	assert.equal(isInside(base, join(base, "..", "outside")), false);
});

test("validateCwd accepts a directory inside an allowlisted root", () => {
	const base = root();
	const project = join(base, "project");
	mkdirSync(project);
	assert.equal(validateCwd(project, [base]), resolve(project));
});

test("validateCwd rejects missing, relative, outside, and traversal input", () => {
	const base = root();
	assert.throws(() => validateCwd(undefined, [base]), /cwd is required/);
	assert.throws(() => validateCwd("relative/path", [base]), /absolute/);
	assert.throws(() => validateCwd(tmpdir(), [base]), /outside allowlisted/);
	assert.throws(() => validateCwd(join(base, "..", "elsewhere"), [base]), /outside allowlisted/);
	assert.throws(() => validateCwd(base, []), /no allowlisted roots/);
});

test("validateCwd rejects symlink escapes", () => {
	const base = root();
	const outside = root();
	writeFileSync(join(outside, "file.txt"), "x");
	const link = join(base, "escape");
	try {
		symlinkSync(outside, link, "junction");
	} catch {
		return; // symlink creation unavailable; covered by traversal test
	}
	assert.throws(() => validateCwd(link, [base]), /outside allowlisted/);
});

test("validateName enforces the token charset", () => {
	assert.equal(validateName("web-pi_1.0"), "web-pi_1.0");
	assert.throws(() => validateName("bad name"), /invalid session name/);
	assert.throws(() => validateName(""), /invalid session name/);
	assert.throws(() => validateName("x".repeat(65)), /invalid session name/);
});
