const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class MigrationComparator {
  constructor(oldDomain, newDomain) {
    this.oldDomain = oldDomain;
    this.newDomain = newDomain;
    this.snapshotsDir = '__snapshots';
    this.resultsDir = 'results';
    this.browser = null;
    this.page = null;
    
    // Create directories if they don't exist
    this.createDirectories();
  }

  createDirectories() {
    [this.snapshotsDir, this.resultsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async initialize() {
    this.browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    this.page = await this.browser.newPage();
    
    // Set viewport and user agent for consistent rendering
    await this.page.setViewport({ width: 1920, height: 1080 });
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async crawlWebsite(baseUrl) {
    const allUrls = new Set();
    const visitedUrls = new Set();
    const htmlSnapshots = {};

    const crawlPage = async (url) => {
      if (visitedUrls.has(url) || !url.startsWith(baseUrl)) {
        return;
      }

      console.log(`Crawling: ${url}`);
      visitedUrls.add(url);

      try {
        // Check if browser is still connected
        if (!this.browser.isConnected()) {
          console.log('Browser disconnected, reinitializing...');
          await this.initialize();
        }

        await this.page.goto(url, { 
          waitUntil: 'networkidle2', 
          timeout: 30000 
        });

        // Take HTML snapshot
        const html = await this.page.content();
        const urlKey = url.replace(/[^a-zA-Z0-9]/g, '_');
        htmlSnapshots[urlKey] = html;

        // Extract all links
        const pageUrls = await this.page.evaluate((baseUrl) => {
          const urlArray = Array.from(document.links).map((link) => link.href);
          const uniqueUrlArray = [...new Set(urlArray)];
          return uniqueUrlArray.filter(url => url.startsWith(baseUrl));
        }, baseUrl);

        pageUrls.forEach(url => allUrls.add(url));

        // Recursively crawl each new URL
        for (const newUrl of pageUrls) {
          if (!visitedUrls.has(newUrl)) {
            await crawlPage(newUrl);
          }
        }

      } catch (error) {
        console.error(`Error crawling ${url}:`, error.message);
        // If it's a connection error, try to reinitialize
        if (error.message.includes('detached') || error.message.includes('Connection closed')) {
          try {
            await this.initialize();
          } catch (reinitError) {
            console.error('Failed to reinitialize browser:', reinitError.message);
          }
        }
      }
    };

    await crawlPage(baseUrl);
    return { urls: Array.from(allUrls), snapshots: htmlSnapshots };
  }

  async extractPageInfo(html, url) {
    try {
      // Create a temporary page to parse HTML
      const tempPage = await this.browser.newPage();
      await tempPage.setContent(html);
      
      const pageInfo = await tempPage.evaluate(() => {
        const getMetaContent = (name) => {
          const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
          return meta ? meta.getAttribute('content') : '';
        };

        const getTextContent = (selector) => {
          const element = document.querySelector(selector);
          return element ? element.textContent.trim() : '';
        };

        return {
          title: document.title,
          description: getMetaContent('description'),
          keywords: getMetaContent('keywords'),
          h1: getTextContent('h1'),
          h2: getTextContent('h2'),
          mainContent: getTextContent('main') || getTextContent('body'),
          canonical: getMetaContent('canonical'),
          robots: getMetaContent('robots'),
          ogTitle: getMetaContent('og:title'),
          ogDescription: getMetaContent('og:description'),
          ogImage: getMetaContent('og:image'),
          twitterCard: getMetaContent('twitter:card'),
          twitterTitle: getMetaContent('twitter:title'),
          twitterDescription: getMetaContent('twitter:description')
        };
      });

      await tempPage.close();
      return pageInfo;
    } catch (error) {
      console.error(`Error extracting page info for ${url}:`, error.message);
      return {
        title: '',
        description: '',
        keywords: '',
        h1: '',
        h2: '',
        mainContent: '',
        canonical: '',
        robots: '',
        ogTitle: '',
        ogDescription: '',
        ogImage: '',
        twitterCard: '',
        twitterTitle: '',
        twitterDescription: ''
      };
    }
  }

  comparePageInfo(oldInfo, newInfo, url) {
    const differences = {
      url: url,
      changes: []
    };

    const compareField = (field, oldValue, newValue) => {
      if (oldValue !== newValue) {
        differences.changes.push({
          field: field,
          old: oldValue,
          new: newValue,
          type: 'content_change'
        });
      }
    };

    // Compare all fields
    compareField('title', oldInfo.title, newInfo.title);
    compareField('description', oldInfo.description, newInfo.description);
    compareField('keywords', oldInfo.keywords, newInfo.keywords);
    compareField('h1', oldInfo.h1, newInfo.h1);
    compareField('h2', oldInfo.h2, newInfo.h2);
    compareField('canonical', oldInfo.canonical, newInfo.canonical);
    compareField('robots', oldInfo.robots, newInfo.robots);
    compareField('ogTitle', oldInfo.ogTitle, newInfo.ogTitle);
    compareField('ogDescription', oldInfo.ogDescription, newInfo.ogDescription);
    compareField('ogImage', oldInfo.ogImage, newInfo.ogImage);
    compareField('twitterCard', oldInfo.twitterCard, newInfo.twitterCard);
    compareField('twitterTitle', oldInfo.twitterTitle, newInfo.twitterTitle);
    compareField('twitterDescription', oldInfo.twitterDescription, newInfo.twitterDescription);

    return differences;
  }

  async compareWebsites() {
    console.log('Starting website migration comparison...');
    console.log(`Old Domain: ${this.oldDomain}`);
    console.log(`New Domain: ${this.newDomain}`);

    await this.initialize();

    try {
      // Crawl both websites
      console.log('\n=== Crawling Old Website ===');
      const oldData = await this.crawlWebsite(this.oldDomain);
      
      console.log('\n=== Crawling New Website ===');
      const newData = await this.crawlWebsite(this.newDomain);

      // Save snapshots
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      
      fs.writeFileSync(
        path.join(this.snapshotsDir, `old_website_${timestamp}.json`),
        JSON.stringify(oldData, null, 2)
      );
      
      fs.writeFileSync(
        path.join(this.snapshotsDir, `new_website_${timestamp}.json`),
        JSON.stringify(newData, null, 2)
      );

      // Convert old URLs to new domain format for comparison
      const oldUrlsConverted = oldData.urls.map(url => 
        url.replace(this.oldDomain, this.newDomain)
      );

      // Find missing URLs
      const missingUrls = oldUrlsConverted.filter(url => !newData.urls.includes(url));
      const newUrls = newData.urls.filter(url => !oldUrlsConverted.includes(url));

      // Compare common pages
      const commonUrls = oldData.urls.filter(url => 
        newData.urls.includes(url.replace(this.oldDomain, this.newDomain))
      );

      const pageComparisons = [];
      
      for (const oldUrl of commonUrls) {
        const newUrl = oldUrl.replace(this.oldDomain, this.newDomain);
        const oldUrlKey = oldUrl.replace(/[^a-zA-Z0-9]/g, '_');
        const newUrlKey = newUrl.replace(/[^a-zA-Z0-9]/g, '_');

        if (oldData.snapshots[oldUrlKey] && newData.snapshots[newUrlKey]) {
          const oldInfo = await this.extractPageInfo(oldData.snapshots[oldUrlKey], oldUrl);
          const newInfo = await this.extractPageInfo(newData.snapshots[newUrlKey], newUrl);
          
          const comparison = this.comparePageInfo(oldInfo, newInfo, newUrl);
          if (comparison.changes.length > 0) {
            pageComparisons.push(comparison);
          }
        }
      }

      // Generate results
      const results = {
        testInfo: {
          timestamp: new Date().toISOString(),
          oldDomain: this.oldDomain,
          newDomain: this.newDomain,
          testDuration: `${Date.now() - Date.now()}ms`
        },
        summary: {
          oldWebsiteUrls: oldData.urls.length,
          newWebsiteUrls: newData.urls.length,
          missingUrls: missingUrls.length,
          newUrls: newUrls.length,
          pagesWithChanges: pageComparisons.length
        },
        missingUrls: missingUrls,
        newUrls: newUrls,
        pageComparisons: pageComparisons,
        seoImpact: {
          pagesWithTitleChanges: pageComparisons.filter(p => 
            p.changes.some(c => c.field === 'title')
          ).length,
          pagesWithDescriptionChanges: pageComparisons.filter(p => 
            p.changes.some(c => c.field === 'description')
          ).length,
          pagesWithCanonicalChanges: pageComparisons.filter(p => 
            p.changes.some(c => c.field === 'canonical')
          ).length
        }
      };

      // Save results
      const resultsFile = path.join(this.resultsDir, `migration_comparison_${timestamp}.json`);
      fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));

      // Generate human-readable report
      const reportFile = path.join(this.resultsDir, `migration_report_${timestamp}.txt`);
      this.generateHumanReadableReport(results, reportFile);

      console.log('\n=== Comparison Complete ===');
      console.log(`Results saved to: ${resultsFile}`);
      console.log(`Report saved to: ${reportFile}`);
      console.log(`Snapshots saved to: ${this.snapshotsDir}/`);

      return results;

    } finally {
      await this.close();
    }
  }

  generateHumanReadableReport(results, filename) {
    let report = `# Website Migration Comparison Report

## Test Information

- **Timestamp:** ${results.testInfo.timestamp}
- **Old Domain:** ${results.testInfo.oldDomain}
- **New Domain:** ${results.testInfo.newDomain}

## Summary

| Metric | Count |
|--------|-------|
| Old Website URLs | ${results.summary.oldWebsiteUrls} |
| New Website URLs | ${results.summary.newWebsiteUrls} |
| Missing URLs | ${results.summary.missingUrls} |
| New URLs | ${results.summary.newUrls} |
| Pages with Changes | ${results.summary.pagesWithChanges} |

## SEO Impact Analysis

| Change Type | Affected Pages |
|-------------|----------------|
| Title Changes | ${results.seoImpact.pagesWithTitleChanges} |
| Description Changes | ${results.seoImpact.pagesWithDescriptionChanges} |
| Canonical Changes | ${results.seoImpact.pagesWithCanonicalChanges} |

## Missing URLs (${results.missingUrls.length})

${results.missingUrls.length > 0 ? results.missingUrls.map((url, index) => `${index + 1}. \`${url}\``).join('\n') : '*No missing URLs found*'}

## New URLs (${results.newUrls.length})

${results.newUrls.length > 0 ? results.newUrls.map((url, index) => `${index + 1}. \`${url}\``).join('\n') : '*No new URLs found*'}

## Pages with Changes (${results.pageComparisons.length})

${results.pageComparisons.length > 0 ? results.pageComparisons.map((page, pageIndex) => {
  const changesList = page.changes.map((change, changeIndex) => {
    return `### ${changeIndex + 1}. ${change.field}

**Old Value:** ${change.old || '(empty)'}
**New Value:** ${change.new || '(empty)'}`;
  }).join('\n\n');

  return `### ${pageIndex + 1}. ${page.url}

${changesList}`;
}).join('\n\n') : '*No pages with changes found*'}

---

*Report generated on ${new Date().toLocaleString()}*
`;

    fs.writeFileSync(filename, report);
  }
}

// CLI argument parsing
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      options[key] = value;
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      const value = args[i + 1];
      if (value && !value.startsWith('-')) {
        options[key] = value;
        i++; // Skip next argument as it's the value
      }
    }
  }
  
  return options;
}

// CLI usage
if (require.main === module) {
  const options = parseArguments();
  
  if (!options.old || !options.new) {
    console.log('Website Migration Comparison Tool');
    console.log('==================================');
    console.log('');
    console.log('Usage:');
    console.log('  node migration-compare.js --old=<old-domain> --new=<new-domain>');
    console.log('  node migration-compare.js -o <old-domain> -n <new-domain>');
    console.log('');
    console.log('Examples:');
    console.log('  node migration-compare.js --old=https://oldwebsite.com --new=https://newwebsite.com');
    console.log('  node migration-compare.js -o https://oldwebsite.com -n https://newwebsite.com');
    console.log('');
    console.log('Options:');
    console.log('  --old, -o    Old website domain (required)');
    console.log('  --new, -n    New website domain (required)');
    console.log('');
    console.log('Description:');
    console.log('  Compares two websites and generates a detailed report of differences,');
    console.log('  including missing URLs, content changes, and SEO impact analysis.');
    process.exit(1);
  }

  const comparator = new MigrationComparator(options.old, options.new);
  
  comparator.compareWebsites()
    .then(results => {
      console.log('\nMigration comparison completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error during comparison:', error);
      process.exit(1);
    });
}

module.exports = MigrationComparator; 