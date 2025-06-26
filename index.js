#!/usr/bin/env node

const path = require('path');

// CLI argument parsing
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      if (arg.includes('=')) {
        const [key, value] = arg.slice(2).split('=');
        options[key] = value;
      } else {
        // Handle boolean flags like --quick
        const key = arg.slice(2);
        options[key] = true;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      const value = args[i + 1];
      if (value && !value.startsWith('-')) {
        options[key] = value;
        i++; // Skip next argument as it's the value
      } else {
        // Handle single letter boolean flags
        options[key] = true;
      }
    }
  }
  
  return options;
}

// CLI usage
function showUsage() {
  console.log('Web Delta - Website Migration Comparison Tool');
  console.log('=============================================');
  console.log('');
  console.log('Usage:');
  console.log('  node index.js --old=<old-domain> --new=<new-domain> [--quick]');
  console.log('  node index.js -o <old-domain> -n <new-domain> [--quick]');
  console.log('');
  console.log('Examples:');
  console.log('  node index.js --old=https://oldwebsite.com --new=https://newwebsite.com');
  console.log('  node index.js --old=https://oldwebsite.com --new=https://newwebsite.com --quick');
  console.log('  node index.js -o https://oldwebsite.com -n https://newwebsite.com');
  console.log('  node index.js -o https://oldwebsite.com -n https://newwebsite.com --quick');
  console.log('');
  console.log('Options:');
  console.log('  --old, -o    Old website domain (required)');
  console.log('  --new, -n    New website domain (required)');
  console.log('  --quick      Run quick comparison (max 10 pages each) instead of full comparison');
  console.log('');
  console.log('Description:');
  console.log('  Compares two websites and generates a detailed report of differences,');
  console.log('  including missing URLs, content changes, and SEO impact analysis.');
  console.log('  Use --quick for faster analysis of smaller websites.');
}

// Main execution
if (require.main === module) {
  const options = parseArguments();
  
  if (!options.old || !options.new) {
    showUsage();
    process.exit(1);
  }

  // Determine which script to run
  const scriptPath = options.quick 
    ? path.join(__dirname, 'src', 'quick.js')
    : path.join(__dirname, 'src', 'index.js');

  // Import and run the appropriate script
  try {
    const script = require(scriptPath);
    const comparator = new script(options.old, options.new);
    
    comparator.compareWebsites()
      .then(results => {
        const mode = options.quick ? 'quick' : 'full';
        console.log(`\n${mode} migration comparison completed successfully!`);
        process.exit(0);
      })
      .catch(error => {
        console.error('Error during comparison:', error);
        process.exit(1);
      });
  } catch (error) {
    console.error('Error loading comparison script:', error.message);
    process.exit(1);
  }
}

module.exports = { parseArguments, showUsage }; 