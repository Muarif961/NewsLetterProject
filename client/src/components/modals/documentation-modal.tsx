import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Button } from "../ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { Search, ArrowRight } from "lucide-react"
import { Input } from "../ui/input"
import { ScrollArea } from "../ui/scroll-area"
import { GettingStarted } from "../documentation/getting-started"
import { CreatingNewsletters } from "../documentation/creating-newsletters"
import { ManagingSubscribers } from "../documentation/managing-subscribers"
import { APIDocumentation } from "../documentation/api-documentation"

const MotionSection = motion.section

const docs = [
  {
    title: "Getting Started",
    description: "Learn the basics of using the platform",
    component: GettingStarted,
  },
  {
    title: "Creating Newsletters",
    description: "Guide to creating and sending newsletters",
    component: CreatingNewsletters,
  },
  {
    title: "Managing Subscribers",
    description: "Best practices for subscriber management",
    component: ManagingSubscribers,
  },
  {
    title: "API Documentation",
    description: "Integrate with our API",
    component: APIDocumentation,
  },
]

export function DocumentationModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredDocs = docs.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const SelectedComponent = docs.find(
    (doc) => doc.title === selectedDoc
  )?.component

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] p-8 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {selectedDoc || "Documentation"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {!selectedDoc ? (
              <MotionSection
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6 py-6"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search documentation..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {filteredDocs.map((doc, index) => (
                    <motion.div
                      key={doc.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="group rounded-lg border p-6 hover:border-primary hover:shadow-sm cursor-pointer"
                      onClick={() => setSelectedDoc(doc.title)}
                    >
                      <h3 className="font-medium group-hover:text-primary">
                        {doc.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {doc.description}
                      </p>
                      <div className="mt-2 flex items-center text-sm text-primary">
                        Learn more
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </MotionSection>
            ) : (
              <MotionSection
                key="detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="py-6"
              >
                <div className="space-y-6">
                  <Button
                    variant="ghost"
                    className="mb-4"
                    onClick={() => setSelectedDoc(null)}
                  >
                    ← Back to Overview
                  </Button>
                  <div className="overflow-y-auto pr-4">
                    {SelectedComponent && <SelectedComponent />}
                  </div>
                </div>
              </MotionSection>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}