import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const calculators = [
  { name: 'Retirement Calculator', path: '/' },
  { name: 'Guardrails Calculator', path: '/guardrails' },
  { name: 'Military Pension Calculator', path: '/military-pension' },
  { name: 'Roth Conversion Calculator', path: '/roth-conversion' },
  { name: 'Savings Calculator', path: '/savings-calculator' },
  { name: 'SailAway Calculator', path: '/sailaway' },
] as const;

interface CalculatorNavigationProps {
  children: ReactNode;
}

export function CalculatorNavigation({ children }: CalculatorNavigationProps) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const menuId = useId();

  const currentIndex = Math.max(
    0,
    calculators.findIndex(({ path }) =>
      path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`),
    ),
  );
  const currentCalculator = calculators[currentIndex];

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const openAndFocus = (index: number) => {
    setOpen(true);
    requestAnimationFrame(() => itemRefs.current[index]?.focus());
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openAndFocus(currentIndex);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      openAndFocus(calculators.length - 1);
    }
  };

  const handleItemKeyDown = (event: KeyboardEvent<HTMLAnchorElement>, index: number) => {
    let nextIndex: number | undefined;
    if (event.key === 'ArrowDown') nextIndex = (index + 1) % calculators.length;
    if (event.key === 'ArrowUp') nextIndex = (index - 1 + calculators.length) % calculators.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = calculators.length - 1;

    if (nextIndex !== undefined) {
      event.preventDefault();
      itemRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex w-full flex-col items-center mb-4"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
        <button
          ref={triggerRef}
          type="button"
          aria-label={`Choose calculator. Current calculator: ${currentCalculator.name}`}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
          onKeyDown={handleTriggerKeyDown}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-2 py-1 -mx-2 text-center transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span>{children}</span>
          <ChevronDown
            aria-hidden="true"
            className={`h-5 w-5 sm:h-6 sm:w-6 shrink-0 text-primary transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </h1>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Calculator menu"
          className="absolute left-1/2 z-50 mt-3 w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-border bg-background p-2 text-left shadow-xl"
        >
          {calculators.map((calculator, index) => {
            const selected = index === currentIndex;
            return (
              <Link
                key={calculator.path}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                to={calculator.path}
                role="menuitem"
                aria-current={selected ? 'page' : undefined}
                onClick={() => setOpen(false)}
                onKeyDown={(event) => handleItemKeyDown(event, index)}
                className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
                  selected
                    ? 'bg-primary/15 text-primary'
                    : 'text-foreground hover:bg-muted focus-visible:bg-muted'
                }`}
              >
                <span>{calculator.name}</span>
                {selected && <Check aria-hidden="true" className="h-4 w-4 shrink-0" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
