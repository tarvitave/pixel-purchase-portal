import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const Terms = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header pixelCount={0} />
      
      <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-3xl mx-auto prose prose-invert">
          <h1 className="text-4xl font-bold text-foreground mb-2">Terms of Use</h1>
          <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="space-y-8 text-muted-foreground">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing and using x402homepage.com, you agree to be bound by these Terms of Use. 
                If you do not agree to these terms, please do not use our platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Description of Service</h2>
              <p>
                x402homepage.com is a collaborative pixel canvas platform that allows users to purchase, 
                own, and customize pixels using Solana cryptocurrency. Users can set colors and optionally 
                link URLs to their owned pixels.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Wallet Connection</h2>
              <p>
                To purchase pixels, you must connect a compatible Solana wallet (currently Phantom). 
                You are responsible for maintaining the security of your wallet and private keys. 
                We are not responsible for any loss of funds due to compromised wallets.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Pixel Purchases</h2>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>All pixel purchases are final and non-refundable.</li>
                <li>Prices are displayed in SOL (Solana) cryptocurrency.</li>
                <li>Owned pixels can be outbid by other users at a higher price.</li>
                <li>When outbidding pixels that are part of a batch, you must purchase the entire batch.</li>
                <li>Transaction fees (gas) are the responsibility of the buyer.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Content Guidelines</h2>
              <p>When adding links to your pixels, you agree not to link to content that:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>Is illegal, harmful, or violates any applicable laws.</li>
                <li>Contains malware, phishing attempts, or other malicious content.</li>
                <li>Infringes on intellectual property rights of others.</li>
                <li>Contains explicit adult content, hate speech, or harassment.</li>
                <li>Promotes scams, fraud, or deceptive practices.</li>
              </ul>
              <p className="mt-4">
                We reserve the right to remove or modify any content that violates these guidelines.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Intellectual Property</h2>
              <p>
                The x402homepage.com platform, including its design, code, and branding, is our intellectual property. 
                Users retain rights to the content they create within the pixel canvas, subject to these terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Disclaimer of Warranties</h2>
              <p>
                The platform is provided "as is" without warranties of any kind. We do not guarantee 
                uninterrupted access, error-free operation, or that the platform will meet your specific requirements.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Limitation of Liability</h2>
              <p>
                We are not liable for any indirect, incidental, special, or consequential damages arising 
                from your use of the platform, including but not limited to loss of cryptocurrency, 
                failed transactions, or unauthorized access to your wallet.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Blockchain Transactions</h2>
              <p>
                All transactions are processed on the Solana blockchain and are irreversible once confirmed. 
                We cannot reverse, cancel, or modify blockchain transactions. Ensure you verify all 
                transaction details before confirming.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Modifications to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. Continued use of the platform 
                after changes constitutes acceptance of the modified terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">11. Governing Law</h2>
              <p>
                These terms are governed by applicable laws. Any disputes shall be resolved through 
                appropriate legal channels.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">12. Contact</h2>
              <p>
                For questions about these Terms of Use, please contact us through our platform.
              </p>
            </section>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Terms;
