import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Ban, ShieldX, Skull, Scale, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ContentPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-12 pt-24 max-w-4xl">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Canvas
          </Button>
          <h1 className="text-4xl font-bold text-foreground mb-4">Content Policy</h1>
          <p className="text-muted-foreground text-lg">
            To maintain a safe and welcoming environment for all users, we have established clear guidelines 
            about what content is prohibited on x402homepage.com. All uploaded images are automatically 
            checked against these policies.
          </p>
        </div>

        <div className="space-y-6">
          {/* Adult/Sexual Content */}
          <Card className="border-destructive/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-destructive">
                <Ban className="w-6 h-6" />
                Adult & Sexual Content
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p className="mb-3">The following is strictly prohibited:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Nudity or partial nudity</li>
                <li>Pornography or sexually explicit material</li>
                <li>Sexually suggestive content or imagery</li>
                <li>Sexual services or solicitation</li>
              </ul>
            </CardContent>
          </Card>

          {/* Violence */}
          <Card className="border-destructive/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-destructive">
                <Skull className="w-6 h-6" />
                Violence & Gore
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p className="mb-3">The following is strictly prohibited:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Graphic violence or gore</li>
                <li>Images depicting injuries, blood, or mutilation</li>
                <li>Weapons being used violently against people or animals</li>
                <li>Depictions of torture or abuse</li>
                <li>Content glorifying or promoting violence</li>
              </ul>
            </CardContent>
          </Card>

          {/* Hate Symbols */}
          <Card className="border-destructive/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-destructive">
                <ShieldX className="w-6 h-6" />
                Hate Symbols & Extremism
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p className="mb-3">The following is strictly prohibited:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Nazi symbols, imagery, or propaganda</li>
                <li>KKK or white supremacist imagery</li>
                <li>Terrorist organization symbols or support</li>
                <li>Extremist or hate group content</li>
                <li>Content promoting discrimination based on race, ethnicity, religion, gender, or sexual orientation</li>
              </ul>
            </CardContent>
          </Card>

          {/* Illegal Content */}
          <Card className="border-destructive/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-destructive">
                <Scale className="w-6 h-6" />
                Illegal Content
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p className="mb-3">The following is strictly prohibited:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Drug use, sales, or promotion of illegal substances</li>
                <li>Weapons for sale or illegal weapon modifications</li>
                <li>Stolen goods or services</li>
                <li>Fraud, scams, or deceptive practices</li>
                <li>Any content that violates local, state, or federal laws</li>
              </ul>
            </CardContent>
          </Card>

          {/* Other Prohibited Content */}
          <Card className="border-destructive/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-destructive">
                <AlertTriangle className="w-6 h-6" />
                Other Prohibited Content
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p className="mb-3">Additionally, the following is not allowed:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Graphic or disturbing imagery designed to shock</li>
                <li>Content depicting harm to minors</li>
                <li>Harassment or bullying of individuals</li>
                <li>Personal information of others without consent (doxxing)</li>
                <li>Spam or misleading content</li>
                <li>Copyright-infringing material</li>
              </ul>
            </CardContent>
          </Card>

          {/* Enforcement */}
          <Card className="border-border bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-foreground">Enforcement</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-3">
              <p>
                All images uploaded to x402homepage.com are automatically screened using AI-powered 
                content moderation. Images that violate our content policy will be rejected and cannot 
                be placed on the canvas.
              </p>
              <p>
                <strong className="text-foreground">Important:</strong> Content moderation occurs 
                <em> before</em> any payment is processed. If your image is rejected, you will not 
                be charged.
              </p>
              <p>
                We reserve the right to remove any content that violates these policies, even if it 
                was initially approved. Repeated violations may result in wallet restrictions.
              </p>
            </CardContent>
          </Card>

          {/* Contact */}
          <div className="text-center text-muted-foreground pt-4">
            <p>
              If you believe your image was incorrectly rejected, please contact us at{' '}
              <a 
                href="mailto:support@x402homepage.com" 
                className="text-primary hover:underline"
              >
                support@x402homepage.com
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
