# Contributing to Node.js Template

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

Be respectful and inclusive. We're all here to learn and improve.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Run tests: `npm test`
6. Run linting: `npm run lint`
7. Commit your changes (see commit guidelines below)
8. Push to your fork: `git push origin feature/your-feature-name`
9. Create a Pull Request

## Development Setup

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Start services
docker-compose up -d

# Start development server
npm run dev
```

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code refactoring without changing functionality
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **build**: Build system or external dependencies changes
- **ci**: CI/CD configuration changes
- **chore**: Other changes that don't modify src or test files
- **revert**: Revert a previous commit

### Examples

```
feat(auth): add JWT refresh token support

Implement refresh token mechanism to allow users to
obtain new access tokens without re-authenticating.

Closes #123
```

```
fix(database): resolve connection pool leak

Fixed memory leak caused by not releasing database
connections properly in error cases.
```

```
docs(readme): update installation instructions

Added detailed steps for Docker setup and environment configuration.
```

## Code Style

- Use TypeScript strict mode
- Follow ESLint rules
- Format code with Prettier
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### Naming Conventions

- **Variables/Functions**: camelCase (`getUserById`, `isValid`)
- **Classes/Interfaces**: PascalCase (`UserService`, `ApiResponse`)
- **Constants**: UPPER_SNAKE_CASE (`HTTP_STATUS`, `USER_ROLES`)
- **Files**: kebab-case (`user-service.ts`, `auth-middleware.ts`)

## Testing Guidelines

- Write tests for all new features
- Maintain test coverage above 80%
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies

### Test Structure

```typescript
describe('Component/Function Name', () => {
  describe('method name', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = myFunction(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

## Pull Request Process

1. **Update documentation** if you're adding/changing functionality
2. **Add tests** for new features or bug fixes
3. **Run all tests** and ensure they pass
4. **Update CHANGELOG** if applicable
5. **Keep PRs focused** - one feature/fix per PR
6. **Write clear descriptions** explaining what and why
7. **Link related issues** using "Closes #123" or "Fixes #456"
8. **Request review** from maintainers

### PR Checklist

- [ ] Code follows style guidelines
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] No breaking changes (or documented if unavoidable)
- [ ] Branch is up to date with main

## Architecture Guidelines

### File Organization

- Keep files small and focused (< 300 lines)
- One component/class per file
- Group related files in directories
- Use index files for clean imports

### Code Patterns

1. **Dependency Injection**: Pass dependencies as parameters
2. **Error Handling**: Use try-catch and proper error types
3. **Async/Await**: Prefer async/await over callbacks
4. **Type Safety**: Avoid `any`, use proper types
5. **Immutability**: Prefer `const` over `let`

### API Design

- Use RESTful conventions
- Standardized response format
- Proper HTTP status codes
- Input validation on all endpoints
- Pagination for list endpoints

## Security Guidelines

- Never commit secrets or credentials
- Use environment variables for configuration
- Validate all user inputs
- Use parameterized queries for database
- Implement rate limiting
- Follow OWASP best practices

## Questions?

If you have questions, please:
1. Check existing issues
2. Read the documentation
3. Ask in discussions
4. Create a new issue with the question label

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing! 🎉
