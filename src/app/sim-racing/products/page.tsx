import type { Metadata } from 'next'
import ProductsClient from './products-client'

export const metadata: Metadata = {
  title: 'Sim Racing Hardware — Wheels, Pedals, Rigs & More | F1Rec',
  description: 'Browse sim racing hardware by category and brand. Compare pricing, ratings, and picks across wheels, pedals, rigs, and accessories.',
}

export default function SimRacingProductsPage() {
  return <ProductsClient />
}
