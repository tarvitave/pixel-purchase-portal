import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const FAQ = () => {
  const faqs = [
    {
      question: "What is x402homepage.com?",
      answer: "x402homepage.com is a collaborative pixel canvas where anyone can purchase and own pixels using Solana cryptocurrency. Each pixel can be customized with any color and optionally linked to a URL of your choice."
    },
    {
      question: "How does the x402 Protocol work?",
      answer: "The x402 Protocol enables micropayments on the web. When you purchase pixels, you're making a direct Solana transaction that's recorded on the blockchain, giving you verifiable ownership of your pixels."
    },
    {
      question: "How do I purchase pixels?",
      answer: "Connect your Phantom wallet using the 'Connect Wallet' button, select the pixels you want to purchase on the canvas, choose your color, and confirm the transaction. You can purchase individual pixels or select multiple pixels at once for bulk purchases."
    },
    {
      question: "What is the pricing for pixels?",
      answer: "The base price for unclaimed pixels starts at 0.000001 SOL per pixel. If you want to purchase pixels that are already owned by someone else, you must outbid by paying the previous price plus 0.000001 SOL per pixel."
    },
    {
      question: "What happens when I outbid someone?",
      answer: "When you outbid a pixel that's part of a batch purchase, you must buy all pixels from that original batch. The price will be the previous cost per pixel plus 0.000001 SOL, multiplied by the number of pixels in the batch."
    },
    {
      question: "Can I add a link to my pixels?",
      answer: "Yes! When purchasing pixels, you can optionally add a URL. When other users click on your pixels, they'll be directed to your linked website."
    },
    {
      question: "Which wallets are supported?",
      answer: "Currently, we support Phantom wallet for Solana transactions. Make sure you have Phantom installed as a browser extension and have some SOL in your wallet to make purchases."
    },
    {
      question: "Is my pixel purchase permanent?",
      answer: "Your pixel ownership is recorded on the Solana blockchain. However, other users can outbid your pixels by paying a higher price. If someone outbids your pixels, they become the new owner."
    },
    {
      question: "How many pixels are available?",
      answer: "The canvas contains 1 million pixels (1000 x 1000 grid). Each pixel is individually purchasable and customizable."
    },
    {
      question: "What if I have issues with my transaction?",
      answer: "All transactions are processed on the Solana blockchain. If you experience issues, ensure your wallet has sufficient SOL for the transaction plus gas fees. You can verify your transaction status on a Solana block explorer."
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header imageCount={0} pixelsCovered={0} />
      
      <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-2">Frequently Asked Questions</h1>
          <p className="text-muted-foreground mb-8">Everything you need to know about x402homepage.com</p>
          
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-foreground hover:text-primary">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default FAQ;
