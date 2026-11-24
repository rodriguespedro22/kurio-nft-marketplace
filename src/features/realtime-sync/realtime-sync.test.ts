import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, test } from 'vitest';

import type { Cart, CartItem, Nft, NftListItem, NftUpdatedEvent } from '@/contracts';
import { qk } from '@/shared/api/query-keys';

import { applyNftUpdated } from './apply-nft-updated';
import {
  addCartNotices,
  type CartNotice,
  cartChangesFor,
  getCartNotices,
  noticeMessage,
  resetCartNotices,
} from './cart-notices';

const NFT_ID = 'nft-a';
const ED_1 = 'nft-a-1-10';
const ED_2 = 'nft-a-1-50';

function listItem(overrides: Partial<NftListItem> = {}): NftListItem {
  return {
    id: NFT_ID,
    name: 'Ape A',
    tokenNumber: 1,
    collection: 'Apes',
    category: 'arte-digital',
    network: 'ethereum',
    isRare: false,
    previousPrice: null,
    status: 'listed',
    version: 1,
    image: { asset: 'ape-emerald-a', alt: 'Ape A' },
    price: '1.5',
    ...overrides,
  } as NftListItem;
}

function nft(version = 1): Nft {
  return {
    ...listItem({ version }),
    editions: [
      { id: ED_1, label: '1/10', kind: 'limited', price: '2', supply: 10, available: 4 },
      { id: ED_2, label: '1/50', kind: 'limited', price: '1.5', supply: 50, available: 9 },
    ],
  } as unknown as Nft;
}

function event(version: number, editions: NftUpdatedEvent['data']['editions']): NftUpdatedEvent {
  return {
    eventId: `e-${version}`,
    type: 'nft.updated',
    resource: { type: 'nft', id: NFT_ID },
    version,
    occurredAt: '2026-11-24T12:00:00.000Z',
    data: { editions, status: editions.every((e) => e.available === 0) ? 'sold_out' : 'listed' },
  };
}

const priceUp = (version: number) =>
  event(version, [
    { id: ED_1, price: '3', available: 4 },
    { id: ED_2, price: '2.5', available: 9 },
  ]);

function cartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: 'item-1',
    nftId: NFT_ID,
    editionId: ED_1,
    editionLabel: '1/10',
    quantity: 1,
    unitPrice: '2',
    available: 4,
    nft: listItem(),
    ...overrides,
  };
}

const cartOf = (...items: CartItem[]): Cart => ({
  id: 'cart-1',
  items,
  couponCode: null,
  updatedAt: '2026-11-24T12:00:00.000Z',
});

describe('applyNftUpdated', () => {
  let qc: QueryClient;
  beforeEach(() => {
    qc = new QueryClient();
  });

  test('evento mais novo atualiza detalhe, catálogo, destaques e favoritos', () => {
    qc.setQueryData(qk.nft(NFT_ID), nft(1));
    qc.setQueryData(['catalog', { page: 1 }], { items: [listItem()], page: 1 });
    qc.setQueryData(qk.featured(), [listItem()]);
    qc.setQueryData(qk.user('u-1').favorites, { items: [listItem()] });

    applyNftUpdated(qc, priceUp(2));

    const detail = qc.getQueryData<Nft>(qk.nft(NFT_ID))!;
    expect(detail.version).toBe(2);
    expect(detail.editions.map((e) => e.price)).toEqual(['3', '2.5']);
    // Preço de vitrine = menor preço entre as edições disponíveis.
    expect(qc.getQueryData<{ items: NftListItem[] }>(['catalog', { page: 1 }])!.items[0]!.price).toBe('2.5');
    expect(qc.getQueryData<NftListItem[]>(qk.featured())![0]!.version).toBe(2);
    expect(qc.getQueryData<{ items: NftListItem[] }>(qk.user('u-1').favorites)!.items[0]!.price).toBe('2.5');
  });

  test('evento igual ou mais antigo que o cache não muda nada', () => {
    const cached = nft(3);
    const page = { items: [listItem({ version: 3 })], page: 1 };
    qc.setQueryData(qk.nft(NFT_ID), cached);
    qc.setQueryData(['catalog', { page: 1 }], page);

    applyNftUpdated(qc, priceUp(3));
    applyNftUpdated(qc, priceUp(2));

    expect(qc.getQueryData(qk.nft(NFT_ID))).toBe(cached);
    expect(qc.getQueryData(['catalog', { page: 1 }])).toBe(page);
  });

  test('carrinho e cotação só são invalidados se o NFT está no carrinho', () => {
    const quoteKey = qk.guest('g-1').quote({ network: 'ethereum' });
    qc.setQueryData(qk.guest('g-1').cart, cartOf(cartItem({ nftId: 'outro' })));
    qc.setQueryData(quoteKey, { total: '1' });

    applyNftUpdated(qc, priceUp(2));
    expect(qc.getQueryState(qk.guest('g-1').cart)!.isInvalidated).toBe(false);

    qc.setQueryData(qk.guest('g-1').cart, cartOf(cartItem()));
    applyNftUpdated(qc, priceUp(3));
    expect(qc.getQueryState(qk.guest('g-1').cart)!.isInvalidated).toBe(true);
    expect(qc.getQueryState(quoteKey)!.isInvalidated).toBe(true);
  });
});

describe('cartChangesFor', () => {
  test('preço alterado e edição esgotada viram avisos com o nome da linha', () => {
    const notices = cartChangesFor(
      cartOf(cartItem()),
      event(2, [
        { id: ED_1, price: '3', available: 0 },
        { id: ED_2, price: '1.5', available: 9 },
      ]),
    );
    expect(notices.notices.map(noticeMessage)).toEqual([
      'Ape A (edição 1/10) esgotou',
      'Preço de Ape A (edição 1/10) mudou de 2.00 ETH para 3.00 ETH',
    ]);
  });

  test('sem carrinho, de outro NFT ou mais antigo que a linha: nenhum aviso', () => {
    const none = { notices: [], cleared: [] };
    expect(cartChangesFor(undefined, priceUp(2))).toEqual(none);
    expect(cartChangesFor(cartOf(cartItem({ nftId: 'outro' })), priceUp(2))).toEqual(none);
    expect(cartChangesFor(cartOf(cartItem({ nft: listItem({ version: 2 }) })), priceUp(2))).toEqual(none);
  });
});

describe('avisos do carrinho', () => {
  const read = (owner: string) => getCartNotices(owner).map(noticeMessage);

  beforeEach(() => {
    resetCartNotices('guest:g-1:cart');
  });

  const only = (notice: CartNotice) => ({ notices: [notice], cleared: [] });
  const price = (from: string, to: string): CartNotice => ({
    key: 'item-1:price',
    cartItemId: 'item-1',
    kind: 'price' as const,
    name: 'Ape A (edição 1/10)',
    from,
    to,
  });

  test('o mesmo item e tipo é substituído, mantendo o preço de antes do primeiro aviso', () => {
    addCartNotices('guest:g-1:cart', only(price('2', '3')));
    addCartNotices('guest:g-1:cart', only(price('3', '4')));
    expect(read('guest:g-1:cart')).toEqual(['Preço de Ape A (edição 1/10) mudou de 2.00 ETH para 4.00 ETH']);
  });

  test('preço que volta ao valor original remove o aviso', () => {
    addCartNotices('guest:g-1:cart', only(price('2', '3')));
    addCartNotices('guest:g-1:cart', only(price('3', '2')));
    expect(read('guest:g-1:cart')).toEqual([]);
  });

  test('edição que volta a ter estoque tira o aviso de esgotado', () => {
    const editions = (available: number) => [
      { id: ED_1, price: '2', available },
      { id: ED_2, price: '1.5', available: 9 },
    ];
    addCartNotices('guest:g-1:cart', cartChangesFor(cartOf(cartItem()), event(2, editions(0))));
    expect(read('guest:g-1:cart')).toEqual(['Ape A (edição 1/10) esgotou']);

    const soldOutLine = cartItem({ available: 0, nft: listItem({ version: 2, status: 'sold_out' }) });
    addCartNotices('guest:g-1:cart', cartChangesFor(cartOf(soldOutLine), event(3, editions(2))));
    expect(read('guest:g-1:cart')).toEqual([]);
  });

  test('avisos de um dono não aparecem para outro; trocar de dono limpa', () => {
    addCartNotices('user:a:cart', only(price('2', '3')));
    expect(read('user:b:cart')).toEqual([]);
    resetCartNotices('user:b:cart');
    expect(read('user:a:cart')).toEqual([]);
  });
});
