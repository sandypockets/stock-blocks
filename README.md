# Stock Blocks Plugin for Obsidian

Display stock prices, changes, and sparkline charts in your Obsidian notes with multiple display and sorting options. The plugin uses the free Yahoo Finance API to fetch real stock data without requiring an API key. 

Data can be displayed 2 ways:
- As a compact table of multiple stocks with sparklines using the `stock-block-list` code block
- As a larger detailed chart for a single stock using the `stock-block` code block

To learn how to set up each of those components, see the **Usage Examples** section below.

## Features

### Multi-Currency Support
- **Automatic currency detection** based on stock exchange suffixes
- Supports USD, CAD, EUR, GBP, JPY, AUD, HKD
- Prices displayed with proper currency symbols ($ € £ ¥ etc.)
- Examples: AAPL (USD), SHOP.TO (CAD), SAP.DE (EUR), ASML.AS (EUR)

### Stock List (`stock-block-list` code block)
Displays a table of multiple tickers with:
 - Symbol (optionally as wikilinks)
 - Latest price with currency symbol
 - % change (green/red color coding)
 - Sparkline showing recent price trend
 - Sorting by symbol, price, or % change
 - SVG sparklines with hover tooltip
 - Optional title and description above the table

### Single Stock Chart (`stock-block` code block)
Displays a larger chart for one symbol with:
 - Header: symbol, price with currency, % change
 - Subtitle: range (min–max) over selected period with currency
 - SVG line chart with hover tooltip
 - Optional axes showing price values and dates

### Smart Business Day Handling
When enabled in settings (enabled by default), the `days` parameter represents trading days rather than calendar days. The plugin ensures sufficient data points for meaningful charts, even for very short periods (1-2 days)

## Usage Examples
Learn how to display a list of stocks, or a chart for a single stock. 

### Stock List
The minimum configuration now only requires a list of stocks, which defaults to the last 30 days.

````markdown
```stock-block-list
stocks: AAPL, MSFT, NVDA, SHOP, SPY
```
````

If you need more customization, you can use additional properties:

- `stocks`, `symbols`, or `tickers`: Comma-separated list of stock symbols (any of these property names work)
- `days`: Number of days of historical data (default: 30, interpreted as business days if enabled in settings)
- `width`: Width of sparklines in pixels (default: 500, capped at 120 for table display)
- `height`: Height of sparklines in pixels (default: 300, capped at 40 for table display)
- `linkStyle`: How to display symbols - `none`, `wikilink`, or `markdown` (default: none)
- `sparkline`: Whether to show sparkline charts in the table (default: true)
- `refreshInterval`: Auto-refresh interval in minutes (optional)
- `title`: Custom title text (optional, defaults to "Stock List")
- `description`: Descriptive text shown below the title (optional)

### Single Stock Chart
The minimum configuration now only requires a stock property. The date range defaults to the last 30 days.

````markdown
```stock-block
stocks: AAPL
```
````

If you need more customization, you can use additional properties:

- `symbol`, `symbols`, `stock`, `stocks`, `ticker`, or `tickers`: Stock symbol to display (any of these property names work)
- `days`: Number of days of historical data (default: 30, interpreted as business days if enabled in settings)
- `width`: Width of chart in pixels (default: 500)
- `height`: Height of chart in pixels (default: 300)
- `showAxes`: Show price and date axes (default: true)
- `refreshInterval`: Auto-refresh interval in minutes (optional)
- `showLastUpdate`: Show last update timestamp and refresh controls (default: true)
- `title`: Custom title text (optional, shows above the stock symbol and price)
- `description`: Descriptive text shown below the title (optional)

### International Stocks and Currency Examples

The plugin automatically detects currencies based on stock exchange suffixes:

````markdown
```stock-block-list
tickers: AAPL, SHOP.TO, SAP.DE, ASML.AS, 7203.T
days: 60
title: Global Diversified Portfolio
description: Stocks from US (USD), Canada (CAD), Germany (EUR), Netherlands (EUR), and Japan (JPY)
```
````

```stock-block
symbol: NESN.SW
days: 60
title: Nestlé S.A. (Swiss Exchange)
description: Swiss stock showing CHF currency formatting
```


Currency Detection Examples:
- `AAPL` → USD ($)
- `SHOP.TO` → CAD (CA$)
- `SAP.DE` → EUR (€)
- `BP.L` → GBP (£)
- `7203.T` → JPY (¥)
- `CBA.AX` → AUD (A$)
- `0700.HK` → HKD (HK$)

## Data Source

The plugin fetches real stock data from Yahoo Finance API, which provides free access to:

- Current stock prices
- Historical price data
- Daily trading information
- Support for stocks, ETFs, and major indices

Features:
- No API key required
- Automatic caching to reduce API calls
- Clear error messages when Yahoo Finance is unavailable
- Real-time data updates when notes are opened

Supported Symbols:
- US Stocks: AAPL, MSFT, GOOGL, TSLA, etc.
- ETFs: SPY, QQQ, VTI, VOO, etc.
- Indices: ^GSPC (S&P 500), ^IXIC (NASDAQ), ^DJI (Dow Jones)

The plugin automatically handles API errors and will display clear error messages if the Yahoo Finance service is temporarily unavailable.

## Development

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd stock-blocks

# Install dependencies
npm install
```

### Building
```bash
# Development build with watch mode (recommended during development)
npm run dev

# Production build (for releases)
npm run build
```

### Testing
1. Run `npm run build` or `npm run dev`
2. Copy `main.js`, `manifest.json`, and `styles.css` to your test vault:
   ```
   <vault>/.obsidian/plugins/stock-blocks/
   ```
3. Reload Obsidian and enable the plugin in **Settings > Community plugins**

### Project Structure
- `main.ts` - Plugin entry point (compiles to `main.js`)
- `src/` - Source code modules
- `manifest.json` - Plugin metadata
- `styles.css` - Plugin styles
- `esbuild.config.mjs` - Build configuration

## License
See LICENSE file for details.

## Contributing
Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes in TypeScript (`main.ts` and `src/` files)
4. Test your changes:
   - Run `npm run dev` for development builds with watch mode
   - Copy the built files to a test vault and verify functionality
5. Run `npm run build` to ensure production build works
6. Submit a pull request

## Disclaimer

This plugin is for educational and informational purposes only. Stock data is provided by Yahoo Finance and should not be used as the sole basis for investment decisions. Always consult with financial professionals and verify data with official sources before making investment decisions. If the Yahoo Finance API is unavailable, the plugin will display error messages.
