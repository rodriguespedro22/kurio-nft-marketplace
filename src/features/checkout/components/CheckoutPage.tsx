import { useEffect, useId, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIsMutating, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useNavigate } from '@tanstack/react-router';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { QuoteSchema, type Cart, type Profile, type Quote, type Wallet } from '@/contracts';
import { useSession } from '@/features/auth/session';
import { OrderSummary } from '@/features/cart/components/OrderSummary';
import { OrderSummarySkeleton } from '@/features/cart/components/OrderSummarySkeleton';
import { cartLineName } from '@/features/cart/labels';
import { useCart } from '@/features/cart/queries';
import { useQuote } from '@/features/cart/quote-queries';
import { quoteKey, useCartOwner } from '@/features/cart/use-cart-owner';
import { getUnsettledAttempt, type Attempt } from '@/features/orders/idempotency';
import { getPendingOrder } from '@/features/orders/pending-order';
import { CREATE_ORDER_KEY, isUncertain, useCreateOrder } from '@/features/orders/queries';
import { useProfile } from '@/features/profile/queries';
import { useWallets } from '@/features/wallets/queries';
import { ApiError } from '@/shared/api/api-error';
import { BackButton } from '@/shared/layout/BackButton';
import { Breadcrumb } from '@/shared/layout/Breadcrumb';
import { useMediaQuery } from '@/shared/lib/use-media-query';
import { formatEth, mulEth } from '@/shared/money/eth';
import { buttonVariants } from '@/shared/ui/button-variants';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { CartIcon } from '@/shared/ui/icons';
import { NftImage } from '@/shared/ui/nft-image';
import { PageError } from '@/shared/ui/page-error';
import { Skeleton } from '@/shared/ui/skeleton';

import { loadCheckoutDraft, saveCheckoutDraft } from '../draft';
import { BUYER_FIELDS, buyerFromWallet, buyerSchema, emptyBuyer, type BuyerFormValues } from '../schema';
import { BuyerForm } from './BuyerForm';
import { ReviewDialog } from './ReviewDialog';
import { ProviderPicker } from './ProviderPicker';
import { WalletNetworkPicker } from './WalletNetworkPicker';

const GRID = 'grid gap-8 xl:grid-cols-[minmax(0,763px)_minmax(0,405px)] xl:justify-between';

type CheckoutData = { userId: string; profile: Profile; wallets: Wallet[]; cart: Cart };

/** Rascunho da sessão > carteira escolhida (a principal por padrão) > perfil. */
function initialState({ userId, profile, wallets }: CheckoutData) {
  const draft = loadCheckoutDraft(userId);
  const fallback = wallets.find((wallet) => wallet.slot === 'primary') ?? wallets[0] ?? null;
  const wallet = wallets.find((item) => item.id === draft?.walletId) ?? fallback;
  const base = wallet ? buyerFromWallet(wallet, emptyBuyer(profile)) : emptyBuyer(profile);
  return { walletId: wallet?.id ?? null, buyer: { ...base, ...draft?.buyer } };
}

type Review = { previous: Quote; current: Quote | null; error: unknown };

/**
 * O que a revisão mostra. Se a cotação do carrinho foi refeita com a revisão aberta (evento de
 * preço/estoque, item removido), a mais nova vira a atual e a que estava na tela vira a anterior.
 */
function shownReview(review: Review, live: Quote | undefined): Review {
  if (!review.current || !live || live.version <= review.current.version) return review;
  return { previous: review.current, current: live, error: null };
}

function CheckoutContent(data: CheckoutData) {
  const desktop = useMediaQuery('(min-width: 80rem)');
  const { userId, wallets, cart } = data;
  const formId = useId();
  const [initial] = useState(() => initialState(data));
  const [walletId, setWalletId] = useState(initial.walletId);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [buyerOpen, setBuyerOpen] = useState(true);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const owner = useCartOwner();
  /** Timeout/rede no envio: o pedido pode existir — reenvio com a mesma chave. */
  const [verifying, setVerifying] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const createOrder = useCreateOrder({ onUncertain: () => setVerifying(true) });
  // Foco do erro feito à mão (ordem da tela): o RHF seguiria a ordem de registro dos campos.
  const form = useForm<BuyerFormValues>({
    resolver: zodResolver(buyerSchema),
    defaultValues: initial.buyer,
    shouldFocusError: false,
  });
  const values = useWatch({ control: form.control });
  // Antes de escolher a rede, a taxa é estimada na Ethereum (a mesma do carrinho).
  const network = values.network || 'ethereum';
  const quote = useQuote({ network });
  const selected = wallets.find((wallet) => wallet.id === walletId) ?? null;
  const shown = review ? shownReview(review, quote.data) : null;
  const lineNames = Object.fromEntries(
    cart.items.map((item) => [item.id, cartLineName(item.nft.name, item.editionLabel)]),
  );

  useEffect(() => {
    saveCheckoutDraft(userId, { walletId, buyer: values as Partial<BuyerFormValues> });
  }, [userId, walletId, values]);

  function selectWallet(wallet: Wallet) {
    setWalletId(wallet.id);
    setWalletError(null);
    form.reset(buyerFromWallet(wallet, form.getValues()), { keepDefaultValues: true });
  }

  function walletProblem(): string | null {
    if (!selected) return 'Escolha uma carteira cadastrada para receber os NFTs.';
    if (selected.connection !== 'connected') return 'Conecte a carteira escolhida para continuar.';
    return null;
  }

  async function openReview() {
    const previous = quote.data;
    if (!previous) return;
    setReview({ previous, current: null, error: null });
    setReviewOpen(true);
    const renewed = await quote.refetch();
    setReview({
      previous,
      current: renewed.isError ? null : (renewed.data ?? null),
      error: renewed.isError ? renewed.error : null,
    });
  }

  function confirmOrder(current: Quote) {
    if (!selected) return;
    setOrderError(null);
    const input = {
      quoteId: current.quoteId,
      quoteVersion: current.version,
      walletId: selected.id,
      network: current.network,
      buyer: buyerSchema.parse(form.getValues()),
    };
    createOrder.mutate(input, {
      onSuccess: (order) => {
        setVerifying(false);
        void navigate({ to: '/pedido/$orderId', params: { orderId: order.id } });
      },
      onError: (error) => {
        if (isUncertain(error)) {
          setVerifying(true);
          return;
        }
        setVerifying(false);
        const fresh =
          error instanceof ApiError && error.code === 'QUOTE_STALE'
            ? QuoteSchema.safeParse((error.details as { quote?: unknown } | undefined)?.quote)
            : null;
        if (fresh?.success) {
          // A cotação nova também vale para o resumo (sem refazer outra e perder a diferença).
          queryClient.setQueryData(quoteKey(owner, { network: fresh.data.network }), fresh.data);
          setReview({ previous: current, current: fresh.data, error: null });
          return;
        }
        setOrderError(
          error instanceof ApiError ? error.message : 'Não foi possível criar o pedido. Tente novamente.',
        );
      },
    });
  }

  const orderNotice = verifying ? (
    <div role="status" className="flex flex-wrap items-center justify-between gap-3 text-body-sm text-amber">
      <span>Verificando seu pedido…</span>
      {createOrder.isError && shown?.current ? (
        <Button variant="outline" size="sm" onClick={() => shown.current && confirmOrder(shown.current)}>
          Tentar novamente
        </Button>
      ) : null}
    </div>
  ) : orderError ? (
    <p role="alert" className="text-body-sm text-coral">
      {orderError}
    </p>
  ) : null;

  const onSubmit = form.handleSubmit(
    () => {
      const problem = walletProblem();
      setWalletError(problem);
      if (!problem) void openReview();
    },
    (errors) => {
      setWalletError(walletProblem());
      const first = BUYER_FIELDS.find((field) => errors[field]);
      if (first) {
        setBuyerOpen(true);
        requestAnimationFrame(() => form.setFocus(first));
      }
    },
  );

  // No celular a carteira vem antes do formulário (como no layout mobile); a ordem no DOM acompanha a
  // ordem visual nas duas larguras.
  const picker = (
    <WalletNetworkPicker
      wallets={wallets}
      selectedId={walletId}
      onSelect={selectWallet}
      error={walletError}
    />
  );

  return (
    <div className={GRID}>
      {desktop ? null : picker}
      {desktop ? null : <ProviderPicker control={form.control} />}
      {desktop ? (
        <BuyerForm id={formId} form={form} onSubmit={onSubmit} />
      ) : (
        <details
          open={buyerOpen}
          onToggle={(event) => setBuyerOpen(event.currentTarget.open)}
          className="group"
        >
          <summary className="cursor-pointer py-2 text-[1.0625rem] leading-4 font-bold text-foreground">
            Dados do colecionador
          </summary>
          <div className="pt-4">
            <BuyerForm id={formId} form={form} onSubmit={onSubmit} />
          </div>
        </details>
      )}

      <aside aria-labelledby="seus-nfts" className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-col gap-3 max-xl:sr-only">
          <h2 id="seus-nfts" className="text-[1.0625rem] leading-4 font-bold text-foreground">
            Seus NFTs
          </h2>
          <div
            aria-hidden="true"
            className="flex justify-between border-b border-primary/30 pb-3 text-body-lg leading-4 text-foreground"
          >
            <span className="font-bold">NFTs</span>
            <span className="font-medium">Subtotal</span>
          </div>
          <ul aria-label="Itens da compra" className="flex flex-col gap-3">
            {cart.items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 bg-surface p-1 pr-3">
                <NftImage asset={item.nft.image.asset} alt="" sizes="66px" className="size-16.5 shrink-0" />
                <div className="ml-1 flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body-lg leading-4 font-bold text-foreground">
                    {item.nft.name}
                  </span>
                  <span className="mt-1.5 truncate text-body-sm leading-4 text-muted">
                    ID do token: #{item.nft.tokenNumber}
                  </span>
                </div>
                <span className="shrink-0 text-body-sm leading-4 text-secondary">
                  <span className="sr-only">Quantidade: </span>(x {item.quantity})
                </span>
                <span className="shrink-0 text-section leading-4 font-bold text-accent tabular-nums">
                  {formatEth(mulEth(item.unitPrice, item.quantity))}
                </span>
              </li>
            ))}
          </ul>
          <Link
            to="/carrinho"
            className="self-center text-body-sm leading-4 text-foreground underline-offset-4 hover:underline"
          >
            Tem um código promocional? <span className="text-accent">Aplique aqui</span>
          </Link>
        </div>

        {quote.data ? (
          <OrderSummary quote={quote.data} updating={quote.isFetching} totalDivider />
        ) : quote.isError ? (
          <PageError
            error={quote.error}
            title="Não foi possível calcular o resumo"
            onRetry={() => void quote.refetch()}
            className="py-6"
          />
        ) : (
          <OrderSummarySkeleton />
        )}
        {desktop ? picker : null}
        {desktop ? <ProviderPicker control={form.control} /> : null}

        <Button
          ref={confirmRef}
          type="submit"
          form={formId}
          size="lg"
          disabled={!quote.data}
          className="h-[60px] w-full rounded-[40px] bg-linear-[133deg] from-primary to-primary/80 text-body-lg leading-4 font-bold md:h-10 md:rounded-[3px] md:bg-primary md:bg-none md:text-body"
        >
          Confirmar compra
        </Button>
      </aside>

      {shown && selected && values.network ? (
        <ReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          previous={shown.previous}
          current={shown.current}
          error={shown.error}
          onRetry={() => void openReview()}
          lineNames={lineNames}
          wallet={selected}
          network={values.network}
          returnFocusRef={confirmRef}
          onConfirm={confirmOrder}
          confirming={createOrder.isPending}
          notice={orderNotice}
        />
      ) : null}
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div data-testid="checkout-skeleton" aria-hidden="true" className={GRID}>
      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-18 w-full" />
        <Skeleton className="h-18 w-full" />
        <OrderSummarySkeleton />
      </div>
    </div>
  );
}

/**
 * Envio que ficou sem resposta (a página recarregou durante o timeout): o pedido pode já existir.
 * Reenvia a mesma tentativa — mesma chave e corpo — e segue para o pedido que o servidor devolver.
 */
function ResumeAttempt({ attempt, onSettled }: { attempt: Attempt; onSettled: () => void }) {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  const createOrder = useCreateOrder();
  const started = useRef(false);

  function resume() {
    setFailed(false);
    createOrder.mutate(attempt.input, {
      onSuccess: (order) =>
        void navigate({ to: '/pedido/$orderId', params: { orderId: order.id }, replace: true }),
      onError: (error) => {
        if (isUncertain(error)) {
          setFailed(true);
          return;
        }
        toast.error(error instanceof ApiError ? error.message : 'Não foi possível concluir o pedido.');
        onSettled();
      },
    });
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    resume();
  });

  return (
    <div role="status" className="flex flex-wrap items-center gap-3 text-body-sm text-amber">
      <span>Verificando seu pedido…</span>
      {failed ? (
        <Button variant="outline" size="sm" onClick={resume}>
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}

/** Pagamento: comprador, carteira e rede, revisão. */
export function CheckoutPage() {
  const session = useSession();
  const profile = useProfile();
  const wallets = useWallets();
  const cart = useCart();
  const failed = [profile, wallets, cart].find((query) => query.isError);
  // Envio sem resposta definitiva encontrado ao abrir a página (não o que esta tela enviar agora).
  const [resumable, setResumable] = useState(() => (session ? getUnsettledAttempt(session.user.id) : null));
  // O pedido pode ser confirmado (e esvaziar o carrinho) antes da resposta chegar: durante o envio
  // o checkout continua montado para concluir a navegação ou o reenvio com a mesma chave.
  const ordering = useIsMutating({ mutationKey: CREATE_ORDER_KEY }) > 0;
  const pendingOrder = session ? getPendingOrder(session.user.id) : null;
  // Pedido em andamento (reload, aba nova): a tentativa continua na tela de status.
  if (pendingOrder) return <Navigate to="/pedido/$orderId" params={{ orderId: pendingOrder }} replace />;

  let content;
  if (resumable && session) {
    content = <ResumeAttempt key={resumable.key} attempt={resumable} onSettled={() => setResumable(null)} />;
  } else if (failed) {
    content = (
      <PageError
        error={failed.error}
        title="Não foi possível abrir o pagamento"
        onRetry={() => {
          for (const query of [profile, wallets, cart]) if (query.isError) void query.refetch();
        }}
      />
    );
  } else if (!session || !profile.data || !wallets.data || !cart.data) {
    content = <CheckoutSkeleton />;
  } else if (cart.data.items.length === 0 && !ordering) {
    content = (
      <EmptyState
        icon={<CartIcon className="size-6" />}
        title="Seu carrinho está vazio"
        description="Adicione NFTs ao carrinho para finalizar a compra."
        action={
          <Link to="/" hash="catalogo" className={buttonVariants({ variant: 'primary' })}>
            Explorar o catálogo
          </Link>
        }
      />
    );
  } else {
    content = (
      <CheckoutContent
        key={session.user.id}
        userId={session.user.id}
        profile={profile.data}
        wallets={wallets.data}
        cart={cart.data}
      />
    );
  }

  return (
    <div className="container-page flex flex-col gap-4 py-4 md:gap-8 md:pt-8 md:pb-6">
      <title>Pagamento · Kurio</title>
      <div className="flex items-center gap-6 md:sr-only">
        <BackButton className="size-[35px] border-border bg-surface-raised text-secondary md:hidden" />
        <h1 className="text-title-sm leading-4 font-bold text-foreground">Pagamento com carteira</h1>
      </div>
      <Breadcrumb current="Pagamento" />
      {content}
    </div>
  );
}
