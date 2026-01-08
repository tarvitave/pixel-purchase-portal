import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header pixelCount={0} />
      
      <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-3xl mx-auto prose prose-invert">
          <h1 className="text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="space-y-8 text-muted-foreground">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
              <p>
                Welcome to x402homepage.com. We respect your privacy and are committed to protecting your personal data. 
                This privacy policy explains how we collect, use, and safeguard your information when you use our pixel canvas platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Information We Collect</h2>
              <p>We collect the following types of information:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li><strong>Wallet Address:</strong> Your Solana wallet address when you connect to make purchases.</li>
                <li><strong>Transaction Data:</strong> Records of pixel purchases, including coordinates, colors, and transaction signatures.</li>
                <li><strong>Usage Data:</strong> Information about how you interact with our platform, including pages visited and actions taken.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>Process and verify pixel purchases on the Solana blockchain.</li>
                <li>Display pixel ownership and associated links on the canvas.</li>
                <li>Maintain the integrity and security of our platform.</li>
                <li>Improve our services and user experience.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Blockchain Data</h2>
              <p>
                Please note that transactions on the Solana blockchain are public and permanent. Your wallet address and 
                transaction history are visible on the public ledger. We have no control over blockchain data once 
                transactions are confirmed.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Data Security</h2>
              <p>
                We implement appropriate security measures to protect your information. However, no method of 
                transmission over the Internet is 100% secure. We cannot guarantee absolute security of your data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Third-Party Services</h2>
              <p>
                Our platform integrates with third-party services including Phantom Wallet and the Solana blockchain. 
                These services have their own privacy policies, and we encourage you to review them.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Cookies</h2>
              <p>
                We may use cookies and similar technologies to enhance your experience. You can control cookie 
                preferences through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Changes to This Policy</h2>
              <p>
                We may update this privacy policy from time to time. We will notify you of any changes by posting 
                the new policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Contact Us</h2>
              <p>
                If you have any questions about this privacy policy, please contact us through our platform.
              </p>
            </section>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
