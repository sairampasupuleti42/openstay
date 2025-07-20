import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Title from "@/helpers/Title";
import SEOMeta from "@/helpers/SEOMeta";
import {
  testFirebaseConnection,
  testContactsCollection,
} from "@/utils/firebaseTest";
import {
  fixFirestoreConnection,
  checkFirestoreConfig,
  retryFirestoreOperation,
} from "@/utils/firestoreFix";

// Zod validation schema
const contactSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  subject: z.string().min(5, {
    message: "Subject must be at least 5 characters.",
  }),
  message: z.string().min(10, {
    message: "Message must be at least 10 characters.",
  }),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export default function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  const onSubmit = async (values: ContactFormValues) => {
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      console.log("Attempting to submit form with values:", values);
      console.log("Firebase db instance:", db);

      // Test Firestore connection first
      console.log("Testing Firestore connection...");

      // Add form data to Firestore with retry logic
      const docData = {
        ...values,
        timestamp: new Date().toISOString(),
        status: "new",
        createdAt: new Date(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      console.log("Attempting to write document:", docData);

      // Use retry mechanism for the Firestore operation
      const docRef = await retryFirestoreOperation(
        () => addDoc(collection(db, "contacts_messages"), docData),
        3, // 3 retries
        1000 // 1 second initial delay
      );

      console.log("Document written with ID: ", docRef.id);
      setSubmitStatus("success");
      form.reset();
    } catch (error: unknown) {
      console.error("Error submitting form:", error);
      console.error("Error details:", {
        error,
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : "Unknown",
        code: (error as { code?: string })?.code || "Unknown",
        stack: error instanceof Error ? error.stack : "Unknown",
      });

      // Type guard for Firebase errors
      const isFirebaseError = (
        err: unknown
      ): err is { code: string; message: string } => {
        return (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          "message" in err
        );
      };

      setSubmitStatus("error");

      // More specific error messages
      if (isFirebaseError(error)) {
        console.error("Firebase Error code:", error.code);
        console.error("Firebase Error message:", error.message);

        switch (error.code) {
          case "permission-denied":
            setErrorMessage(
              "Permission denied. Please check Firestore security rules."
            );
            break;
          case "unavailable":
            setErrorMessage(
              "Firestore service is temporarily unavailable. Please try again in a moment."
            );
            break;
          case "failed-precondition":
            setErrorMessage(
              "Database configuration error. Please contact support."
            );
            break;
          case "unauthenticated":
            setErrorMessage(
              "Authentication required. Please sign in and try again."
            );
            break;
          case "resource-exhausted":
            setErrorMessage("Request quota exceeded. Please try again later.");
            break;
          case "deadline-exceeded":
            setErrorMessage(
              "Request timed out. Please check your connection and try again."
            );
            break;
          case "internal":
            setErrorMessage("Internal server error. Please try again later.");
            break;
          default:
            setErrorMessage(
              `Firestore error (${error.code}): ${error.message}`
            );
        }
      } else if (error instanceof Error) {
        if (error.message.includes("WebChannelConnection")) {
          setErrorMessage(
            "Connection error. Please check your internet connection and try again."
          );
        } else if (error.message.includes("transport errored")) {
          setErrorMessage(
            "Network transport error. Please refresh the page and try again."
          );
        } else {
          setErrorMessage(`Network error: ${error.message}`);
        }
      } else {
        setErrorMessage(
          "An unexpected error occurred. Please try again later."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEOMeta
        title="Contact Us - Openstay"
        description="Get in touch with Openstay. Send us a message and we'll get back to you as soon as possible. We're here to help with all your accommodation needs."
        keywords="contact, support, help, customer service, Openstay"
        canonicalUrl="/contact"
      />

      <main className="min-h-screen bg-background">
        {/* Header Section */}
        <section className="py-16 px-4 bg-gradient-to-br from-background to-muted">
          <div className="container mx-auto max-w-6xl text-center">
            <Title variant="solid" className="mb-6">
              Get In Touch
            </Title>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Have a question or need assistance? We're here to help. Send us a
              message and we'll get back to you as soon as possible.
            </p>
          </div>
        </section>

        {/* Contact Content */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              {/* Left Column - Cover Photo and Contact Info */}
              <div className="space-y-8">
                <div className="relative h-[400px] rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-primary/10">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center p-8">
                      <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                          className="w-12 h-12 text-primary"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        Let's Connect
                      </h3>
                      <p className="text-muted-foreground">
                        Your message matters to us
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      Contact Information
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <svg
                          className="w-5 h-5 text-primary mt-1 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        <div>
                          <h4 className="font-medium text-gray-900">Email</h4>
                          <p className="text-muted-foreground">
                            info@Openstay.com
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <svg
                          className="w-5 h-5 text-primary mt-1 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                        <div>
                          <h4 className="font-medium text-gray-900">Phone</h4>
                          <p className="text-muted-foreground">
                            +91 (998) 993-8828
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <svg
                          className="w-5 h-5 text-primary mt-1 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <div>
                          <h4 className="font-medium text-gray-900">Address</h4>
                          <p className="text-muted-foreground">
                            3-110 Kotipalli Road
                            <br />
                            Putrela, AP 521227
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      Response Time
                    </h3>
                    <p className="text-muted-foreground">
                      We typically respond to all inquiries within 24 hours
                      during business days. For urgent matters, please call us
                      directly.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column - Contact Form */}
              <div className="bg-card rounded-lg border p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Send us a Message
                </h2>

                {/* Status Messages */}
                {submitStatus === "success" && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex">
                      <svg
                        className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">
                          Message sent successfully!
                        </h3>
                        <p className="text-sm text-green-700 mt-1">
                          Thank you for your message. We'll get back to you
                          soon.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {submitStatus === "error" && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex">
                      <svg
                        className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          Error sending message
                        </h3>
                        <p className="text-sm text-red-700 mt-1">
                          {errorMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contact Form */}
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Your full name"
                                {...field}
                                aria-describedby="name-error"
                              />
                            </FormControl>
                            <FormMessage id="name-error" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="your.email@example.com"
                                type="email"
                                {...field}
                                aria-describedby="email-error"
                              />
                            </FormControl>
                            <FormMessage id="email-error" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="What is your message about?"
                              {...field}
                              aria-describedby="subject-error"
                            />
                          </FormControl>
                          <FormMessage id="subject-error" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tell us more about your inquiry..."
                              className="min-h-[120px]"
                              {...field}
                              aria-describedby="message-error"
                            />
                          </FormControl>
                          <FormMessage id="message-error" />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting}
                      aria-describedby="submit-status"
                    >
                      {isSubmitting ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Sending Message...
                        </>
                      ) : (
                        "Send Message"
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
