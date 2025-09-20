#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';

const args = process.argv.slice(2);
const versionType = args[0]; // patch, minor, major, or specific version

if (!versionType) {
  console.log('Usage: node update-version.mjs <patch|minor|major|x.y.z>');
  console.log('Examples:');
  console.log('  node update-version.mjs patch   # 1.0.0 -> 1.0.1');
  console.log('  node update-version.mjs minor   # 1.0.0 -> 1.1.0');
  console.log('  node update-version.mjs major   # 1.0.0 -> 2.0.0');
  console.log('  node update-version.mjs 1.5.0   # Set specific version');
  process.exit(1);
}

function incrementVersion(version, type) {
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

try {
  // Read current package.json
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const currentVersion = packageJson.version;
  
  let newVersion;
  
  if (['patch', 'minor', 'major'].includes(versionType)) {
    // Calculate new version manually
    newVersion = incrementVersion(currentVersion, versionType);
    
    // Update package.json
    packageJson.version = newVersion;
    writeFileSync('package.json', JSON.stringify(packageJson, null, '\t') + '\n');
  } else {
    // Use provided version
    newVersion = versionType;
    if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
      console.error('❌ Invalid version format. Expected semver (x.y.z)');
      process.exit(1);
    }
    
    // Update package.json manually
    packageJson.version = newVersion;
    writeFileSync('package.json', JSON.stringify(packageJson, null, '\t') + '\n');
  }
  
  console.log(`📦 Updated package.json: ${currentVersion} -> ${newVersion}`);
  
  // Update manifest.json
  const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
  const currentManifestVersion = manifest.version;
  manifest.version = newVersion;
  writeFileSync('manifest.json', JSON.stringify(manifest, null, '\t') + '\n');
  console.log(`📄 Updated manifest.json: ${currentManifestVersion} -> ${newVersion}`);
  
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