# Contributing to BIS Toolkit

Thank you for your interest in contributing to this project! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js 24.x
- npm (comes with Node.js)

### Setup Development Environment

1. **Clone the repository:**
   ```bash
   git clone https://github.com/koncord/bis-toolkit.git
   cd bis-toolkit
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the packages:**
   ```bash
   npm run build
   ```

## Development Workflow

### Code Style

- We use ESLint for code linting
- TypeScript strict mode is enabled
- Run `npm run lint` to check for issues
- Run `npm run lint:fix` to automatically fix issues

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-something` - for new features
- `fix/resolve-issue` - for bug fixes
- `docs/update-readme` - for documentation
- `refactor/improve-code` - for refactoring

### Commit Messages

Follow conventional commit format:
- `feat: add new completion provider`
- `fix: resolve hover information error`
- `docs: update installation instructions`
- `chore: update dependencies`
- `test: add tests for symbol lookup`
- `refactor: improve diagnostics performance`

### Pull Request Process

1. **Create a branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes:**
   - Write code
   - Add/update tests
   - Update documentation

3. **Verify your changes:**
   ```bash
   npm run lint
   npm run build
   ```

4. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

5. **Push to GitHub:**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request:**
   - Go to the repository on GitHub
   - Click "New Pull Request"
   - Fill out the PR template
   - Link any related issues

### PR Requirements

Before your PR can be merged:
- ✅ All CI checks must pass
- ✅ Code must be reviewed by a maintainer
- ✅ Documentation must be updated (if applicable)
- ✅ No merge conflicts

## Reporting Issues

### Bug Reports

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.yml) and include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Extension and VS Code versions
- Operating system

### Feature Requests

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.yml) and include:
- Problem you're trying to solve
- Proposed solution
- Alternative approaches considered
- Use cases and examples

## Getting Help

- 💬 [GitHub Discussions](https://github.com/koncord/bis-toolkit/discussions) - Ask questions
- 🐛 [Issues](https://github.com/koncord/bis-toolkit/issues) - Report bugs
- 📖 [Documentation](README.md) - Read the docs

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Give constructive feedback
- Focus on what's best for the community

# License and Contributor License Agreement (CLA)

## License

This project is currently licensed under the **GNU General Public License v3.0 (GPL-3.0)**.  
See the [LICENSE](LICENSE) file for full terms.

All contributions to this repository are governed by the Contributor License Agreement (CLA) below, which grants the project owner the right to relicense the project under different or additional terms in the future.

---

## Contributor License Agreement (CLA)

By submitting a pull request, issue, patch, or any other contribution to this repository, you agree to be bound by this Contributor License Agreement.

### 1. Grant of Copyright License
You grant to **Stanislav "Koncord" Zhukov** (the "Project Owner") a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable license to:
- reproduce,
- prepare derivative works of,
- publicly display,
- publicly perform,
- sublicense, and
- distribute  
your contributions and derivative works thereof, in source or binary form.

### 2. Grant of Patent License
You grant to the Project Owner a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable (except as stated in this section) patent license to make, have made, use, offer to sell, sell, import, and otherwise transfer your contribution, where such license applies only to those patent claims licensable by you that are necessarily infringed by your contribution or its combination with the project.

### 3. Right to Relicense
You acknowledge and agree that the Project Owner has the **exclusive right to relicense** the project, including your contributions, under any license terms — including but not limited to future versions of the GPL or proprietary/commercial licenses — at their sole discretion.  
This right applies without any obligation to notify or seek further consent from contributors.

### 4. Ownership and Original Work
You retain ownership of the copyright in your contributions.  
This agreement **does not transfer ownership** to the Project Owner, but grants them all necessary rights to use, distribute, and relicense your contributions as described above.

You further represent that:
- each of your contributions is your original creation, and  
- you have the legal right to grant the above licenses.  

If your contribution includes third-party code, you agree to clearly identify it and confirm that it is compatible with GPL-3.0 or a license that permits its inclusion under these terms.

### 5. No Warranty
You provide your contributions on an **“AS IS”** basis, without warranties or conditions of any kind, either express or implied, including without limitation any warranties or conditions of title, non-infringement, merchantability, or fitness for a particular purpose.

### 6. Retention of Rights
You retain the right to use, copy, modify, and distribute your contributions independently of this project for any purpose, without restriction.

---

**By contributing to this project, you confirm that you have read and agree to the terms of this Contributor License Agreement.**


---

Thank you for contributing! 🎉
