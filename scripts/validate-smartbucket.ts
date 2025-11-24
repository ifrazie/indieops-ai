#!/usr/bin/env node
/**
 * Pre-Deployment SmartBucket Validation Script
 * 
 * Validates that SmartBucket is correctly configured before deployment.
 * Run this locally to catch configuration issues early.
 * 
 * Usage: npx tsx scripts/validate-smartbucket.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: string;
}

const results: ValidationResult[] = [];

function validate(name: string, check: () => boolean, successMsg: string, errorMsg: string, details?: string) {
  const passed = check();
  results.push({
    passed,
    message: passed ? `✓ ${successMsg}` : `✗ ${errorMsg}`,
    details: passed ? undefined : details,
  });
}

console.log('🔍 Validating SmartBucket Configuration...\n');

// ==========================================================================
// 1. Check manifest file exists and contains smartbucket
// ==========================================================================

const manifestPath = path.join(process.cwd(), 'raindrop.manifest');
let manifestContent = '';

validate(
  'manifest-exists',
  () => fs.existsSync(manifestPath),
  'Manifest file exists',
  'Manifest file not found',
  'Expected raindrop.manifest in project root'
);

if (fs.existsSync(manifestPath)) {
  manifestContent = fs.readFileSync(manifestPath, 'utf-8');
  
  validate(
    'smartbucket-defined',
    () => /smartbucket\s+"documents"/.test(manifestContent),
    'SmartBucket "documents" is defined in manifest',
    'SmartBucket "documents" not found in manifest',
    'Add: smartbucket "documents" {} to your manifest'
  );
}

// ==========================================================================
// 2. Check generated types exist
// ==========================================================================

const genFiles = [
  'src/api-gateway/raindrop.gen.ts',
  'src/biz-brain/raindrop.gen.ts',
];

genFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  validate(
    `gen-file-${file}`,
    () => fs.existsSync(filePath),
    `Generated types exist: ${file}`,
    `Generated types missing: ${file}`,
    'Run: npm run generate'
  );

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    validate(
      `env-binding-${file}`,
      () => /DOCUMENTS/.test(content),
      `DOCUMENTS binding found in ${file}`,
      `DOCUMENTS binding missing in ${file}`,
      'Regenerate types: npm run generate'
    );
  }
});

// ==========================================================================
// 3. Check API Gateway uses SmartBucket correctly
// ==========================================================================

const apiGatewayPath = path.join(process.cwd(), 'src/api-gateway/index.ts');
if (fs.existsSync(apiGatewayPath)) {
  const apiContent = fs.readFileSync(apiGatewayPath, 'utf-8');

  validate(
    'api-uses-env-documents',
    () => /c\.env\.DOCUMENTS/.test(apiContent),
    'API Gateway accesses env.DOCUMENTS correctly',
    'API Gateway does not access env.DOCUMENTS',
    'Use: c.env.DOCUMENTS to access SmartBucket'
  );

  validate(
    'api-uses-search',
    () => /\.search\(/.test(apiContent),
    'API Gateway uses SmartBucket search() method',
    'API Gateway missing search() usage',
    'Use: smartbucket.search({ input, requestId })'
  );

  validate(
    'api-uses-documentchat',
    () => /\.documentChat\(/.test(apiContent),
    'API Gateway uses SmartBucket documentChat() method',
    'API Gateway missing documentChat() usage',
    'Use: smartbucket.documentChat({ objectId, input, requestId })'
  );

  // Anti-pattern checks
  validate(
    'no-manual-rag',
    () => !/embedding|vector|chunk.*split|manual.*rag/i.test(apiContent),
    'No manual RAG implementation detected (good!)',
    'Possible manual RAG code detected',
    'SmartBucket handles RAG automatically - remove manual implementation'
  );
}

// ==========================================================================
// 4. Check for proper requestId usage
// ==========================================================================

if (fs.existsSync(apiGatewayPath)) {
  const apiContent = fs.readFileSync(apiGatewayPath, 'utf-8');

  validate(
    'requestid-generation',
    () => /requestId.*=.*`.*\$\{/.test(apiContent) || /requestId.*Date\.now/.test(apiContent),
    'RequestId generation pattern found',
    'RequestId generation pattern not found',
    'Generate unique requestIds for tracking: `search-${Date.now()}-${Math.random()}`'
  );
}

// ==========================================================================
// 5. Check TypeScript compilation
// ==========================================================================

const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
validate(
  'tsconfig-exists',
  () => fs.existsSync(tsconfigPath),
  'TypeScript config exists',
  'TypeScript config missing'
);

// ==========================================================================
// 6. Check test files exist
// ==========================================================================

const testFiles = [
  'src/api-gateway/index.test.ts',
  'src/_test/mocks.ts',
];

testFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  validate(
    `test-${file}`,
    () => fs.existsSync(filePath),
    `Test file exists: ${file}`,
    `Test file missing: ${file}`,
    'Create tests to validate SmartBucket usage'
  );
});

// ==========================================================================
// Print Results
// ==========================================================================

console.log('Results:\n');

let allPassed = true;
results.forEach(result => {
  console.log(result.message);
  if (result.details) {
    console.log(`  → ${result.details}`);
  }
  if (!result.passed) {
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(60));

if (allPassed) {
  console.log('✅ All validations passed! SmartBucket is properly configured.');
  console.log('\nNext steps:');
  console.log('  1. Run tests: npm test');
  console.log('  2. Build: npm run build');
  console.log('  3. Deploy: npm run start');
  console.log('  4. Monitor: raindrop logs tail');
  process.exit(0);
} else {
  console.log('❌ Some validations failed. Fix issues before deploying.');
  console.log('\nQuick fixes:');
  console.log('  • Generate types: npm run generate');
  console.log('  • Run tests: npm test');
  console.log('  • Validate manifest: npm run validate');
  process.exit(1);
}
