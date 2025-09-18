# Stock Blocks Plugin Demo

This document demonstrates the Stock Blocks plugin functionality.

## Multi-Stock List Example

Here's a list of popular tech stocks with sparklines:

# Stock Blocks Plugin Demo

This plugin provides stock data visualization for Obsidian notes with real-time Yahoo Finance data integration.

## Features

✅ **Real Yahoo Finance Data** - Live stock prices and historical data  
✅ **Multiple Display Options** - Static lists, interactive lists, and individual charts  
✅ **Interactive Features** - Sorting, manual refresh, auto-refresh capabilities  
✅ **Markdown Integration** - Use code blocks in your notes  
✅ **Caching** - Intelligent caching to reduce API calls  
✅ **Error Handling** - Clear error messages when data is unavailable  
✅ **Responsive Design** - Works on all screen sizes  

## Quick Start

### Basic Stock List (Multiple Stocks)

```stock-block-list
tickers: AAPL, MSFT, NVDA, TSLA, GOOGL
days: 30
width: 600
height: 300
```

### Stock List (Interactive by Default)

```stock-block-list
tickers: AAPL, MSFT, NVDA, TSLA, GOOGL
days: 30
width: 600
height: 300
refreshInterval: 5
```

### Individual Stock Chart

```stock-block
symbol: AAPL
days: 30
width: 500
height: 300
showAxes: true
```

## Ease of Use - Minimal Configuration

The plugin now supports minimal configuration with smart defaults. You can now simply specify a symbol and get sensible defaults:

### Minimal Stock Chart

```stock-block
symbol: AAPL
```

This automatically uses:
- `days: 30` (30 days of historical data)
- `width: 500` (500 pixels wide)
- `height: 300` (300 pixels tall)
- `showAxes: true` (show price and date axes)

### Consistent Parameter Names

You can now use `tickers`, `symbols`, or `stocks` for stock lists, and `symbol`, `symbols`, `stock`, `stocks`, `ticker`, or `tickers` for individual charts:

```stock-block-list
symbols: AAPL, MSFT, NVDA
days: 30
```

```stock-block-list
stocks: AAPL, SHOP, MSFT, NVDA, TSLA, GOOGL, AMZN, META, NFLX
days: 120
linkStyle: wikilink
title: My Stocks
description: A list of stocks I'm interested in
```

```stock-block
stocks: NVDA
days: 90
```

All these property names work the same way. If you specify multiple tickers for individual charts, only the first one will be used.

## Display Options

### `stock-block-list` - Stock List (Interactive)
- **Purpose**: Display of multiple stocks with interactive features
- **Features**: 
  - ✅ Shows symbol, price, change percentage, and sparkline chart
  - ✅ Sortable columns (click headers to sort by symbol, price, or change)
  - ✅ Manual refresh button to get latest data
  - ✅ Auto-refresh capability (set `refreshInterval` in minutes)
  - ✅ Last update timestamp display
- **Best for**: Both quick reference and active monitoring
- **Performance**: Lightweight with optional interactive features

### `stock-block` - Individual Stock Chart
- **Purpose**: Detailed view of a single stock
- **Features**: Price chart with configurable time period and styling
- **Best for**: In-depth analysis of specific stocks
- **Performance**: Moderate, depends on chart complexity

## Advanced Examples

### Advanced Stock List

```stock-block-list
tickers: AAPL, MSFT, NVDA, TSLA, GOOGL, AMZN, META, NFLX
days: 90
width: 800
height: 400
linkStyle: wikilink
```

### Tech Stock Chart

```stock-block
symbol: NVDA
days: 60
width: 600
height: 350
showAxes: true
```

## Commands

- **Refresh Stock Data** - Clears cache and refreshes all stock data in current note
- **Open Stock Dashboard** - Opens the interactive dashboard view

## Dashboard

Access the stock dashboard through:
- Command palette: "Open Stock Dashboard"
- Ribbon icon (trending up icon)
- The dashboard provides an interactive interface for managing multiple stocks

## Configuration Options

### Stock List Parameters

| Parameter | Description | Default | Example |
|-----------|-------------|---------|---------|
| `tickers`, `symbols`, or `stocks` | Comma-separated stock symbols | Required | `AAPL, MSFT, NVDA` |
| `days` | Historical data period | 30 | `90` |
| `width` | Sparkline width in pixels | 500 | `120` |
| `height` | Sparkline height in pixels | 300 | `40` |
| `linkStyle` | Link style for symbols | `none` | `wikilink` or `markdown` |

### Stock Chart Parameters

| Parameter | Description | Default | Example |
|-----------|-------------|---------|---------|
| `symbol`, `symbols`, `stock`, `stocks`, `ticker`, or `tickers` | Stock ticker symbol | Required | `AAPL` |
| `days` | Historical data period | 30 | `90` |
| `width` | Chart width in pixels | 500 | `600` |
| `height` | Chart height in pixels | 300 | `350` |
| `showAxes` | Show chart axes | true | `false` |

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Data Source**: Yahoo Finance API
- **Build System**: esbuild with automatic JSX
- **Platform**: Obsidian Plugin API

## Examples

### Popular Tech Stocks

```stock-block-list
tickers: AAPL, MSFT, NVDA, GOOGL, AMZN, META, TSLA
days: 30
width: 700
height: 350
linkStyle: wikilink
```

### Apple Stock Detail

```stock
symbol: AAPL
days: 90
width: 600
height: 400
showAxes: true
```

### Cryptocurrency Stocks

```stock-block-list
tickers: COIN, MSTR, RIOT, MARA
days: 60
width: 600
height: 300
```

### Individual Crypto Stock

```stock
symbol: COIN
days: 30
width: 500
height: 300
showAxes: true
```

### International Stocks with Currency Support

```stock-block-list
tickers: AAPL, SHOP.TO, ASML.AS, NESN.SW, TM
days: 30
title: Global Portfolio
description: Mix of US, Canadian, European, and Japanese stocks showing automatic currency detection
refreshInterval: 10
```

### European Stocks

```stock-block-list
tickers: SAP.DE, ASML.AS, MC.PA, NESN.SW
days: 60
title: European Tech & Luxury
description: Stocks from German, Dutch, French, and Swiss exchanges
```

### Asian Markets

```stock
symbol: 7203.T
days: 90
width: 600
height: 300
title: Toyota Motor Corporation (Tokyo)
description: Japanese stock showing JPY pricing
showAxes: true
```

### Error Handling Example

When Yahoo Finance API is unavailable or a stock symbol is invalid, you'll see clear error messages:

```stock-list
tickers: INVALID_SYMBOL, ANOTHER_BAD_SYMBOL
days: 30
```

The error display will show:
- ⚠️ **Error loading stock data: Yahoo Finance API failed for INVALID_SYMBOL: [specific error]**
- *Yahoo Finance API may be temporarily unavailable. Try again later or check your internet connection.*

## Notes

- Stock data is cached for 5 minutes by default to reduce API calls
- **No fallback data**: If Yahoo Finance is unavailable, the plugin will show an error message instead of mock data
- **Currency support**: Prices automatically display in the appropriate currency (USD, CAD, EUR, GBP, JPY, etc.)
- Currency detection is based on exchange suffixes (.TO for CAD, .L for GBP, .DE for EUR, etc.)
- Historical data shows closing prices
- The plugin works offline with cached data

## Individual Stock Charts

### Apple Inc. (AAPL) - 6 Month Chart

```stock
symbol: AAPL
days: 180
width: 800
height: 300
showAxes: true
```

### Tesla Inc. (TSLA) - 3 Month Chart

```stock
symbol: TSLA
days: 90
width: 600
height: 250
showAxes: false
```

## Market Indices

Track major market indices:

```stock-block-list
tickers: SPY, QQQ, VTI, VOO
days: 30
width: 100
height: 25
linkStyle: none
```

## Configuration Examples

### Minimal Configuration
```stock-block-list
tickers: AAPL, MSFT
```

### With Custom Styling
```stock-block-list
tickers: NVDA, AMD, INTC
days: 60
width: 150
height: 50
linkStyle: markdown
```

### Without Sparklines (Data Only)
```stock-block-list
tickers: SPY, QQQ, VTI, IWM, DIA
days: 30
sparkline: false
title: Market Indices - Data Only
description: Clean table showing just prices and changes without charts
```

## Notes

- Stock data is fetched from **Yahoo Finance API** for real-time prices
- Shows clear error messages if Yahoo Finance is unavailable
- Refresh the note to see updated prices and charts
- Use the command palette to "Refresh all stock data" to clear cache
- Configure defaults and caching in Settings → Stock Blocks
