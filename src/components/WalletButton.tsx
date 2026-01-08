import { Button } from '@/components/ui/button';
import { usePhantom } from '@/hooks/usePhantom';
import { Wallet, LogOut, ExternalLink, RefreshCw, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function WalletButton() {
  const { connected, publicKey, connecting, connect, disconnect, isPhantomInstalled } = usePhantom();

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const handleSwitchWallet = async () => {
    await disconnect();
    // Small delay to ensure disconnect completes
    setTimeout(() => {
      connect();
    }, 100);
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="border-border">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse mr-2" />
            <span className="font-mono text-sm">
              {truncateAddress(publicKey)}
            </span>
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleSwitchWallet}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Switch Wallet
          </DropdownMenuItem>
          <DropdownMenuItem onClick={disconnect} className="text-destructive">
            <LogOut className="w-4 h-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
