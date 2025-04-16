const fs = require('fs');

// Read the original file
const originalContent = fs.readFileSync('content.tsx', 'utf8');

// New dialog content
const dialogContent = `        <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Newsletter</DialogTitle>
              <DialogDescription>
                Choose your sending options
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Step 1: Choose between test or real sending */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">Sending Mode</div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="test-mode"
                      checked={testMode}
                      onCheckedChange={setTestMode}
                    />
                    <Label htmlFor="test-mode" className="text-sm">
                      {testMode ? "Test Mode" : "Production Mode"}
                    </Label>
                  </div>
                </div>

                {testMode ? (
                  <div className="space-y-2">
                    <Label htmlFor="test-email">Test Email Address</Label>
                    <Input
                      id="test-email"
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="Enter test email address"
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      The newsletter will only be sent to this email address for testing
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="subscriber-group">Recipient Selection</Label>
                    <Select
                      onValueChange={(value) => setSelectedGroupId(value)}
                      value={selectedGroupId || "all"}
                      id="subscriber-group"
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select recipients" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subscribers</SelectItem>
                        {groups?.map((group) => (
                          <SelectItem key={group.id} value={group.id.toString()}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {selectedGroupId && selectedGroupId !== "all"
                        ? "Only subscribers in the selected group will receive this newsletter"
                        : "All active subscribers will receive this newsletter"}
                    </p>
                  </div>
                )}
              </div>

              {/* Step 2: Choose when to send */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="font-medium mb-2">Schedule</div>
                <div className="space-y-2">
                  <Select
                    onValueChange={(value) =>
                      setScheduleType(value as "now" | "later")
                    }
                    defaultValue={scheduleType}
                    value={scheduleType}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select when to send" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="now">Send Immediately</SelectItem>
                      <SelectItem value="later">Schedule for Later</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {scheduleType === "later" && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="schedule-date">Schedule Date & Time</Label>
                      <Input
                        id="schedule-date"
                        type="datetime-local"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSendDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendNewsletter}
                disabled={
                  sending ||
                  (testMode && !testEmail) ||
                  (scheduleType === "later" && !scheduleDate)
                }
                className="gap-2"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {scheduleType === "later" ? "Scheduling..." : "Sending..."}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {testMode 
                      ? "Send Test" 
                      : scheduleType === "later"
                        ? "Schedule Newsletter"
                        : "Send Newsletter"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>`;

// Find the dialog section and replace it
const pattern = /<Dialog open=\{sendDialogOpen\} onOpenChange=\{setSendDialogOpen\}>[\s\S]*?<\/Dialog>/;
const newContent = originalContent.replace(pattern, dialogContent);

// Write the new content back to the file
fs.writeFileSync('content.tsx', newContent);

console.log("Dialog content replaced successfully");
