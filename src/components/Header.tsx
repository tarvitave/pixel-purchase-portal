import { WalletButton } from './WalletButton';

interface HeaderProps {
  imageCount: number;
  pixelsCovered: number;
}

export function Header({ imageCount, pixelsCovered }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-muted/95 backdrop-blur-md border-b border-border">
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
          <a 
            href="https://linkedin.com/in/colinwynd" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Contact Me
          </a>
          <div className="text-center">
            <div className="text-2xl font-bold font-mono text-foreground">
              {imageCount.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Images Placed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold font-mono text-primary">
              {pixelsCovered.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Pixels Covered</div>
          </div>
        </div>

        {/* Wallet */}
        <WalletButton />
      </div>
    </header>
  );
}
