import { Button } from '@/components/ui/button';
import { usePhantom } from '@/hooks/usePhantom';
import { Wallet, LogOut, ExternalLink } from 'lucide-react';

export function WalletButton() {
  const { connected, publicKey, connecting, connect, disconnect, isPhantomInstalled } = usePhantom();

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (!isPhantomInstalled) {
    return (
      <Button
        onClick={() => window.open('https://phantom.app/', '_blank')}
        className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 glow-purple"
      >
        <ExternalLink className="w-4 h-4 mr-2" />
        Install Phantom
      </Button>
    );
  }

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-3">
        <div className="bg-card border border-border rounded-lg px-4 py-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="font-mono text-sm text-foreground">
            {truncateAddress(publicKey)}
          </span>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={disconnect}
          className="border-border hover:bg-destructive/20 hover:border-destructive"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={connect}
      disabled={connecting}
      className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 glow-purple"
    >
      {connecting ? (
        <>
          <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
          Connecting...
        </>
      ) : (
        <>
          <Wallet className="w-4 h-4 mr-2" />
          Connect Phantom
        </>
      )}
    </Button>
  );
}
