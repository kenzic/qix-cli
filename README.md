# qix

CLI for managing bash scripts. Add, link, list, and run scripts from a single place (`~/.qix/scripts`) with optional metadata and shell completion.

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

- **Bash completion**:

  ```bash
  source <(qix completion bash)
  ```

## License

Apache-2.0. See [LICENSE](LICENSE).
