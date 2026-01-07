import { WalletButton } from './WalletButton';

interface HeaderProps {
  pixelCount: number;
}

export function Header({ pixelCount }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary via-secondary to-accent rounded-lg flex items-center justify-center">
            <span className="text-lg font-bold text-primary-foreground">×</span>
          </div>
          <div>
            <h1 className="font-bold text-lg text-foreground">
              x402<span className="text-primary">homepage</span>.com
            </h1>
            <p className="text-xs text-muted-foreground -mt-0.5">
              HTTP x402 Protocol • Solana Micropayments
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold font-mono text-foreground">
              {pixelCount.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Pixels Placed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold font-mono text-primary">
              1M
            </div>
            <div className="text-xs text-muted-foreground">Total Pixels</div>
          </div>
        </div>

        {/* Wallet */}
        <WalletButton />
      </div>
    </header>
  );
}
