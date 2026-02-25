import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { constants } from "node:fs";
import {
  access,
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliPath = path.resolve(__dirname, "../src/cli.js");

async function setupSandbox(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "qix-test-"));
  const home = path.join(root, "home");
  const cwd = path.join(root, "work");

  await mkdir(home, { recursive: true });
  await mkdir(cwd, { recursive: true });

  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });

  return { home, cwd };
}

function scriptsDir(home) {
  return path.join(home, ".qix", "scripts");
}

function managedScriptPath(home, name) {
  return path.join(scriptsDir(home), `${name}.sh`);
}

function runCli(args, { home, cwd }) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    env: { ...process.env, HOME: home },
    encoding: "utf8",
  });
}

async function createScript(filePath, content) {
  await writeFile(filePath, content, { mode: 0o755 });
}

async function createQixShim(binDir) {
  await mkdir(binDir, { recursive: true });
  const shimPath = path.join(binDir, "qix");
  await writeFile(
    shimPath,
    `#!/usr/bin/env bash
exec "${process.execPath}" "${cliPath}" "$@"
`,
  );
  await chmod(shimPath, 0o755);
  return shimPath;
}

test("add copies script and keeps source file", async (t) => {
  const { home, cwd } = await setupSandbox(t);
  const source = path.join(cwd, "deploy.sh");

  await createScript(source, "#!/usr/bin/env bash\necho deploy\n");

  const result = runCli(["add", source], { home, cwd });
  assert.equal(result.status, 0);

  await access(source, constants.F_OK);
  const stored = managedScriptPath(home, "deploy");
  await access(stored, constants.F_OK);

  const storedStat = await stat(stored);
  assert.equal(storedStat.mode & 0o777, 0o755);
});

test("add --move moves source script into managed directory", async (t) => {
  const { home, cwd } = await setupSandbox(t);
  const source = path.join(cwd, "move-me.sh");
  await createScript(source, "#!/usr/bin/env bash\necho move\n");

  const result = runCli(["add", source, "--move"], { home, cwd });
  assert.equal(result.status, 0);

  const moved = managedScriptPath(home, "move-me");
  await access(moved, constants.F_OK);

  await assert.rejects(access(source, constants.F_OK), /ENOENT/);
});

test("add --name stores script under custom name", async (t) => {
  const { home, cwd } = await setupSandbox(t);
  const source = path.join(cwd, "deploy.sh");
  await createScript(source, "#!/usr/bin/env bash\necho custom\n");

  const result = runCli(["add", source, "--name", "prod-deploy"], {
    home,
    cwd,
  });
  assert.equal(result.status, 0);

  await access(managedScriptPath(home, "prod-deploy"), constants.F_OK);
});

test("add rejects duplicate script names without --force", async (t) => {
  const { home, cwd } = await setupSandbox(t);
  const source = path.join(cwd, "duplicate.sh");
  await createScript(source, "#!/usr/bin/env bash\necho one\n");

  assert.equal(runCli(["add", source], { home, cwd }).status, 0);

  const second = runCli(["add", source], { home, cwd });
  assert.equal(second.status, 1);
  assert.match(second.stderr, /Error: Script "duplicate" already exists/);
});

test("add --force replaces an existing managed script", async (t) => {
  const { home, cwd } = await setupSandbox(t);
  const source = path.join(cwd, "replace.sh");
  await createScript(source, "#!/usr/bin/env bash\necho first\n");
  assert.equal(runCli(["add", source], { home, cwd }).status, 0);

  await createScript(source, "#!/usr/bin/env bash\necho second\n");
  const forced = runCli(["add", source, "--force"], { home, cwd });
  assert.equal(forced.status, 0);

  const content = await readFile(managedScriptPath(home, "replace"), "utf8");
  assert.match(content, /second/);
});

test("link creates a symlink in managed scripts directory", async (t) => {
  const { home, cwd } = await setupSandbox(t);
  const source = path.join(cwd, "linked.sh");
  await createScript(source, "#!/usr/bin/env bash\necho linked\n");

  const result = runCli(["link", source], { home, cwd });
  assert.equal(result.status, 0);

  const destination = managedScriptPath(home, "linked");
  const destinationStat = await lstat(destination);
  assert.equal(destinationStat.isSymbolicLink(), true);
  assert.equal(await readlink(destination), source);
});

test("link rejects duplicate names without --force", async (t) => {
  const { home, cwd } = await setupSandbox(t);
  const source = path.join(cwd, "dup-link.sh");
  await createScript(source, "#!/usr/bin/env bash\necho linked\n");

  assert.equal(runCli(["link", source], { home, cwd }).status, 0);

  const duplicate = runCli(["link", source], { home, cwd });
  assert.equal(duplicate.status, 1);
  assert.match(duplicate.stderr, /Error: Script "dup-link" already exists/);
});

test("list prints script names one per line", async (t) => {
  const { home, cwd } = await setupSandbox(t);
  const first = path.join(cwd, "alpha.sh");
  const second = path.join(cwd, "beta.txt");
  await createScript(first, "#!/usr/bin/env bash\necho alpha\n");
  await createScript(second, "#!/usr/bin/env bash\necho beta\n");

  assert.equal(runCli(["add", first], { home, cwd }).status, 0);
  assert.equal(runCli(["add", second], { home, cwd }).status, 0);

  await mkdir(scriptsDir(home), { recursive: true });
  await writeFile(path.join(scriptsDir(home), "ignore.txt"), "x");

  const listed = runCli(["list", "--plain"], { home, cwd });
  assert.equal(listed.status, 0);

  const names = listed.stdout
    .trim()
    .split("\n")
    .map((line) => line.split(" — ")[0].trim())
    .filter(Boolean);

  assert.deepEqual(names, ["alpha", "beta"]);
});

test("run executes managed script through bash and forwards args", async (t) => {
  const { home, cwd } = await setupSandbox(t);
  const source = path.join(cwd, "echoargs.sh");
  await createScript(
    source,
    '#!/usr/bin/env bash\nprintf "%s|%s\\n" "$1" "$2"\n',
  );

  assert.equal(runCli(["add", source], { home, cwd }).status, 0);

  const result = runCli(["run", "echoargs", "--", "foo", "bar"], { home, cwd });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /foo\|bar/);
});

test("run returns child script exit code", async (t) => {
  const { home, cwd } = await setupSandbox(t);
  const source = path.join(cwd, "exit7.sh");
  await createScript(source, "#!/usr/bin/env bash\nexit 7\n");

  assert.equal(runCli(["add", source], { home, cwd }).status, 0);

  const result = runCli(["run", "exit7"], { home, cwd });
  assert.equal(result.status, 7);
});

test("run accepts name with .sh extension", async (t) => {
  const { home, cwd } = await setupSandbox(t);
  const source = path.join(cwd, "ext.sh");
  await createScript(source, "#!/usr/bin/env bash\necho with-extension\n");

  assert.equal(runCli(["add", source], { home, cwd }).status, 0);

  const result = runCli(["run", "ext.sh"], { home, cwd });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /with-extension/);
});

test("info accepts name with .sh extension", async (t) => {
  const { home, cwd } = await setupSandbox(t);
  const source = path.join(cwd, "extinfo.sh");
  await createScript(source, "#!/usr/bin/env bash\necho x\n");

  assert.equal(runCli(["add", source], { home, cwd }).status, 0);

  const result = runCli(["info", "extinfo.sh"], { home, cwd });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^Name: extinfo/m);
});

test("invalid names are rejected", async (t) => {
  const { home, cwd } = await setupSandbox(t);
  const source = path.join(cwd, "badname.sh");
  await createScript(source, "#!/usr/bin/env bash\necho x\n");

  const result = runCli(["add", source, "--name", "bad/name"], { home, cwd });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Error: Invalid script name "bad\/name"/);
});

test("missing source and missing run target return clear errors", async (t) => {
  const { home, cwd } = await setupSandbox(t);

  const missingSource = runCli(["add", path.join(cwd, "does-not-exist.sh")], {
    home,
    cwd,
  });
  assert.equal(missingSource.status, 1);
  assert.match(missingSource.stderr, /Error: Source script not found/);

  const missingRun = runCli(["run", "not-here"], { home, cwd });
  assert.equal(missingRun.status, 1);
  assert.match(missingRun.stderr, /Error: Script "not-here" not found/);
});

test("completion bash prints completion script", async (t) => {
  const { home, cwd } = await setupSandbox(t);

  const result = runCli(["completion", "bash"], { home, cwd });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /_qix_completion\(\)/);
  assert.match(result.stdout, /complete -F _qix_completion qix/);
});

test("bash completion suggests managed names for qix run", async (t) => {
  const { home, cwd } = await setupSandbox(t);
  const source = path.join(cwd, "deploy.sh");
  await createScript(source, "#!/usr/bin/env bash\necho deploy\n");

  assert.equal(runCli(["add", source], { home, cwd }).status, 0);

  const completionResult = runCli(["completion", "bash"], { home, cwd });
  assert.equal(completionResult.status, 0);

  const completionPath = path.join(cwd, "qix-completion.bash");
  await writeFile(completionPath, completionResult.stdout);

  const binDir = path.join(cwd, "bin");
  await createQixShim(binDir);

  const check = spawnSync(
    "bash",
    [
      "-lc",
      `source "${completionPath}"
COMP_WORDS=(qix run de)
COMP_CWORD=2
_qix_completion
printf '%s\n' "\${COMPREPLY[@]}"
`,
    ],
    {
      cwd,
      env: {
        ...process.env,
        HOME: home,
        PATH: `${binDir}:${process.env.PATH || ""}`,
      },
      encoding: "utf8",
    },
  );

  assert.equal(check.status, 0, check.stderr);
  assert.match(check.stdout, /^deploy$/m);
});

test("info script not found returns error", async (t) => {
  const { home, cwd } = await setupSandbox(t);

  const result = runCli(["info", "not-here"], { home, cwd });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Error: Script "not-here" not found/);
});

test("info script with no header block shows name only", async (t) => {
  const { home, cwd } = await setupSandbox(t);
  const source = path.join(cwd, "nometa.sh");
  await createScript(source, "#!/usr/bin/env bash\necho nometa\n");

  assert.equal(runCli(["add", source], { home, cwd }).status, 0);

  const result = runCli(["info", "nometa"], { home, cwd });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Name: nometa/);
  assert.ok(!result.stdout.includes("Description:"));
  assert.ok(!result.stdout.includes("Usage:"));
  assert.ok(!result.stdout.includes("Metadata:"));
});

test("info script with description shows name and description", async (t) => {
  const { home, cwd } = await setupSandbox(t);
  const source = path.join(cwd, "withdesc.sh");
  const content = `#!/usr/bin/env bash
# ---
# description: Deploy to production
# ---
echo deploy
`;
  await createScript(source, content);

  assert.equal(runCli(["add", source], { home, cwd }).status, 0);

  const result = runCli(["info", "withdesc"], { home, cwd });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /^Name: withdesc/m);
  assert.match(result.stdout, /Description: Deploy to production/);
});

test("info script with usage shows usage in its own section", async (t) => {
  const { home, cwd } = await setupSandbox(t);
  const source = path.join(cwd, "withusage.sh");
  const content = `#!/usr/bin/env bash
# ---
# metadata:
#   usage: qix run withusage -- --env prod
# ---
echo run
`;
  await createScript(source, content);

  assert.equal(runCli(["add", source], { home, cwd }).status, 0);

  const result = runCli(["info", "withusage"], { home, cwd });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^Name: withusage/m);
  assert.match(result.stdout, /Usage:/);
  assert.match(result.stdout, /qix run withusage -- --env prod/);
  assert.ok(
    !result.stdout.includes("usage") || result.stdout.includes("Usage:"),
  );
});

test("info script with multiple metadata shows table excluding usage and description", async (t) => {
  const { home, cwd } = await setupSandbox(t);
  const source = path.join(cwd, "fullmeta.sh");
  const content = `#!/usr/bin/env bash
# ---
# description: Full metadata script
# metadata:
#   usage: qix run fullmeta
#   author: Test Author
#   version: "1.0"
# ---
echo full
`;
  await createScript(source, content);

  assert.equal(runCli(["add", source], { home, cwd }).status, 0);

  const result = runCli(["info", "fullmeta"], { home, cwd });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^Name: fullmeta/m);
  assert.match(result.stdout, /Description: Full metadata script/);
  assert.match(result.stdout, /Usage:/);
  assert.match(result.stdout, /qix run fullmeta/);
  assert.match(result.stdout, /Metadata/);
  assert.match(result.stdout, /author.*Test Author/);
  assert.match(result.stdout, /version.*1\.0/);
});
