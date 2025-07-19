import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

// Zod schema for form validation
const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  message: z.string().min(10, {
    message: "Message must be at least 10 characters.",
  }),
})

function App() {
  const [submissions, setSubmissions] = useState<Array<z.infer<typeof formSchema>>>([])

  // Initialize form with Zod validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  })

  // Handle form submission
  function onSubmit(values: z.infer<typeof formSchema>) {
    setSubmissions(prev => [...prev, values])
    form.reset()
    console.log(values)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">OpenStay</h1>
            <p className="text-muted-foreground text-lg">
              React + Vite + TailwindCSS + Shadcn/ui + Zod + Firebase
            </p>
          </div>

          <div className="bg-card border rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Contact Form</h2>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your name" {...field} />
                      </FormControl>
                      <FormDescription>
                        This is your public display name.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter your email" {...field} />
                      </FormControl>
                      <FormDescription>
                        We'll never share your email with anyone else.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <textarea
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Enter your message"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Tell us how we can help you.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Submit
                </Button>
              </form>
            </Form>
          </div>

          {submissions.length > 0 && (
            <div className="bg-card border rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Submissions</h2>
              <div className="space-y-4">
                {submissions.map((submission, index) => (
                  <div key={index} className="border rounded p-4 bg-muted/50">
                    <p><strong>Name:</strong> {submission.name}</p>
                    <p><strong>Email:</strong> {submission.email}</p>
                    <p><strong>Message:</strong> {submission.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>🔥 Firebase configuration is ready in src/lib/firebase.ts</p>
            <p>📝 Add your Firebase config to start using authentication and database</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
