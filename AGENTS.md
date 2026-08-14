# Repository guidance

This repository publishes Agent Skills for Tines products. Keep every skill portable across Agent Skills-compatible clients unless its purpose specifically depends on a Tines product.

## Skill structure

Place each skill at `skills/<skill-name>/SKILL.md`. Optional supporting files belong in `scripts/`, `references/`, or `assets/` within that skill’s directory.

Follow the [Agent Skills specification](https://agentskills.io/specification):

- Use a lowercase, hyphenated directory name no longer than 64 characters.
- Set the frontmatter `name` to the exact directory name.
- Write a concrete `description` that says what the skill does and when it should trigger.
- Set `compatibility` to the intended Tines product when a skill is product-specific (for example, `Tines 3B`).
- Keep the body focused on instructions an agent needs after the skill triggers.
- Link supporting files directly from `SKILL.md` so an agent can load them only when needed.
- Preserve copyright and modification notices in derivative skills.

Run `gh skill publish --dry-run` before submitting a change.
