# Stock Blocks smoke test examples

Use this note as a portable manual smoke fixture after building Stock Blocks and installing the release artifacts into a local Obsidian test vault. These examples mirror the existing stock smoke workflow and add crypto-specific coverage.

## Expected smoke results

- Valid stock and crypto blocks render without console errors.
- Mixed stock and crypto lists keep successful rows visible if one symbol fails.
- Sorting, refresh controls, stale-data indicators, sparklines, chart tooltips, and Yahoo links remain usable.
- Invalid examples show clear error UI without breaking nearby valid blocks.
- Crypto prices use USD formatting and enough decimal precision for small-price assets.

## Stock baseline checks

### Basic stock list

```stock-block-list
stocks: AAPL, MSFT, NVDA
days: 30
linkStyle: wikilink
sortBy: symbol
sortOrder: asc
showTodayChange: true
title: Stock baseline list
description: Confirms existing stock list behavior still works before crypto checks.
```

### Single stock chart

```stock-block
stock: AAPL
days: 30
width: 600
height: 300
showAxes: true
showTodayChange: true
title: Stock baseline chart
description: Confirms existing stock chart behavior still works before crypto checks.
```

## Crypto chart checks

### BTC line chart

```stock-block
crypto: BTC
quoteCurrency: USD
days: 30
width: 600
height: 300
showAxes: true
showTodayChange: true
title: BTC USD line chart
description: Should resolve to BTC-USD and render a calendar-day crypto line chart.
```

### ETH candlestick chart

```stock-block
crypto: ETH
quoteCurrency: USD
days: 30
width: 600
height: 320
showAxes: true
useCandles: true
showTodayChange: true
title: ETH USD candlestick chart
description: Should render OHLC candles for ETH-USD.
```

### Crypto symbol with USD suffix

```stock-block
crypto: BTC-USD
quoteCurrency: USD
days: 14
width: 600
height: 300
showAxes: true
title: BTC suffix normalization
description: Should display BTC while using Yahoo's BTC-USD symbol behind the scenes.
```

## Mixed list checks

### Crypto list using singular property

```stock-block-list
crypto: BTC
quoteCurrency: USD
days: 30
linkStyle: wikilink
title: Singular crypto list
description: The singular crypto property should work for one list row.
```

### Crypto list using singular property with many symbols

```stock-block-list
crypto: BTC, ETH, SOL
quoteCurrency: USD
days: 30
linkStyle: wikilink
title: Singular crypto property with many symbols
description: The singular crypto property should also accept a comma-separated list.
```

### Single chart using plural property

```stock-block
cryptos: BTC, ETH
quoteCurrency: USD
days: 30
width: 600
height: 300
showAxes: true
title: Plural cryptos chart
description: The plural cryptos property should work in a single chart; BTC should be charted because it is first.
```

### Stocks and cryptos together

```stock-block-list
stocks: AAPL, MSFT
cryptos: BTC, ETH, SOL
quoteCurrency: USD
days: 30
linkStyle: wikilink
sortBy: symbol
sortOrder: asc
showTodayChange: true
title: Mixed stock and crypto list
description: Stocks should render with cryptos in one table; sorting should apply across all rows.
```

### Mixed list sorted by performance

```stock-block-list
stocks: AAPL, MSFT
cryptos: BTC, ETH, SOL
quoteCurrency: USD
days: 30
linkStyle: markdown
sortBy: changePercent
sortOrder: desc
showLastUpdate: true
showTodayChange: true
refreshInterval: 5
title: Mixed list sorted by change
description: Verify refresh controls, sorting, links, stale-data handling, and successful rows after failures.
```

## Yahoo crypto resolver checks

### Suffixed Yahoo crypto symbols

```stock-block-list
cryptos: PEPE, SUI, UNI, TAO
quoteCurrency: USD
days: 30
linkStyle: markdown
showTodayChange: true
title: Suffixed Yahoo crypto resolver
description: These assets may resolve to Yahoo symbols like PEPE24478-USD, SUI20947-USD, UNI7083-USD, or TAO22974-USD while displaying the user-facing symbols.
```

### Small-price crypto precision

```stock-block
crypto: PEPE
quoteCurrency: USD
days: 30
width: 600
height: 300
showAxes: true
showTodayChange: true
title: PEPE USD precision
description: Price labels should keep useful crypto precision instead of rounding to two decimals.
```

## Error and validation checks

### Unsupported quote currency

```stock-block
crypto: BTC
quoteCurrency: CAD
days: 30
width: 600
height: 300
showAxes: true
title: Unsupported CAD crypto quote
description: Expected error: only USD crypto quotes are supported in this version.
```

### Stock and crypto in one chart block

```stock-block
stock: AAPL
crypto: BTC
quoteCurrency: USD
days: 30
width: 600
height: 300
showAxes: true
title: Invalid stock plus crypto chart
description: Expected error: specify either a stock symbol or a crypto symbol, not both.
```

### Empty mixed list

```stock-block-list
stocks:
cryptos:
quoteCurrency: USD
days: 30
title: Empty mixed list
description: Expected error: add at least one stock or crypto symbol.
```

### Non-match protection for derivative crypto symbols

```stock-block
crypto: MATIC
quoteCurrency: USD
days: 30
width: 600
height: 300
showAxes: true
title: MATIC non-match protection
description: Should not silently resolve to staked, wrapped, or derivative variants such as STMATIC-USD, MATICX-USD, or WMATIC-USD. If Yahoo does not provide a matching MATIC-USD or MATIC<digits>-USD cryptocurrency result, this block should show a clear resolution error.
```

## Manual acceptance checklist

- BTC, ETH, SOL, PEPE, SUI, UNI, and TAO display as user-facing symbols instead of Yahoo suffixed symbols.
- Valid crypto charts use calendar days and keep at least two plotted points.
- Valid crypto candlestick blocks render OHLC candles.
- `crypto` and `cryptos` both work for one crypto symbol or a comma-separated list.
- Mixed lists render stocks and cryptos together and allow sorting across all rows.
- Refresh failures preserve stale successful data and show a refresh-failed state.
- Invalid crypto blocks show clear validation or resolution errors.
- `stock: BTC` behavior remains separate from `crypto: BTC`.
