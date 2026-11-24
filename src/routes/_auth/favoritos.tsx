import { createFileRoute } from '@tanstack/react-router';

import { FavoritesPage } from '@/features/favorites/components/FavoritesPage';

export const Route = createFileRoute('/_auth/favoritos')({
  component: FavoritesPage,
});
