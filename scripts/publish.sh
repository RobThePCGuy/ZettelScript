#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# ZettelScript Publish Script
# =============================================================================
# Usage: ./scripts/publish.sh [patch|minor|major]
# Default: patch
# =============================================================================

VERSION_TYPE="${1:-patch}"

# Validate version type
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo "Error: Version type must be 'patch', 'minor', or 'major'"
  echo "Usage: ./scripts/publish.sh [patch|minor|major]"
  exit 1
fi

echo "=== ZettelScript Publish Script ==="
echo "Version bump: $VERSION_TYPE"
echo ""

# =============================================================================
# Pre-flight checks
# =============================================================================

echo "--- Pre-flight checks ---"

# Check we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "Error: Must be on 'main' branch (currently on '$CURRENT_BRANCH')"
  exit 1
fi
echo "✓ On main branch"

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: Uncommitted changes detected. Commit or stash them first."
  git status --short
  exit 1
fi
echo "✓ Working directory clean"

# Check for untracked files (warn only)
UNTRACKED=$(git ls-files --others --exclude-standard)
if [[ -n "$UNTRACKED" ]]; then
  echo "Warning: Untracked files detected:"
  echo "$UNTRACKED"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Check GitHub CLI auth
if ! gh auth status &>/dev/null; then
  echo "Error: Not logged into GitHub CLI"
  echo "Run: gh auth login"
  exit 1
fi
echo "✓ GitHub CLI authenticated"

# Check npm auth
if ! npm whoami &>/dev/null; then
  echo "Error: Not logged into npm"
  echo "Run: npm login"
  exit 1
fi
NPM_USER=$(npm whoami)
echo "✓ npm authenticated as '$NPM_USER'"

# Check remote is up to date
git fetch origin main --quiet
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [[ "$LOCAL" != "$REMOTE" ]]; then
  echo "Error: Local branch differs from origin/main"
  echo "Run: git pull origin main"
  exit 1
fi
echo "✓ Up to date with origin/main"

echo ""

# =============================================================================
# Quality checks
# =============================================================================

echo "--- Quality checks ---"

echo "Installing dependencies..."
npm ci --silent

echo "Running linter..."
npm run lint

echo "Running type checker..."
npm run typecheck

echo "Running tests..."
npm run test:run

echo "✓ All quality checks passed"
echo ""

# =============================================================================
# Build
# =============================================================================

echo "--- Build ---"

npm run build
echo "✓ Build complete"

# Verify dist exists and has content
if [[ ! -d "dist" ]] || [[ -z "$(ls -A dist)" ]]; then
  echo "Error: dist/ directory is empty or missing after build"
  exit 1
fi
echo "✓ dist/ directory verified"
echo ""

# =============================================================================
# Version bump and git operations
# =============================================================================

echo "--- Version bump ---"

# Get current version before bump
OLD_VERSION=$(node -p "require('./package.json').version")

# npm version creates commit and tag automatically
npm version "$VERSION_TYPE" -m "chore(release): %s"

NEW_VERSION=$(node -p "require('./package.json').version")
TAG="v$NEW_VERSION"

echo "✓ Bumped $OLD_VERSION → $NEW_VERSION"
echo ""

# =============================================================================
# Publish
# =============================================================================

echo "--- Publish ---"

# Push to GitHub (includes tag)
echo "Pushing to GitHub..."
git push origin main --follow-tags

echo "Publishing to npm..."
npm publish --access public

echo "Creating GitHub release..."
gh release create "$TAG" --generate-notes

echo ""
echo "=== Success! ==="
echo "Published zettelscript@$NEW_VERSION"
echo ""
echo "npm: https://www.npmjs.com/package/zettelscript"
echo "GitHub: https://github.com/RobThePCGuy/ZettelScript/releases/tag/$TAG"
