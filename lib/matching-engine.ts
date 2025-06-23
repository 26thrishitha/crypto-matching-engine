export interface Order {
  order_id: string
  symbol: string
  order_type: "market" | "limit" | "ioc" | "fok"
  side: "buy" | "sell"
  quantity: number
  price?: number
  timestamp: number
  filled_quantity: number
  status: "pending" | "filled" | "partially_filled" | "cancelled"
}

export interface Trade {
  trade_id: string
  symbol: string
  price: number
  quantity: number
  timestamp: string
  aggressor_side: "buy" | "sell"
  maker_order_id: string
  taker_order_id: string
}

export interface OrderBookLevel {
  price: number
  quantity: number
  orders: Order[]
}

export interface BBO {
  best_bid: number | null
  best_ask: number | null
  spread: number | null
}

export class MatchingEngine {
  private buyOrders: Map<number, OrderBookLevel> = new Map()
  private sellOrders: Map<number, OrderBookLevel> = new Map()
  private trades: Trade[] = []
  private orderHistory: Order[] = []
  private stats = {
    total_orders: 0,
    total_trades: 0,
    volume_24h: 0,
    orders_per_second: 0,
  }
  private lastSecondOrders = 0
  private lastSecondTimestamp = Date.now()

  constructor() {
    // Update orders per second every second
    setInterval(() => {
      const now = Date.now()
      const timeDiff = (now - this.lastSecondTimestamp) / 1000
      this.stats.orders_per_second = this.lastSecondOrders / timeDiff
      this.lastSecondOrders = 0
      this.lastSecondTimestamp = now
    }, 1000)
  }

  submitOrder(orderData: Omit<Order, "timestamp" | "filled_quantity" | "status">): {
    status: "success" | "error"
    message?: string
    order_id: string
    trades?: Trade[]
  } {
    try {
      // Validate order
      const validation = this.validateOrder(orderData)
      if (!validation.valid) {
        return {
          status: "error",
          message: validation.message,
          order_id: orderData.order_id,
        }
      }

      const order: Order = {
        ...orderData,
        timestamp: Date.now(),
        filled_quantity: 0,
        status: "pending",
      }

      this.stats.total_orders++
      this.lastSecondOrders++
      this.orderHistory.push(order)

      // Process order based on type
      const result = this.processOrder(order)

      return {
        status: "success",
        order_id: order.order_id,
        trades: result.trades,
      }
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        order_id: orderData.order_id,
      }
    }
  }

  private validateOrder(order: Omit<Order, "timestamp" | "filled_quantity" | "status">): {
    valid: boolean
    message?: string
  } {
    if (!order.order_id || !order.symbol || !order.side || !order.order_type) {
      return { valid: false, message: "Missing required fields" }
    }

    if (order.quantity <= 0) {
      return { valid: false, message: "Quantity must be positive" }
    }

    if (order.order_type !== "market" && (!order.price || order.price <= 0)) {
      return { valid: false, message: "Price must be positive for non-market orders" }
    }

    return { valid: true }
  }

  private processOrder(order: Order): { trades: Trade[] } {
    const trades: Trade[] = []

    switch (order.order_type) {
      case "market":
        return this.processMarketOrder(order)
      case "limit":
        return this.processLimitOrder(order)
      case "ioc":
        return this.processIOCOrder(order)
      case "fok":
        return this.processFOKOrder(order)
      default:
        throw new Error(`Unsupported order type: ${order.order_type}`)
    }
  }

  private processMarketOrder(order: Order): { trades: Trade[] } {
    const trades: Trade[] = []
    let remainingQuantity = order.quantity

    const oppositeBook = order.side === "buy" ? this.sellOrders : this.buyOrders
    const sortedPrices = Array.from(oppositeBook.keys()).sort((a, b) => (order.side === "buy" ? a - b : b - a))

    for (const price of sortedPrices) {
      if (remainingQuantity <= 0) break

      const level = oppositeBook.get(price)!
      const levelTrades = this.matchAtLevel(order, level, remainingQuantity)
      trades.push(...levelTrades)

      remainingQuantity -= levelTrades.reduce((sum, trade) => sum + trade.quantity, 0)

      // Clean up empty level
      if (level.quantity <= 0) {
        oppositeBook.delete(price)
      }
    }

    order.filled_quantity = order.quantity - remainingQuantity
    order.status = order.filled_quantity === order.quantity ? "filled" : "partially_filled"

    this.updateStats(trades)
    return { trades }
  }

  private processLimitOrder(order: Order): { trades: Trade[] } {
    const trades: Trade[] = []
    let remainingQuantity = order.quantity

    // Check if order is marketable
    const bbo = this.getBBO()
    const isMarketable =
      order.side === "buy"
        ? bbo.best_ask !== null && order.price! >= bbo.best_ask
        : bbo.best_bid !== null && order.price! <= bbo.best_bid

    if (isMarketable) {
      // Execute marketable portion
      const oppositeBook = order.side === "buy" ? this.sellOrders : this.buyOrders
      const sortedPrices = Array.from(oppositeBook.keys()).sort((a, b) => (order.side === "buy" ? a - b : b - a))

      for (const price of sortedPrices) {
        if (remainingQuantity <= 0) break

        // Price protection - don't trade through
        if (order.side === "buy" && price > order.price!) break
        if (order.side === "sell" && price < order.price!) break

        const level = oppositeBook.get(price)!
        const levelTrades = this.matchAtLevel(order, level, remainingQuantity)
        trades.push(...levelTrades)

        remainingQuantity -= levelTrades.reduce((sum, trade) => sum + trade.quantity, 0)

        if (level.quantity <= 0) {
          oppositeBook.delete(price)
        }
      }
    }

    // Add remaining quantity to book
    if (remainingQuantity > 0) {
      this.addToBook(order, remainingQuantity)
    }

    order.filled_quantity = order.quantity - remainingQuantity
    order.status = remainingQuantity === 0 ? "filled" : order.filled_quantity > 0 ? "partially_filled" : "pending"

    this.updateStats(trades)
    return { trades }
  }

  private processIOCOrder(order: Order): { trades: Trade[] } {
    // IOC behaves like a limit order but cancels unfilled portion
    const result = this.processLimitOrder(order)

    // Cancel any unfilled portion
    if (order.filled_quantity < order.quantity) {
      this.removeFromBook(order)
      order.status = order.filled_quantity > 0 ? "partially_filled" : "cancelled"
    }

    return result
  }

  private processFOKOrder(order: Order): { trades: Trade[] } {
    // Check if entire order can be filled
    const canFillCompletely = this.canFillOrder(order, order.quantity)

    if (!canFillCompletely) {
      order.status = "cancelled"
      return { trades: [] }
    }

    // Fill the entire order
    return this.processLimitOrder(order)
  }

  private canFillOrder(order: Order, quantity: number): boolean {
    const oppositeBook = order.side === "buy" ? this.sellOrders : this.buyOrders
    let availableQuantity = 0

    const sortedPrices = Array.from(oppositeBook.keys()).sort((a, b) => (order.side === "buy" ? a - b : b - a))

    for (const price of sortedPrices) {
      if (order.order_type !== "market") {
        if (order.side === "buy" && price > order.price!) break
        if (order.side === "sell" && price < order.price!) break
      }

      const level = oppositeBook.get(price)!
      availableQuantity += level.quantity

      if (availableQuantity >= quantity) {
        return true
      }
    }

    return false
  }

  private matchAtLevel(takerOrder: Order, level: OrderBookLevel, maxQuantity: number): Trade[] {
    const trades: Trade[] = []
    let remainingQuantity = Math.min(maxQuantity, level.quantity)

    // Sort orders by timestamp (FIFO)
    const sortedOrders = [...level.orders].sort((a, b) => a.timestamp - b.timestamp)

    for (const makerOrder of sortedOrders) {
      if (remainingQuantity <= 0) break

      const tradeQuantity = Math.min(remainingQuantity, makerOrder.quantity - makerOrder.filled_quantity)

      if (tradeQuantity > 0) {
        const trade: Trade = {
          trade_id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          symbol: takerOrder.symbol,
          price: level.price,
          quantity: tradeQuantity,
          timestamp: new Date().toISOString(),
          aggressor_side: takerOrder.side,
          maker_order_id: makerOrder.order_id,
          taker_order_id: takerOrder.order_id,
        }

        trades.push(trade)
        this.trades.push(trade)

        // Update order fill quantities
        makerOrder.filled_quantity += tradeQuantity
        if (makerOrder.filled_quantity >= makerOrder.quantity) {
          makerOrder.status = "filled"
        }

        remainingQuantity -= tradeQuantity
        level.quantity -= tradeQuantity
      }
    }

    // Remove filled orders from level
    level.orders = level.orders.filter((order) => order.status !== "filled")

    return trades
  }

  private addToBook(order: Order, quantity: number): void {
    const book = order.side === "buy" ? this.buyOrders : this.sellOrders
    const price = order.price!

    if (!book.has(price)) {
      book.set(price, {
        price,
        quantity: 0,
        orders: [],
      })
    }

    const level = book.get(price)!
    level.quantity += quantity
    level.orders.push({
      ...order,
      quantity: quantity,
    })
  }

  private removeFromBook(order: Order): void {
    const book = order.side === "buy" ? this.buyOrders : this.sellOrders
    const price = order.price!

    if (book.has(price)) {
      const level = book.get(price)!
      level.orders = level.orders.filter((o) => o.order_id !== order.order_id)
      level.quantity = level.orders.reduce((sum, o) => sum + (o.quantity - o.filled_quantity), 0)

      if (level.orders.length === 0) {
        book.delete(price)
      }
    }
  }

  private updateStats(trades: Trade[]): void {
    this.stats.total_trades += trades.length
    this.stats.volume_24h += trades.reduce((sum, trade) => sum + trade.price * trade.quantity, 0)
  }

  getBBO(): BBO {
    const bestBid = this.buyOrders.size > 0 ? Math.max(...this.buyOrders.keys()) : null
    const bestAsk = this.sellOrders.size > 0 ? Math.min(...this.sellOrders.keys()) : null
    const spread = bestBid !== null && bestAsk !== null ? bestAsk - bestBid : null

    return { best_bid: bestBid, best_ask: bestAsk, spread }
  }

  getOrderBook(symbol: string, depth = 10) {
    const bids = Array.from(this.buyOrders.entries())
      .sort(([a], [b]) => b - a)
      .slice(0, depth)
      .map(([price, level]) => [price, level.quantity] as [number, number])

    const asks = Array.from(this.sellOrders.entries())
      .sort(([a], [b]) => a - b)
      .slice(0, depth)
      .map(([price, level]) => [price, level.quantity] as [number, number])

    return {
      timestamp: new Date().toISOString(),
      symbol,
      bids,
      asks,
      bbo: this.getBBO(),
    }
  }

  getRecentTrades(limit = 50): Trade[] {
    return this.trades.slice(-limit).reverse()
  }

  getStats() {
    return { ...this.stats }
  }
}

// Global matching engine instance
export const matchingEngine = new MatchingEngine()
