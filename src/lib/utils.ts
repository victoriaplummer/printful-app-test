/**
 * Combines class names with conditional logic
 *
 * @example
 * // Basic usage:
 * cn('text-red-500', 'bg-blue-500')
 *
 * // With conditions:
 * cn('text-base', isPrimary && 'text-blue-500', !isPrimary && 'text-gray-500')
 */
export function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Creates a map of class variations
 *
 * @example
 * const buttonVariants = cva({
 *   base: 'px-4 py-2 rounded-md',
 *   variants: {
 *     intent: {
 *       primary: 'bg-blue-500 text-white',
 *       secondary: 'bg-gray-200 text-gray-800',
 *       danger: 'bg-red-500 text-white',
 *     },
 *     size: {
 *       small: 'text-sm',
 *       medium: 'text-base',
 *       large: 'text-lg',
 *     },
 *   },
 *   defaultVariants: {
 *     intent: 'primary',
 *     size: 'medium',
 *   },
 * });
 *
 * // Usage:
 * <button className={buttonVariants({ intent: 'danger', size: 'large' })}>
 *   Delete
 * </button>
 */
export function cva(config: {
  base?: string;
  variants?: Record<string, Record<string, string>>;
  defaultVariants?: Record<string, string>;
}) {
  return (props?: Record<string, string | undefined>) => {
    const { base = "", variants = {}, defaultVariants = {} } = config;
    const classes = [base];

    // Apply variants
    Object.entries(variants).forEach(([variantType, variantOptions]) => {
      const variantValue = props?.[variantType] || defaultVariants[variantType];
      if (variantValue && variantOptions[variantValue]) {
        classes.push(variantOptions[variantValue]);
      }
    });

    return classes.join(" ");
  };
}
