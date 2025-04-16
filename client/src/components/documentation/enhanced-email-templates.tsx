import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

const EnhancedEmailTemplates = () => {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Enhanced Email Templates</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Create beautiful, responsive newsletters with our enhanced email components
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          These components are specifically designed for email compatibility and will
          render properly across different email clients, including Outlook, Gmail, and mobile devices.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="layouts">Layouts</TabsTrigger>
          <TabsTrigger value="examples">Examples</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Email Components</CardTitle>
              <CardDescription>
                Our enhanced email components provide a suite of tools for creating
                professional, responsive newsletters that render well across all email clients.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-semibold">Key Features</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Responsive design that adapts to mobile devices</li>
                <li>Dark mode support for better reading experience</li>
                <li>Two-column layouts with proper stacking behavior on mobile</li>
                <li>Card-style content blocks for visual hierarchy</li>
                <li>Quote boxes for highlighting testimonials</li>
                <li>Visual dividers for content separation</li>
                <li>Enhanced list styling for better readability</li>
                <li>Outlook and Gmail compatibility</li>
              </ul>
              
              <h3 className="text-lg font-semibold mt-6">How to Use</h3>
              <p>
                When creating a newsletter template, you can use HTML tags with specific
                CSS classes to apply these enhanced components. The system will 
                automatically process your template to ensure email client compatibility.
              </p>
              
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                <p className="text-sm font-mono">
                  {'<div class="content-card">Your card content here</div>'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="components" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Cards</CardTitle>
              <CardDescription>
                Use content cards to create visually distinct sections in your newsletter
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                <p className="text-sm font-mono">
                  {'<div class="content-card" style="background-color: #ffffff; border-radius: 8px; padding: 25px; margin: 25px 0;">'}<br/>
                  {'  <h2>Featured Content</h2>'}<br/>
                  {'  <p>Your content here...</p>'}<br/>
                  {'</div>'}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Quote Boxes</CardTitle>
              <CardDescription>
                Highlight testimonials or important quotes with styled quote boxes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                <p className="text-sm font-mono">
                  {'<div class="quote-box" style="padding: 15px; font-style: italic; border-left: 4px solid #6054d6; background-color: #f8f8f8; margin: 20px 0;">'}<br/>
                  {'  <p>"This is a styled quote for your newsletter."</p>'}<br/>
                  {'  <p style="margin: 8px 0 0; font-size: 14px; font-style: normal; text-align: right;">— Author</p>'}<br/>
                  {'</div>'}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Dividers</CardTitle>
              <CardDescription>
                Use visual dividers to separate content sections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                <p className="text-sm font-mono">
                  {'<div class="divider" style="border-top: 1px solid #eaeaea; margin: 25px 0;"></div>'}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Styled Lists</CardTitle>
              <CardDescription>
                Create better-looking, more readable lists
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                <p className="text-sm font-mono">
                  {'<ul style="text-align: left; display: inline-block; margin: 15px auto; padding-left: 20px;">'}<br/>
                  {'  <li style="margin-bottom: 12px; line-height: 1.6; text-align: left;">'}<br/>
                  {'    <strong>Item Title:</strong> Item description text'}<br/>
                  {'  </li>'}<br/>
                  {'  <!-- More list items -->'}<br/>
                  {'</ul>'}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
              <CardDescription>
                Add call-to-action buttons that work across email clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                <p className="text-sm font-mono">
                  {'<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" class="button-table" style="margin: 20px auto;">'}<br/>
                  {'  <tr>'}<br/>
                  {'    <td align="center" style="background-color: #6054d6; border-radius: 4px; padding: 12px 24px;">'}<br/>
                  {'      <a href="#" target="_blank" style="color: #ffffff; text-decoration: none; display: inline-block; font-family: \'Helvetica Neue\', Arial, sans-serif; font-size: 16px; font-weight: 600; line-height: 1.2;">'}<br/>
                  {'        Button Text'}<br/>
                  {'      </a>'}<br/>
                  {'    </td>'}<br/>
                  {'  </tr>'}<br/>
                  {'</table>'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="layouts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Two-Column Layout</CardTitle>
              <CardDescription>
                Create responsive two-column layouts that stack on mobile devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                <p className="text-sm font-mono">
                  {'<!--[if mso]>'}<br/>
                  {'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'}<br/>
                  {'<tr><td width="50%" valign="top"><![endif]-->'}<br/>
                  {'<div class="stack-column" style="display: inline-block; width: 49%; vertical-align: top; padding-right: 1%;">'}<br/>
                  {'  <!-- Left column content -->'}<br/>
                  {'</div>'}<br/>
                  {'<!--[if mso]></td><td width="50%" valign="top"><![endif]-->'}<br/>
                  {'<div class="stack-column" style="display: inline-block; width: 49%; vertical-align: top; padding-left: 1%;">'}<br/>
                  {'  <!-- Right column content -->'}<br/>
                  {'</div>'}<br/>
                  {'<!--[if mso]></td></tr></table><![endif]-->'}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Featured Section Layout</CardTitle>
              <CardDescription>
                Create visually engaging featured content sections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                <p className="text-sm font-mono">
                  {'<div class="content-card" style="text-align: left; padding: 25px; border-radius: 8px; background-color: #ffffff; margin: 25px 0;">'}<br/>
                  {'  <h2 style="margin-top: 0; text-align: center;">Featured Article</h2>'}<br/>
                  {'  <p style="line-height: 1.6; text-align: left;">Main content here...</p>'}<br/>
                  {'  <!-- Quote box can go here -->'}<br/>
                  {'  <!-- Button can go here -->'}<br/>
                  {'</div>'}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Call-to-Action Section</CardTitle>
              <CardDescription>
                Create eye-catching call-to-action sections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                <p className="text-sm font-mono">
                  {'<div style="padding: 30px; text-align: center; background-color: #6054d6; border-radius: 8px; margin: 25px 0;">'}<br/>
                  {'  <h2 style="margin-top: 0; color: #ffffff; font-size: 22px; font-weight: 600; text-align: center;">Call to Action Title</h2>'}<br/>
                  {'  <p style="line-height: 1.6; text-align: center; color: #ffffff; margin-bottom: 20px;">Description text here...</p>'}<br/>
                  {'  <!-- Button with white background, colored text -->'}<br/>
                  {'  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" class="button-table" style="margin: 0 auto;">'}<br/>
                  {'    <tr>'}<br/>
                  {'      <td align="center" style="background-color: #ffffff; border-radius: 4px; padding: 12px 24px;">'}<br/>
                  {'        <a href="#" target="_blank" style="color: #6054d6; text-decoration: none; display: inline-block; font-size: 16px; font-weight: 600; line-height: 1.2;">Button Text</a>'}<br/>
                  {'      </td>'}<br/>
                  {'    </tr>'}<br/>
                  {'  </table>'}<br/>
                  {'</div>'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="examples" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Complete Newsletter Example</CardTitle>
              <CardDescription>
                See a full example of a newsletter using the enhanced components
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                The below example includes all the key components working together to create a complete,
                professional newsletter. You can use this as a starting template.
              </p>
              
              <p className="mb-2">
                View the full example in the sample file:
              </p>
              
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                <p className="text-sm font-mono mb-1">
                  /enhanced-email-sample.html
                </p>
                <p className="text-sm">
                  This file contains a complete example newsletter that showcases all the enhanced components.
                </p>
              </div>
              
              <div className="mt-6 flex justify-center">
                <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-md inline-flex items-center">
                  <CheckCircle2 className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-300" />
                  <span>Components are fully tested and compatible with major email clients</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Using the Component Library</CardTitle>
              <CardDescription>
                How to use the enhanced email components in your code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                For developers looking to integrate these components programmatically, we 
                provide a component library that can be imported and used in your code:
              </p>
              
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                <p className="text-sm font-mono">
                  {`// Import the components`}<br/>
                  {`import emailComponents from '../lib/enhanced-email-integration';`}<br/><br/>
                  {`// Use the components`}<br/>
                  {`const twoColumnLayout = emailComponents.createTwoColumnLayout(`}<br/>
                  {`  '<h2>Left Column</h2><p>Left column content...</p>',`}<br/>
                  {`  '<h2>Right Column</h2><p>Right column content...</p>'`}<br/>
                  {`);`}<br/><br/>
                  {`const quoteBox = emailComponents.createQuoteBox(`}<br/>
                  {`  'This is an important quote to highlight.',`}<br/>
                  {`  'John Doe, CEO'`}<br/>
                  {`);`}<br/><br/>
                  {`// Enhance an existing template`}<br/>
                  {`const enhancedTemplate = emailComponents.enhanceNewsletterLayout(content, {`}<br/>
                  {`  logoUrl: 'https://example.com/logo.png',`}<br/>
                  {`  title: 'My Newsletter',`}<br/>
                  {`  splitIntoColumns: true`}<br/>
                  {`});`}
                </p>
              </div>
              
              <p>
                For more details about the available functions and options, refer to the API documentation 
                or the source code in <code className="text-sm">server/lib/email-components.js</code> and 
                <code className="text-sm">server/lib/enhanced-email-integration.ts</code>.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedEmailTemplates;
