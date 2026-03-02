---
on:
  push:
    branches: [main]
permissions:
      contents: read
      issues: read
      pull-requests: read
engine: codex
network:
  allowed:
    - defaults
    - python
    - node
    - go
    - java
tools:
  github:
    toolsets: [default]
  edit:
  bash: true
  web-fetch:
  web-search:
---

# pubblicazione

Devi analizzare la repository e pubblicare su github pages la pagina compilata. la mia github pages per la repository https://github.com/Razdnut/torna_a_casa corrisponde a https://razdnut.github.io/torna_a_casa .

<!--
## TODO: Customize this workflow

The workflow has been generated based on your selections. Consider adding:

- [ ] More specific instructions for the AI
- [ ] Error handling requirements
- [ ] Output format specifications
- [ ] Integration with other workflows
- [ ] Testing and validation steps

## Configuration Summary

- **Trigger**: Push to main branch
- **AI Engine**: codex
- **Tools**: github, edit, bash, web-fetch, web-search
- **Network Access**: ecosystem

## Next Steps

1. Review and customize the workflow content above
2. Remove TODO sections when ready
3. Run `gh aw compile` to generate the GitHub Actions workflow
4. Test the workflow with a manual trigger or appropriate event
-->