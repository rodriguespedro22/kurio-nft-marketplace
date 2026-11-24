import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-field font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: 'bg-primary font-bold text-ink hover:bg-primary-dark',
        outline: 'border border-border bg-transparent text-foreground hover:border-primary hover:text-accent',
        secondary: 'bg-surface-raised text-foreground hover:bg-border',
        ghost: 'bg-transparent text-foreground hover:bg-surface-raised',
        link: 'h-auto px-0 text-accent underline-offset-4 hover:underline',
        danger: 'border border-error bg-transparent text-coral hover:bg-error/10',
      },
      size: {
        sm: 'h-9 px-3 text-body-sm',
        md: 'h-11 px-5 text-body',
        lg: 'h-12 px-6 text-body-lg',
        icon: 'size-11',
        'icon-sm': 'size-9',
      },
      shape: {
        default: '',
        pill: 'rounded-full',
      },
    },
    compoundVariants: [{ variant: 'link', className: 'h-auto px-0' }],
    defaultVariants: { variant: 'primary', size: 'md', shape: 'default' },
  },
);
