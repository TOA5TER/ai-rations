import { readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { parseFrontmatter } from "@earendil-works/pi-coding-agent";
import {
  ACTIONS,
  CONTRACT_VERSION,
  type BaseDescriptor,
  type Provider,
  type Selection,
  type SkillName,
} from "./provider-contract.ts";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function reject(detail: string): never {
  throw new Error(
    `dev-loop: ${detail}; repair the provider installation and reload`,
  );
}

function inside(root: string, path: string): boolean {
  const rel = relative(root, path);
  return rel !== ".." && !rel.startsWith(".." + sep) && !isAbsolute(rel);
}

function checkedFile(root: string, path: unknown, id: string): string {
  if (typeof path !== "string" || !isAbsolute(path))
    reject(`provider ${id} path must be absolute: ${String(path)}`);
  let actual: string;
  try {
    actual = realpathSync(path);
    if (!statSync(actual).isFile())
      reject(`provider ${id} resource is not a file: ${path}`);
  } catch {
    reject(`provider ${id} resource is missing or unreadable: ${path}`);
  }
  if (!inside(root, actual))
    reject(`provider ${id} resource is outside its root: ${path}`);
  return actual;
}

function validateProvider(value: unknown, isPublic: boolean): Provider {
  if (!record(value)) reject("invalid provider declaration");
  if (value.version !== CONTRACT_VERSION)
    reject(`unsupported provider version ${String(value.version)}`);
  if (
    typeof value.id !== "string" ||
    !/^[a-z0-9]+(?:[-.][a-z0-9]+)*$/.test(value.id)
  )
    reject("invalid provider id");
  if (!isPublic && value.id === "public")
    reject("provider id public is reserved");
  if (typeof value.root !== "string" || !isAbsolute(value.root))
    reject(`provider ${value.id} root must be absolute`);
  let root: string;
  try {
    root = realpathSync(value.root);
    if (!statSync(root).isDirectory())
      reject(`provider ${value.id} root is not a directory`);
  } catch {
    reject(`provider ${value.id} root is missing: ${value.root}`);
  }
  if (!record(value.skills))
    reject(`provider ${value.id} skills must be an object`);
  if (!Array.isArray(value.requiredFiles))
    reject(`provider ${value.id} requiredFiles must be an array`);
  for (const action of ACTIONS) {
    if (!Object.hasOwn(value.skills, `dev-loop-${action}`))
      reject(`provider ${value.id} is missing dev-loop-${action}`);
  }
  const skills: Provider["skills"] = {};
  const seen = new Set<string>();
  for (const [name, file] of Object.entries(value.skills)) {
    if (!/^dev-loop-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name))
      reject(`provider ${value.id} has invalid skill name ${name}`);
    if (["dev-loop-epic", "dev-loop-full-cycle"].includes(name))
      reject(`unsupported workflow ${name}`);
    const path = checkedFile(root, file, value.id);
    if (seen.has(path))
      reject(`provider ${value.id} has duplicate skill path ${path}`);
    seen.add(path);
    const { frontmatter } = parseFrontmatter<Record<string, unknown>>(
      readFileSync(path, "utf8"),
    );
    if (frontmatter.name !== name)
      reject(`provider ${value.id} skill name mismatch in ${path}`);
    if (
      typeof frontmatter.description !== "string" ||
      !frontmatter.description.trim()
    )
      reject(`provider ${value.id} skill description is missing in ${path}`);
    skills[name as SkillName] = path;
  }
  const requiredFiles = value.requiredFiles.map((path) =>
    checkedFile(root, path, value.id as string),
  );
  return { version: 1, id: value.id, root, skills, requiredFiles };
}

export function publicProvider(root: string): Provider {
  const inventory: unknown = JSON.parse(
    readFileSync(resolve(root, "resources.json"), "utf8"),
  );
  if (
    !Array.isArray(inventory) ||
    inventory.length === 0 ||
    inventory.some(
      (path) =>
        typeof path !== "string" ||
        !path ||
        isAbsolute(path) ||
        !inside(root, resolve(root, path)),
    )
  ) {
    reject("invalid public resources inventory");
  }
  const skills = Object.fromEntries(
    ACTIONS.map((action) => [
      `dev-loop-${action}`,
      resolve(root, `skills/dev-loop-${action}/SKILL.md`),
    ]),
  );
  return {
    version: 1,
    id: "public",
    root,
    skills,
    requiredFiles: inventory.map((path) => resolve(root, path as string)),
  };
}

export function selectProvider(
  base: Provider,
  declarations: unknown[],
): Selection {
  const validatedBase = validateProvider(base, true);
  if (declarations.length > 1)
    reject("provider conflict: remove competing wrapper extensions");
  const provider =
    declarations.length === 0
      ? validatedBase
      : validateProvider(declarations[0], false);
  return {
    provider,
    base: {
      version: 1,
      skills: validatedBase.skills as BaseDescriptor["skills"],
    },
  };
}
