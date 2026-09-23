import { realpathSync } from "node:fs";
import { isAbsolute, resolve, sep } from "node:path";

/** Case-insensitive prefix compare on Windows, exact elsewhere. */
export function isInside(root: string, target: string): boolean {
	const norm = (p: string): string =>
		process.platform === "win32" ? p.toLowerCase() : p;
	const r = norm(resolve(root));
	const t = norm(resolve(target));
	if (t === r) return true;
	const prefix = r.endsWith(sep) ? r : r + sep;
	return t.startsWith(prefix);
}

export function realOrResolved(path: string): string {
	try {
		return realpathSync.native(path);
	} catch {
		return resolve(path);
	}
}

/**
 * Resolve `input` to an existing directory inside one allowlisted root.
 * Traversal (`..`), absolute escapes, and symlink escapes are rejected:
 * resolve() collapses `..` and realpathSync resolves links before the
 * prefix match, so a link pointing outside the root cannot pass.
 */
export function validateCwd(input: string | undefined, allowRoots: string[]): string {
	if (!input) throw new Error("cwd is required");
	if (!isAbsolute(input)) throw new Error(`cwd must be absolute: ${input}`);
	if (allowRoots.length === 0) throw new Error("no allowlisted roots configured");
	const candidate = realOrResolved(resolve(input));
	for (const root of allowRoots) {
		if (isInside(realOrResolved(resolve(root)), candidate)) return candidate;
	}
	throw new Error(`cwd outside allowlisted roots: ${candidate}`);
}

const NAME_RE = /^[A-Za-z0-9._-]{1,64}$/;

export function validateName(name: string): string {
	if (!NAME_RE.test(name)) throw new Error(`invalid session name: ${name}`);
	return name;
}
