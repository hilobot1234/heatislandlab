# Repository Guidelines

## Project Structure & Module Organization

The `HeatIsland` directory currently contains no source code, tests, assets, or build configuration. Establish the project layout when adding the first implementation, and update this guide to match it.

Suggested directories are `src/` for application code, `tests/` for automated tests, and `assets/` for static resources. Introduce only directories the implementation needs. Keep related modules together and document the application's entry point in `README.md`.

## Build, Test, and Development Commands

No build, test, or local development commands are configured yet. When choosing a toolchain, provide reproducible commands for installing dependencies, running locally, testing, and building. Record exact commands in `README.md`, including required runtime versions and setup steps. Do not assume commands such as `npm test` apply until the corresponding configuration exists.

## Coding Style & Naming Conventions

Follow the conventions of the chosen language and use consistent indentation within each file. Prefer descriptive module, function, and variable names. Add formatter and linter configuration alongside the first source files, and document how to run those tools. Avoid unrelated formatting changes in functional contributions.

## Testing Guidelines

No testing framework or coverage threshold is established. Choose a framework appropriate to the implementation and add tests for new behavior and bug fixes. Use descriptive test names that identify the behavior and expected outcome. Keep tests deterministic and document their execution command before submitting changes.

## Commit & Pull Request Guidelines

This directory has no Git repository or commit history, so no existing commit convention can be inferred. When Git is initialized, use concise, imperative commit subjects, such as `Add temperature data parser`.

Pull requests should explain the change, its purpose, and validation performed. Link relevant issues and include screenshots for visible interface changes. Explicitly identify any setup changes or checks that could not be run.

## Security & Configuration

Never commit credentials or private data. Document required configuration using placeholder values, and exclude local secrets and generated artifacts through `.gitignore` when those files are introduced.
