import { ScrollArea } from "../ui/scroll-area"
import { Card } from "../ui/card"

export function GettingStarted() {
  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Getting Started Guide</h2>

        <section className="space-y-4">
          <h3 className="text-xl font-semibold">Welcome to the Newsletter Platform</h3>
          <p className="text-muted-foreground">
            Our AI-powered platform makes it easy to create, manage, and send engaging newsletters.
            This guide will help you get started with all the essential features.
          </p>

          <Card className="p-4 space-y-3">
            <h4 className="font-semibold">1. Setting Up Your Account</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Click the "Settings" icon in the dashboard to customize your preferences</li>
              <li>Choose your preferred language from the available options</li>
              <li>Set up your billing preferences and review available credit packages</li>
              <li>Configure your company branding (logo, colors, fonts)</li>
            </ul>
          </Card>

          <Card className="p-4 space-y-3">
            <h4 className="font-semibold">2. Creating Your First Newsletter</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Click "Create New" on the dashboard to start a newsletter</li>
              <li>Select topics of interest using the topic selector</li>
              <li>Click "Generate Content" to create AI-curated articles</li>
              <li>Customize the content, layout, and styling using our intuitive editor</li>
              <li>Preview your newsletter before sending</li>
            </ul>
          </Card>

          <Card className="p-4 space-y-3">
            <h4 className="font-semibold">3. Content Customization</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the drag-and-drop interface to organize sections</li>
              <li>Upload a header image or use our image library</li>
              <li>Adjust fonts, colors, and backgrounds to match your brand</li>
              <li>Edit the AI-generated content to add your personal touch</li>
              <li>Save custom templates for future use</li>
            </ul>
          </Card>

          <Card className="p-4 space-y-3">
            <h4 className="font-semibold">4. Managing Your Newsletters</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Schedule newsletters for future delivery</li>
              <li>Track engagement metrics in real-time</li>
              <li>Monitor AI credit usage and billing</li>
              <li>Access past newsletters and templates</li>
            </ul>
          </Card>

          <div className="mt-6">
            <h4 className="font-semibold mb-2">Pro Tips for Success</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Keep your content focused on specific topics for better AI generation</li>
              <li>Use the executive summary feature to highlight key points</li>
              <li>Regularly review analytics to optimize your content strategy</li>
              <li>Save frequently used templates to streamline your workflow</li>
            </ul>
          </div>

          <Card className="p-4 bg-muted/50 mt-6">
            <h4 className="font-semibold mb-2">Need Help?</h4>
            <p>
              Our support team is here to help you succeed. You can:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Check our detailed documentation sections</li>
              <li>Contact support through the Settings page</li>
              <li>Join our community forums for tips and best practices</li>
              <li>Schedule a demo with our team for personalized guidance</li>
            </ul>
          </Card>
        </section>
      </div>
    </ScrollArea>
  )
}