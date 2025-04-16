import { ScrollArea } from "../ui/scroll-area"
import { Card } from "../ui/card"

export function APIDocumentation() {
  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">API Documentation</h2>

        <section className="space-y-4">
          <p className="text-muted-foreground">
            Integrate our newsletter platform with your applications using our RESTful API.
            This guide covers everything you need to know about API authentication, endpoints,
            and best practices.
          </p>

          <Card className="p-4 space-y-3">
            <h4 className="font-semibold">1. Getting Started with the API</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Generate your API key in the Settings page</li>
              <li>Use HTTPS for all API requests</li>
              <li>Include your API key in the Authorization header</li>
              <li>Test endpoints in the API playground</li>
            </ul>
          </Card>

          <Card className="p-4 space-y-3">
            <h4 className="font-semibold">2. Common API Endpoints</h4>
            <div className="space-y-4">
              <div>
                <p className="font-medium">Newsletter Management:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>GET /api/newsletters - List all newsletters</li>
                  <li>POST /api/newsletters - Create new newsletter</li>
                  <li>GET /api/newsletters/:id - Get newsletter details</li>
                  <li>PATCH /api/newsletters/:id - Update newsletter</li>
                  <li>POST /api/newsletters/:id/send - Send newsletter</li>
                </ul>
              </div>

              <div>
                <p className="font-medium">Subscriber Management:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>GET /api/subscribers - List subscribers</li>
                  <li>POST /api/subscribers - Add subscriber</li>
                  <li>PUT /api/subscribers/:id - Update subscriber</li>
                  <li>DELETE /api/subscribers/:id - Remove subscriber</li>
                  <li>GET /api/subscribers/segments - List segments</li>
                </ul>
              </div>

              <div>
                <p className="font-medium">Content Generation:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>POST /api/content/generate - Generate AI content</li>
                  <li>GET /api/content/topics - List available topics</li>
                  <li>POST /api/content/curate - Curate content from URL</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <h4 className="font-semibold">3. Using Webhooks</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Set up webhook endpoints in your Settings</li>
              <li>Receive real-time event notifications</li>
              <li>Monitor delivery and engagement events</li>
              <li>Implement webhook authentication</li>
              <li>Handle webhook retries and failures</li>
            </ul>
          </Card>

          <Card className="p-4 space-y-3">
            <h4 className="font-semibold">4. API Best Practices</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Implement proper error handling</li>
              <li>Use pagination for large data sets</li>
              <li>Cache API responses when appropriate</li>
              <li>Follow rate limiting guidelines</li>
              <li>Keep your API key secure</li>
            </ul>
          </Card>

          <div className="mt-6">
            <h4 className="font-semibold mb-2">Code Examples</h4>
            <Card className="p-4 bg-muted/50 space-y-4">
              <p className="font-medium">Creating a New Subscriber:</p>
              <pre className="text-sm overflow-x-auto bg-muted p-3 rounded-md">
{`curl -X POST https://api.newsletter-platform.com/v1/subscribers \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "preferences": ["technology", "business"]
  }'`}
              </pre>

              <p className="font-medium mt-4">Generating Newsletter Content:</p>
              <pre className="text-sm overflow-x-auto bg-muted p-3 rounded-md">
{`curl -X POST https://api.newsletter-platform.com/v1/content/generate \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "topics": ["technology", "ai"],
    "tone": "professional",
    "length": "medium"
  }'`}
              </pre>
            </Card>
          </div>

          <Card className="p-4 bg-muted/50 mt-6">
            <h4 className="font-semibold mb-2">Rate Limits and Quotas</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>1000 requests per minute per API key</li>
              <li>Larger quotas available for enterprise plans</li>
              <li>Implement exponential backoff for retries</li>
              <li>Monitor usage in your dashboard</li>
              <li>Contact support for custom limits</li>
            </ul>
          </Card>
        </section>
      </div>
    </ScrollArea>
  )
}