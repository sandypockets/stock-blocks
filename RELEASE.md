# Release Automation Guide

This repository uses GitHub Actions to automatically create releases when the plugin version is updated. This ensures immutable releases and maintains consistency between `package.json` and `manifest.json`.

## How It Works

### Automatic Releases

1. Version Update Detection: When you push changes to `main` that include updates to `package.json` or `manifest.json`, the workflow checks if the version has changed.

2. Version Consistency: The system ensures that `package.json` and `manifest.json` have matching version numbers.

3. Automatic Release Creation: If versions match and have changed, a new GitHub release is automatically created with:
   - `main.js` (compiled plugin)
   - `manifest.json` (plugin metadata)
   - `styles.css` (plugin styles)

4. Release Notes: Automatic generation of release notes with installation instructions.

### Validation Workflow

A separate validation workflow runs on all pushes and pull requests to:
- Check version consistency between files
- Validate manifest.json structure
- Run linting and type checking
- Test the build process
- Verify all required release assets are present

## Usage

### Creating a New Release

#### Method 1: Using update-version script (Recommended)

```bash
# For bug fixes
npm run update-version patch

# For new features
npm run update-version minor

# For breaking changes
npm run update-version major

# Review changes, test, then commit and push
git add .
git commit -m "Bump version to x.x.x"
git push origin main
```

This method:
- Updates both `package.json` and `manifest.json` versions
- Gives you control over when to commit and push
- Ensures version consistency between files

#### Method 2: Using npm version (Alternative)

```bash
# For bug fixes
npm version patch

# For new features
npm version minor

# For breaking changes
npm version major

# Push the changes (this triggers the release)
git push origin main --follow-tags
```

This method:
- Updates `package.json` version
- Runs the `version` script which updates `manifest.json` and `versions.json`
- Creates a git commit and tag automatically
- When pushed, triggers the automatic release

#### Method 3: Manual Version Update

1. Update the version in both `package.json` and `manifest.json`:
   ```json
   // package.json
   {
     "version": "1.3.0"
   }
   
   // manifest.json
   {
     "version": "1.3.0"
   }
   ```
2. Commit and push:
   ```bash
   git add package.json manifest.json

   # Change "1.3.0" to your desired version
   git commit -m "Bump version to 1.3.0"

   git push origin main
   ```

### Release Process Flow

1. Developer Action - Update version using one of the methods above
2. GitHub Action Triggered - On push to `main` with version file changes
3. Version Check - Validates version consistency and checks if it's a new version
4. Build Process - Installs dependencies, runs linting, and builds the plugin
5. Release Creation - Creates a GitHub release with proper assets
6. Asset Upload - Uploads `main.js`, `manifest.json`, and `styles.css`

### Safety Features

- Version Mismatch Detection - Prevents releases if `package.json` and `manifest.json` versions don't match
- Duplicate Release Prevention - Won't create a release if the version already exists as a tag
- Build Validation - Ensures the plugin builds successfully before creating a release
- Asset Verification - Confirms all required files are present and non-empty

### Monitoring Releases

- Check the **Actions** tab to monitor workflow runs
- Failed builds will prevent releases and show detailed error messages
- Successful releases appear in the **Releases** section with all required assets

### Troubleshooting
#### Version Mismatch Error
```
❌ Version mismatch between package.json (1.2.0) and manifest.json (1.1.0)
```
**Solution**: Ensure both files have the same version number.

#### Build Failure
```
❌ Build failed: main.js was not generated
```
**Solution**: Fix TypeScript compilation errors and ensure the build script works locally.

#### Missing Assets
```
❌ Missing required files for release: styles.css
```
**Solution**: Ensure all required files (`main.js`, `manifest.json`, `styles.css`) exist after the build.

### Best Practices
1. Always test locally before pushing version updates:
   ```bash
   npm run build
   npm run lint
   ```
2. Use semantic versioning:
   - `patch` (1.0.1) for bug fixes
   - `minor` (1.1.0) for new features
   - `major` (2.0.0) for breaking changes
3. Review the validation workflow on pull requests to catch issues early
4. Monitor the Actions tab after pushing to ensure successful release
5.  Keep release notes meaningful by making descriptive commit messages

This automated system ensures that every version update results in a proper, immutable release with all necessary assets for Obsidian plugin installation.