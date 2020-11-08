# ghat

> Reuse GitHub Action workflows across repositories

Stop maintaining a separate workflow for every one of your repository, use `ghat` to sync them with your favorite version.

You can run `ghat` **once** to set up your workflow in a new repo or run it every time you want to update it. Updating existing workflows will override any changes except for the global `env` object, which will be merged with the templates’s existing `env` object.

_Note: `ghat` is a tool that runs on your computer, not on GitHub Actions, and requires you to commit the changes,_ so you can be sure that the workflow never changes without you agreeing to it.

## Usage

This repository has a few [templates](https://github.com/fregante/ghat/tree/master/templates) you can use, but `ghat` can fetch any repository or specific file within it — exactly like [degit](https://github.com/Rich-Harris/degit) can, the tool `ghat` is based on.

You can refer to [degit’s documentation](https://github.com/Rich-Harris/degit#basics) to find out what other source formats are allowed (including specifying branches, commits and other references).

### Fetch repo

If you provide a user/repo address, `ghat` will fetch the repository and look for `*.yml` files at the top level. If none are found, it will assume you want to copy the repo’s active workflows from `.github/workflows`

```sh
npx ghat fregante/ghat
# Copies *.ya?ml OR .github/workflows/*.ya?ml
```

### Fetch whole folder

```sh
npx ghat fregante/ghat/templates/node
# Copies templates/node/*.ya?ml into .github/workflows. It's NOT recursive
```

### Fetch specific file

```sh
npx ghat fregante/ghat/templates/node/ci.yml
# Copies templates/node/ci.yml into .github/workflows/ci.yml
```

## Customizing the templates

When you fetch a workflow that already exists locally, the local file will be overridden, except for the top-level `env` object. For example:

#### Local file

```yml
# Generated by `npx ghat fregante/workflows/demo`
env:
  ADJECTIVE: cool
# DO NOT EDIT BELOW

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo My workflow is $ADJECTIVE
```

#### Template file

```yml
env:
  ADJECTIVE: the default

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo This new workflow is "$ADJECTIVE" since it was updated
```

#### Updated local file

Only the top-level `env` will be preserved, the rest will be updated.

```yml
# Generated by `npx ghat fregante/workflows/demo`
env:
  ADJECTIVE: cool
# DO NOT EDIT BELOW

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo This new workflow is "$ADJECTIVE" since it was updated
```

## License

MIT © [Federico Brigante](https://fregante.com)
