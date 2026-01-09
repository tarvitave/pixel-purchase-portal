import { WalletButton } from './WalletButton';
import { HelpCircle, Zap } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

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

        {/* Center - Info Hovers */}
        <div className="hidden md:flex items-center gap-4">
          {/* How It Works */}
          <HoverCard openDelay={100} closeDelay={100}>
            <HoverCardTrigger asChild>
              <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <HelpCircle className="w-4 h-4" />
                How It Works
              </button>
            </HoverCardTrigger>
            <HoverCardContent className="w-72" align="center">
              <h4 className="text-sm font-medium text-foreground mb-2">How It Works</h4>
              <ol className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary font-bold">1.</span>
                  Connect your Phantom wallet
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">2.</span>
                  Upload an image and add a link URL
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">3.</span>
                  Drag to position on the 500×500 canvas
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">4.</span>
                  Click "Place Image" and pay in SOL
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">5.</span>
                  Your image stays forever (or until outbid!)
                </li>
              </ol>
            </HoverCardContent>
          </HoverCard>

          {/* HTTP x402 Protocol */}
          <HoverCard openDelay={100} closeDelay={100}>
            <HoverCardTrigger asChild>
              <button className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
                <Zap className="w-4 h-4" />
                x402 Protocol
              </button>
            </HoverCardTrigger>
            <HoverCardContent className="w-72" align="center">
              <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <span className="text-primary">⚡</span>
                HTTP x402 Protocol
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This canvas uses the x402 protocol for native web payments. 
                Each pixel purchase is a micropayment secured by Solana's 
                lightning-fast blockchain.
              </p>
            </HoverCardContent>
          </HoverCard>
        </div>

        {/* Stats */}
        <div className="hidden lg:flex items-center gap-6">
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
