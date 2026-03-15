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
import { afterEach, describe, expect, it } from "vitest";

const cliPath = path.resolve(__dirname, "../dist/cli.js");

let currentRoot: string | null = null;

async function setupSandbox(): Promise<{ home: string; cwd: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qix-test-"));
  currentRoot = root;
  const home = path.join(root, "home");
  const cwd = path.join(root, "work");

  await mkdir(home, { recursive: true });
  await mkdir(cwd, { recursive: true });

  return { home, cwd };
}

function scriptsDir(home: string): string {
  return path.join(home, ".qix", "scripts");
}

function managedScriptPath(home: string, name: string): string {
  return path.join(scriptsDir(home), `${name}.sh`);
}

function runCli(
  args: string[],
  { home, cwd }: { home: string; cwd: string }
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    env: { ...process.env, HOME: home },
    encoding: "utf8",
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

async function createScript(filePath: string, content: string): Promise<void> {
  await writeFile(filePath, content, { mode: 0o755 });
}

async function createQixShim(binDir: string): Promise<string> {
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

afterEach(async () => {
  if (currentRoot) {
    await rm(currentRoot, { recursive: true, force: true });
    currentRoot = null;
  }
});

describe("qix cli", () => {
  it("add copies script and keeps source file", async () => {
    const { home, cwd } = await setupSandbox();
    const source = path.join(cwd, "deploy.sh");

    await createScript(source, "#!/usr/bin/env bash\necho deploy\n");

    const result = runCli(["add", source], { home, cwd });
    expect(result.status).toBe(0);

    await access(source, constants.F_OK);
    const stored = managedScriptPath(home, "deploy");
    await access(stored, constants.F_OK);

    const storedStat = await stat(stored);
    expect(storedStat.mode & 0o777).toBe(0o755);
  });

  it("add --move moves source script into managed directory", async () => {
    const { home, cwd } = await setupSandbox();
    const source = path.join(cwd, "move-me.sh");
    await createScript(source, "#!/usr/bin/env bash\necho move\n");

    const result = runCli(["add", source, "--move"], { home, cwd });
    expect(result.status).toBe(0);

    const moved = managedScriptPath(home, "move-me");
    await access(moved, constants.F_OK);

    await expect(access(source, constants.F_OK)).rejects.toThrow(/ENOENT/);
  });

  it("add --name stores script under custom name", async () => {
    const { home, cwd } = await setupSandbox();
    const source = path.join(cwd, "deploy.sh");
    await createScript(source, "#!/usr/bin/env bash\necho custom\n");

    const result = runCli(["add", source, "--name", "prod-deploy"], {
      home,
      cwd,
    });
    expect(result.status).toBe(0);

    await access(managedScriptPath(home, "prod-deploy"), constants.F_OK);
  });

  it("add rejects duplicate script names without --force", async () => {
    const { home, cwd } = await setupSandbox();
    const source = path.join(cwd, "duplicate.sh");
    await createScript(source, "#!/usr/bin/env bash\necho one\n");

    expect(runCli(["add", source], { home, cwd }).status).toBe(0);

    const second = runCli(["add", source], { home, cwd });
    expect(second.status).toBe(1);
    expect(second.stderr).toMatch(/Error: Script "duplicate" already exists/);
  });

  it("add --force replaces an existing managed script", async () => {
    const { home, cwd } = await setupSandbox();
    const source = path.join(cwd, "replace.sh");
    await createScript(source, "#!/usr/bin/env bash\necho first\n");
    expect(runCli(["add", source], { home, cwd }).status).toBe(0);

    await createScript(source, "#!/usr/bin/env bash\necho second\n");
    const forced = runCli(["add", source, "--force"], { home, cwd });
    expect(forced.status).toBe(0);

    const content = await readFile(managedScriptPath(home, "replace"), "utf8");
    expect(content).toMatch(/second/);
  });

  it("link creates a symlink in managed scripts directory", async () => {
    const { home, cwd } = await setupSandbox();
    const source = path.join(cwd, "linked.sh");
    await createScript(source, "#!/usr/bin/env bash\necho linked\n");

    const result = runCli(["link", source], { home, cwd });
    expect(result.status).toBe(0);

    const destination = managedScriptPath(home, "linked");
    const destinationStat = await lstat(destination);
    expect(destinationStat.isSymbolicLink()).toBe(true);
    expect(await readlink(destination)).toBe(source);
  });

  it("link rejects duplicate names without --force", async () => {
    const { home, cwd } = await setupSandbox();
    const source = path.join(cwd, "dup-link.sh");
    await createScript(source, "#!/usr/bin/env bash\necho linked\n");

    expect(runCli(["link", source], { home, cwd }).status).toBe(0);

    const duplicate = runCli(["link", source], { home, cwd });
    expect(duplicate.status).toBe(1);
    expect(duplicate.stderr).toMatch(/Error: Script "dup-link" already exists/);
  });

  it("list prints script names one per line", async () => {
    const { home, cwd } = await setupSandbox();
    const first = path.join(cwd, "alpha.sh");
    const second = path.join(cwd, "beta.txt");
    await createScript(first, "#!/usr/bin/env bash\necho alpha\n");
    await createScript(second, "#!/usr/bin/env bash\necho beta\n");

    expect(runCli(["add", first], { home, cwd }).status).toBe(0);
    expect(runCli(["add", second], { home, cwd }).status).toBe(0);

    await mkdir(scriptsDir(home), { recursive: true });
    await writeFile(path.join(scriptsDir(home), "ignore.txt"), "x");

    const listed = runCli(["list", "--plain"], { home, cwd });
    expect(listed.status).toBe(0);

    const names = listed.stdout
      .trim()
      .split("\n")
      .map((line) => line.split(" — ")[0].trim())
      .filter(Boolean);

    expect(names).toEqual(["alpha", "beta"]);
  });

  it("run executes managed script through bash and forwards args", async () => {
    const { home, cwd } = await setupSandbox();
    const source = path.join(cwd, "echoargs.sh");
    await createScript(
      source,
      '#!/usr/bin/env bash\nprintf "%s|%s\\n" "$1" "$2"\n'
    );

    expect(runCli(["add", source], { home, cwd }).status).toBe(0);

    const result = runCli(["run", "echoargs", "--", "foo", "bar"], {
      home,
      cwd,
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/foo\|bar/);
  });

  it("run returns child script exit code", async () => {
    const { home, cwd } = await setupSandbox();
    const source = path.join(cwd, "exit7.sh");
    await createScript(source, "#!/usr/bin/env bash\nexit 7\n");

    expect(runCli(["add", source], { home, cwd }).status).toBe(0);

    const result = runCli(["run", "exit7"], { home, cwd });
    expect(result.status).toBe(7);
  });

  it("run accepts name with .sh extension", async () => {
    const { home, cwd } = await setupSandbox();
    const source = path.join(cwd, "ext.sh");
    await createScript(source, "#!/usr/bin/env bash\necho with-extension\n");

    expect(runCli(["add", source], { home, cwd }).status).toBe(0);

    const result = runCli(["run", "ext.sh"], { home, cwd });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/with-extension/);
  });

  it("info accepts name with .sh extension", async () => {
    const { home, cwd } = await setupSandbox();
    const source = path.join(cwd, "extinfo.sh");
    await createScript(source, "#!/usr/bin/env bash\necho x\n");

    expect(runCli(["add", source], { home, cwd }).status).toBe(0);

    const result = runCli(["info", "extinfo.sh"], { home, cwd });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/^Name: extinfo/m);
  });

  it("invalid names are rejected", async () => {
    const { home, cwd } = await setupSandbox();
    const source = path.join(cwd, "badname.sh");
    await createScript(source, "#!/usr/bin/env bash\necho x\n");

    const result = runCli(["add", source, "--name", "bad/name"], {
      home,
      cwd,
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Error: Invalid script name "bad\/name"/);
  });

  it("missing source and missing run target return clear errors", async () => {
    const { home, cwd } = await setupSandbox();

    const missingSource = runCli(
      ["add", path.join(cwd, "does-not-exist.sh")],
      { home, cwd }
    );
    expect(missingSource.status).toBe(1);
    expect(missingSource.stderr).toMatch(/Error: Source script not found/);

    const missingRun = runCli(["run", "not-here"], { home, cwd });
    expect(missingRun.status).toBe(1);
    expect(missingRun.stderr).toMatch(/Error: Script "not-here" not found/);
  });

  it("completion bash prints completion script", async () => {
    const { home, cwd } = await setupSandbox();

    const result = runCli(["completion", "bash"], { home, cwd });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/_qix_completion\(\)/);
    expect(result.stdout).toMatch(/complete -F _qix_completion qix/);
  });

  it("bash completion suggests managed names for qix run", async () => {
    const { home, cwd } = await setupSandbox();
    const source = path.join(cwd, "deploy.sh");
    await createScript(source, "#!/usr/bin/env bash\necho deploy\n");

    expect(runCli(["add", source], { home, cwd }).status).toBe(0);

    const completionResult = runCli(["completion", "bash"], { home, cwd });
    expect(completionResult.status).toBe(0);

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
      }
    );

    expect(check.status).toBe(0);
    expect(check.stdout).toMatch(/^deploy$/m);
  });

  it("info script not found returns error", async () => {
    const { home, cwd } = await setupSandbox();

    const result = runCli(["info", "not-here"], { home, cwd });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Error: Script "not-here" not found/);
  });

  it("info script with no header block shows name only", async () => {
    const { home, cwd } = await setupSandbox();
    const source = path.join(cwd, "nometa.sh");
    await createScript(source, "#!/usr/bin/env bash\necho nometa\n");

    expect(runCli(["add", source], { home, cwd }).status).toBe(0);

    const result = runCli(["info", "nometa"], { home, cwd });

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Name: nometa/);
    expect(result.stdout.includes("Description:")).toBe(false);
    expect(result.stdout.includes("Usage:")).toBe(false);
    expect(result.stdout.includes("Metadata:")).toBe(false);
  });

  it("info script with description shows name and description", async () => {
    const { home, cwd } = await setupSandbox();
    const source = path.join(cwd, "withdesc.sh");
    const content = `#!/usr/bin/env bash
# ---
# description: Deploy to production
# ---
echo deploy
`;
    await createScript(source, content);

    expect(runCli(["add", source], { home, cwd }).status).toBe(0);

    const result = runCli(["info", "withdesc"], { home, cwd });

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/^Name: withdesc/m);
    expect(result.stdout).toMatch(/Description: Deploy to production/);
  });

  it("info script with usage shows usage in its own section", async () => {
    const { home, cwd } = await setupSandbox();
    const source = path.join(cwd, "withusage.sh");
    const content = `#!/usr/bin/env bash
# ---
# metadata:
#   usage: qix run withusage -- --env prod
# ---
echo run
`;
    await createScript(source, content);

    expect(runCli(["add", source], { home, cwd }).status).toBe(0);

    const result = runCli(["info", "withusage"], { home, cwd });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/^Name: withusage/m);
    expect(result.stdout).toMatch(/Usage:/);
    expect(result.stdout).toMatch(/qix run withusage -- --env prod/);
    expect(
      !result.stdout.includes("usage") || result.stdout.includes("Usage:")
    ).toBe(true);
  });

  it("info script with multiple metadata shows table excluding usage and description", async () => {
    const { home, cwd } = await setupSandbox();
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

    expect(runCli(["add", source], { home, cwd }).status).toBe(0);

    const result = runCli(["info", "fullmeta"], { home, cwd });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/^Name: fullmeta/m);
    expect(result.stdout).toMatch(/Description: Full metadata script/);
    expect(result.stdout).toMatch(/Usage:/);
    expect(result.stdout).toMatch(/qix run fullmeta/);
    expect(result.stdout).toMatch(/Metadata/);
    expect(result.stdout).toMatch(/author.*Test Author/);
    expect(result.stdout).toMatch(/version.*1\.0/);
  });
});
