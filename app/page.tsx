"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { TrendingUp, TrendingDown, Activity, DollarSign } from "lucide-react"
import { DemoDataGenerator } from "@/components/demo-data-generator"

interface OrderBookEntry {
  price: number
  quantity: number
  orders: number
}

interface Trade {
  timestamp: string
  symbol: string
  trade_id: string
  price: number
  quantity: number
  aggressor_side: "buy" | "sell"
  maker_order_id: string
  taker_order_id: string
}

interface OrderBookData {
  timestamp: string
  symbol: string
  asks: [number, number][]
  bids: [number, number][]
  bbo: {
    best_bid: number | null
    best_ask: number | null
    spread: number | null
  }
}

interface Stats {
  total_orders: number
  total_trades: number
  volume_24h: number
  orders_per_second: number
}

export default function TradingDashboard() {
  const [orderBook, setOrderBook] = useState<OrderBookData>({
    timestamp: "",
    symbol: "BTC-USDT",
    asks: [],
    bids: [],
    bbo: { best_bid: null, best_ask: null, spread: null },
  })
  const [trades, setTrades] = useState<Trade[]>([])
  const [stats, setStats] = useState<Stats>({
    total_orders: 0,
    total_trades: 0,
    volume_24h: 0,
    orders_per_second: 0,
  })
  const [isConnected, setIsConnected] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Order form state
  const [orderForm, setOrderForm] = useState({
    symbol: "BTC-USDT",
    order_type: "limit",
    side: "buy",
    quantity: "",
    price: "",
  })

  useEffect(() => {
    let intervalId: NodeJS.Timeout

    const fetchUpdates = async () => {
      try {
        // Fetch order book
        const obResponse = await fetch("/api/orderbook?symbol=BTC-USDT&depth=10")
        if (obResponse.ok) {
          const orderBookData = await obResponse.json()
          setOrderBook(orderBookData)
        }

        // Fetch recent trades
        const tradesResponse = await fetch("/api/trades?limit=50")
        if (tradesResponse.ok) {
          const tradesData = await tradesResponse.json()
          setTrades(tradesData)
        }

        // Fetch stats
        const statsResponse = await fetch("/api/stats")
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData)
        }

        setIsConnected(true)
      } catch (error) {
        console.error("Error fetching updates:", error)
        setIsConnected(false)
      }
    }

    // Initial fetch
    fetchUpdates()

    // Set up polling every 500ms for real-time feel
    intervalId = setInterval(fetchUpdates, 500)

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [refreshTrigger])

  const submitOrder = async () => {
    try {
      const orderData = {
        ...orderForm,
        quantity: Number.parseFloat(orderForm.quantity),
        price: orderForm.order_type === "market" ? undefined : Number.parseFloat(orderForm.price),
        order_id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      }

      const response = await fetch("/api/submit-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      })

      const result = await response.json()

      if (result.status === "success") {
        // Reset form
        setOrderForm((prev) => ({
          ...prev,
          quantity: "",
          price: "",
        }))
      } else {
        alert(`Order failed: ${result.message}`)
      }
    } catch (error) {
      console.error("Failed to submit order:", error)
      alert("Failed to submit order")
    }
  }

  const formatPrice = (price: number) => price.toFixed(2)
  const formatQuantity = (qty: number) => qty.toFixed(4)

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Crypto Matching Engine</h1>
            <p className="text-gray-600">High-Performance Trading System</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
            <span className="text-sm text-gray-600">{isConnected ? "Connected" : "Disconnected"}</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_orders.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_trades.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">24h Volume</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.volume_24h.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orders/Sec</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.orders_per_second.toFixed(1)}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            {/* Order Form */}
            <Card>
              <CardHeader>
                <CardTitle>Submit Order</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="symbol">Symbol</Label>
                    <Select
                      value={orderForm.symbol}
                      onValueChange={(value) => setOrderForm((prev) => ({ ...prev, symbol: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BTC-USDT">BTC-USDT</SelectItem>
                        <SelectItem value="ETH-USDT">ETH-USDT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="order_type">Order Type</Label>
                    <Select
                      value={orderForm.order_type}
                      onValueChange={(value) => setOrderForm((prev) => ({ ...prev, order_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="market">Market</SelectItem>
                        <SelectItem value="limit">Limit</SelectItem>
                        <SelectItem value="ioc">IOC</SelectItem>
                        <SelectItem value="fok">FOK</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="side">Side</Label>
                    <Select
                      value={orderForm.side}
                      onValueChange={(value) => setOrderForm((prev) => ({ ...prev, side: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buy">Buy</SelectItem>
                        <SelectItem value="sell">Sell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.0001"
                      value={orderForm.quantity}
                      onChange={(e) => setOrderForm((prev) => ({ ...prev, quantity: e.target.value }))}
                      placeholder="0.0000"
                    />
                  </div>
                </div>

                {orderForm.order_type !== "market" && (
                  <div>
                    <Label htmlFor="price">Price</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={orderForm.price}
                      onChange={(e) => setOrderForm((prev) => ({ ...prev, price: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                )}

                <Button
                  onClick={submitOrder}
                  className="w-full"
                  disabled={!orderForm.quantity || (orderForm.order_type !== "market" && !orderForm.price)}
                >
                  Submit Order
                </Button>
              </CardContent>
            </Card>

            {/* Demo Data Generator */}
            <DemoDataGenerator onOrderSubmitted={() => setRefreshTrigger((prev) => prev + 1)} />
          </div>

          {/* Order Book */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Order Book - {orderBook.symbol}
                {orderBook.bbo.spread && <Badge variant="outline">Spread: ${orderBook.bbo.spread.toFixed(2)}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Best Bid/Ask */}
                <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Best Bid</div>
                    <div className="text-lg font-bold text-green-600">
                      {orderBook.bbo.best_bid ? `$${formatPrice(orderBook.bbo.best_bid)}` : "-"}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Best Ask</div>
                    <div className="text-lg font-bold text-red-600">
                      {orderBook.bbo.best_ask ? `$${formatPrice(orderBook.bbo.best_ask)}` : "-"}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Asks */}
                <div>
                  <h4 className="text-sm font-medium text-red-600 mb-2">Asks (Sell Orders)</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {orderBook.asks
                      .slice(0, 10)
                      .reverse()
                      .map(([price, quantity], index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-red-600">${formatPrice(price)}</span>
                          <span>{formatQuantity(quantity)}</span>
                        </div>
                      ))}
                  </div>
                </div>

                <Separator />

                {/* Bids */}
                <div>
                  <h4 className="text-sm font-medium text-green-600 mb-2">Bids (Buy Orders)</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {orderBook.bids.slice(0, 10).map(([price, quantity], index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-green-600">${formatPrice(price)}</span>
                        <span>{formatQuantity(quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Trades */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {trades.map((trade, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      {trade.aggressor_side === "buy" ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <div>
                        <div className="text-sm font-medium">${formatPrice(trade.price)}</div>
                        <div className="text-xs text-gray-600">
                          {formatQuantity(trade.quantity)} {trade.symbol.split("-")[0]}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">{new Date(trade.timestamp).toLocaleTimeString()}</div>
                  </div>
                ))}
                {trades.length === 0 && <div className="text-center text-gray-500 py-8">No trades yet</div>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
