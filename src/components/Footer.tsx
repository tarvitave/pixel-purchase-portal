import { NavLink } from './NavLink';

export function Footer() {
  return (
    <footer className="bg-muted/95 backdrop-blur-md border-t border-border py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-primary via-secondary to-accent rounded flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">×</span>
            </div>
            <span className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} x402homepage.com
            </span>
          </div>
          
          <nav className="flex items-center gap-6">
            <NavLink 
              to="/faq" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              FAQ
            </NavLink>
            <NavLink 
              to="/privacy" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </NavLink>
            <NavLink 
              to="/terms" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms
            </NavLink>
          </nav>
        </div>
      </div>
    </footer>
  );
}
