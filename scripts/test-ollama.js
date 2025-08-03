#!/usr/bin/env node

// Simple CLI script to test Ollama integration
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🦙 Recall Ollama Integration Test\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Please run this script from the project root directory');
  process.exit(1);
}

// Check if TypeScript files exist
const testFile = 'src/examples/ollamaIntegrationTest.ts';
if (!fs.existsSync(testFile)) {
  console.error(`❌ Test file not found: ${testFile}`);
  process.exit(1);
}

console.log('🔍 Checking Ollama service...');

// Simple Ollama availability check
async function checkOllama() {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Ollama is running');
      console.log(`📦 Models available: ${data.models?.length || 0}`);
      return true;
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Ollama not accessible:', error.message);
    console.log('\n💡 Setup Instructions:');
    console.log('1. Install Ollama: https://ollama.ai');
    console.log('2. Start service: ollama serve');
    console.log('3. Pull model: ollama pull llama3.2:3b');
    return false;
  }
}

// Main execution
async function main() {
  const ollamaAvailable = await checkOllama();
  
  if (!ollamaAvailable) {
    console.log('\n⚠️  Ollama setup required before testing');
    process.exit(1);
  }

  console.log('\n🚀 Running integration test...\n');
  
  try {
    // Compile and run the TypeScript test
    execSync('npx tsx src/examples/ollamaIntegrationTest.ts', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log('\n🎉 Ollama integration test completed successfully!');
  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
    process.exit(1);
  }
}

// Add fetch polyfill for Node.js if needed
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

main().catch(console.error);