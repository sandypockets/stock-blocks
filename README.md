# Stock Blocks Plugin for Obsidian

[![GitHub Release](https://img.shields.io/github/v/release/sandypockets/stock-blocks)](https://github.com/sandypockets/stock-blocks/releases)
[![Bundle Size](https://img.shields.io/github/languages/code-size/sandypockets/stock-blocks)](https://github.com/sandypockets/stock-blocks)
[![License](https://img.shields.io/github/license/sandypockets/stock-blocks)](https://github.com/sandypockets/stock-blocks/blob/main/LICENSE)
[![Downloads](https://img.shields.io/github/downloads/sandypockets/stock-blocks/total)](https://github.com/sandypockets/stock-blocks/releases)
[![Last Commit](https://img.shields.io/github/last-commit/sandypockets/stock-blocks)](https://github.com/sandypockets/stock-blocks/commits/main)
[![GitHub Issues](https://img.shields.io/github/issues/sandypockets/stock-blocks)](https://github.com/sandypockets/stock-blocks/issues)




Display stock prices, changes, and sparkline charts in your Obsidian notes with multiple display and sorting options.

- Zero dependencies. We don't use any third party libraries for charts, or anything else.
- Uses the free Yahoo Finance API to fetch real stock data without requiring an API key.

Data can be displayed 2 ways:

As a compact table of multiple stocks with sparklines using the `stock-block-list` code block

![Stock Block List](/docs/stock-block-list.jpg)

Or as a larger detailed chart for a single stock using the `stock-block` code block

![Stock Block](/docs/stock-block.jpg)

To learn how to set up each of those components, see the **Usage Examples** section below.

## Features

### Multi-Currency Support
- Automatic currency detection based on stock exchange suffixes
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

## Beta testing
To test the newest versions of the plugin before official releases, you can install the beta builds using the BRAT plugin. 

1. Install the [BRAT plugin](https://obsidian.md/plugins?id=obsidian42-brat) from the [Obsidian Community Plugins](https://obsidian.md/plugins).
2. In Obsidian, open the BRAT plugin settings.
3. Click **Add Beta plugin**.
4. Enter the repository URL: `https://github.com/sandypockets/stock-blocks`

This will cause the plugin to automatically update whenever there are changes made to the `main` branch of this repository. If you want to pin to a specific version, then you can also do that in BRAT. To do so, look for **Add Beta plugin with frozen version** in the BRAT settings.

You can learn more about BRAT and how to use it in the [BRAT documentation](https://github.com/TfTHacker/obsidian42-brat).

## Development

### Setup
```bash
git clone https://github.com/sandypockets/stock-blocks.git
cd stock-blocks
npm install
```

### Building
```bash
# Development build with watch mode (recommended during development)
npm run dev
```
```bash
npm run build
```

## Contributing
Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/name-of-your-feature`
3. Make your changes in TypeScript (`main.ts` and `src/` files)
4. Test your changes:
   - Run `npm run dev` for development builds with watch mode
   - Copy the built files to a test vault and verify functionality
5. Run `npm run build` to ensure production build works
6. Submit a pull request

## License
See LICENSE file for details.

## Disclaimer
This plugin is for educational and informational purposes only. Stock data is provided by Yahoo Finance and should not be used as the sole basis for investment decisions. Always consult with financial professionals and verify data with official sources before making investment decisions. If the Yahoo Finance API is unavailable, the plugin will display error messages.
