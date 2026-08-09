# Issue tracker: GitHub

Issues and PRDs for this repository live as GitHub Issues in `armoutihansen/first-minecraft-mod`. Use the `gh` CLI for tracker operations.

## Conventions

- Create an issue with `gh issue create` and a complete Markdown body.
- Read an issue with `gh issue view <number> --comments` and include labels when evaluating its state.
- Apply and remove labels with `gh issue edit`.
- Close resolved issues with a concise outcome comment.
- Infer the repository from the configured GitHub remote when running inside this checkout.

## Pull requests as a triage surface

**PRs as a request surface: no.** External pull requests are not pulled into the issue triage queue. GitHub Issues are the request surface for planned work.

## Publishing conventions

When a skill says to publish to the issue tracker, create a GitHub Issue. When it says to fetch the relevant ticket, read the GitHub Issue and its comments.
