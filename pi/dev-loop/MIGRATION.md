# Migration inventory

Public source reference: `TOA5TER/claude-quest`, `plugins/dev-workflow`, revision `b52ae988426c932ff5f6c58ed5c1dee0f1fdce77`.

The existing inline Pi adaptation supplies the execution baseline. The original public plugin supplies workflow and supporting-reference context. These files are maintained here; installation does not regenerate them from a plugin checkout.

## Included

- developing, debugging, writing-specs, creating-stories, reviewing-prs, testing-prs, addressing-pr-comments, exposed with the `dev-loop-` prefix.
- Debugging retains investigation, development, and `--rework` modes.
- Shared standards, override-first adapter loading, adversarial review, writing guidance, code-comment verification, repository discovery.
- Shortcut PM and local filesystem notes adapters and their interfaces.
- Inline code-quality, architecture, security, performance, product, and budget review perspectives.
- The standalone HTML specification template.
- Pi runtime guidance for active configuration paths, inline execution, and selected-provider transitions.

The machine-readable installation inventory is `resources.json`.

## Adaptations

- Bundle paths resolve relative to the containing instruction file. Repository operations and generated output still resolve against the working repository.
- Configuration stays in `dev-workflow` below Pi's active agent directory. Loading resources does not seed or modify it.
- Named workflow transitions use the selected skill catalog. Wrapper delegation reads the exact public base resource with arguments and wrapper rules intact.
- Methodology skills are external prerequisites, invoked by their Pi names.
- Reviews and multi-repository work run sequentially in the current session.
- Worktree lookup, approval gates, TDD, CI/deploy gates, and verification remain mandatory.
- Debugging plan output uses HTML consistently with shared output rules.

## Excluded

No full-cycle or epic entry points, role-session resources, checkpoint state, attention reporting, background dispatch, per-stage model selection, or subagent execution. Additional built-in PM/notes adapters are outside this extraction. Company authentication and policy remain external.
