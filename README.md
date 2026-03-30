# qix

CLI for managing bash scripts. Add, link, list, and run scripts from a single place (`~/.qix/scripts`), author new scripts with an agentic CLI (`qix make`), optional metadata, and shell completion.

```
                                                   ░░░
                              ░                 ▒▒▒▓▓▓▒░
                              ░░░    ░▒▒▒░░▒▒▒▒▒▒░▓▓▒▒▒
                             ░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░▒▓▓▒▒░
                            ░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▓▓▓▒░░░░░░░░░░░░
                           ░▒▒▒▒▒▒▒░░░░░░░░░▒▒▒▒▒▒▒▒▒░░░░▒▒▒▒▒▒▒▒▒▒▒▒▒░
                         ░░▒▒▒▒▒▒░░░░▒██▓░░░░░▒▒▒▒▒▒░░░░░░░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░
                        ░▒▒▒▒▒▒▒▒░░▒███▓▓█▓░░░▒▒▒▒▓▒▒▒░░░░░▒▒▒░▒▒▒▒░░░▒▒▒▒▒▒▒▒░
                       ░▒▒▒▒▒▒▒▒░░░▒▓█████▓░░░░░░░    ░░░░░░░░░░▒░▒░░░░░░▒░▒▒▒▒▒▒░
                      ▒▒▒▒▒▒▒▒▒░░░░░░░▒▒▒▒░░░░░░░░░░░░░░░░░░░░░░░▒░░░░░░░░░▒░▒▒▒▒▒▒▒░
                 ░░  ░▒▒▒▒▒▒▒▒▒▒░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▒▒░
                    ▒▒▒▒▒▒▒▒▒▒▒░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░▒▒▒▒▒▒▒▒▓▒▒▒░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▒░░░░░░░░░░░░░░░░░░░░░▒░░
                   ░▒▒▒▒▒▒▒▓▓▒▒░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▒▒░░░░░░░░░░░░░░░░░░░░░░▒░░
                  ░░▒▒▒▒▓▓▒▓▒▒░░░░░░░░░░░░░░░░░░░░░░░░░░░▒▒▒▒░░▒░░░░░░░░░░░░░░░░░░░░░░░▒▒▒░
                   ░░▒▒▓▓▒▒▒▒░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ░░░░░░░░░░▒░░░░░
                     ░░▒▒▒▒▒▒░░░░░░░░░░░░░▒░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ░░     ░░ ░░░░░▒▒░░░░
                       ░░░▒░░░▒░░░░░░░▒░░░░▒░░░░░░░░░░░░░░░░░░░░░░░░    ░ ░       ░░░░░░░▒░▒▒
                          ░░░▒▒▒▒▒░▒░▒░▒▒▒▒░░░░░░░░░░░░░░░░░░░░░░░░ ░   ░  ░       ░░░░░░░▒▒▒
                            ░░▒▒▒▒▒▒▒▒▒▒░▒▒▒░░░░░░░░░░░░░░░░░░░░░░░░░  ░░    ░░  ░  ░░░░░▒▒▒▒
                              ░▒▒▒▒▒▒▒▒▒▒▒▒░▒▒▒░░░░░░░░░░░░░░░░░░░░░ ░░  ░░    ░░   ░░░░▒▒▒▒▒
                               ░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░░░░░░░░░░░░░░░░░░░░░░░░░ ░░     ░░░░░░▒▒▒▒▒▒
                                ░▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░░░░░░░░░░░░░░░░░░░░░░░░░░ ░░░     ░░░░▒▒▒▒▒▒
                                ░▒▒▒▒▒▒▒▒▒▒▒▒▒░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ░░░░░░░▒▒▒▒▒▒
                                ░▒▒▒▒▒▒▒▒▒▒▒▒▒░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▒▒▒▒▒
                                 ░▒▒▒▒▒▒▒▒▒▒▒░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▒▒▒▒
                                 ░▒▓▓▓▓▓▓▓▒▒▒▒░░░░░░░░░░░░░░░░▒░░░▒▒▒▒░░░░░░░░░░░░░░░░░░░░░░▒
                                 ░▒▓▓▓▓▒▒░ ░░░░░░░░░░░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░░░░░░░░░░░░░░░░░░░
                                ░▒▓▓█▒░▒▒▒▒░░░░░░░░▒▒▒▒▒▒▒▒▓▒▒▒▒▒▒▓▒▓▓▓▒▒▒▒▒▒░░▒▒░░░░░░░░░░░░
                           ░▒▒▒▓▓▓███▓▓▓▒░░░░░░░▒▒▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                         ░░░░▒▒▒▒▒▒▒▒▒▒▒░▒▒░░░▒▒▒▒▓▓▓▓▓▓▒▒▒▒▒▒▒▒▒░░░░░░░░░░░░░░░▒▓▓▒▒▒░▒░░░░░
                                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
```

## Install

```bash
npm install -g qix-cli
```

Or with pnpm:

```bash
pnpm add -g qix-cli
```

## Usage

- **Add** a script (copy into `~/.qix/scripts`):

  ```bash
  qix add ./deploy.sh
  qix add ./deploy.sh --move
  qix add ./deploy.sh --name prod-deploy --force
  ```

- **Link** a script instead of copying:

  ```bash
  qix link ./deploy.sh
  qix link ./deploy.sh --name prod-deploy --force
  ```

- **List** scripts:

  ```bash
  qix list
  qix list --plain
  qix list --json
  ```

- **Info** for a script (name, description, usage, metadata):

  ```bash
  qix info <name>
  ```

- **Run** a script (extra args are passed through):

  ```bash
  qix run prod-deploy -- --env staging
  ```

- **Make** a new script with an agentic CLI (default: [Claude Code](https://docs.anthropic.com/en/docs/claude-code/cli-usage)). `qix make` appends qix-specific instructions (bash style, qix YAML header, logging with a verbosity flag that only affects logs—not the script’s primary output) and opens the provider in the current directory. When you are satisfied with the file on disk, register it with `qix add`:

  ```bash
  qix make my-script
  qix make --provider claude-code my-script
  # After the agent writes the script:
  qix add ./my-script.sh --move
  ```

  Override the Claude Code binary if needed: `QIX_MAKE_CLAUDE_BIN=/path/to/claude`. Additional providers can be added over time; `--provider` selects one (today only `claude-code` is built in).

- **Manage cron** entries for scripts:

  ```bash
  qix cron add prod-deploy --schedule "*/15 * * * *" --comment heartbeat
  qix cron add prod-deploy --schedule "0 2 * * *" --args "--env prod"
  qix cron list
  qix cron list --name prod-deploy --json
  qix cron remove prod-deploy --comment heartbeat
  qix cron remove prod-deploy --all
  ```

  Each job is stored with a `# qix cron: …` comment line directly above the crontab line; `qix cron remove` deletes both. Script names accept an optional `.sh` suffix (same as `qix run`).

- **Bash completion**:

  ```bash
  source <(qix completion bash)
  ```

## License

Apache-2.0. See [LICENSE](LICENSE).
