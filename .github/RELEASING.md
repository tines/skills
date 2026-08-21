# Releasing Tines Agent Skills

Releases version the complete repository. Individual skills do not have independent versions.

The GitHub Actions release workflow runs `gh skill publish` and creates the tag and GitHub release. Maintainers do not run `gh skill publish` locally.

## One-time repository setup

Before the first release:

1. Add the `agent-skills` repository topic.
2. Create a `skills-release` environment that allows deployments only from `main` and requires approval from the Tines engineering team.
3. Enable immutable releases in the repository’s release settings.
4. Add a `v*` tag ruleset that blocks updates and deletions while allowing the release workflow to create tags.
5. Confirm that GitHub Actions can create releases with the repository `GITHUB_TOKEN`.

GitHub only allows users with repository write access to dispatch a workflow. The protected environment adds a Tines engineering approval gate before the release job receives its write token. Create the environment before the first dispatch; referencing its name in the workflow does not configure its reviewers. The workflow has no repository administration permission, so maintainers configure these settings.

## Create a release

1. Merge the generated 3B sync pull request after the Agent Skills validation check passes.
2. Open **Actions → Release Agent Skills → Run workflow**.
3. Select `main` and enter the next repository version in `vX.Y.Z` form.
4. Approve the `skills-release` environment deployment.
5. Review the completed job and generated release notes.

No local publishing command is required. The workflow validates the repository, confirms that the version is unused, runs `gh skill publish --tag`, verifies that the resulting tag points to the validated `main` commit, and installs every skill from the new version as a smoke test.

Use semantic versions as follows:

- Major: remove or incompatibly change existing skill behavior.
- Minor: add a skill or a substantial backward-compatible capability.
- Patch: correct or clarify existing skills without changing their intended contract.

Do not reuse a version. If publication fails before the tag is created, correct the problem and rerun the same version. If a tag or immutable release was created, correct `main` and publish a new patch version.

## GitHub releases and skills.sh

`gh skill publish` creates a GitHub tag and release. This gives `gh skill install` a stable latest release and lets consumers pin a version:

```bash
gh skill install tines/skills --all --pin v1.0.0
```

skills.sh has no release upload endpoint. `npx skills add tines/skills` reads the public repository’s default branch, and skills.sh discovery is populated from normal CLI install telemetry. Do not generate synthetic installs in CI. A genuine public install will seed discovery, and subsequent normal installs will refresh the indexed content.
