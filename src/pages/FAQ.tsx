import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const FAQ = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-3xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Canvas
          </Button>
          <h1 className="text-4xl font-bold text-foreground mb-2">Frequently Asked Questions</h1>
          <p className="text-muted-foreground mb-8">Everything you need to know about x402homepage.com</p>
          
          <Accordion type="single" collapsible className="w-full text-base">
            {/* About */}
            <AccordionItem value="what-is">
              <AccordionTrigger className="text-left text-lg text-foreground hover:text-primary">
                What is x402homepage.com?
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground space-y-3">
                <p>
                  x402homepage.com is a collaborative image canvas where anyone can purchase and own space 
                  using Solana cryptocurrency. Upload images, add links, and claim your spot on a shared 
                  500×500 pixel canvas that lives on the blockchain.
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* x402 Protocol - Expanded */}
            <AccordionItem value="x402-protocol">
              <AccordionTrigger className="text-left text-lg text-foreground hover:text-primary">
                How does the HTTP x402 Protocol work?
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground space-y-3">
                <p>
                  The <strong className="text-foreground">HTTP 402 "Payment Required"</strong> status code was 
                  reserved in the original HTTP specification for future use with digital payments. x402homepage.com 
                  brings this vision to life using Solana blockchain micropayments.
                </p>
                <p>
                  When you place an image, you're making a direct Solana transaction that's cryptographically 
                  verified and permanently recorded on the blockchain. This gives you verifiable, immutable 
                  proof of ownership that no centralized authority can revoke.
                </p>
                <p>
                  <strong className="text-foreground">Learn more:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/402" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      MDN: HTTP 402 Payment Required
                    </a>
                  </li>
                  <li>
                    <a href="https://solana.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Solana Blockchain
                    </a>
                  </li>
                  <li>
                    <a href="https://docs.solana.com/introduction" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Solana Documentation
                    </a>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            {/* Canvas & Image Size */}
            <AccordionItem value="canvas-size">
              <AccordionTrigger className="text-left text-lg text-foreground hover:text-primary">
                What is the canvas size and image requirements?
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground space-y-3">
                <p>
                  The canvas is <strong className="text-foreground">500×500 pixels</strong> (250,000 total pixels). 
                  You can place images of any size that fits within the canvas bounds.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Minimum image size: 1×1 pixel</li>
                  <li>Maximum image size: 500×500 pixels (full canvas)</li>
                  <li>Supported formats: PNG, JPG, GIF, WebP</li>
                  <li>Images are automatically resized to fit your selected area</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            {/* How to Purchase */}
            <AccordionItem value="how-to-purchase">
              <AccordionTrigger className="text-left text-lg text-foreground hover:text-primary">
                How do I place an image on the canvas?
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground space-y-3">
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Connect your <a href="https://phantom.app/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Phantom wallet</a></li>
                  <li>Upload an image using the Image Placement panel</li>
                  <li>Optionally add a link URL (users clicking your image will visit this link)</li>
                  <li>Drag to position your image on the 500×500 canvas</li>
                  <li>Click "Place Image" and approve the SOL transaction</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            {/* Pricing */}
            <AccordionItem value="pricing">
              <AccordionTrigger className="text-left text-lg text-foreground hover:text-primary">
                What is the pricing for placing images?
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground space-y-3">
                <p>
                  <strong className="text-foreground">Base price:</strong> 0.000001 SOL per pixel (1,000 lamports)
                </p>
                <p>
                  For example, a 100×100 image (10,000 pixels) costs 0.01 SOL at base price.
                </p>
                <p>
                  <strong className="text-foreground">Outbidding:</strong> To replace someone else's image, 
                  you must pay the previous price per pixel + 0.000001 SOL, multiplied by your image size.
                </p>
                <p>
                  <strong className="text-foreground">Free updates:</strong> If you fully cover your own existing 
                  images, you can update them for free!
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* Outbidding */}
            <AccordionItem value="outbidding">
              <AccordionTrigger className="text-left text-lg text-foreground hover:text-primary">
                How does outbidding work?
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground space-y-3">
                <p>
                  To place an image over existing images, your new image must <strong className="text-foreground">fully cover</strong> all 
                  overlapping images. Partial overlaps are not allowed.
                </p>
                <p>
                  The outbid price is calculated as: (highest existing price per pixel + 0.000001 SOL) × your image's pixel count.
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* Content Policy */}
            <AccordionItem value="content-policy">
              <AccordionTrigger className="text-left text-lg text-foreground hover:text-primary">
                What content is prohibited?
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground space-y-3">
                <p>
                  All images are automatically screened using AI-powered content moderation <strong className="text-foreground">before payment</strong>. 
                  The following content is strictly prohibited:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Adult/sexual content and nudity</li>
                  <li>Violence, gore, and graphic imagery</li>
                  <li>Hate symbols and extremist content</li>
                  <li>Illegal content (drugs, weapons sales)</li>
                  <li>Harassment and disturbing content</li>
                </ul>
                <p className="mt-2">
                  <Link to="/content-policy" className="text-primary hover:underline">
                    View our full Content Policy →
                  </Link>
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* Wallets */}
            <AccordionItem value="wallets">
              <AccordionTrigger className="text-left text-lg text-foreground hover:text-primary">
                Which wallets are supported?
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground space-y-3">
                <p>
                  Currently, we support <a href="https://phantom.app/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Phantom wallet</a> for 
                  Solana transactions. Phantom is available as a browser extension and mobile app.
                </p>
                <p>
                  Make sure you have SOL in your wallet to cover the image placement cost plus network fees 
                  (typically ~0.000005 SOL per transaction).
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* Permanence */}
            <AccordionItem value="permanence">
              <AccordionTrigger className="text-left text-lg text-foreground hover:text-primary">
                Is my image placement permanent?
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground space-y-3">
                <p>
                  Your image ownership is recorded on the Solana blockchain and stored permanently. However, 
                  other users can outbid your space by paying a higher price—if they do, they become the new owner 
                  of that area.
                </p>
                <p>
                  Think of it like digital real estate: you own it until someone makes you a better offer!
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* Transaction Issues */}
            <AccordionItem value="transaction-issues">
              <AccordionTrigger className="text-left text-lg text-foreground hover:text-primary">
                What if I have issues with my transaction?
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground space-y-3">
                <p>
                  All transactions are processed on the Solana blockchain. If you experience issues:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Ensure your wallet has sufficient SOL for the transaction plus gas fees</li>
                  <li>Check your internet connection and try again</li>
                  <li>Verify your transaction on <a href="https://solscan.io/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Solscan</a> or <a href="https://explorer.solana.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Solana Explorer</a></li>
                </ul>
                <p className="mt-2">
                  <strong className="text-foreground">Note:</strong> Content moderation happens before payment, 
                  so you'll never be charged for rejected images.
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* Links */}
            <AccordionItem value="links">
              <AccordionTrigger className="text-left text-lg text-foreground hover:text-primary">
                Can I add a link to my image?
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground space-y-3">
                <p>
                  Yes! When placing an image, you can optionally add a URL. When other users click on your 
                  image, they'll be directed to your linked website.
                </p>
                <p>
                  You can also update your link at any time by replacing your image (free if you own the space).
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default FAQ;
