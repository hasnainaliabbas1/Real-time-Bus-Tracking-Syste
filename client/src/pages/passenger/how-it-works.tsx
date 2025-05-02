import { Link } from "wouter";
import { ArrowLeft, Map, CreditCard, Bus, QrCode, MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export default function HowItWorks() {
  const { user } = useAuth();

  const steps = [
    {
      title: "Track Your Bus",
      description: "View real-time locations of all buses on the map. Search for routes and see estimated arrival times.",
      icon: <Map className="h-8 w-8 text-primary" />,
      link: "/",
      linkText: "Go to Map",
    },
    {
      title: "Book Your Ticket",
      description: "Select your route, starting point, destination, and time. Pay securely with your preferred payment method.",
      icon: <CreditCard className="h-8 w-8 text-primary" />,
      link: "/passenger/tickets",
      linkText: "Book a Ticket",
    },
    {
      title: "Board Your Bus",
      description: "Show your digital ticket's QR code to the driver when boarding. No paper tickets needed!",
      icon: <QrCode className="h-8 w-8 text-primary" />,
      link: "/passenger/tickets?tab=my-tickets",
      linkText: "View My Tickets",
    },
    {
      title: "Save on Regular Travel",
      description: "Subscribe to daily, weekly, or monthly passes for unlimited rides and save money on regular travel.",
      icon: <Bus className="h-8 w-8 text-primary" />,
      link: "/passenger/subscriptions",
      linkText: "View Subscription Plans",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="ml-2 text-xl font-semibold text-gray-900">How It Works</h1>
            </div>
            <div className="text-sm text-gray-500">
              Welcome, {user?.fullName || user?.username}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-4">
            Get Started with BusTrack
          </h2>
          <p className="max-w-2xl mx-auto text-gray-600">
            Follow these simple steps to make the most of our bus tracking and booking system.
          </p>
        </div>

        {/* Steps Section */}
        <div className="py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {steps.map((step, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col h-full">
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                      {step.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-2 flex items-center">
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-white text-sm mr-3">
                        {index + 1}
                      </span>
                      {step.title}
                    </h3>
                    <p className="text-gray-600 mb-6 flex-grow">
                      {step.description}
                    </p>
                    <Link href={step.link} className="mt-auto">
                      <Button className="w-full">
                        {step.linkText}
                        <MoveRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-center mb-8">Additional Features</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h4 className="text-lg font-medium mb-2">Real-time Updates</h4>
              <p className="text-gray-600">
                Get instant notifications about bus delays, route changes, or service disruptions.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h4 className="text-lg font-medium mb-2">Save Favorite Routes</h4>
              <p className="text-gray-600">
                Mark your most used routes as favorites for quick access and tracking.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                  <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                </svg>
              </div>
              <h4 className="text-lg font-medium mb-2">Transaction History</h4>
              <p className="text-gray-600">
                Access your past tickets and subscription purchases for record keeping.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 bg-white rounded-lg shadow-sm p-6 md:p-8">
          <h3 className="text-2xl font-bold mb-6">Frequently Asked Questions</h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-medium mb-2">How accurate is the bus tracking?</h4>
              <p className="text-gray-600">
                Our system updates bus locations in real-time, typically within 10-15 seconds. 
                Weather conditions and network connectivity may occasionally affect accuracy.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-medium mb-2">Can I get a refund for my ticket?</h4>
              <p className="text-gray-600">
                Tickets can be refunded up to 24 hours before the scheduled departure time. 
                After that, refunds are only available in exceptional circumstances.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-medium mb-2">What happens if I miss my bus?</h4>
              <p className="text-gray-600">
                Single tickets are valid for the specific time booked. If you miss your bus, 
                you'll need to purchase a new ticket. Subscription pass holders can take any 
                bus on their eligible routes.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-medium mb-2">How do I report a problem with the service?</h4>
              <p className="text-gray-600">
                You can report any issues through the app by navigating to Settings {'->'} Report an Issue, 
                or by contacting our customer support team.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 text-center">
          <h3 className="text-xl font-bold mb-4">Ready to start your journey?</h3>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/">
              <Button size="lg">
                <Map className="mr-2 h-5 w-5" />
                View Live Map
              </Button>
            </Link>
            <Link href="/passenger/tickets">
              <Button size="lg" variant="outline">
                <CreditCard className="mr-2 h-5 w-5" />
                Book a Ticket
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
