import { ScrollArea } from "../ui/scroll-area"
import { Card } from "../ui/card"

export function CreatingNewsletters() {
  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Creating Newsletters</h2>

        <section className="space-y-4">
          <p className="text-muted-foreground">
            Learn how to create engaging newsletters using our AI-powered platform.
            Follow this step-by-step guide to craft professional newsletters that resonate with your audience.
          </p>

          <Card className="p-4 space-y-3">
            <h4 className="font-semibold">1. Starting Your Newsletter</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Navigate to the dashboard and click "Create New"</li>
              <li>Select topics of interest (Technology, Business, Science, etc.)</li>
              <li>Choose between starting from scratch or using a template</li>
              <li>Give your newsletter a compelling title and description</li>
            </ul>
          </Card>

          <Card className="p-4 space-y-3">
            <h4 className="font-semibold">2. Generating Content with AI</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Click the "Generate Content" button to start AI curation</li>
              <li>Review the generated executive summary and articles</li>
              <li>Edit or regenerate content as needed</li>
              <li>Add your personal insights and commentary</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              Pro Tip: Select multiple related topics to get more comprehensive content
            </p>
          </Card>

          <Card className="p-4 space-y-3">
            <h4 className="font-semibold">3. Visual Customization</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Upload or drag-and-drop your header image</li>
              <li>Choose from our selection of professional fonts</li>
              <li>Customize colors for text and background</li>
              <li>Adjust section layouts using the visual editor</li>
              <li>Preview how your newsletter looks on different devices</li>
            </ul>
          </Card>

          <Card className="p-4 space-y-3">
            <h4 className="font-semibold">4. Content Organization</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Arrange stories by dragging sections</li>
              <li>Add or remove sections as needed</li>
              <li>Include "Read More" links for detailed articles</li>
              <li>Organize content by categories or themes</li>
            </ul>
          </Card>

          <Card className="p-4 space-y-3">
            <h4 className="font-semibold">5. Preview and Testing</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the live preview feature to see your changes in real-time</li>
              <li>Send a test email to yourself</li>
              <li>Check how images and layouts appear in different email clients</li>
              <li>Review mobile responsiveness</li>
            </ul>
          </Card>

          <div className="mt-6">
            <h4 className="font-semibold mb-2">Best Practices</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Keep your design consistent with your brand identity</li>
              <li>Use the executive summary to highlight key points</li>
              <li>Include a mix of AI-generated and custom content</li>
              <li>Save successful newsletters as templates</li>
              <li>Monitor engagement metrics to improve future content</li>
            </ul>
          </div>

          <Card className="p-4 bg-muted/50 mt-6">
            <h4 className="font-semibold mb-2">Quick Tips for Better Newsletters</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Keep your content focused and relevant to your audience</li>
              <li>Use clear section headings and organized layouts</li>
              <li>Balance text and visual elements</li>
              <li>Test different sending times for optimal engagement</li>
              <li>Regularly update your templates based on performance data</li>
            </ul>
          </Card>
        </section>
      </div>
    </ScrollArea>
  )
}