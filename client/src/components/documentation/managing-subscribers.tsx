import { ScrollArea } from "../ui/scroll-area"
import { Card } from "../ui/card"

export function ManagingSubscribers() {
  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Managing Subscribers</h2>

        <section className="space-y-4">
          <p className="text-muted-foreground">
            Learn how to effectively manage your subscriber base, create targeted segments,
            and optimize engagement with our comprehensive subscriber management tools.
          </p>

          <Card className="p-4 space-y-3">
            <h4 className="font-semibold">1. Building Your Subscriber List</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Import existing subscribers via CSV upload</li>
              <li>Create subscription forms for your website</li>
              <li>Set up automated welcome emails</li>
              <li>Monitor list growth and health metrics</li>
            </ul>
          </Card>

          <Card className="p-4 space-y-3">
            <h4 className="font-semibold">2. Subscriber Segmentation</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Create segments based on interests and preferences</li>
              <li>Group subscribers by engagement level</li>
              <li>Segment by geographic location</li>
              <li>Use custom tags for detailed organization</li>
              <li>Create dynamic segments that update automatically</li>
            </ul>
          </Card>

          <Card className="p-4 space-y-3">
            <h4 className="font-semibold">3. Engagement Tracking</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Monitor open rates and click-through rates</li>
              <li>Track content performance by segment</li>
              <li>Analyze reading patterns and preferences</li>
              <li>Identify most engaged subscribers</li>
              <li>Generate detailed engagement reports</li>
            </ul>
          </Card>

          <Card className="p-4 space-y-3">
            <h4 className="font-semibold">4. List Maintenance</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Automatically handle bounced emails</li>
              <li>Process unsubscribe requests</li>
              <li>Clean inactive subscribers</li>
              <li>Update subscriber information</li>
              <li>Maintain GDPR compliance</li>
            </ul>
          </Card>

          <Card className="p-4 space-y-3">
            <h4 className="font-semibold">5. Re-engagement Campaigns</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Identify inactive subscribers</li>
              <li>Create targeted re-engagement content</li>
              <li>Set up automated re-engagement sequences</li>
              <li>Track re-engagement success rates</li>
            </ul>
          </Card>

          <Card className="p-4 space-y-3">
            <h4 className="font-semibold">Best Practices for List Health</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Regularly clean your subscriber list</li>
              <li>Use double opt-in for new subscribers</li>
              <li>Segment subscribers based on engagement</li>
              <li>Monitor and improve deliverability rates</li>
              <li>Maintain consistent sending schedules</li>
            </ul>
          </Card>

          <Card className="p-4 bg-muted/50">
            <h4 className="font-semibold mb-2">Privacy and Compliance</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Ensure GDPR and privacy law compliance</li>
              <li>Maintain clear unsubscribe options</li>
              <li>Keep subscriber data secure</li>
              <li>Document subscriber consent</li>
              <li>Regular privacy policy updates</li>
            </ul>
          </Card>
        </section>
      </div>
    </ScrollArea>
  )
}