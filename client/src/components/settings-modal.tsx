import { Dialog, DialogContent } from "./ui/dialog"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Switch } from "./ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { useTheme } from "./theme-provider"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Mail, Key, Palette, ChevronRight, Eye, EyeOff } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import useSWR from "swr"
import { Alert, AlertDescription } from "./ui/alert"

interface VerifiedEmail {
  email: string
  verificationStatus: 'pending' | 'verified' | 'failed'
  isDomain: boolean
  verifiedAt?: string
}

interface ApiKeys {
  openai_key?: string
  news_api_key?: string
  custom_gpt_url?: string
  custom_gpt_key?: string
  use_custom_openai: boolean
  use_custom_news_api: boolean
  use_custom_gpt: boolean
}

const SettingSection = motion.div

export function SettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const [activeSection, setActiveSection] = useState<'email' | 'api' | 'appearance'>('email')
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingApiKeys, setIsSavingApiKeys] = useState(false)
  const [verifyingEmail, setVerifyingEmail] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [isTesting, setIsTesting] = useState(false)

  const [showOpenAIKey, setShowOpenAIKey] = useState(false)
  const [showNewsAPIKey, setShowNewsAPIKey] = useState(false)
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    openai_key: "",
    news_api_key: "",
    custom_gpt_url: "",
    custom_gpt_key: "",
    use_custom_openai: false,
    use_custom_news_api: false,
    use_custom_gpt: false,
  })

  const { data: verifiedEmails, mutate: mutateEmails } = useSWR<{ success: boolean; data: VerifiedEmail[] }>("/api/verified-emails")
  const { data: apiKeysData, mutate: mutateApiKeys } = useSWR<{ success: boolean; data: ApiKeys | null }>("/api/api-keys")

  useEffect(() => {
    if (apiKeysData?.data) {
      setApiKeys(apiKeysData.data)
    }
  }, [apiKeysData?.data])

  const handleVerifyEmail = async () => {
    if (!newEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address to verify",
        variant: "destructive",
      })
      return
    }

    setVerifyingEmail(true)
    try {
      const response = await fetch("/api/verified-emails/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message)

      await mutateEmails()
      setNewEmail('')
      toast({
        title: "Success",
        description: data.message || "Verification email sent. Please check your inbox.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start email verification",
        variant: "destructive",
      })
    } finally {
      setVerifyingEmail(false)
    }
  }

  const handleCheckVerification = async (email: string) => {
    try {
      const response = await fetch(`/api/verified-emails/status?email=${encodeURIComponent(email)}`)
      const data = await response.json()

      if (data.status === 'verified') {
        await mutateEmails()
      }

      toast({
        title: data.status === 'verified' ? "Success" : "Status",
        description: data.message,
        variant: data.status === 'verified' ? "default" : "secondary",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to check verification status",
        variant: "destructive",
      })
    }
  }
  const handleTestEmail = async () => {
    if (!testEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address for testing",
        variant: "destructive",
      })
      return
    }

    if (!verifiedEmails?.data?.some(email => email.verificationStatus === 'verified')) {
      toast({
        title: "Error",
        description: "Please verify at least one email address before testing",
        variant: "destructive",
      })
      return
    }

    setIsTesting(true)
    try {
      const response = await fetch("/api/verified-emails/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message)

      toast({
        title: "Success",
        description: "Test email sent successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      })
    } finally {
      setIsTesting(false)
    }
  }

  const menuItems = [
    { id: 'email', label: 'Email Settings', icon: Mail },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background">
        <div className="flex h-[80vh]">
          <motion.div
            className="w-64 border-r bg-muted/50 p-4 space-y-2"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {menuItems.map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant={activeSection === id ? "secondary" : "ghost"}
                className="w-full justify-start gap-2 h-12"
                onClick={() => setActiveSection(id as any)}
              >
                <Icon className="h-5 w-5" />
                {label}
                <ChevronRight className="ml-auto h-4 w-4" />
              </Button>
            ))}
          </motion.div>

          <div className="flex-1 p-6 overflow-y-auto">
            <AnimatePresence mode="wait">
              {activeSection === 'email' && (
                <SettingSection
                  key="email"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold">Email Settings</h2>
                    <p className="text-muted-foreground">Manage your verified sending addresses</p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label>Add Email Address</Label>
                      <div className="flex gap-2">
                        <Input
                          type="email"
                          placeholder="Enter email to verify"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          onClick={handleVerifyEmail}
                          disabled={verifyingEmail || !newEmail}
                        >
                          {verifyingEmail ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Verifying...
                            </>
                          ) : (
                            'Verify Email'
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label>Verified Addresses</Label>
                      {verifiedEmails?.data?.length === 0 ? (
                        <Alert>
                          <AlertDescription>
                            No verified email addresses. Add and verify an email address to start sending.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div className="space-y-2">
                          {verifiedEmails?.data?.map((email) => (
                            <div key={email.email} className="flex items-center justify-between p-4 border rounded-lg">
                              <div>
                                <p className="font-medium">{email.email}</p>
                                <p className="text-sm text-muted-foreground">
                                  Status: {email.verificationStatus}
                                  {email.verifiedAt && ` • Verified on ${new Date(email.verifiedAt).toLocaleDateString()}`}
                                </p>
                              </div>
                              {email.verificationStatus === 'pending' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCheckVerification(email.email)}
                                >
                                  Check Status
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-6 mt-6">
                      <h3 className="text-lg font-medium mb-4">Test Configuration</h3>
                      <div className="space-y-4">
                        <div className="grid gap-2">
                          <Label htmlFor="testEmail">Test Email Address</Label>
                          <Input
                            id="testEmail"
                            type="email"
                            placeholder="Enter email for testing"
                            className="max-w-lg"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                          />
                        </div>
                        <Button
                          onClick={handleTestEmail}
                          disabled={isTesting}
                          variant="outline"
                          className="gap-2"
                        >
                          {isTesting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            'Send Test Email'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </SettingSection>
              )}

              {activeSection === 'appearance' && (
                <SettingSection
                  key="appearance"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold">Appearance</h2>
                    <p className="text-muted-foreground">Customize your application theme</p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="theme">Theme</Label>
                      <Select value={theme} onValueChange={setTheme}>
                        <SelectTrigger className="max-w-lg">
                          <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </SettingSection>
              )}
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}