# Contributing to Hookdeck Agent Skills

Thank you for your interest in contributing! This repository contains AI agent skills for Hookdeck products (Event Gateway and Outpost).

## Ways to Contribute

| Contribution | Description |
|--------------|-------------|
| **Improve existing skills** | Fix inaccuracies, update CLI commands, add missing reference content |
| **Add examples** | Add webhook handler examples for new frameworks |
| **Add reference files** | Document new CLI workflows, API patterns, or configuration guides |
| **Report issues** | Found a bug or inaccuracy? [Open an issue](https://github.com/hookdeck/agent-skills/issues) |
| **Improve tests** | Expand test coverage for existing examples |

## Getting Started

```bash
git clone https://github.com/hookdeck/agent-skills.git
cd agent-skills
```

### Run Tests

**Code example tests** (signature verification in examples):

```bash
# Run all tests
./scripts/test-examples.sh

# Or run individually
cd skills/event-gateway/examples/express && npm install && npm test
cd skills/event-gateway/examples/nextjs && npm install && npm test
cd skills/event-gateway/examples/fastapi && pip install -r requirements.txt && pytest test_webhook.py -v
```

**Agent scenario tests** (end-to-end: install skills, run Claude, score report): see [TESTING.md](TESTING.md#agent-scenario-testing-two-layers). From repo root: `./scripts/test-agent-scenario.sh run receive-webhooks express` or `./scripts/test-agent-scenario.sh list`.

## Repository Structure

See [AGENTS.md](AGENTS.md) for the full specification, including:

- Directory layout and naming conventions
- SKILL.md frontmatter requirements
- Content principles (progressive disclosure, inline linking, prescriptive guidance)
- Terminology glossary
- Skill authoring checklist

## Contribution Guidelines

### Before You Start

1. Read [AGENTS.md](AGENTS.md) -- it contains all authoring rules and conventions
2. Check existing [issues](https://github.com/hookdeck/agent-skills/issues) to avoid duplicate work
3. For larger changes, open an issue first to discuss the approach

### Making Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-change`
3. Follow the conventions in [AGENTS.md](AGENTS.md):
   - Use correct [terminology](AGENTS.md#terminology-glossary) (e.g., "Source Authentication" not "Source Verification")
   - Link to live documentation inline
   - Keep SKILL.md under 500 lines
   - Add a table of contents to reference files over 100 lines
4. Run tests to verify nothing is broken
5. Commit and open a pull request

### Pull Request Guidelines

- Use conventional commit format for PR titles:
  - `feat: add Flask webhook handler example`
  - `fix: correct CLI flags in connection-rules reference`
  - `docs: update authentication decision tree`
- Include a clear description of what changed and why
- Ensure all tests pass

### Code Example Standards

All CLI and API examples in reference files must be accurate and verified:

- CLI commands must use valid flags (check with `hookdeck <command> --help`)
- `hookdeck connection create` must include `--source-type` and `--destination-type`
- cURL examples must use valid endpoints and correct request bodies
- JSON examples must be valid (no trailing commas)

## Related

- [hookdeck/webhook-skills](https://github.com/hookdeck/webhook-skills) -- Provider-specific webhook skills
- [Agent Skills Specification](https://agentskills.io) -- The open standard
- [Hookdeck Documentation](https://hookdeck.com/docs) -- Canonical product docs

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
