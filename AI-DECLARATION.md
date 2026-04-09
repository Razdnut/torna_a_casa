---
version: "0.1.1"
level: copilot
processes:
  design: copilot
  implementation: copilot
  testing: copilot
  documentation: copilot
  review: copilot
  deployment: copilot
---

## Notes

- This repository declares `copilot` level AI usage for the whole project.
- AI tools were used across the main development lifecycle, including design, implementation, testing, documentation, review, and deployment-related work.
- Human supervision remained responsible for deciding scope, validating changes, reviewing outputs, and approving the final result.
- This declaration applies repository-wide unless a future revision adds component-specific overrides.
- Project context: `torna_a_casa` is a work-hours tracking project with a web application build flow (`pnpm build` / `pnpm preview`) and Android release automation via GitHub Actions.
