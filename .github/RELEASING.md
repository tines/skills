# Releasing Tines Agent Skills

Releases version the complete repository. Individual skills do not have independent versions.

The GitHub Actions release workflow runs `gh skill publish` after changes reach `main` and creates the tag and GitHub release. Maintainers do not run `gh skill publish` locally.

## One-time repository setup

Before the first release:

1. Add the `agent-skills` repository topic.
2. Enable immutable releases in the repository’s release settings.
3. Add a `v*` tag ruleset that blocks updates and deletions while allowing the release workflow to create tags.
4. Create the `release:major`, `release:minor`, and `release:patch` pull request labels.
5. Confirm that GitHub Actions can create releases with the repository `GITHUB_TOKEN`.

The workflow has no repository administration permission, so maintainers configure these settings.

## Create a release

Merge the generated 3B sync pull request after the Agent Skills validation check passes. A push to `main` starts the release workflow. If `skills/` or `skills.sh.json` changed since the latest release, the workflow selects the next semantic version and publishes the complete repository. Otherwise, it completes without creating a release.

No local publishing command is required. The workflow confirms that the generated version is unused, runs `gh skill publish --tag`, verifies that the resulting tag points to the validated `main` commit, and installs every skill from the new version as a smoke test. It can also be started manually from `main` to retry a failed run.

The first automatic release uses `v1.0.0`. Later releases select a semantic version bump from the changes since the latest tag:

- Major when a skill is removed.
- Minor when a skill is added.
- Patch for all other skill changes.

Apply one of the `release:major`, `release:minor`, or `release:patch` labels to a pull request to override automatic detection. If multiple different release labels are present across the changes being released, the workflow stops instead of choosing one.

If publication fails before the tag is created, rerun the workflow. If a tag or immutable release was created, correct `main`; the next run calculates a new version from the latest tag.

## GitHub releases and skills.sh

`gh skill publish` creates a GitHub tag and release. This gives `gh skill install` a stable latest release and lets consumers pin a version:

```bash
gh skill install tines/skills --all --pin v1.0.0
```

skills.sh has no release upload endpoint. `npx skills add tines/skills` reads the public repository’s default branch, and skills.sh discovery is populated from normal CLI install telemetry. Do not generate synthetic installs in CI. A genuine public install will seed discovery, and subsequent normal installs will refresh the indexed content.
