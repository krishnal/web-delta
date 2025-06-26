# Web Delta

A comprehensive Node.js tool for comparing websites before and after migration, with detailed analysis of content changes, SEO impact, and missing URLs.

Website updates often cause unintended changes — broken meta tags, missing headings, altered content, or invisible SEO regressions.
Whether you're migrating platforms, changing CMS, or deploying from a new CI/CD pipeline, even minor differences can tank your SEO, alter your messaging, or affect UX.

## Features

- **Recursive Website Crawling**: Crawls entire websites to discover all pages
- **HTML Snapshots**: Takes complete HTML snapshots of all pages
- **Content Comparison**: Compares titles, descriptions, meta tags, and SEO elements
- **SEO Impact Analysis**: Identifies changes that could affect search rankings
- **Missing URL Detection**: Finds URLs that exist on old site but not on new site
- **Human-Readable Reports**: Generates both JSON and Markdown reports
- **Timestamped Results**: All results are saved with timestamps for tracking

## Installation

```bash
npm install
```

## Usage

### Command Line Interface

#### Full Comparison (All Pages)
```bash
node index.js --old=<old-domain> --new=<new-domain>
```

#### Quick Comparison (Max 10 Pages Each)
```bash
node index.js --old=<old-domain> --new=<new-domain> --quick
```

#### Using npm scripts
```bash
# Full comparison using npm
npm run start:compare -- --old=<old-domain> --new=<new-domain>

# Quick comparison using npm
npm run start:quick -- --old=<old-domain> --new=<new-domain>

# Direct execution
npm start -- --old=<old-domain> --new=<new-domain>
```

#### Alternative Syntax
```bash
# Using short flags
node index.js -o <old-domain> -n <new-domain>

# Using short flags with quick mode
node index.js -o <old-domain> -n <new-domain> --quick

# Using long flags with equals
node index.js --old=https://oldwebsite.com --new=https://newwebsite.com
```

**Examples:**
```bash
# Full comparison
node index.js --old=https://oldwebsite.com --new=https://newwebsite.com

# Quick comparison
node index.js --old=https://oldwebsite.com --new=https://newwebsite.com --quick

# Using npm scripts
npm run start:compare -- --old=https://oldwebsite.com --new=https://newwebsite.com
npm run start:quick -- --old=https://oldwebsite.com --new=https://newwebsite.com

# Using short flags
node index.js -o https://oldwebsite.com -n https://newwebsite.com
node index.js -o https://oldwebsite.com -n https://newwebsite.com --quick
```

### Programmatic Usage

```javascript
// For full comparison
const MigrationComparator = require('./src/index.js');

const comparator = new MigrationComparator(
  'https://oldwebsite.com',
  'https://newwebsite.com'
);

const results = await comparator.compareWebsites();
```

```javascript
// For quick comparison
const QuickComparator = require('./src/quick.js');

const comparator = new QuickComparator(
  'https://oldwebsite.com',
  'https://newwebsite.com'
);

const results = await comparator.compareWebsites();
```

## Output Structure

The tool creates the following directory structure:

```
project/
├── src/                    # Core comparison modules
│   ├── index.js            # Full-featured comparison tool
│   └── quick.js            # Quick comparison tool (max 10 pages)
├── __snapshots/            # HTML snapshots of both websites
│   ├── old_website_2025-06-19T06-30-00.json
│   └── new_website_2025-06-19T06-30-00.json
├── results/                # Comparison results
│   ├── migration_comparison_2025-06-19T06-30-00.json
│   └── migration_report_2025-06-19T06-30-00.md
├── index.js                # Main driver script
├── package.json            # Project configuration
└── README.md               # This file
```

## Results Analysis

### JSON Results (`migration_comparison_*.json`)

```json
{
  "testInfo": {
    "timestamp": "2025-06-19T06:30:00.000Z",
    "oldDomain": "https://oldwebsite.com",
    "newDomain": "https://newwebsite.com"
  },
  "summary": {
    "oldWebsiteUrls": 100,
    "newWebsiteUrls": 95,
    "missingUrls": 5,
    "newUrls": 0,
    "pagesWithChanges": 15
  },
  "missingUrls": [
    "https://newwebsite.com/missing-page-1",
    "https://newwebsite.com/missing-page-2"
  ],
  "pageComparisons": [
    {
      "url": "https://newwebsite.com/page",
      "changes": [
        {
          "field": "title",
          "old": "Old Page Title",
          "new": "New Page Title",
          "type": "content_change"
        }
      ]
    }
  ],
  "seoImpact": {
    "pagesWithTitleChanges": 10,
    "pagesWithDescriptionChanges": 8,
    "pagesWithCanonicalChanges": 2
  }
}
```

### Markdown Report (`migration_report_*.md`)

Human-readable report with:
- Summary statistics
- List of missing URLs
- List of new URLs
- Detailed page-by-page changes
- SEO impact analysis

## SEO Elements Compared

The tool compares the following SEO-critical elements:

- **Page Title** (`<title>`)
- **Meta Description** (`meta[name="description"]`)
- **Meta Keywords** (`meta[name="keywords"]`)
- **H1 and H2 Headings**
- **Canonical URLs** (`link[rel="canonical"]`)
- **Robots Meta** (`meta[name="robots"]`)
- **Open Graph Tags** (`og:title`, `og:description`, `og:image`)
- **Twitter Card Tags** (`twitter:card`, `twitter:title`, `twitter:description`)

## Configuration Options

You can modify the following settings in the `MigrationComparator` class:

- **Viewport Size**: Change `setViewport()` for different screen sizes
- **User Agent**: Modify `setUserAgent()` for different browser simulation
- **Timeout**: Adjust page load timeout (default: 30 seconds)
- **Wait Strategy**: Change `waitUntil` option for different page load strategies

## Error Handling

The tool includes comprehensive error handling:
- Network timeouts
- Invalid URLs
- Access denied pages
- JavaScript errors
- Memory management

## Performance Considerations

- **Memory Usage**: Large websites may require significant memory
- **Network Load**: Tool makes many HTTP requests
- **Processing Time**: Depends on website size and complexity
- **Rate Limiting**: Consider adding delays for large sites

## Example Output

```
Starting website migration comparison...
Old Domain: https://oldwebsite.com
New Domain: https://newwebsite.com

=== Crawling Old Website ===
Crawling: https://oldwebsite.com/
Crawling: https://oldwebsite.com/about
...

=== Crawling New Website ===
Crawling: https://newwebsite.com/
Crawling: https://newwebsite.com/about
...

=== Comparison Complete ===
Results saved to: results/migration_comparison_2025-06-19T06-30-00.json
Report saved to: results/migration_report_2025-06-19T06-30-00.txt
Snapshots saved to: __snapshots/
```

## Troubleshooting

### Common Issues

1. **Puppeteer Installation**: Ensure Puppeteer is properly installed
2. **Network Access**: Check firewall and network connectivity
3. **Memory Issues**: For large sites, consider increasing Node.js memory limit
4. **Rate Limiting**: Some sites may block rapid requests

### Debug Mode

Add console logging to debug issues:

```javascript
// In crawlPage function
console.log(`Attempting to crawl: ${url}`);
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.

## Changelog

### v1.0.0
- Initial release
- Full website crawling and comparison
- SEO impact analysis
- HTML snapshots
- Human-readable reports 