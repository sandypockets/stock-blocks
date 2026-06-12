#!/usr/bin/env node

import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const args = process.argv.slice(2);
const versionType = args[0];

if (!versionType) {
  console.log('Usage: node update-version.mjs <patch|minor|major|x.y.z>');
  console.log('Examples:');
  console.log('  node update-version.mjs patch   # 1.0.0 -> 1.0.1');
  console.log('  node update-version.mjs minor   # 1.0.0 -> 1.1.0');
  console.log('  node update-version.mjs major   # 1.0.0 -> 2.0.0');
  console.log('  node update-version.mjs 1.5.0   # Set specific version');
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  writeFileSync(filePath, JSON.stringify(value, null, '\t') + '\n');
}

function isSemver(version) {
  return /^\d+\.\d+\.\d+$/.test(version);
}

function incrementVersion(version, type) {
  if (!isSemver(version)) {
    throw new Error(`Current package.json version is not semver: ${version}`);
  }

  const parts = version.split('.').map(Number);
  const [major, minor, patch] = parts;
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Unknown version type: ${type}`);
  }
}

function getNewVersion(currentVersion, versionType) {
  if (['patch', 'minor', 'major'].includes(versionType)) {
    return incrementVersion(currentVersion, versionType);
  }

  if (!isSemver(versionType)) {
    throw new Error('Invalid version format. Expected semver (x.y.z)');
  }

  return versionType;
}

function updatePackageVersion(currentVersion, newVersion) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const versionArgs = [
    'version',
    newVersion,
    '--no-git-tag-version',
    '--ignore-scripts'
  ];

  if (newVersion === currentVersion) {
    versionArgs.push('--allow-same-version');
  }

  execFileSync(npmCommand, versionArgs, {
    stdio: 'inherit'
  });
}

function validateVersionMetadata(expectedVersion, expectedMinAppVersion) {
  const packageJson = readJson('package.json');
  const manifest = readJson('manifest.json');
  const versions = readJson('versions.json');
  const packageLock = readJson('package-lock.json');
  const lockRootVersion = packageLock.packages?.['']?.version;

  const errors = [];

  if (packageJson.version !== expectedVersion) {
    errors.push(`package.json version is ${packageJson.version}`);
  }
  if (manifest.version !== expectedVersion) {
    errors.push(`manifest.json version is ${manifest.version}`);
  }
  if (packageLock.version !== expectedVersion) {
    errors.push(`package-lock.json version is ${packageLock.version}`);
  }
  if (lockRootVersion !== expectedVersion) {
    errors.push(`package-lock.json root package version is ${lockRootVersion}`);
  }
  if (versions[expectedVersion] !== expectedMinAppVersion) {
    errors.push(`versions.json ${expectedVersion} maps to ${versions[expectedVersion]}`);
  }

  if (errors.length > 0) {
    throw new Error(`Version metadata mismatch:\n${errors.map(error => `- ${error}`).join('\n')}`);
  }
}

try {
  const packageJson = readJson('package.json');
  const currentVersion = packageJson.version;
  const newVersion = getNewVersion(currentVersion, versionType);

  updatePackageVersion(currentVersion, newVersion);
  
  console.log(`📦 Updated package.json: ${currentVersion} -> ${newVersion}`);
  
  const manifest = readJson('manifest.json');
  const currentManifestVersion = manifest.version;
  const { minAppVersion } = manifest;
  manifest.version = newVersion;
  writeJson('manifest.json', manifest);
  console.log(`📄 Updated manifest.json: ${currentManifestVersion} -> ${newVersion}`);
  
  const versions = readJson('versions.json');
  versions[newVersion] = minAppVersion;
  writeJson('versions.json', versions);
  console.log(`🗂️  Updated versions.json: added ${newVersion} -> ${minAppVersion}`);

  validateVersionMetadata(newVersion, minAppVersion);
  
  console.log('\n✅ Version update completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Review the changes: git diff');
  console.log('2. Test the build: npm run build');
  console.log('3. Stage and commit: git add . && git commit -m "Bump version to ' + newVersion + '"');
  console.log('4. Push when ready: git push');
  console.log('\n🚀 The GitHub Action will automatically create a release when you push to main.');
  
} catch (error) {
  console.error('❌ Error updating version:', error.message);
  process.exit(1);
}
